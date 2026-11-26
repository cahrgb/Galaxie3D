        // =========================================================================
        // 4. MOTEUR 3D THREE.JS (MODE DISPERSÉ DANS L'ESPACE)
        // =========================================================================
        let scene, camera, renderer, cardsGroup;
        let starFieldPrimary, starFieldSecondary;
        let sharedUnitPlaneGeo = null;
        let cardMeshes = [];
        let frontMeshes = [];
        let hoveredIndex = -1;

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2(-99, -99);
        const canvasRect = { left: 0, top: 0, width: 1, height: 1 };

        // État de la boucle d'animation (indépendante du taux de rafraîchissement + pause en arrière-plan)
        let animFrameId = null;
        let lastFrameTime = 0;
        let elapsedTime = 0;

        // État du survol (raycast exécuté au plus une fois par frame)
        let hoverDirty = false;
        let hoverClientX = -9999;
        let hoverClientY = -9999;

        // Contrôle fluide de la caméra orbitale autour du nuage de cartes
        const cameraOrbit = {
            yaw: 0,
            pitch: 0.06,
            zoom: 16.5,
            targetYaw: 0,
            targetPitch: 0.06,
            targetZoom: 16.5
        };

        let isPointerDown = false;
        let hasDragged = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let lastPointerX = 0;
        let lastPointerY = 0;

        function updateCanvasRect() {
            if (!renderer || !renderer.domElement) return;
            const rect = renderer.domElement.getBoundingClientRect();
            canvasRect.left = rect.left;
            canvasRect.top = rect.top;
            canvasRect.width = Math.max(1, rect.width);
            canvasRect.height = Math.max(1, rect.height);
        }

        function initThreeScene() {
            const container = domCache.canvasContainer || document.getElementById('canvas-container');
            const w = window.innerWidth;
            const h = window.innerHeight;
            const activeThemeIndex = getActiveGalaxy().themeIndex;

            scene = new THREE.Scene();
            scene.fog = new THREE.FogExp2(THEMES[activeThemeIndex].fog, 0.018);

            camera = new THREE.PerspectiveCamera(48, w / Math.max(1, h), 0.1, 220);
            camera.position.set(0, 0, cameraOrbit.zoom);

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
            renderer.setSize(w, h);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            container.innerHTML = '';
            container.appendChild(renderer.domElement);
            updateCanvasRect();

            // Géométrie unitaire partagée par toutes les cartes (évite d'allouer 2 PlaneGeometry par carte)
            sharedUnitPlaneGeo = new THREE.PlaneGeometry(1, 1);

            // Champ d'étoiles / particules 3D profond
            starFieldPrimary = createStarField(950, 75, 0.13, THEMES[activeThemeIndex].starPrimary);
            starFieldSecondary = createStarField(550, 95, 0.09, THEMES[activeThemeIndex].starSecondary);
            scene.add(starFieldPrimary);
            scene.add(starFieldSecondary);

            cardsGroup = new THREE.Group();
            scene.add(cardsGroup);

            applyTheme(activeThemeIndex, false, false);
            rebuildCards3D();
        }

        function createStarField(count, spread, size, colorHex) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
                const r = spread * (0.28 + Math.random() * 0.72);
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
                positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
                positions[i * 3 + 2] = r * Math.cos(phi);
            }
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const material = new THREE.PointsMaterial({
                color: colorHex,
                size,
                transparent: true,
                opacity: 0.72,
                depthWrite: false
            });
            return new THREE.Points(geometry, material);
        }

        function applyTheme(index, notify = true, persist = true) {
            const galaxy = getActiveGalaxy();
            galaxy.themeIndex = ((index % THEMES.length) + THEMES.length) % THEMES.length;
            const theme = THEMES[galaxy.themeIndex];

            document.body.style.backgroundColor = theme.cssBg;
            if (scene) {
                scene.background = new THREE.Color(theme.bg);
                scene.fog = new THREE.FogExp2(theme.fog, 0.017);
            }
            if (starFieldPrimary) starFieldPrimary.material.color.setHex(theme.starPrimary);
            if (starFieldSecondary) starFieldSecondary.material.color.setHex(theme.starSecondary);

            const nameEl = document.getElementById('theme-current-name');
            if (nameEl) nameEl.textContent = theme.name;

            if (persist) {
                saveState();
            }
            if (notify) {
                showToast(`Ambiance : ${theme.name}`, 'info');
            }
        }

        /**
         * Calcule des coordonnées 3D harmonieusement dispersées dans l'espace (sphère de Fibonacci adaptée)
         */
        function computeSparsePosition(index, total) {
            const aspect = Math.max(0.75, Math.min(2.0, window.innerWidth / Math.max(1, window.innerHeight)));
            const scaleBoost = 1 + Math.min(0.65, Math.max(0, total - 6) * 0.04);

            if (total === 1) {
                return new THREE.Vector3(0, 0, -2.5);
            }

            const goldenAngle = Math.PI * (3 - Math.sqrt(5));
            const t = (index + 0.5) / total;
            const yNorm = 1 - 2 * t;
            const rAtY = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
            const theta = goldenAngle * index;

            const spreadX = 8.4 * aspect * scaleBoost;
            const spreadY = 5.4 * scaleBoost;
            const spreadZ = 6.8 * scaleBoost;

            // Légère variation déterministe de rayon pour créer de la profondeur organique
            const radialJitter = 0.78 + ((index * 37) % 10) * 0.045;

            return new THREE.Vector3(
                Math.cos(theta) * rAtY * spreadX * radialJitter,
                yNorm * spreadY * radialJitter,
                Math.sin(theta) * rAtY * spreadZ * radialJitter - 1.5
            );
        }

        /**
         * Reconstruit l'ensemble des cartes 3D filtrées dans l'espace dispersé
         * en réutilisant les textures en cache et la géométrie partagée
         */
        function rebuildCards3D(focusId = null) {
            // Nettoyage des matériaux de l'affichage précédent (textures gérées par le cache, géométrie partagée conservée)
            for (let i = 0; i < cardMeshes.length; i++) {
                const group = cardMeshes[i];
                const data = group.userData;
                if (data) {
                    if (data.frontMat) {
                        if (!data.textureCached && data.frontMat.map) {
                            data.frontMat.map.dispose();
                        }
                        data.frontMat.dispose();
                    }
                    if (data.glowMat) data.glowMat.dispose();
                }
                cardsGroup.remove(group);
            }
            cardMeshes = [];
            frontMeshes = [];
            hoveredIndex = -1;
            hoverDirty = false;
            if (domCache.canvasContainer) {
                domCache.canvasContainer.classList.remove('pointer-card');
            }

            updateFilterCounts();
            const items = getFilteredItems();
            const emptyState = document.getElementById('empty-state');

            if (items.length === 0) {
                state.selectedIndex = -1;
                if (emptyState) emptyState.classList.remove('hidden');
                pruneCardTextureCache();
                return;
            }
            if (emptyState) emptyState.classList.add('hidden');

            const visibleIds = new Set();

            for (let index = 0; index < items.length; index++) {
                const item = items[index];
                if (item.id) visibleIds.add(item.id);
                const { texture, width3D, height3D } = createCardTexture(item);
                const group = new THREE.Group();

                // Plan principal haute définition de la carte (géométrie partagée)
                const frontMat = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 1,
                    side: THREE.DoubleSide
                });
                const frontMesh = new THREE.Mesh(sharedUnitPlaneGeo, frontMat);
                frontMesh.scale.set(width3D, height3D, 1);
                frontMesh.userData.cardIndex = index;
                group.add(frontMesh);
                frontMeshes.push(frontMesh);

                // Aura arrière subtile donnant du relief en 3D (géométrie partagée)
                const glowMat = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(item.color || '#38bdf8'),
                    transparent: true,
                    opacity: 0.16,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });
                const glowMesh = new THREE.Mesh(sharedUnitPlaneGeo, glowMat);
                glowMesh.scale.set(width3D + 0.14, height3D + 0.14, 1);
                glowMesh.position.z = -0.04;
                group.add(glowMesh);

                const basePos = computeSparsePosition(index, items.length);
                group.position.copy(basePos);

                group.userData = {
                    index,
                    item,
                    basePos,
                    frontMat,
                    glowMat,
                    textureCached: Boolean(item.id),
                    width3D,
                    height3D,
                    floatPhase: index * 1.37 + Math.random() * 0.5,
                    floatSpeed: 0.55 + (index % 4) * 0.14
                };

                cardsGroup.add(group);
                cardMeshes.push(group);
            }

            pruneCardTextureCache(visibleIds);

            // Par défaut aucune carte n'est sélectionnée, sauf si focusId est demandé explicitement
            if (focusId) {
                const foundIdx = items.findIndex(x => x.id === focusId);
                state.selectedIndex = foundIdx !== -1 ? foundIdx : -1;
            } else {
                state.selectedIndex = -1;
            }
        }

        function selectCard(index) {
            if (index < 0 || index >= cardMeshes.length) {
                state.selectedIndex = -1;
                return;
            }
            state.selectedIndex = index;
        }

        function deselectCard() {
            state.selectedIndex = -1;
        }

        // Vecteurs temporaires réutilisés pour éviter les allocations par frame
        const _camForward = new THREE.Vector3();
        const _targetPos = new THREE.Vector3();
        const _targetQuat = new THREE.Quaternion();
        const _lookMatrix = new THREE.Matrix4();
        const _upVec = new THREE.Vector3(0, 1, 0);

        /**
         * Met à jour en douceur la caméra et la position/zoom de chaque carte 3D
         * (indépendant du taux de rafraîchissement via dt)
         */
        function updateCardsTransform(elapsed, dt) {
            const frames60 = dt * 60;
            const damp = (f) => 1 - Math.pow(1 - f, frames60);

            // Dérive lente de l'espace lorsque rien n'est zoomé
            if (state.autoRotate && state.selectedIndex === -1 && !isPointerDown && !isAnyModalOpen()) {
                cameraOrbit.targetYaw += 0.0011 * frames60;
            }

            // Interpolation douce de la caméra orbitale
            const dampCamRot = damp(0.075);
            const dampCamZoom = damp(0.08);
            cameraOrbit.yaw += (cameraOrbit.targetYaw - cameraOrbit.yaw) * dampCamRot;
            cameraOrbit.pitch += (cameraOrbit.targetPitch - cameraOrbit.pitch) * dampCamRot;
            cameraOrbit.zoom += (cameraOrbit.targetZoom - cameraOrbit.zoom) * dampCamZoom;

            const cosPitch = Math.cos(cameraOrbit.pitch);
            camera.position.set(
                Math.sin(cameraOrbit.yaw) * cosPitch * cameraOrbit.zoom,
                Math.sin(cameraOrbit.pitch) * cameraOrbit.zoom,
                Math.cos(cameraOrbit.yaw) * cosPitch * cameraOrbit.zoom
            );
            camera.lookAt(0, 0, 0);
            camera.getWorldDirection(_camForward);

            // Rotation discrète des champs d'étoiles
            if (starFieldPrimary) starFieldPrimary.rotation.y = elapsed * 0.012;
            if (starFieldSecondary) starFieldSecondary.rotation.y = -elapsed * 0.008;

            const len = cardMeshes.length;
            if (len === 0) return;

            const hasSelection = state.selectedIndex !== -1 && state.selectedIndex < len;
            const tanHalfFov = hasSelection ? Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) : 0;

            // Facteurs d'interpolation précalculés une seule fois par frame
            const dampSelPos = damp(0.14);
            const dampSelQuat = damp(0.16);
            const dampSelOp = damp(0.15);
            const dampIdlePos = dampCamZoom; // 0.08
            const dampIdleScale = damp(0.12);
            const dampIdleOp = damp(0.10);

            for (let idx = 0; idx < len; idx++) {
                const group = cardMeshes[idx];
                const data = group.userData;
                const isSelected = hasSelection && idx === state.selectedIndex;
                const isHovered = !hasSelection && idx === hoveredIndex;

                if (isSelected) {
                    // Calcul exact de la distance pour que l'image remplisse ~92% de l'écran en premier plan
                    const fillRatio = data.item.type === 'image' ? 0.92 : 0.76;
                    const distForHeight = data.height3D / (2 * tanHalfFov * fillRatio);
                    const distForWidth = data.width3D / (2 * tanHalfFov * camera.aspect * fillRatio);
                    const focusDist = Math.max(0.65, distForHeight, distForWidth);

                    _targetPos.copy(camera.position).addScaledVector(_camForward, focusDist);
                    group.position.lerp(_targetPos, dampSelPos);
                    group.quaternion.slerp(camera.quaternion, dampSelQuat);

                    const nextScale = group.scale.x + (1.0 - group.scale.x) * dampSelPos;
                    group.scale.setScalar(nextScale);

                    data.frontMat.opacity += (1.0 - data.frontMat.opacity) * dampSelOp;
                    data.glowMat.opacity += (0.28 - data.glowMat.opacity) * dampSelOp;
                } else {
                    // Flottement naturel dans l'espace 3D distant
                    const bobY = Math.sin(elapsed * data.floatSpeed + data.floatPhase) * 0.24;
                    const bobX = Math.cos(elapsed * data.floatSpeed * 0.7 + data.floatPhase) * 0.14;

                    _targetPos.set(
                        data.basePos.x + bobX,
                        data.basePos.y + bobY,
                        data.basePos.z
                    );

                    // Reculer légèrement les autres cartes lorsqu'un élément est zoomé
                    if (hasSelection) {
                        _targetPos.multiplyScalar(1.22);
                    }

                    group.position.lerp(_targetPos, dampIdlePos);

                    // Orienter doucement chaque carte vers la caméra
                    _lookMatrix.lookAt(camera.position, group.position, _upVec);
                    _targetQuat.setFromRotationMatrix(_lookMatrix);
                    group.quaternion.slerp(_targetQuat, dampIdlePos);

                    const targetScale = isHovered ? 1.09 : (hasSelection ? 0.86 : 0.92);
                    const nextScale = group.scale.x + (targetScale - group.scale.x) * dampIdleScale;
                    group.scale.setScalar(nextScale);

                    const targetOpacity = hasSelection ? 0.26 : 1.0;
                    data.frontMat.opacity += (targetOpacity - data.frontMat.opacity) * dampIdleOp;
                    const targetGlow = isHovered ? 0.34 : (hasSelection ? 0.04 : 0.14);
                    data.glowMat.opacity += (targetGlow - data.glowMat.opacity) * dampIdleScale;
                }
            }
        }

        function updateHoverFromPointer() {
            if (isAnyModalOpen() || isPointerDown) return;
            const nextHovered = getIntersectedCardIndex(hoverClientX, hoverClientY);
            if ((nextHovered !== -1) !== (hoveredIndex !== -1) && domCache.canvasContainer) {
                domCache.canvasContainer.classList.toggle('pointer-card', nextHovered !== -1);
            }
            hoveredIndex = nextHovered;
        }

        function startAnimationLoop() {
            if (animFrameId !== null || document.hidden) return;
            lastFrameTime = 0;
            animFrameId = requestAnimationFrame(animate);
        }

        function stopAnimationLoop() {
            if (animFrameId !== null) {
                cancelAnimationFrame(animFrameId);
                animFrameId = null;
            }
            lastFrameTime = 0;
        }

        function animate(now) {
            if (document.hidden) {
                animFrameId = null;
                lastFrameTime = 0;
                return;
            }
            animFrameId = requestAnimationFrame(animate);

            const dt = lastFrameTime > 0
                ? Math.min(0.05, Math.max(0, (now - lastFrameTime) / 1000))
                : (1 / 60);
            lastFrameTime = now;
            elapsedTime += dt;

            if (hoverDirty) {
                hoverDirty = false;
                updateHoverFromPointer();
            }

            updateCardsTransform(elapsedTime, dt);
            if (renderer && scene && camera) {
                renderer.render(scene, camera);
            }
        }

        // =========================================================================
        // 5. INTERACTIONS 3D (SOURIS, TACTILE, MOLETTE, CLAVIER, REDIMENSIONNEMENT)
        // =========================================================================
        function getIntersectedCardIndex(clientX, clientY) {
            if (frontMeshes.length === 0 || !camera) return -1;
            pointer.x = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
            pointer.y = -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1;

            raycaster.setFromCamera(pointer, camera);
            const hits = raycaster.intersectObjects(frontMeshes, false);
            if (hits.length > 0 && typeof hits[0].object.userData.cardIndex === 'number') {
                return hits[0].object.userData.cardIndex;
            }
            return -1;
        }

        let pendingViewerOpenTimer = null;

        function handleCanvasTap(clientX, clientY) {
            if (isAnyModalOpen()) return;
            if (isOptionsMenuOpen()) {
                closeOptionsMenu();
            }

            if (pendingViewerOpenTimer) {
                clearTimeout(pendingViewerOpenTimer);
                pendingViewerOpenTimer = null;
            }

            const hitIndex = getIntersectedCardIndex(clientX, clientY);

            if (hitIndex !== -1) {
                const tappedItem = cardMeshes[hitIndex]?.userData?.item;
                if (hitIndex === state.selectedIndex) {
                    if (tappedItem && tappedItem.type === 'website' && tappedItem.url) {
                        openWebViewer(tappedItem);
                    } else if (tappedItem && tappedItem.type === 'pdf') {
                        openPdfViewer(tappedItem);
                    } else {
                        // Pour une image déjà zoomée : recliquer la renvoie simplement à distance
                        deselectCard();
                    }
                } else {
                    selectCard(hitIndex);
                    if (tappedItem && tappedItem.type === 'pdf') {
                        pendingViewerOpenTimer = setTimeout(() => {
                            pendingViewerOpenTimer = null;
                            if (state.selectedIndex === hitIndex && !isAnyModalOpen()) {
                                openPdfViewer(tappedItem);
                            }
                        }, 450);
                    } else if (tappedItem && tappedItem.type === 'website' && tappedItem.url) {
                        pendingViewerOpenTimer = setTimeout(() => {
                            pendingViewerOpenTimer = null;
                            if (state.selectedIndex === hitIndex && !isAnyModalOpen()) {
                                openWebViewer(tappedItem);
                            }
                        }, 450);
                    }
                }
            } else if (state.selectedIndex !== -1) {
                // Clic dans le vide : renvoie la carte zoomée à distance
                deselectCard();
            }
        }

        function setup3DInteractions() {
            const container = domCache.canvasContainer || document.getElementById('canvas-container');

            // Mise en pause automatique du rendu WebGL lorsque l'onglet est en arrière-plan
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    stopAnimationLoop();
                } else {
                    startAnimationLoop();
                }
            });

            // --- Menu contextuel (clic droit ou appui long tactile sur carte 3D) ---
            const contextMenuEl = document.getElementById('card-context-menu');
            let contextMenuItem = null;

            function hideCardContextMenu() {
                if (contextMenuEl) contextMenuEl.classList.add('hidden');
                contextMenuItem = null;
            }

            function openCardContextMenuAt(clientX, clientY) {
                if (isAnyModalOpen()) {
                    hideCardContextMenu();
                    return false;
                }
                if (isOptionsMenuOpen()) closeOptionsMenu();

                const hitIndex = getIntersectedCardIndex(clientX, clientY);
                if (hitIndex === -1) {
                    hideCardContextMenu();
                    return false;
                }

                const item = cardMeshes[hitIndex]?.userData?.item;
                if (!item || !contextMenuEl) {
                    hideCardContextMenu();
                    return false;
                }

                contextMenuItem = item;
                contextMenuEl.classList.remove('hidden');

                const menuRect = contextMenuEl.getBoundingClientRect();
                const x = Math.min(clientX, window.innerWidth - menuRect.width - 8);
                const y = Math.min(clientY, window.innerHeight - menuRect.height - 8);
                contextMenuEl.style.left = `${Math.max(8, x)}px`;
                contextMenuEl.style.top = `${Math.max(8, y)}px`;
                return true;
            }

            container.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                openCardContextMenuAt(e.clientX, e.clientY);
            });

            document.getElementById('ctx-btn-edit')?.addEventListener('click', () => {
                const item = contextMenuItem;
                hideCardContextMenu();
                if (item) openEditorModal(item);
            });

            document.getElementById('ctx-btn-delete')?.addEventListener('click', () => {
                const item = contextMenuItem;
                hideCardContextMenu();
                if (!item) return;
                askConfirm(
                    'Supprimer cette carte ?',
                    `« ${item.title} » sera retirée définitivement de votre espace 3D.`,
                    () => {
                        setActiveItems(getActiveItems().filter(x => x.id !== item.id));
                        saveState();
                        renderGalaxyMenuList();
                        rebuildCards3D();
                        showToast('Carte supprimée.', 'info');
                    }
                );
            });

            window.addEventListener('pointerdown', (e) => {
                if (contextMenuEl && !contextMenuEl.classList.contains('hidden') && !contextMenuEl.contains(e.target)) {
                    hideCardContextMenu();
                }
            });
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') hideCardContextMenu();
            });
            window.addEventListener('wheel', hideCardContextMenu, { passive: true });
            window.addEventListener('resize', hideCardContextMenu, { passive: true });

            // Horodatage du dernier événement tactile pour ignorer les événements souris synthétiques
            let lastTouchTimestamp = 0;
            const isRecentTouch = () => (performance.now() - lastTouchTimestamp) < 600;

            // --- Souris ---
            container.addEventListener('mousedown', (e) => {
                if (isRecentTouch() || e.button !== 0 || isAnyModalOpen()) return;
                isPointerDown = true;
                hasDragged = false;
                hoverDirty = false;
                dragStartX = lastPointerX = e.clientX;
                dragStartY = lastPointerY = e.clientY;
            });

            window.addEventListener('mousemove', (e) => {
                if (isRecentTouch() || isAnyModalOpen()) return;

                if (isPointerDown) {
                    const dx = e.clientX - lastPointerX;
                    const dy = e.clientY - lastPointerY;
                    if (Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) > 5) {
                        hasDragged = true;
                    }
                    if (state.selectedIndex === -1) {
                        cameraOrbit.targetYaw -= dx * 0.0055;
                        cameraOrbit.targetPitch = Math.max(-0.95, Math.min(0.95, cameraOrbit.targetPitch + dy * 0.0045));
                    }
                    lastPointerX = e.clientX;
                    lastPointerY = e.clientY;
                } else if (renderer && e.target === renderer.domElement) {
                    hoverClientX = e.clientX;
                    hoverClientY = e.clientY;
                    hoverDirty = true;
                }
            }, { passive: true });

            container.addEventListener('mouseleave', () => {
                hoverDirty = false;
                if (hoveredIndex !== -1) {
                    hoveredIndex = -1;
                    container.classList.remove('pointer-card');
                }
            });

            window.addEventListener('mouseup', (e) => {
                if (isRecentTouch() || !isPointerDown) return;
                isPointerDown = false;
                if (!hasDragged) {
                    handleCanvasTap(e.clientX, e.clientY);
                }
            });

            // --- Molette pour zoomer/dézoomer librement l'espace 3D ---
            container.addEventListener('wheel', (e) => {
                if (isAnyModalOpen() || state.selectedIndex !== -1) return;
                e.preventDefault();
                cameraOrbit.targetZoom = Math.max(9.5, Math.min(28, cameraOrbit.targetZoom + e.deltaY * 0.01));
            }, { passive: false });

            // --- Tactile (mobile, tablette & écrans tactiles) ---
            // Supporte : glisser 1 doigt (orbite + inertie), pincement 2 doigts (zoom),
            // appui long (menu contextuel Modifier/Supprimer), balayage sur carte zoomée (navigation / fermeture)
            let isPinching = false;
            let wasPinching = false;
            let lastPinchDistance = 0;
            let pinchStartDistance = 0;
            let longPressTimer = null;
            let longPressTriggered = false;
            let touchVelocityYaw = 0;
            let touchVelocityPitch = 0;
            let lastTouchMoveTime = 0;

            function getTouchDistance(t1, t2) {
                return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            }

            function cancelLongPress() {
                if (longPressTimer !== null) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            }

            function resetTouchState() {
                cancelLongPress();
                isPointerDown = false;
                isPinching = false;
                wasPinching = false;
                longPressTriggered = false;
                lastPinchDistance = 0;
                pinchStartDistance = 0;
                touchVelocityYaw = 0;
                touchVelocityPitch = 0;
            }

            container.addEventListener('touchstart', (e) => {
                lastTouchTimestamp = performance.now();
                if (isAnyModalOpen()) {
                    resetTouchState();
                    return;
                }

                // Effacer l'état de survol souris s'il était actif
                if (hoveredIndex !== -1) {
                    hoveredIndex = -1;
                    container.classList.remove('pointer-card');
                }
                hoverDirty = false;

                if (e.touches.length === 1) {
                    const touch = e.touches[0];
                    isPinching = false;
                    wasPinching = false;
                    longPressTriggered = false;
                    isPointerDown = true;
                    hasDragged = false;
                    dragStartX = lastPointerX = touch.clientX;
                    dragStartY = lastPointerY = touch.clientY;
                    touchVelocityYaw = 0;
                    touchVelocityPitch = 0;
                    lastTouchMoveTime = lastTouchTimestamp;

                    cancelLongPress();
                    longPressTimer = setTimeout(() => {
                        longPressTimer = null;
                        if (!isPointerDown || hasDragged || isPinching || isAnyModalOpen()) return;
                        if (openCardContextMenuAt(dragStartX, dragStartY)) {
                            longPressTriggered = true;
                            isPointerDown = false;
                            hasDragged = true;
                            if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                                navigator.vibrate(15);
                            }
                        }
                    }, 500);
                } else if (e.touches.length === 2) {
                    e.preventDefault();
                    cancelLongPress();
                    hideCardContextMenu();
                    isPinching = true;
                    wasPinching = true;
                    hasDragged = true;
                    isPointerDown = true;
                    lastPinchDistance = getTouchDistance(e.touches[0], e.touches[1]);
                    pinchStartDistance = lastPinchDistance;
                    touchVelocityYaw = 0;
                    touchVelocityPitch = 0;
                } else {
                    cancelLongPress();
                }
            }, { passive: false });

            container.addEventListener('touchmove', (e) => {
                const now = performance.now();
                lastTouchTimestamp = now;
                if (isAnyModalOpen()) return;

                e.preventDefault();

                if (e.touches.length === 2) {
                    cancelLongPress();
                    const dist = getTouchDistance(e.touches[0], e.touches[1]);
                    if (isPinching && lastPinchDistance > 0) {
                        if (state.selectedIndex === -1) {
                            const deltaDist = lastPinchDistance - dist;
                            cameraOrbit.targetZoom = Math.max(9.5, Math.min(28, cameraOrbit.targetZoom + deltaDist * 0.045));
                        } else if (pinchStartDistance > 0 && (pinchStartDistance - dist) > 45) {
                            // Pincement vers l'intérieur sur une carte zoomée : la renvoyer à distance
                            deselectCard();
                            pinchStartDistance = dist;
                        }
                    } else {
                        pinchStartDistance = dist;
                    }
                    lastPinchDistance = dist;
                    isPinching = true;
                    wasPinching = true;
                    hasDragged = true;
                    return;
                }

                if (!isPointerDown || isPinching || longPressTriggered || e.touches.length !== 1) return;

                const touch = e.touches[0];
                const dx = touch.clientX - lastPointerX;
                const dy = touch.clientY - lastPointerY;
                if (Math.hypot(touch.clientX - dragStartX, touch.clientY - dragStartY) > 10) {
                    hasDragged = true;
                    cancelLongPress();
                }
                if (state.selectedIndex === -1) {
                    const dYaw = -dx * 0.0065;
                    const dPitch = dy * 0.0055;
                    cameraOrbit.targetYaw += dYaw;
                    cameraOrbit.targetPitch = Math.max(-0.95, Math.min(0.95, cameraOrbit.targetPitch + dPitch));

                    const dtSec = Math.max(0.008, (now - lastTouchMoveTime) / 1000);
                    touchVelocityYaw = touchVelocityYaw * 0.55 + (dYaw / dtSec) * 0.45;
                    touchVelocityPitch = touchVelocityPitch * 0.55 + (dPitch / dtSec) * 0.45;
                }
                lastPointerX = touch.clientX;
                lastPointerY = touch.clientY;
                lastTouchMoveTime = now;
            }, { passive: false });

            container.addEventListener('touchend', (e) => {
                const now = performance.now();
                lastTouchTimestamp = now;
                cancelLongPress();

                // Transition fluide de 2 doigts vers 1 doigt (sans saut de caméra ni clic involontaire)
                if (e.touches.length === 1) {
                    isPinching = false;
                    wasPinching = true;
                    hasDragged = true;
                    lastPinchDistance = 0;
                    lastPointerX = e.touches[0].clientX;
                    lastPointerY = e.touches[0].clientY;
                    lastTouchMoveTime = now;
                    return;
                }

                if (e.touches.length > 0) return;

                if (isPointerDown && !wasPinching && !longPressTriggered) {
                    const touch = e.changedTouches && e.changedTouches[0];
                    if (!hasDragged && touch) {
                        handleCanvasTap(touch.clientX, touch.clientY);
                    } else if (hasDragged && state.selectedIndex !== -1 && touch) {
                        // Balayage sur carte zoomée : gauche/droite pour naviguer, bas pour fermer
                        const totalDx = touch.clientX - dragStartX;
                        const totalDy = touch.clientY - dragStartY;
                        if (Math.abs(totalDx) > 55 && Math.abs(totalDx) > Math.abs(totalDy) * 1.25 && cardMeshes.length > 1) {
                            if (totalDx < 0) {
                                selectCard((state.selectedIndex + 1) % cardMeshes.length);
                            } else {
                                selectCard((state.selectedIndex - 1 + cardMeshes.length) % cardMeshes.length);
                            }
                        } else if (totalDy > 70 && Math.abs(totalDy) > Math.abs(totalDx) * 1.25) {
                            deselectCard();
                        }
                    } else if (hasDragged && state.selectedIndex === -1 && (now - lastTouchMoveTime) < 100) {
                        // Inertie douce après un glissement rapide
                        const yawImpulse = Math.max(-0.85, Math.min(0.85, touchVelocityYaw * 0.14));
                        const pitchImpulse = Math.max(-0.35, Math.min(0.35, touchVelocityPitch * 0.12));
                        cameraOrbit.targetYaw += yawImpulse;
                        cameraOrbit.targetPitch = Math.max(-0.95, Math.min(0.95, cameraOrbit.targetPitch + pitchImpulse));
                    }
                }

                resetTouchState();
            });

            container.addEventListener('touchcancel', () => {
                lastTouchTimestamp = performance.now();
                resetTouchState();
            });

            // --- Clavier ---
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    if (isAnyModalOpen()) {
                        closeAllModals();
                    } else if (isOptionsMenuOpen()) {
                        closeOptionsMenu();
                    } else if (state.selectedIndex !== -1) {
                        deselectCard();
                    }
                    return;
                }

                if (isAnyModalOpen() || cardMeshes.length === 0) return;

                if (e.key === 'ArrowRight' && state.selectedIndex !== -1) {
                    selectCard((state.selectedIndex + 1) % cardMeshes.length);
                } else if (e.key === 'ArrowLeft' && state.selectedIndex !== -1) {
                    selectCard((state.selectedIndex - 1 + cardMeshes.length) % cardMeshes.length);
                } else if (e.key === 'Enter' && state.selectedIndex !== -1) {
                    const item = cardMeshes[state.selectedIndex]?.userData?.item;
                    if (item && item.type === 'website' && item.url) {
                        openWebViewer(item);
                    } else if (item && item.type === 'pdf') {
                        openPdfViewer(item);
                    }
                }
            });

            // --- Redimensionnement réactif (et rotation d'écran mobile/tablette) ---
            function handleViewportResize() {
                if (!camera || !renderer) return;
                const w = window.innerWidth;
                const h = window.innerHeight;
                camera.aspect = w / Math.max(1, h);
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
                updateCanvasRect();

                // Recalculer la dispersion horizontale selon le nouveau ratio d'écran
                const total = cardMeshes.length;
                for (let idx = 0; idx < total; idx++) {
                    cardMeshes[idx].userData.basePos = computeSparsePosition(idx, total);
                }
            }

            window.addEventListener('resize', handleViewportResize);
            window.addEventListener('orientationchange', () => {
                hideCardContextMenu();
                setTimeout(handleViewportResize, 120);
            });
        }

