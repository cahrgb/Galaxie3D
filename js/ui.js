        // =========================================================================
        // 6. MENU ROUE DENTELÉE & ÉTAT DES BOUTONS D'OPTIONS
        // =========================================================================
        function isOptionsMenuOpen() {
            const menu = domCache.optionsMenu || document.getElementById('options-menu');
            return menu && !menu.classList.contains('hidden');
        }

        function openOptionsMenu() {
            const menu = document.getElementById('options-menu');
            const btn = document.getElementById('btn-options-toggle');
            const gear = document.getElementById('icon-options-gear');
            if (menu) menu.classList.remove('hidden');
            if (btn) btn.setAttribute('aria-expanded', 'true');
            if (gear) gear.style.transform = 'rotate(90deg)';
        }

        function closeOptionsMenu() {
            const menu = document.getElementById('options-menu');
            const btn = document.getElementById('btn-options-toggle');
            const gear = document.getElementById('icon-options-gear');
            if (menu) menu.classList.add('hidden');
            if (btn) btn.setAttribute('aria-expanded', 'false');
            if (gear) gear.style.transform = 'rotate(0deg)';
        }

        function toggleOptionsMenu() {
            if (isOptionsMenuOpen()) {
                closeOptionsMenu();
            } else {
                openOptionsMenu();
            }
        }

        function updateFilterButtonsUI() {
            document.querySelectorAll('.filter-btn').forEach(btn => {
                const isActive = btn.dataset.filter === state.filter;
                btn.classList.toggle('bg-white/15', isActive);
                btn.classList.toggle('text-white', isActive);
                btn.classList.toggle('text-slate-300', !isActive);
            });
            updateFilterCounts();
        }

        function updateAutoRotateUI() {
            const pill = document.getElementById('autorotate-pill');
            const knob = document.getElementById('autorotate-knob');
            if (!pill || !knob) return;
            if (state.autoRotate) {
                pill.classList.remove('bg-white/15');
                pill.classList.add('bg-sky-500');
                knob.style.transform = 'translateX(16px)';
                knob.classList.remove('bg-slate-300');
                knob.classList.add('bg-white');
            } else {
                pill.classList.remove('bg-sky-500');
                pill.classList.add('bg-white/15');
                knob.style.transform = 'translateX(0px)';
                knob.classList.remove('bg-white');
                knob.classList.add('bg-slate-300');
            }
        }


        // =========================================================================
        // 8. CONNEXION DE TOUS LES ÉVÉNEMENTS DE L'INTERFACE
        // =========================================================================
        function setupUIEvents() {
            // Bouton Roue Dentelée
            document.getElementById('btn-options-toggle').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleOptionsMenu();
            });

            // Fermer le menu si clic en dehors (sauf dans la boîte de confirmation)
            document.addEventListener('click', (e) => {
                const wrapper = document.getElementById('options-wrapper');
                const confirmModal = document.getElementById('modal-confirm');
                if (confirmModal && confirmModal.contains(e.target)) return;
                if (isOptionsMenuOpen() && wrapper && !wrapper.contains(e.target)) {
                    closeOptionsMenu();
                }
            });

            // Boutons "Ajouter une carte"
            document.getElementById('btn-open-add').addEventListener('click', () => openEditorModal(null));
            document.getElementById('btn-empty-add').addEventListener('click', () => openEditorModal(null));

            // Bouton "Ajouter une galaxie" dans le menu roue dentelée
            document.getElementById('btn-add-galaxy').addEventListener('click', (e) => {
                e.stopPropagation();
                addGalaxy();
            });

            // Filtres (Tout / Sites Web / Images)
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    state.filter = btn.dataset.filter;
                    updateFilterButtonsUI();
                    rebuildCards3D();
                    closeOptionsMenu();
                });
            });

            // Dérive automatique
            document.getElementById('btn-toggle-autorotate').addEventListener('click', () => {
                state.autoRotate = !state.autoRotate;
                updateAutoRotateUI();
                saveState();
                showToast(state.autoRotate ? 'Dérive automatique activée' : 'Dérive automatique désactivée', 'info');
            });

            // Ambiance 3D
            document.getElementById('btn-cycle-theme').addEventListener('click', () => {
                applyTheme((getActiveGalaxy().themeIndex + 1) % THEMES.length, true);
            });

            // Gestionnaire de bibliothèque
            document.getElementById('btn-open-manager').addEventListener('click', () => {
                closeOptionsMenu();
                renderManagerList();
                document.getElementById('modal-manager').classList.remove('hidden');
            });

            document.getElementById('btn-close-manager').addEventListener('click', () => {
                document.getElementById('modal-manager').classList.add('hidden');
            });

            document.getElementById('modal-manager').addEventListener('click', (e) => {
                if (e.target.id === 'modal-manager') {
                    document.getElementById('modal-manager').classList.add('hidden');
                }
            });

            // Export HTML autonome déjà rempli (depuis la bibliothèque)
            document.getElementById('btn-export-html').addEventListener('click', () => {
                exportFilledWebsiteHtml();
            });

            // Export JSON (toutes les galaxies)
            document.getElementById('btn-export-json').addEventListener('click', () => {
                const payload = JSON.stringify({
                    version: 2,
                    exportedAt: new Date().toISOString(),
                    activeGalaxyId: state.activeGalaxyId,
                    galaxies: state.galaxies
                }, null, 2);
                const blob = new Blob([payload], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'portail-3d-sauvegarde.json';
                a.click();
                URL.revokeObjectURL(url);
                showToast('Sauvegarde JSON exportée.', 'success');
            });

            // Import JSON (compatible multi-galaxies et ancien format mono-galaxie)
            document.getElementById('input-import-json').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const parsed = JSON.parse(ev.target.result);
                        if (parsed && Array.isArray(parsed.galaxies) && parsed.galaxies.length > 0) {
                            state.galaxies = parsed.galaxies.map((g, idx) => ({
                                id: (typeof g.id === 'string' && g.id) ? g.id : `galaxy-${idx + 1}`,
                                name: (typeof g.name === 'string' && g.name.trim()) ? g.name.trim() : `Galaxie ${idx + 1}`,
                                color: g.color || ACCENT_COLORS[idx % ACCENT_COLORS.length].hex,
                                themeIndex: typeof g.themeIndex === 'number'
                                    ? ((g.themeIndex % THEMES.length) + THEMES.length) % THEMES.length
                                    : (idx % THEMES.length),
                                items: Array.isArray(g.items) ? g.items : []
                            }));
                            state.activeGalaxyId = parsed.activeGalaxyId || state.galaxies[0].id;
                            ensureDefaultGalaxy();
                            applyTheme(getActiveGalaxy().themeIndex, false);
                            saveState();
                            renderGalaxySwitcher();
                            renderGalaxyMenuList();
                            updateFilterButtonsUI();
                            rebuildCards3D();
                            renderManagerList();
                            showToast(`${state.galaxies.length} galaxie${state.galaxies.length > 1 ? 's' : ''} importée${state.galaxies.length > 1 ? 's' : ''} avec succès !`, 'success');
                        } else {
                            const importedItems = Array.isArray(parsed) ? parsed : parsed.items;
                            if (!Array.isArray(importedItems)) {
                                throw new Error('Format invalide');
                            }
                            setActiveItems(importedItems);
                            if (typeof parsed.themeIndex === 'number') {
                                applyTheme(parsed.themeIndex, false);
                            }
                            saveState();
                            renderGalaxyMenuList();
                            rebuildCards3D();
                            renderManagerList();
                            showToast(`${importedItems.length} cartes importées avec succès !`, 'success');
                        }
                    } catch {
                        showToast('Fichier JSON invalide ou corrompu.', 'error');
                    }
                    e.target.value = '';
                };
                reader.readAsText(file);
            });

            // Réinitialisation (vider la galaxie active)
            document.getElementById('btn-reset-demo').addEventListener('click', () => {
                const activeGalaxy = getActiveGalaxy();
                askConfirm(
                    `Vider ${activeGalaxy.name} ?`,
                    'Toutes les cartes de cette galaxie seront supprimées.',
                    () => {
                        setActiveItems([]);
                        state.filter = 'all';
                        saveState();
                        renderGalaxyMenuList();
                        updateFilterButtonsUI();
                        rebuildCards3D();
                        renderManagerList();
                        showToast(`${activeGalaxy.name} vidée.`, 'info');
                    }
                );
            });

            // --- Événements de la modale Éditeur ---
            document.getElementById('btn-close-editor').addEventListener('click', () => {
                document.getElementById('modal-editor').classList.add('hidden');
            });
            document.getElementById('btn-cancel-editor').addEventListener('click', () => {
                document.getElementById('modal-editor').classList.add('hidden');
            });
            document.getElementById('modal-editor').addEventListener('click', (e) => {
                if (e.target.id === 'modal-editor') {
                    document.getElementById('modal-editor').classList.add('hidden');
                }
            });

            document.querySelectorAll('.type-selector-btn').forEach(btn => {
                btn.addEventListener('click', () => setEditorType(btn.dataset.type));
            });

            // Zone Drag & Drop d'image
            const dropzone = document.getElementById('image-dropzone');
            const fileInput = document.getElementById('input-image-file');

            dropzone.addEventListener('click', (e) => {
                if (e.target.closest('#btn-remove-image')) return;
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    handleImageFile(e.target.files[0]);
                }
            });

            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('dropzone-active');
            });
            dropzone.addEventListener('dragleave', () => {
                dropzone.classList.remove('dropzone-active');
            });
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dropzone-active');
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleImageFile(e.dataTransfer.files[0]);
                }
            });

            document.getElementById('btn-remove-image').addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput.value = '';
                setEditorImagePreview(null, null);
            });

            // Zone Drag & Drop de fichier PDF
            const pdfDropzone = document.getElementById('pdf-dropzone');
            const pdfInput = document.getElementById('input-pdf-file');

            if (pdfDropzone && pdfInput) {
                pdfDropzone.addEventListener('click', (e) => {
                    if (e.target.closest('#btn-remove-pdf')) return;
                    pdfInput.click();
                });

                pdfInput.addEventListener('change', (e) => {
                    if (e.target.files && e.target.files[0]) {
                        handlePdfFile(e.target.files[0]);
                    }
                });

                pdfDropzone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    pdfDropzone.classList.add('dropzone-active');
                });
                pdfDropzone.addEventListener('dragleave', () => {
                    pdfDropzone.classList.remove('dropzone-active');
                });
                pdfDropzone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    pdfDropzone.classList.remove('dropzone-active');
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handlePdfFile(e.dataTransfer.files[0]);
                    }
                });
            }

            const removePdfBtn = document.getElementById('btn-remove-pdf');
            if (removePdfBtn) {
                removePdfBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (pdfInput) pdfInput.value = '';
                    setEditorPdfPreview(null, '', 0);
                });
            }

            // Génération d'aperçu automatique pour les sites web dans l'éditeur
            const urlInput = document.getElementById('input-url');
            const generateWebPreviewBtn = document.getElementById('btn-generate-web-preview');
            const webPreviewStatus = document.getElementById('web-preview-status');

            async function triggerEditorWebsitePreview(force = false) {
                if (!urlInput) return;
                const rawUrl = urlInput.value.trim();
                const validUrl = extractValidUrl(rawUrl);
                if (!validUrl) {
                    if (force) showToast('Veuillez saisir une adresse web valide.', 'error');
                    return;
                }
                const normalized = normalizeUrl(validUrl);

                const titleInput = document.getElementById('input-title');
                if (titleInput && !titleInput.value.trim()) {
                    titleInput.value = extractNiceTitleFromUrl(normalized);
                }

                if (!force && (state.editingImageData || editorLastAutoPreviewUrl === normalized)) {
                    return;
                }

                editorLastAutoPreviewUrl = normalized;
                const token = ++editorWebPreviewToken;
                if (generateWebPreviewBtn) {
                    generateWebPreviewBtn.disabled = true;
                    generateWebPreviewBtn.textContent = '⏳ Aperçu…';
                }
                if (webPreviewStatus) {
                    webPreviewStatus.textContent = 'Capture de l’aperçu du site en cours…';
                    webPreviewStatus.classList.remove('hidden');
                }

                try {
                    const preview = await fetchWebsitePreview(normalized);
                    if (token !== editorWebPreviewToken) return;
                    setEditorImagePreview(preview.dataUrl, preview.aspect);
                    if (webPreviewStatus) {
                        webPreviewStatus.textContent = 'Aperçu du site capturé avec succès.';
                    }
                    if (force) {
                        showToast('Aperçu du site généré !', 'success');
                    }
                } catch {
                    if (token !== editorWebPreviewToken) return;
                    if (webPreviewStatus) {
                        webPreviewStatus.textContent = 'Impossible de capturer l’aperçu automatiquement (vous pouvez ajouter une image manuellement).';
                    }
                    if (force) {
                        showToast('Impossible de capturer cet aperçu automatiquement.', 'error');
                    }
                } finally {
                    if (token === editorWebPreviewToken && generateWebPreviewBtn) {
                        generateWebPreviewBtn.disabled = false;
                        generateWebPreviewBtn.textContent = '✨ Aperçu';
                    }
                }
            }

            if (generateWebPreviewBtn) {
                generateWebPreviewBtn.addEventListener('click', () => triggerEditorWebsitePreview(true));
            }
            if (urlInput) {
                urlInput.addEventListener('blur', () => {
                    if (state.editingType === 'website') {
                        triggerEditorWebsitePreview(false);
                    }
                });
            }

            // Événements du lecteur Site Web intégré
            const closeWebBtn = document.getElementById('btn-close-web-viewer');
            if (closeWebBtn) {
                closeWebBtn.addEventListener('click', () => closeWebViewer());
            }
            const webModalEl = document.getElementById('modal-web-viewer');
            if (webModalEl) {
                webModalEl.addEventListener('click', (e) => {
                    if (e.target.id === 'modal-web-viewer') {
                        closeWebViewer();
                    }
                });
            }
            const fullscreenWebBtn = document.getElementById('btn-web-fullscreen');
            if (fullscreenWebBtn) {
                fullscreenWebBtn.addEventListener('click', () => {
                    if (!activeWebItem) return;
                    setWebFullscreen(!activeWebFullscreen);
                });
            }
            const reloadWebBtn = document.getElementById('btn-web-reload');
            if (reloadWebBtn) {
                reloadWebBtn.addEventListener('click', () => reloadWebViewer());
            }
            const externalWebBtn = document.getElementById('btn-web-external');
            if (externalWebBtn) {
                externalWebBtn.addEventListener('click', () => {
                    if (!activeWebItem || !activeWebItem.url) return;
                    window.open(normalizeUrl(activeWebItem.url), '_blank', 'noopener,noreferrer');
                });
            }

            // Événements du lecteur PDF
            const closePdfBtn = document.getElementById('btn-close-pdf-viewer');
            if (closePdfBtn) {
                closePdfBtn.addEventListener('click', closePdfViewer);
            }
            const pdfModalEl = document.getElementById('modal-pdf-viewer');
            if (pdfModalEl) {
                pdfModalEl.addEventListener('click', (e) => {
                    if (e.target.id === 'modal-pdf-viewer') {
                        closePdfViewer();
                    }
                });
            }
            const fitWidthBtn = document.getElementById('btn-pdf-fit-width');
            if (fitWidthBtn) {
                fitWidthBtn.addEventListener('click', () => {
                    if (!activePdfDoc) return;
                    activePdfFitMode = 'width';
                    activePdfZoom = 1.0;
                    updatePdfViewerToolbarUI();
                    renderActivePdfPages();
                });
            }
            const fitPageBtn = document.getElementById('btn-pdf-fit-page');
            if (fitPageBtn) {
                fitPageBtn.addEventListener('click', () => {
                    if (!activePdfDoc) return;
                    activePdfFitMode = 'page';
                    activePdfZoom = 1.0;
                    updatePdfViewerToolbarUI();
                    renderActivePdfPages();
                });
            }
            const fullscreenPdfBtn = document.getElementById('btn-pdf-fullscreen');
            if (fullscreenPdfBtn) {
                fullscreenPdfBtn.addEventListener('click', () => {
                    if (!activePdfDoc) return;
                    setPdfFullscreen(!activePdfFullscreen);
                    renderActivePdfPages();
                });
            }
            const zoomOutBtn = document.getElementById('btn-pdf-zoom-out');
            if (zoomOutBtn) {
                zoomOutBtn.addEventListener('click', () => {
                    if (!activePdfDoc) return;
                    activePdfZoom = Math.max(0.4, Math.round((activePdfZoom - 0.2) * 10) / 10);
                    updatePdfZoomLabel();
                    renderActivePdfPages();
                });
            }
            const zoomInBtn = document.getElementById('btn-pdf-zoom-in');
            if (zoomInBtn) {
                zoomInBtn.addEventListener('click', () => {
                    if (!activePdfDoc) return;
                    activePdfZoom = Math.min(3.0, Math.round((activePdfZoom + 0.2) * 10) / 10);
                    updatePdfZoomLabel();
                    renderActivePdfPages();
                });
            }
            // Zoom par pincement à deux doigts dans le lecteur PDF
            const pdfBodyEl = document.getElementById('pdf-viewer-body');
            const pdfPagesEl = document.getElementById('pdf-viewer-pages');
            if (pdfBodyEl && pdfPagesEl) {
                let pdfPinchStartDist = 0;
                let pdfPinchStartZoom = 1.0;
                let pdfPinchTargetZoom = 1.0;
                let isPdfPinching = false;

                pdfBodyEl.addEventListener('touchstart', (e) => {
                    if (!activePdfDoc || e.touches.length !== 2) return;
                    isPdfPinching = true;
                    pdfPinchStartDist = Math.hypot(
                        e.touches[1].clientX - e.touches[0].clientX,
                        e.touches[1].clientY - e.touches[0].clientY
                    );
                    pdfPinchStartZoom = activePdfZoom;
                    pdfPinchTargetZoom = activePdfZoom;
                    pdfPagesEl.style.transformOrigin = 'top center';
                }, { passive: true });

                pdfBodyEl.addEventListener('touchmove', (e) => {
                    if (!isPdfPinching || !activePdfDoc || e.touches.length !== 2 || pdfPinchStartDist <= 0) return;
                    e.preventDefault();
                    const dist = Math.hypot(
                        e.touches[1].clientX - e.touches[0].clientX,
                        e.touches[1].clientY - e.touches[0].clientY
                    );
                    const rawZoom = pdfPinchStartZoom * (dist / pdfPinchStartDist);
                    pdfPinchTargetZoom = Math.max(0.4, Math.min(3.0, rawZoom));
                    const previewScale = pdfPinchTargetZoom / Math.max(0.1, pdfPinchStartZoom);
                    pdfPagesEl.style.transform = `scale(${previewScale.toFixed(3)})`;
                    const zoomLabel = document.getElementById('pdf-zoom-label');
                    if (zoomLabel) zoomLabel.textContent = `${Math.round(pdfPinchTargetZoom * 100)}%`;
                }, { passive: false });

                const finishPdfPinch = () => {
                    if (!isPdfPinching) return;
                    isPdfPinching = false;
                    pdfPagesEl.style.transform = '';
                    pdfPagesEl.style.transformOrigin = '';
                    const rounded = Math.max(0.4, Math.min(3.0, Math.round(pdfPinchTargetZoom * 20) / 20));
                    if (activePdfDoc && Math.abs(rounded - activePdfZoom) >= 0.05) {
                        activePdfZoom = rounded;
                        updatePdfZoomLabel();
                        renderActivePdfPages();
                    } else {
                        updatePdfZoomLabel();
                    }
                };

                pdfBodyEl.addEventListener('touchend', (e) => {
                    if (e.touches.length < 2) finishPdfPinch();
                }, { passive: true });
                pdfBodyEl.addEventListener('touchcancel', finishPdfPinch, { passive: true });
            }
            const downloadPdfBtn = document.getElementById('btn-pdf-download');
            if (downloadPdfBtn) {
                downloadPdfBtn.addEventListener('click', () => {
                    if (!activePdfItem || !activePdfItem.pdfData) return;
                    const blobUrl = dataUrlToBlobUrl(activePdfItem.pdfData);
                    if (!blobUrl) return;
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = activePdfItem.pdfName || `${(activePdfItem.title || 'document').replace(/[^a-z0-9_-]+/gi, '_')}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                });
            }

            // Suppression depuis l'éditeur
            document.getElementById('btn-delete-card').addEventListener('click', () => {
                const id = document.getElementById('input-id').value;
                const item = getActiveItems().find(x => x.id === id);
                if (!item) return;

                askConfirm(
                    'Supprimer cette carte ?',
                    `« ${item.title} » sera retirée de votre page d’accueil 3D.`,
                    () => {
                        setActiveItems(getActiveItems().filter(x => x.id !== id));
                        saveState();
                        renderGalaxyMenuList();
                        document.getElementById('modal-editor').classList.add('hidden');
                        rebuildCards3D();
                        showToast('Carte supprimée.', 'info');
                    }
                );
            });

            // Enregistrement du formulaire
            document.getElementById('card-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const id = document.getElementById('input-id').value;
                const title = document.getElementById('input-title').value.trim();
                const rawUrl = document.getElementById('input-url').value.trim();
                const desc = document.getElementById('input-desc').value.trim();

                if (!title) {
                    showToast('Veuillez saisir un titre pour la carte.', 'error');
                    return;
                }

                // Si une image a été importée sans URL, enregistrer directement en tant qu'Image sans exiger d'URL
                let finalType = state.editingType;
                if (finalType === 'website' && !rawUrl) {
                    if (state.editingImageData) {
                        finalType = 'image';
                    } else {
                        showToast('Veuillez indiquer une URL ou passer en mode Image.', 'error');
                        return;
                    }
                }
                if (finalType === 'pdf' && !state.editingPdfData) {
                    showToast('Veuillez importer un fichier PDF.', 'error');
                    return;
                }

                const finalUrl = finalType === 'website' ? normalizeUrl(rawUrl) : '';
                const finalPdfData = finalType === 'pdf' ? state.editingPdfData : null;
                const finalPdfName = finalType === 'pdf' ? state.editingPdfName : '';
                const finalPdfSize = finalType === 'pdf' ? state.editingPdfSize : 0;
                const defaultArtStyle = finalType === 'image' ? 'planet' : (finalType === 'pdf' ? 'document' : 'rings');
                let savedId = id;
                const activeItems = getActiveItems();

                if (id) {
                    const existingIdx = activeItems.findIndex(x => x.id === id);
                    if (existingIdx !== -1) {
                        activeItems[existingIdx] = {
                            ...activeItems[existingIdx],
                            type: finalType,
                            title,
                            url: finalUrl,
                            description: desc,
                            color: state.editingColor,
                            imageData: state.editingImageData,
                            imageAspect: state.editingImageAspect,
                            pdfData: finalPdfData,
                            pdfName: finalPdfName,
                            pdfSize: finalPdfSize,
                            artStyle: defaultArtStyle
                        };
                    }
                    showToast('Carte mise à jour !', 'success');
                } else {
                    savedId = 'card-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
                    activeItems.push({
                        id: savedId,
                        type: finalType,
                        title,
                        url: finalUrl,
                        description: desc,
                        color: state.editingColor,
                        imageData: state.editingImageData,
                        imageAspect: state.editingImageAspect,
                        pdfData: finalPdfData,
                        pdfName: finalPdfName,
                        pdfSize: finalPdfSize,
                        artStyle: defaultArtStyle
                    });
                    showToast('Nouvelle carte ajoutée en 3D !', 'success');
                }

                // S'assurer que la nouvelle carte est visible si un filtre opposé était actif
                if (state.filter !== 'all' && state.filter !== finalType) {
                    state.filter = 'all';
                    updateFilterButtonsUI();
                }

                saveState();
                renderGalaxyMenuList();
                document.getElementById('modal-editor').classList.add('hidden');

                // Mettre immédiatement en zoom au premier plan si c'est une nouvelle image
                const focusAfterSave = (!id && finalType === 'image') ? savedId : null;
                rebuildCards3D(focusAfterSave);

                // Si c'est un site web sans aperçu personnalisé, générer automatiquement son aperçu en arrière-plan
                if (finalType === 'website' && finalUrl && !state.editingImageData) {
                    generateWebsitePreviewForItem(savedId, finalUrl);
                }
            });

            // Boîte de confirmation personnalisée
            document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
                state.confirmCallback = null;
                document.getElementById('modal-confirm').classList.add('hidden');
            });

            document.getElementById('btn-confirm-ok').addEventListener('click', () => {
                const cb = state.confirmCallback;
                state.confirmCallback = null;
                document.getElementById('modal-confirm').classList.add('hidden');
                if (typeof cb === 'function') cb();
            });

            setupQuickSearchEvents();
        }



        // =========================================================================
        // 9. UTILITAIRES MODALES, TOASTS & FORMATAGE
        // =========================================================================
        function isAnyModalOpen() {
            const editor = domCache.modalEditor || document.getElementById('modal-editor');
            const manager = domCache.modalManager || document.getElementById('modal-manager');
            const confirm = domCache.modalConfirm || document.getElementById('modal-confirm');
            const pdfViewer = domCache.modalPdfViewer || document.getElementById('modal-pdf-viewer');
            const webViewer = domCache.modalWebViewer || document.getElementById('modal-web-viewer');
            const searchModal = domCache.modalSearch || document.getElementById('modal-search');
            return (editor && !editor.classList.contains('hidden')) ||
                   (manager && !manager.classList.contains('hidden')) ||
                   (confirm && !confirm.classList.contains('hidden')) ||
                   (pdfViewer && !pdfViewer.classList.contains('hidden')) ||
                   (webViewer && !webViewer.classList.contains('hidden')) ||
                   (searchModal && !searchModal.classList.contains('hidden'));
        }

        function closeAllModals() {
            closeOptionsMenu();
            (domCache.modalEditor || document.getElementById('modal-editor')).classList.add('hidden');
            (domCache.modalManager || document.getElementById('modal-manager')).classList.add('hidden');
            (domCache.modalConfirm || document.getElementById('modal-confirm')).classList.add('hidden');
            closeSearchModal();
            closePdfViewer();
            closeWebViewer();
        }

        const lastMousePos = { x: null, y: null };
        window.addEventListener('pointerdown', (e) => {
            lastMousePos.x = e.clientX;
            lastMousePos.y = e.clientY;
        }, { passive: true });
        window.addEventListener('pointermove', (e) => {
            lastMousePos.x = e.clientX;
            lastMousePos.y = e.clientY;
        }, { passive: true });

        function askConfirm(title, message, onConfirm) {
            document.getElementById('confirm-title').textContent = title;
            document.getElementById('confirm-message').textContent = message;
            state.confirmCallback = onConfirm;

            const modal = document.getElementById('modal-confirm');
            const dialog = document.getElementById('confirm-dialog');
            modal.classList.remove('hidden');

            if (dialog) {
                const rect = dialog.getBoundingClientRect();
                const margin = 12;
                const targetX = lastMousePos.x !== null ? lastMousePos.x : window.innerWidth / 2;
                const targetY = lastMousePos.y !== null ? lastMousePos.y : window.innerHeight / 2;

                const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
                const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
                const left = Math.min(maxLeft, Math.max(margin, targetX - rect.width / 2));
                const top = Math.min(maxTop, Math.max(margin, targetY - rect.height / 2));

                dialog.style.left = `${Math.round(left)}px`;
                dialog.style.top = `${Math.round(top)}px`;
            }
        }

        function showToast(message, type = 'info') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            const colors = {
                success: 'border-emerald-400/40 bg-emerald-950/85 text-emerald-200',
                error: 'border-rose-400/40 bg-rose-950/85 text-rose-200',
                info: 'border-sky-400/40 bg-slate-900/90 text-sky-100'
            };
            toast.className = `animate-modal pointer-events-auto px-4 py-2.5 rounded-2xl border backdrop-blur-md shadow-xl text-xs font-semibold ${colors[type] || colors.info}`;
            toast.textContent = message;
            container.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-6px)';
                toast.style.transition = 'all 0.25s ease';
                setTimeout(() => toast.remove(), 260);
            }, 3000);
        }

        function normalizeUrl(url) {
            if (!url) return '';
            const trimmed = url.trim();
            if (/^https?:\/\//i.test(trimmed)) return trimmed;
            return 'https://' + trimmed;
        }

        function extractDomain(url) {
            try {
                return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '');
            } catch {
                return url || '';
            }
        }

        function hexToRgba(hex, alpha) {
            const clean = (hex || '#0ea5e9').replace('#', '');
            const r = parseInt(clean.substring(0, 2), 16) || 14;
            const g = parseInt(clean.substring(2, 4), 16) || 165;
            const b = parseInt(clean.substring(4, 6), 16) || 233;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        function truncateText(ctx, text, maxWidth) {
            if (ctx.measureText(text).width <= maxWidth) return text;
            let trimmed = text;
            while (trimmed.length > 0 && ctx.measureText(trimmed + '…').width > maxWidth) {
                trimmed = trimmed.slice(0, -1);
            }
            return trimmed + '…';
        }

        function escapeHtml(str) {
            return String(str || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }
