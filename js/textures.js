        // =========================================================================
        // 3. GÉNÉRATION DE TEXTURES HAUTE DÉFINITION POUR LES CARTES 3D
        // =========================================================================
        function drawRoundedRectPath(ctx, x, y, w, h, r) {
            const radius = Math.min(r, w / 2, h / 2);
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.arcTo(x + w, y, x + w, y + h, radius);
            ctx.arcTo(x + w, y + h, x, y + h, radius);
            ctx.arcTo(x, y + h, x, y, radius);
            ctx.arcTo(x, y, x + w, y, radius);
            ctx.closePath();
        }

        /**
         * Dessine un visuel abstrait élégant lorsqu'aucune image personnalisée n'est fournie
         */
        function drawProceduralArt(ctx, w, h, item) {
            const accent = item.color || '#0ea5e9';
            const bgGrad = ctx.createLinearGradient(0, 0, w, h);
            bgGrad.addColorStop(0, '#0f172a');
            bgGrad.addColorStop(0.55, '#131d35');
            bgGrad.addColorStop(1, '#090d1a');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, w, h);

            // Halo lumineux principal
            const glow1 = ctx.createRadialGradient(w * 0.72, h * 0.28, 10, w * 0.72, h * 0.28, w * 0.7);
            glow1.addColorStop(0, hexToRgba(accent, 0.55));
            glow1.addColorStop(0.55, hexToRgba(accent, 0.14));
            glow1.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow1;
            ctx.fillRect(0, 0, w, h);

            const glow2 = ctx.createRadialGradient(w * 0.2, h * 0.82, 10, w * 0.2, h * 0.82, w * 0.55);
            glow2.addColorStop(0, hexToRgba(accent, 0.28));
            glow2.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow2;
            ctx.fillRect(0, 0, w, h);

            const style = item.artStyle || (item.type === 'image' ? 'planet' : (item.type === 'pdf' ? 'document' : 'rings'));
            ctx.save();

            if (style === 'document') {
                const docW = Math.min(w, h) * 0.44;
                const docH = docW * 1.28;
                const docX = (w - docW) / 2;
                const docY = h * 0.41 - docH / 2;
                const fold = docW * 0.24;
                const r = Math.max(8, docW * 0.08);

                // Feuille de document stylisée avec coin plié
                ctx.beginPath();
                ctx.moveTo(docX + r, docY);
                ctx.lineTo(docX + docW - fold, docY);
                ctx.lineTo(docX + docW, docY + fold);
                ctx.lineTo(docX + docW, docY + docH - r);
                ctx.arcTo(docX + docW, docY + docH, docX + docW - r, docY + docH, r);
                ctx.lineTo(docX + r, docY + docH);
                ctx.arcTo(docX, docY + docH, docX, docY + docH - r, r);
                ctx.lineTo(docX, docY + r);
                ctx.arcTo(docX, docY, docX + r, docY, r);
                ctx.closePath();

                const docGrad = ctx.createLinearGradient(docX, docY, docX + docW, docY + docH);
                docGrad.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
                docGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
                ctx.fillStyle = docGrad;
                ctx.fill();
                ctx.strokeStyle = hexToRgba(accent, 0.75);
                ctx.lineWidth = Math.max(2, w * 0.0045);
                ctx.stroke();

                // Coin plié
                ctx.beginPath();
                ctx.moveTo(docX + docW - fold, docY);
                ctx.lineTo(docX + docW - fold, docY + fold);
                ctx.lineTo(docX + docW, docY + fold);
                ctx.closePath();
                ctx.fillStyle = hexToRgba(accent, 0.35);
                ctx.fill();

                // Lignes de texte décoratives
                const lineX = docX + docW * 0.16;
                const lineW = docW * 0.68;
                for (let l = 0; l < 3; l++) {
                    const ly = docY + docH * (0.58 + l * 0.11);
                    const lw = l === 2 ? lineW * 0.62 : lineW;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
                    drawRoundedRectPath(ctx, lineX, ly, lw, Math.max(4, docH * 0.032), 4);
                    ctx.fill();
                }

                // Badge "PDF" central
                const badgeW = docW * 0.56;
                const badgeH = docH * 0.22;
                const badgeX = w * 0.5 - badgeW / 2;
                const badgeY = docY + docH * 0.24;
                drawRoundedRectPath(ctx, badgeX, badgeY, badgeW, badgeH, badgeH * 0.28);
                ctx.fillStyle = hexToRgba(accent, 0.85);
                ctx.fill();

                ctx.font = `800 ${Math.round(badgeH * 0.62)}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ffffff';
                ctx.fillText('PDF', w * 0.5, badgeY + badgeH * 0.52);
            } else if (style === 'planet') {
                const cx = w * 0.5;
                const cy = h * 0.44;
                const rad = Math.min(w, h) * 0.24;

                const sphereGrad = ctx.createRadialGradient(cx - rad * 0.35, cy - rad * 0.35, rad * 0.08, cx, cy, rad);
                sphereGrad.addColorStop(0, '#ffffff');
                sphereGrad.addColorStop(0.25, accent);
                sphereGrad.addColorStop(1, '#0b1120');

                ctx.fillStyle = sphereGrad;
                ctx.beginPath();
                ctx.arc(cx, cy, rad, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = hexToRgba('#ffffff', 0.35);
                ctx.lineWidth = Math.max(2, w * 0.004);
                ctx.beginPath();
                ctx.ellipse(cx, cy, rad * 1.7, rad * 0.42, -0.26, 0, Math.PI * 2);
                ctx.stroke();
            } else if (style === 'waves') {
                for (let k = 0; k < 5; k++) {
                    ctx.beginPath();
                    const yBase = h * (0.28 + k * 0.11);
                    ctx.moveTo(0, yBase);
                    for (let x = 0; x <= w; x += 24) {
                        const y = yBase + Math.sin((x / w) * Math.PI * 2.5 + k * 0.9) * (h * 0.055);
                        ctx.lineTo(x, y);
                    }
                    ctx.strokeStyle = hexToRgba(accent, 0.18 + k * 0.1);
                    ctx.lineWidth = Math.max(2, w * 0.0045);
                    ctx.stroke();
                }
            } else if (style === 'grid') {
                ctx.strokeStyle = hexToRgba(accent, 0.18);
                ctx.lineWidth = 1.5;
                const step = Math.round(w / 10);
                for (let x = step; x < w; x += step) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, h);
                    ctx.stroke();
                }
                for (let y = step; y < h; y += step) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(w, y);
                    ctx.stroke();
                }
            } else {
                const cx = w * 0.5;
                const cy = h * 0.42;
                for (let r = 1; r <= 4; r++) {
                    ctx.beginPath();
                    ctx.arc(cx, cy, Math.min(w, h) * (0.11 * r), 0, Math.PI * 2);
                    ctx.strokeStyle = hexToRgba(accent, 0.42 - r * 0.07);
                    ctx.lineWidth = Math.max(2, w * 0.0035);
                    ctx.stroke();
                }
            }
            ctx.restore();

            // Monogramme central subtil pour les sites web sans image
            if (item.type === 'website') {
                const initial = (item.title || '?').trim().charAt(0).toUpperCase();
                ctx.save();
                ctx.font = `800 ${Math.round(Math.min(w, h) * 0.28)}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
                ctx.shadowColor = hexToRgba(accent, 0.7);
                ctx.shadowBlur = 32;
                ctx.fillText(initial, w * 0.5, h * 0.42);
                ctx.restore();
            }
        }

        // Cache persistant des textures de cartes (évite de redessiner / redécoder les cartes inchangées)
        const cardTextureCache = new Map();
        const MAX_CACHED_TEXTURES = 64;
        let textureUseCounter = 0;

        function getCardTextureSignature(item) {
            return [
                item.type || '',
                item.title || '',
                item.url || '',
                item.description || '',
                item.color || '',
                item.artStyle || '',
                item.imageAspect || '',
                item.pdfName || '',
                item.pdfSize || 0
            ].join('\u001f');
        }

        function disposeTextureEntry(entry) {
            if (!entry || entry.disposed) return;
            entry.disposed = true;
            if (entry.texture) {
                entry.texture.dispose();
            }
        }

        function pruneCardTextureCache(visibleIds = null) {
            const validIds = new Set();
            for (let g = 0; g < state.galaxies.length; g++) {
                const items = state.galaxies[g].items;
                if (!Array.isArray(items)) continue;
                for (let i = 0; i < items.length; i++) {
                    if (items[i] && items[i].id) validIds.add(items[i].id);
                }
            }

            // Libérer immédiatement les textures des cartes supprimées
            for (const [id, entry] of cardTextureCache.entries()) {
                if (!validIds.has(id)) {
                    disposeTextureEntry(entry);
                    cardTextureCache.delete(id);
                }
            }

            // Borner la mémoire VRAM si un très grand nombre de cartes hors-écran sont en cache (LRU)
            if (cardTextureCache.size > MAX_CACHED_TEXTURES) {
                const evictable = [];
                for (const [id, entry] of cardTextureCache.entries()) {
                    if (!visibleIds || !visibleIds.has(id)) {
                        evictable.push([id, entry]);
                    }
                }
                evictable.sort((a, b) => a[1].lastUsed - b[1].lastUsed);
                let excess = cardTextureCache.size - MAX_CACHED_TEXTURES;
                for (let i = 0; i < evictable.length && excess > 0; i++) {
                    const [id, entry] = evictable[i];
                    disposeTextureEntry(entry);
                    cardTextureCache.delete(id);
                    excess--;
                }
            }
        }

        /**
         * Retourne une texture Canvas haute définition (depuis le cache si inchangée)
         * et les dimensions 3D respectant le ratio réel
         */
        function createCardTexture(item) {
            const sig = getCardTextureSignature(item);
            const imgData = item.imageData || null;
            const cacheId = item.id || null;

            if (cacheId) {
                const cached = cardTextureCache.get(cacheId);
                if (cached && !cached.disposed) {
                    if (cached.sig === sig && cached.imageData === imgData) {
                        cached.lastUsed = ++textureUseCounter;
                        return cached;
                    }
                    disposeTextureEntry(cached);
                    cardTextureCache.delete(cacheId);
                }
            }

            const hasUserImg = Boolean(imgData);
            const rawAspect = item.imageAspect || (item.type === 'image' ? 1.45 : (item.type === 'pdf' ? 0.78 : 1.35));
            const aspect = Math.max(0.55, Math.min(2.2, rawAspect));

            // Dimensions haute netteté pour un zoom plein écran net (~92%)
            const maxPx = hasUserImg ? 1400 : 1024;
            let cw, ch;
            if (aspect >= 1) {
                cw = maxPx;
                ch = Math.round(maxPx / aspect);
            } else {
                ch = maxPx;
                cw = Math.round(maxPx * aspect);
            }

            // Dimensions 3D proportionnelles à aire équilibrée
            const baseArea = 7.2;
            const width3D = Math.sqrt(baseArea * aspect);
            const height3D = width3D / aspect;

            const canvas = document.createElement('canvas');
            canvas.width = cw;
            canvas.height = ch;
            const ctx = canvas.getContext('2d');

            const texture = new THREE.CanvasTexture(canvas);
            texture.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;

            const entry = {
                sig,
                imageData: imgData,
                texture,
                width3D,
                height3D,
                disposed: false,
                lastUsed: ++textureUseCounter
            };

            const drawCardFrame = (accentAlpha) => {
                const radius = Math.round(Math.min(cw, ch) * 0.045);
                ctx.save();
                drawRoundedRectPath(ctx, 2, 2, cw - 4, ch - 4, radius);
                ctx.strokeStyle = hexToRgba(item.color || '#38bdf8', accentAlpha);
                ctx.lineWidth = Math.max(3, Math.round(Math.min(cw, ch) * 0.006));
                ctx.stroke();
                ctx.restore();
            };

            const renderCardCanvas = (loadedImg) => {
                if (entry.disposed) return;

                ctx.clearRect(0, 0, cw, ch);
                const radius = Math.round(Math.min(cw, ch) * 0.045);

                ctx.save();
                drawRoundedRectPath(ctx, 2, 2, cw - 4, ch - 4, radius);
                ctx.clip();

                if (loadedImg) {
                    // Dessiner l'image en haute netteté plein cadre sans bandeau opaque au centre
                    const imgRatio = loadedImg.naturalWidth / Math.max(1, loadedImg.naturalHeight);
                    const canvasRatio = cw / ch;
                    let drawW = cw;
                    let drawH = ch;
                    let dx = 0;
                    let dy = 0;

                    if (imgRatio > canvasRatio) {
                        drawW = ch * imgRatio;
                        dx = (cw - drawW) / 2;
                    } else {
                        drawH = cw / imgRatio;
                        dy = (ch - drawH) / 2;
                    }
                    ctx.drawImage(loadedImg, dx, dy, drawW, drawH);
                } else {
                    drawProceduralArt(ctx, cw, ch, item);
                }

                // Légende élégante en bas uniquement pour les sites web ou les cartes sans image
                if (item.type === 'website' || !loadedImg) {
                    const footerH = Math.round(ch * 0.27);
                    const grad = ctx.createLinearGradient(0, ch - footerH * 1.35, 0, ch);
                    grad.addColorStop(0, 'rgba(5, 8, 22, 0)');
                    grad.addColorStop(0.45, 'rgba(5, 8, 22, 0.72)');
                    grad.addColorStop(1, 'rgba(5, 8, 22, 0.94)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, ch - footerH * 1.35, cw, footerH * 1.35);

                    const padX = Math.round(cw * 0.055);
                    const titleSize = Math.round(Math.min(cw, ch) * 0.072);
                    const subSize = Math.round(Math.min(cw, ch) * 0.038);

                    ctx.fillStyle = '#ffffff';
                    ctx.font = `700 ${titleSize}px Inter, sans-serif`;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'bottom';
                    const titleY = ch - Math.round(ch * 0.095);
                    ctx.fillText(truncateText(ctx, item.title || 'Sans titre', cw - padX * 2), padX, titleY);

                    const subText = item.type === 'website'
                        ? (extractDomain(item.url) || item.description || '')
                        : (item.type === 'pdf'
                            ? (item.description || item.pdfName || 'Document PDF')
                            : (item.description || ''));
                    if (subText) {
                        ctx.fillStyle = 'rgba(203, 213, 225, 0.88)';
                        ctx.font = `500 ${subSize}px Inter, sans-serif`;
                        ctx.fillText(truncateText(ctx, subText, cw - padX * 2), padX, ch - Math.round(ch * 0.042));
                    }
                }

                // Reflet de bord supérieur discret
                const sheen = ctx.createLinearGradient(0, 0, 0, ch * 0.25);
                sheen.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
                sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = sheen;
                ctx.fillRect(0, 0, cw, ch * 0.25);

                ctx.restore();

                // Bordure lumineuse subtile
                drawCardFrame(loadedImg ? 0.45 : 0.65);

                texture.needsUpdate = true;
            };

            if (hasUserImg) {
                // Fond léger instantané pendant le décodage asynchrone (évite le double rendu procédural coûteux)
                const radius = Math.round(Math.min(cw, ch) * 0.045);
                ctx.save();
                drawRoundedRectPath(ctx, 2, 2, cw - 4, ch - 4, radius);
                ctx.fillStyle = '#0f172a';
                ctx.fill();
                ctx.restore();
                drawCardFrame(0.45);
                texture.needsUpdate = true;

                const img = new Image();
                img.onload = () => {
                    img.onload = null;
                    img.onerror = null;
                    renderCardCanvas(img);
                };
                img.onerror = () => {
                    img.onload = null;
                    img.onerror = null;
                    renderCardCanvas(null);
                };
                img.src = imgData;
            } else {
                renderCardCanvas(null);
            }

            if (cacheId) {
                cardTextureCache.set(cacheId, entry);
            }

            return entry;
        }

