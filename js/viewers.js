        // =========================================================================
        // 7. MODALE D'ÉDITION / AJOUT DE CARTE
        // =========================================================================
        function openEditorModal(item = null) {
            closeOptionsMenu();
            const modal = document.getElementById('modal-editor');
            const titleEl = document.getElementById('editor-modal-title');
            const deleteBtn = document.getElementById('btn-delete-card');

            document.getElementById('input-id').value = item ? item.id : '';
            document.getElementById('input-title').value = item ? (item.title || '') : '';
            document.getElementById('input-url').value = item ? (item.url || '') : '';
            document.getElementById('input-desc').value = item ? (item.description || '') : '';
            document.getElementById('input-image-file').value = '';
            const pdfInput = document.getElementById('input-pdf-file');
            if (pdfInput) pdfInput.value = '';
            const webPreviewStatus = document.getElementById('web-preview-status');
            if (webPreviewStatus) {
                webPreviewStatus.textContent = '';
                webPreviewStatus.classList.add('hidden');
            }
            editorLastAutoPreviewUrl = item && item.url ? normalizeUrl(item.url) : '';

            if (item) {
                titleEl.textContent = 'Modifier la carte 3D';
                deleteBtn.classList.remove('hidden');
                setEditorType(item.type || 'website');
                setEditorColor(item.color || ACCENT_COLORS[0].hex);
                setEditorImagePreview(item.imageData || null, item.imageAspect || null);
                setEditorPdfPreview(item.pdfData || null, item.pdfName || '', item.pdfSize || 0);
            } else {
                titleEl.textContent = 'Ajouter une carte 3D';
                deleteBtn.classList.add('hidden');
                setEditorType('website');
                setEditorColor(ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)].hex);
                setEditorImagePreview(null, null);
                setEditorPdfPreview(null, '', 0);
            }

            modal.classList.remove('hidden');
        }

        function setEditorType(type) {
            state.editingType = (type === 'image' || type === 'pdf') ? type : 'website';
            const urlWrapper = document.getElementById('field-url-wrapper');
            const pdfWrapper = document.getElementById('field-pdf-wrapper');
            const hint = document.getElementById('image-requirement-hint');

            document.querySelectorAll('.type-selector-btn').forEach(btn => {
                const active = btn.dataset.type === state.editingType;
                btn.classList.toggle('border-sky-500', active);
                btn.classList.toggle('bg-sky-500/15', active);
                btn.classList.toggle('border-white/10', !active);
                btn.classList.toggle('bg-white/5', !active);
            });

            if (urlWrapper) {
                urlWrapper.classList.toggle('hidden', state.editingType !== 'website');
            }
            if (pdfWrapper) {
                pdfWrapper.classList.toggle('hidden', state.editingType !== 'pdf');
            }
            if (hint) {
                if (state.editingType === 'image') {
                    hint.textContent = '(glissez votre image — aucune URL requise)';
                } else if (state.editingType === 'pdf') {
                    hint.textContent = '(couverture 3D générée automatiquement ou personnalisée)';
                } else {
                    hint.textContent = '(aperçu du site généré automatiquement, ou image personnalisée)';
                }
            }
        }

        function setEditorColor(hex) {
            state.editingColor = hex || ACCENT_COLORS[0].hex;
            const container = document.getElementById('color-swatches');
            if (!container) return;
            container.innerHTML = '';

            ACCENT_COLORS.forEach(col => {
                const active = col.hex.toLowerCase() === state.editingColor.toLowerCase();
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.title = col.name;
                btn.className = `w-7 h-7 rounded-full transition-transform ${active ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-80 hover:opacity-100 hover:scale-105'}`;
                btn.style.backgroundColor = col.hex;
                btn.addEventListener('click', () => setEditorColor(col.hex));
                container.appendChild(btn);
            });
        }

        function setEditorImagePreview(dataUrl, aspect) {
            state.editingImageData = dataUrl || null;
            state.editingImageAspect = aspect || null;

            const placeholder = document.getElementById('dropzone-placeholder');
            const previewWrap = document.getElementById('dropzone-preview-wrapper');
            const previewImg = document.getElementById('dropzone-preview');

            if (dataUrl) {
                previewImg.src = dataUrl;
                placeholder.classList.add('hidden');
                previewWrap.classList.remove('hidden');
            } else {
                previewImg.src = '';
                previewWrap.classList.add('hidden');
                placeholder.classList.remove('hidden');
            }
        }

        function formatFileSize(bytes) {
            if (!bytes || bytes < 0) return '0 Ko';
            if (bytes < 1024) return `${bytes} o`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
            return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
        }

        function setEditorPdfPreview(pdfData, pdfName, pdfSize) {
            state.editingPdfData = pdfData || null;
            state.editingPdfName = pdfName || '';
            state.editingPdfSize = typeof pdfSize === 'number' ? pdfSize : 0;

            const placeholder = document.getElementById('pdf-dropzone-placeholder');
            const loadedWrap = document.getElementById('pdf-dropzone-loaded');
            const nameEl = document.getElementById('pdf-file-name');
            const sizeEl = document.getElementById('pdf-file-size');

            if (pdfData) {
                if (nameEl) nameEl.textContent = state.editingPdfName || 'document.pdf';
                if (sizeEl) sizeEl.textContent = formatFileSize(state.editingPdfSize);
                if (placeholder) placeholder.classList.add('hidden');
                if (loadedWrap) loadedWrap.classList.remove('hidden');
            } else {
                if (nameEl) nameEl.textContent = '';
                if (sizeEl) sizeEl.textContent = '';
                if (loadedWrap) loadedWrap.classList.add('hidden');
                if (placeholder) placeholder.classList.remove('hidden');
            }
        }

        function isPdfFile(file) {
            return Boolean(file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')));
        }

        function readPdfFile(file) {
            return new Promise((resolve, reject) => {
                if (!isPdfFile(file)) {
                    reject(new Error('Format non pris en charge'));
                    return;
                }
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const result = ev.target && ev.target.result;
                    if (typeof result !== 'string' || !result.startsWith('data:')) {
                        reject(new Error('PDF illisible'));
                        return;
                    }
                    const pdfData = result.startsWith('data:application/pdf')
                        ? result
                        : result.replace(/^data:[^;]*;/, 'data:application/pdf;');
                    const cleanName = (file.name || 'Document PDF')
                        .replace(/\.pdf$/i, '')
                        .replace(/[_-]+/g, ' ')
                        .trim()
                        .slice(0, 45) || 'Document PDF';
                    resolve({
                        pdfData,
                        pdfName: file.name || 'document.pdf',
                        pdfSize: file.size || 0,
                        cleanName
                    });
                };
                reader.onerror = () => reject(new Error('Erreur de lecture du PDF'));
                reader.readAsDataURL(file);
            });
        }

        function dataUrlToUint8Array(dataUrl) {
            const parts = String(dataUrl || '').split(',');
            if (parts.length < 2) return null;
            const binary = atob(parts[1]);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
        }

        async function loadPdfDocument(pdfData) {
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js indisponible');
            }
            const bytes = dataUrlToUint8Array(pdfData);
            if (!bytes) {
                throw new Error('Données PDF invalides');
            }
            if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                const hasLocalVendor = Boolean(document.querySelector('script[src^="vendor/"]'));
                pdfjsLib.GlobalWorkerOptions.workerSrc = hasLocalVendor
                    ? 'vendor/pdf.worker.min.js'
                    : 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
            try {
                return await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
            } catch {
                // Repli sans worker si le navigateur bloque les workers externes (ex. file://)
                return await pdfjsLib.getDocument({ data: bytes.slice(), disableWorker: true }).promise;
            }
        }

        async function renderPdfFirstPagePreview(pdfData) {
            const pdfDoc = await loadPdfDocument(pdfData);
            try {
                const page = await pdfDoc.getPage(1);
                const baseViewport = page.getViewport({ scale: 1 });
                const maxDim = 1200;
                const scale = maxDim / Math.max(1, baseViewport.width, baseViewport.height);
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(viewport.width));
                canvas.height = Math.max(1, Math.round(viewport.height));
                const ctx = canvas.getContext('2d');

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                await page.render({ canvasContext: ctx, viewport }).promise;

                let dataUrl;
                try {
                    dataUrl = canvas.toDataURL('image/webp', 0.86);
                    if (!dataUrl.startsWith('data:image/webp')) {
                        dataUrl = canvas.toDataURL('image/jpeg', 0.86);
                    }
                } catch {
                    dataUrl = canvas.toDataURL('image/jpeg', 0.86);
                }

                return {
                    dataUrl,
                    aspect: canvas.width / Math.max(1, canvas.height),
                    numPages: pdfDoc.numPages || 1
                };
            } finally {
                pdfDoc.destroy();
            }
        }

        function handlePdfFile(file) {
            if (!isPdfFile(file)) {
                showToast('Veuillez sélectionner un fichier PDF valide.', 'error');
                return;
            }

            readPdfFile(file)
                .then(async ({ pdfData, pdfName, pdfSize, cleanName }) => {
                    setEditorPdfPreview(pdfData, pdfName, pdfSize);
                    setEditorType('pdf');

                    const titleInput = document.getElementById('input-title');
                    if (titleInput && !titleInput.value.trim()) {
                        titleInput.value = cleanName;
                    }

                    // Générer automatiquement l'aperçu de la première page pour la carte 3D
                    try {
                        const preview = await renderPdfFirstPagePreview(pdfData);
                        setEditorImagePreview(preview.dataUrl, preview.aspect);
                        showToast(`PDF « ${pdfName} » chargé avec aperçu de la page 1.`, 'success');
                    } catch {
                        showToast(`PDF « ${pdfName} » chargé et prêt pour l'export.`, 'success');
                    }
                })
                .catch(() => {
                    showToast('Impossible de lire ce fichier PDF.', 'error');
                });
        }

        let activePdfDoc = null;
        let activePdfItem = null;
        let activePdfZoom = 1.0;
        let activePdfFitMode = 'width'; // 'width' | 'page' | 'custom'
        let activePdfFullscreen = false;
        let activePdfRenderToken = 0;

        function dataUrlToBlobUrl(dataUrl) {
            const parts = String(dataUrl || '').split(',');
            if (parts.length < 2) return null;
            const mimeMatch = parts[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
            const bytes = dataUrlToUint8Array(dataUrl);
            if (!bytes) return null;
            return URL.createObjectURL(new Blob([bytes], { type: mime }));
        }

        function updatePdfZoomLabel() {
            const label = document.getElementById('pdf-zoom-label');
            if (label) {
                label.textContent = `${Math.round(activePdfZoom * 100)}%`;
            }
        }

        function updatePdfViewerToolbarUI() {
            const widthBtn = document.getElementById('btn-pdf-fit-width');
            const pageBtn = document.getElementById('btn-pdf-fit-page');
            const fsBtn = document.getElementById('btn-pdf-fullscreen');

            const setBtnActive = (btn, active) => {
                if (!btn) return;
                btn.classList.toggle('bg-sky-500/30', active);
                btn.classList.toggle('text-sky-200', active);
                btn.classList.toggle('border', active);
                btn.classList.toggle('border-sky-400/40', active);
                btn.classList.toggle('bg-white/10', !active);
                btn.classList.toggle('text-slate-200', !active);
            };

            setBtnActive(widthBtn, activePdfFitMode === 'width');
            setBtnActive(pageBtn, activePdfFitMode === 'page');
            setBtnActive(fsBtn, activePdfFullscreen);
            if (fsBtn) {
                fsBtn.textContent = activePdfFullscreen ? '🗗 Réduire' : '⛶ Plein écran';
            }
            updatePdfZoomLabel();
        }

        function setPdfFullscreen(enabled) {
            activePdfFullscreen = Boolean(enabled);
            const modal = domCache.modalPdfViewer || document.getElementById('modal-pdf-viewer');
            const dialog = document.getElementById('pdf-viewer-dialog');
            if (modal) {
                modal.classList.toggle('p-0', activePdfFullscreen);
                modal.classList.toggle('p-2', !activePdfFullscreen);
                modal.classList.toggle('sm:p-5', !activePdfFullscreen);
            }
            if (dialog) {
                dialog.classList.toggle('max-w-none', activePdfFullscreen);
                dialog.classList.toggle('h-full', activePdfFullscreen);
                dialog.classList.toggle('rounded-none', activePdfFullscreen);
                dialog.classList.toggle('max-w-5xl', !activePdfFullscreen);
                dialog.classList.toggle('h-[92vh]', !activePdfFullscreen);
                dialog.classList.toggle('rounded-3xl', !activePdfFullscreen);
            }
            updatePdfViewerToolbarUI();
        }

        async function renderActivePdfPages() {
            if (!activePdfDoc) return;
            const token = ++activePdfRenderToken;
            const pagesEl = document.getElementById('pdf-viewer-pages');
            const bodyEl = document.getElementById('pdf-viewer-body');
            if (!pagesEl) return;

            pagesEl.innerHTML = '';
            const padX = activePdfFullscreen ? 24 : 48;
            const padY = activePdfFullscreen ? 24 : 48;
            const availableWidth = Math.max(280, (bodyEl ? bodyEl.clientWidth - padX : 800));
            const availableHeight = Math.max(240, (bodyEl ? bodyEl.clientHeight - padY : 600));
            const dpr = Math.min(window.devicePixelRatio || 1, 2);

            for (let pageNum = 1; pageNum <= activePdfDoc.numPages; pageNum++) {
                if (token !== activePdfRenderToken) return;
                const page = await activePdfDoc.getPage(pageNum);
                if (token !== activePdfRenderToken) return;

                const baseViewport = page.getViewport({ scale: 1 });
                let fitScale;
                if (activePdfFitMode === 'width') {
                    fitScale = availableWidth / Math.max(1, baseViewport.width);
                } else if (activePdfFitMode === 'page') {
                    fitScale = Math.min(
                        availableWidth / Math.max(1, baseViewport.width),
                        availableHeight / Math.max(1, baseViewport.height)
                    );
                } else {
                    fitScale = Math.min(1.5, availableWidth / Math.max(1, baseViewport.width));
                }

                const cssScale = Math.max(0.2, fitScale * activePdfZoom);
                const cssViewport = page.getViewport({ scale: cssScale });
                const renderViewport = page.getViewport({ scale: cssScale * dpr });

                const wrapper = document.createElement('div');
                wrapper.className = 'relative rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-white';

                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(renderViewport.width));
                canvas.height = Math.max(1, Math.round(renderViewport.height));
                canvas.style.width = `${Math.round(cssViewport.width)}px`;
                canvas.style.height = `${Math.round(cssViewport.height)}px`;
                canvas.className = 'block';

                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                wrapper.appendChild(canvas);
                pagesEl.appendChild(wrapper);

                await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
            }
        }

        async function openPdfViewer(item) {
            if (!item || !item.pdfData) {
                showToast('Aucun fichier PDF associé à cette carte.', 'error');
                return;
            }
            closePdfViewer();

            activePdfItem = item;
            activePdfZoom = 1.0;
            activePdfFitMode = 'width';
            setPdfFullscreen(false);

            const modal = domCache.modalPdfViewer || document.getElementById('modal-pdf-viewer');
            const titleEl = document.getElementById('pdf-viewer-title');
            const metaEl = document.getElementById('pdf-viewer-meta');
            const loadingEl = document.getElementById('pdf-viewer-loading');
            const pagesEl = document.getElementById('pdf-viewer-pages');

            if (titleEl) titleEl.textContent = item.title || item.pdfName || 'Document PDF';
            if (metaEl) {
                const metaParts = [];
                if (item.pdfName) metaParts.push(item.pdfName);
                if (item.pdfSize) metaParts.push(formatFileSize(item.pdfSize));
                metaEl.textContent = metaParts.join(' — ');
            }
            if (pagesEl) pagesEl.innerHTML = '';
            if (loadingEl) loadingEl.classList.remove('hidden');
            if (modal) modal.classList.remove('hidden');

            const token = ++activePdfRenderToken;
            try {
                const pdfDoc = await loadPdfDocument(item.pdfData);
                if (token !== activePdfRenderToken) {
                    pdfDoc.destroy();
                    return;
                }
                activePdfDoc = pdfDoc;
                if (metaEl) {
                    const metaParts = [];
                    if (item.pdfName) metaParts.push(item.pdfName);
                    if (item.pdfSize) metaParts.push(formatFileSize(item.pdfSize));
                    metaParts.push(`${pdfDoc.numPages} page${pdfDoc.numPages > 1 ? 's' : ''}`);
                    metaEl.textContent = metaParts.join(' — ');
                }
                if (loadingEl) loadingEl.classList.add('hidden');
                await renderActivePdfPages();
            } catch {
                if (loadingEl) loadingEl.classList.add('hidden');
                showToast('Impossible d’afficher ce document PDF.', 'error');
            }
        }

        function closePdfViewer() {
            activePdfRenderToken++;
            setPdfFullscreen(false);
            const modal = domCache.modalPdfViewer || document.getElementById('modal-pdf-viewer');
            const pagesEl = document.getElementById('pdf-viewer-pages');
            const loadingEl = document.getElementById('pdf-viewer-loading');
            if (pagesEl) pagesEl.innerHTML = '';
            if (loadingEl) loadingEl.classList.add('hidden');
            if (modal) modal.classList.add('hidden');
            if (activePdfDoc) {
                activePdfDoc.destroy();
                activePdfDoc = null;
            }
            activePdfItem = null;
            setTimeout(() => {
                if (!isAnyModalOpen()) {
                    deselectCard();
                }
            }, 250);
        }

        // =========================================================================
        // 7B. APERÇU AUTOMATIQUE & LECTEUR DE SITE WEB INTÉGRÉ (BOÎTE MODALE)
        // =========================================================================
        let activeWebItem = null;
        let activeWebFullscreen = false;
        let webViewerLoadTimer = null;
        let editorLastAutoPreviewUrl = '';
        let editorWebPreviewToken = 0;
        const attemptedWebsitePreviews = new Set();

        const DEFAULT_WEB_IFRAME_SANDBOX = 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads';

        function parseYouTubeTimeSeconds(rawTime) {
            if (!rawTime) return 0;
            if (/^\d+$/.test(rawTime)) return parseInt(rawTime, 10) || 0;
            const match = String(rawTime).match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?/i);
            if (!match) return 0;
            const h = parseInt(match[1] || '0', 10);
            const m = parseInt(match[2] || '0', 10);
            const s = parseInt(match[3] || '0', 10);
            return h * 3600 + m * 60 + s;
        }

        function parseYouTubeInfo(rawUrl) {
            const normalized = normalizeUrl(rawUrl);
            if (!normalized) return null;
            try {
                const parsed = new URL(normalized);
                const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
                let videoId = '';

                if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
                    if (parsed.pathname === '/watch') {
                        videoId = parsed.searchParams.get('v') || '';
                    } else {
                        const pathMatch = parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([a-zA-Z0-9_-]{6,})/);
                        if (pathMatch) videoId = pathMatch[1];
                    }
                } else if (host === 'youtu.be') {
                    const seg = parsed.pathname.replace(/^\/+/, '').split('/')[0];
                    if (/^[a-zA-Z0-9_-]{6,}$/.test(seg)) videoId = seg;
                }

                if (!videoId) return null;

                const params = new URLSearchParams();
                const startSec = parseYouTubeTimeSeconds(parsed.searchParams.get('t') || parsed.searchParams.get('start'));
                if (startSec > 0) params.set('start', String(startSec));
                const listId = parsed.searchParams.get('list');
                if (listId) params.set('list', listId);
                params.set('rel', '0');

                const query = params.toString();
                const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}${query ? `?${query}` : ''}`;

                return {
                    videoId,
                    embedUrl,
                    thumbnails: [
                        `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg`,
                        `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/sddefault.jpg`,
                        `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`
                    ]
                };
            } catch {
                return null;
            }
        }

        function getEmbeddableUrl(rawUrl) {
            const normalized = normalizeUrl(rawUrl);
            if (!normalized) return '';
            const yt = parseYouTubeInfo(normalized);
            if (yt) return yt.embedUrl;
            try {
                const parsed = new URL(normalized);
                const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
                if (host === 'vimeo.com') {
                    const vimeoMatch = parsed.pathname.match(/^\/(\d+)/);
                    if (vimeoMatch) {
                        return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
                    }
                }
            } catch {
                // Conserver l'URL normalisée telle quelle
            }
            return normalized;
        }

        function compressImageSourceWithTimeout(src, timeoutMs = 10000) {
            return new Promise((resolve, reject) => {
                let settled = false;
                const timer = setTimeout(() => {
                    if (!settled) {
                        settled = true;
                        reject(new Error('Délai dépassé'));
                    }
                }, timeoutMs);

                compressImageSource(src)
                    .then((res) => {
                        if (!settled) {
                            settled = true;
                            clearTimeout(timer);
                            resolve(res);
                        }
                    })
                    .catch((err) => {
                        if (!settled) {
                            settled = true;
                            clearTimeout(timer);
                            reject(err);
                        }
                    });
            });
        }

        async function fetchWebsitePreview(rawUrl) {
            const normalized = normalizeUrl(rawUrl);
            if (!normalized || !/^https?:\/\//i.test(normalized)) {
                throw new Error('URL invalide');
            }

            // 0. YouTube : récupérer directement la miniature HD de la vidéo (instantané et sans bannière cookies)
            const yt = parseYouTubeInfo(normalized);
            if (yt) {
                for (const thumbUrl of yt.thumbnails) {
                    try {
                        const res = await compressImageSourceWithTimeout(thumbUrl, 6000);
                        // maxresdefault renvoie parfois un placeholder 120x90 si la vidéo n'a pas de HD
                        if (res && res.dataUrl && (!thumbUrl.endsWith('maxresdefault.jpg') || res.aspect > 1.5)) {
                            return res;
                        }
                    } catch {
                        // Essayer la résolution inférieure
                    }
                }
            }

            // 1. Microlink API (capture d'écran haute qualité compatible CORS)
            try {
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                const abortTimer = controller ? setTimeout(() => controller.abort(), 9000) : null;
                const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(normalized)}&screenshot=true&meta=false`;
                const resp = await fetch(apiUrl, controller ? { signal: controller.signal } : undefined);
                if (abortTimer) clearTimeout(abortTimer);
                if (resp.ok) {
                    const json = await resp.json();
                    const shotUrl = json?.data?.screenshot?.url || json?.data?.image?.url;
                    if (shotUrl) {
                        return await compressImageSourceWithTimeout(shotUrl, 9000);
                    }
                }
            } catch {
                // Repli vers le fournisseur suivant
            }

            // 2. Thum.io (capture directe sans clé API)
            try {
                const thumUrl = `https://image.thum.io/get/width/1200/crop/800/noanimate/${normalized}`;
                return await compressImageSourceWithTimeout(thumUrl, 10000);
            } catch {
                // Repli vers le fournisseur suivant
            }

            // 3. WordPress mShots
            const mshotsUrl = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(normalized)}?w=1200&h=800`;
            return await compressImageSourceWithTimeout(mshotsUrl, 10000);
        }

        function refreshCardTextureInScene(item) {
            if (!item || !item.id) return;
            const group = cardMeshes.find(g => g.userData && g.userData.item && g.userData.item.id === item.id);
            if (!group) return;
            const { texture, width3D, height3D } = createCardTexture(item);
            const data = group.userData;
            if (data.frontMat) {
                data.frontMat.map = texture;
                data.frontMat.needsUpdate = true;
            }
            const frontMesh = group.children[0];
            const glowMesh = group.children[1];
            if (frontMesh) frontMesh.scale.set(width3D, height3D, 1);
            if (glowMesh) glowMesh.scale.set(width3D + 0.14, height3D + 0.14, 1);
            data.width3D = width3D;
            data.height3D = height3D;
            data.item = item;
        }

        async function generateWebsitePreviewForItem(itemId, url, { silent = false } = {}) {
            if (!itemId || !url) return;
            const normalized = normalizeUrl(url);
            const attemptKey = `${itemId}|${normalized}`;
            if (attemptedWebsitePreviews.has(attemptKey)) return;
            attemptedWebsitePreviews.add(attemptKey);

            try {
                const preview = await fetchWebsitePreview(normalized);
                let targetItem = null;
                for (const galaxy of state.galaxies) {
                    const found = (galaxy.items || []).find(x => x.id === itemId);
                    if (found) {
                        targetItem = found;
                        break;
                    }
                }
                if (!targetItem || targetItem.type !== 'website' || targetItem.imageData) return;

                targetItem.imageData = preview.dataUrl;
                targetItem.imageAspect = preview.aspect;
                saveState();
                refreshCardTextureInScene(targetItem);
                const managerModal = domCache.modalManager || document.getElementById('modal-manager');
                if (managerModal && !managerModal.classList.contains('hidden')) {
                    renderManagerList();
                }
                if (!silent) {
                    showToast(`Aperçu de « ${targetItem.title} » généré !`, 'success');
                }
            } catch {
                // Conserver le visuel procédural élégant en cas d'échec ou mode hors-ligne
            }
        }

        function backfillMissingWebsitePreviews() {
            const activeItems = getActiveItems();
            const pending = activeItems.filter(item => item && item.type === 'website' && item.url && !item.imageData);
            if (pending.length === 0) return;

            (async () => {
                for (const item of pending) {
                    await generateWebsitePreviewForItem(item.id, item.url, { silent: true });
                }
            })();
        }

        function updateWebViewerToolbarUI() {
            const fsBtn = document.getElementById('btn-web-fullscreen');
            if (!fsBtn) return;
            fsBtn.classList.toggle('bg-sky-500/30', activeWebFullscreen);
            fsBtn.classList.toggle('text-sky-200', activeWebFullscreen);
            fsBtn.classList.toggle('border', activeWebFullscreen);
            fsBtn.classList.toggle('border-sky-400/40', activeWebFullscreen);
            fsBtn.classList.toggle('bg-white/10', !activeWebFullscreen);
            fsBtn.classList.toggle('text-slate-200', !activeWebFullscreen);
            fsBtn.textContent = activeWebFullscreen ? '🗗 Réduire' : '⛶ Plein écran';
        }

        function setWebFullscreen(enabled) {
            activeWebFullscreen = Boolean(enabled);
            const modal = domCache.modalWebViewer || document.getElementById('modal-web-viewer');
            const dialog = document.getElementById('web-viewer-dialog');
            if (modal) {
                modal.classList.toggle('p-0', activeWebFullscreen);
                modal.classList.toggle('p-2', !activeWebFullscreen);
                modal.classList.toggle('sm:p-5', !activeWebFullscreen);
            }
            if (dialog) {
                dialog.classList.toggle('max-w-none', activeWebFullscreen);
                dialog.classList.toggle('h-full', activeWebFullscreen);
                dialog.classList.toggle('rounded-none', activeWebFullscreen);
                dialog.classList.toggle('max-w-6xl', !activeWebFullscreen);
                dialog.classList.toggle('h-[92vh]', !activeWebFullscreen);
                dialog.classList.toggle('rounded-3xl', !activeWebFullscreen);
            }
            updateWebViewerToolbarUI();
        }

        function openWebViewer(item) {
            if (!item || !item.url) {
                showToast('Aucune adresse web associée à cette carte.', 'error');
                return;
            }
            closeWebViewer({ keepSelection: true });

            const normalized = normalizeUrl(item.url);
            const yt = parseYouTubeInfo(normalized);
            const embedUrl = yt ? yt.embedUrl : getEmbeddableUrl(normalized);
            activeWebItem = item;
            setWebFullscreen(false);

            const modal = domCache.modalWebViewer || document.getElementById('modal-web-viewer');
            const iconEl = document.getElementById('web-viewer-icon');
            const titleEl = document.getElementById('web-viewer-title');
            const metaEl = document.getElementById('web-viewer-meta');
            const loadingEl = document.getElementById('web-viewer-loading');
            const iframe = document.getElementById('web-viewer-iframe');
            const footerNote = document.getElementById('web-viewer-footer-note');
            const fallbackLink = document.getElementById('link-web-external-fallback');

            if (iconEl) {
                iconEl.textContent = yt ? '▶️' : '🌐';
                iconEl.classList.toggle('bg-rose-500/20', Boolean(yt));
                iconEl.classList.toggle('text-rose-300', Boolean(yt));
                iconEl.classList.toggle('bg-sky-500/20', !yt);
                iconEl.classList.toggle('text-sky-300', !yt);
            }
            if (titleEl) titleEl.textContent = item.title || extractDomain(normalized) || 'Site Web';
            if (metaEl) metaEl.textContent = yt ? embedUrl : normalized;
            if (footerNote) {
                footerNote.textContent = yt
                    ? `Vidéo YouTube intégrée (${embedUrl})`
                    : 'Certains sites bloquent l’affichage intégré (sécurité X-Frame-Options).';
            }
            if (fallbackLink) {
                fallbackLink.href = normalized;
                fallbackLink.textContent = yt ? 'Ouvrir sur YouTube ↗' : 'Ouvrir directement dans un nouvel onglet ↗';
            }
            if (loadingEl) loadingEl.classList.remove('hidden');
            if (modal) modal.classList.remove('hidden');

            if (webViewerLoadTimer) {
                clearTimeout(webViewerLoadTimer);
                webViewerLoadTimer = null;
            }

            if (iframe) {
                if (yt) {
                    iframe.removeAttribute('sandbox');
                    iframe.classList.remove('bg-white');
                    iframe.classList.add('bg-black');
                } else {
                    iframe.setAttribute('sandbox', DEFAULT_WEB_IFRAME_SANDBOX);
                    iframe.classList.remove('bg-black');
                    iframe.classList.add('bg-white');
                }
                iframe.onload = () => {
                    if (loadingEl) loadingEl.classList.add('hidden');
                    if (webViewerLoadTimer) {
                        clearTimeout(webViewerLoadTimer);
                        webViewerLoadTimer = null;
                    }
                };
                iframe.src = embedUrl;
                // Masquer le spinner après un délai max si le site ne déclenche pas onload (ex. blocage X-Frame-Options)
                webViewerLoadTimer = setTimeout(() => {
                    if (loadingEl) loadingEl.classList.add('hidden');
                    webViewerLoadTimer = null;
                }, 4500);
            }
        }

        function reloadWebViewer() {
            if (!activeWebItem || !activeWebItem.url) return;
            const iframe = document.getElementById('web-viewer-iframe');
            const loadingEl = document.getElementById('web-viewer-loading');
            if (!iframe) return;
            const embedUrl = getEmbeddableUrl(activeWebItem.url);
            if (loadingEl) loadingEl.classList.remove('hidden');
            if (webViewerLoadTimer) clearTimeout(webViewerLoadTimer);
            iframe.src = 'about:blank';
            setTimeout(() => {
                if (activeWebItem) {
                    iframe.src = embedUrl;
                    webViewerLoadTimer = setTimeout(() => {
                        if (loadingEl) loadingEl.classList.add('hidden');
                        webViewerLoadTimer = null;
                    }, 4500);
                }
            }, 60);
        }

        function closeWebViewer({ keepSelection = false } = {}) {
            if (webViewerLoadTimer) {
                clearTimeout(webViewerLoadTimer);
                webViewerLoadTimer = null;
            }
            setWebFullscreen(false);
            const modal = domCache.modalWebViewer || document.getElementById('modal-web-viewer');
            const loadingEl = document.getElementById('web-viewer-loading');
            const iframe = document.getElementById('web-viewer-iframe');
            if (loadingEl) loadingEl.classList.add('hidden');
            if (iframe) {
                iframe.onload = null;
                iframe.src = 'about:blank';
            }
            if (modal) modal.classList.add('hidden');
            activeWebItem = null;
            if (!keepSelection) {
                setTimeout(() => {
                    if (!isAnyModalOpen()) {
                        deselectCard();
                    }
                }, 250);
            }
        }

        /**
         * Compresse et optimise une source d'image (DataURL ou URL compatible CORS) pour la 3D
         */
        function compressImageSource(src) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                if (/^https?:\/\//i.test(src)) {
                    img.crossOrigin = 'anonymous';
                }
                img.onload = () => {
                    try {
                        const maxDim = 1600;
                        let w = img.naturalWidth;
                        let h = img.naturalHeight;
                        const aspect = w / Math.max(1, h);

                        if (w > maxDim || h > maxDim) {
                            if (w >= h) {
                                h = Math.round((h * maxDim) / w);
                                w = maxDim;
                            } else {
                                w = Math.round((w * maxDim) / h);
                                h = maxDim;
                            }
                        }

                        const offCanvas = document.createElement('canvas');
                        offCanvas.width = w;
                        offCanvas.height = h;
                        const octx = offCanvas.getContext('2d');
                        octx.drawImage(img, 0, 0, w, h);

                        let compressedDataUrl;
                        try {
                            compressedDataUrl = offCanvas.toDataURL('image/webp', 0.86);
                            if (!compressedDataUrl.startsWith('data:image/webp')) {
                                compressedDataUrl = offCanvas.toDataURL('image/jpeg', 0.86);
                            }
                        } catch {
                            compressedDataUrl = offCanvas.toDataURL('image/jpeg', 0.86);
                        }

                        resolve({ dataUrl: compressedDataUrl, aspect });
                    } catch (err) {
                        reject(err);
                    }
                };
                img.onerror = () => reject(new Error('Image illisible'));
                img.src = src;
            });
        }

        /**
         * Lit un fichier image local et retourne sa version optimisée + nom propre
         */
        function readAndCompressImageFile(file) {
            return new Promise((resolve, reject) => {
                if (!file || !file.type.startsWith('image/')) {
                    reject(new Error('Format non pris en charge'));
                    return;
                }
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    try {
                        const result = await compressImageSource(ev.target.result);
                        const cleanName = (file.name || 'Image')
                            .replace(/\.[^/.]+$/, '')
                            .replace(/[_-]+/g, ' ')
                            .trim()
                            .slice(0, 45) || 'Image';
                        resolve({ ...result, cleanName });
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
                reader.readAsDataURL(file);
            });
        }

        /**
         * Charge, redimensionne et optimise l'image importée dans le formulaire éditeur
         */
        function handleImageFile(file) {
            if (!file || !file.type.startsWith('image/')) {
                showToast('Veuillez sélectionner un fichier image valide.', 'error');
                return;
            }

            readAndCompressImageFile(file)
                .then(({ dataUrl, aspect, cleanName }) => {
                    setEditorImagePreview(dataUrl, aspect);

                    // Si aucune URL n'est saisie et qu'on n'est pas en mode PDF, basculer automatiquement sur Image
                    const urlInput = document.getElementById('input-url');
                    if (state.editingType === 'website' && urlInput && !urlInput.value.trim()) {
                        setEditorType('image');
                    }

                    // Pré-remplir le titre avec le nom du fichier si vide
                    const titleInput = document.getElementById('input-title');
                    if (titleInput && !titleInput.value.trim()) {
                        titleInput.value = cleanName;
                    }

                    showToast('Image chargée et optimisée pour la 3D.', 'success');
                })
                .catch(() => {
                    showToast('Impossible de lire cette image.', 'error');
                });
        }

        /**
         * Extrait une URL valide depuis un texte ou une liste d'URI glissée
         */
        function extractValidUrl(rawText) {
            if (!rawText) return '';
            const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
            for (const line of lines) {
                if (/^https?:\/\/\S+/i.test(line)) {
                    return line;
                }
                if (/^www\.\S+\.\S+/i.test(line)) {
                    return 'https://' + line;
                }
                if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(line)) {
                    return 'https://' + line;
                }
            }
            return '';
        }

        /**
         * Génère un titre lisible à partir d'une URL (ex: https://fr.wikipedia.org -> Wikipedia)
         */
        function extractNiceTitleFromUrl(url) {
            try {
                const parsed = new URL(normalizeUrl(url));
                const hostParts = parsed.hostname.replace(/^www\./i, '').split('.');
                let main = hostParts.length >= 2 ? hostParts[hostParts.length - 2] : hostParts[0];
                if (main.length <= 2 && hostParts.length >= 3) {
                    main = hostParts[hostParts.length - 3];
                }
                return (main.charAt(0).toUpperCase() + main.slice(1)).slice(0, 45);
            } catch {
                return 'Nouveau site';
            }
        }

        /**
         * Vérifie si une URL pointe directement vers une image
         */
        function looksLikeImageUrl(url) {
            if (!url) return false;
            if (/^data:image\//i.test(url)) return true;
            return /\.(png|jpe?g|webp|gif|avif|bmp)(\?.*)?(#.*)?$/i.test(url);
        }

        /**
         * Analyse les données HTML / URI / Texte d'un glisser-déposer (lien ou image web)
         */
        function parseDroppedLinkData(dataTransfer) {
            const html = dataTransfer.getData('text/html') || '';
            const uriList = dataTransfer.getData('text/uri-list') || '';
            const plain = dataTransfer.getData('text/plain') || '';

            let anchorUrl = '';
            let anchorTitle = '';
            let imgSrc = '';
            let imgAlt = '';

            if (html) {
                try {
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    const aEl = doc.querySelector('a[href]');
                    if (aEl) {
                        anchorUrl = aEl.getAttribute('href') || '';
                        anchorTitle = (aEl.textContent || '').replace(/\s+/g, ' ').trim();
                    }
                    const imgEl = doc.querySelector('img[src]');
                    if (imgEl) {
                        imgSrc = imgEl.getAttribute('src') || '';
                        imgAlt = (imgEl.getAttribute('alt') || '').replace(/\s+/g, ' ').trim();
                    }
                } catch {
                    // Ignorer si le fragment HTML ne peut pas être analysé
                }
            }

            const candidateUrl = extractValidUrl(anchorUrl) || extractValidUrl(uriList) || extractValidUrl(plain);
            const candidateImg = imgSrc || (looksLikeImageUrl(uriList.trim()) ? uriList.trim() : '') || (looksLikeImageUrl(plain.trim()) ? plain.trim() : '');

            return {
                url: candidateUrl,
                title: anchorTitle && !/^https?:\/\//i.test(anchorTitle) ? anchorTitle.slice(0, 45) : '',
                imgSrc: candidateImg,
                imgAlt: imgAlt.slice(0, 45)
            };
        }

        /**
         * Glisser-déposer global : ajoute automatiquement toute image ou tout lien déposé sur la page ou le menu
         */
        function setupGlobalDragAndDrop() {
            const overlay = document.getElementById('global-drop-overlay');
            let dragDepth = 0;

            const isEditorOpen = () => !document.getElementById('modal-editor').classList.contains('hidden');

            const hasDroppableContent = (dt) => {
                if (!dt || !dt.types) return false;
                const types = Array.from(dt.types);
                return types.includes('Files') ||
                       types.includes('text/uri-list') ||
                       types.includes('text/plain') ||
                       types.includes('text/html');
            };

            const hideOverlay = () => {
                dragDepth = 0;
                if (overlay) overlay.classList.add('hidden');
            };

            window.addEventListener('dragenter', (e) => {
                if (isEditorOpen() || !hasDroppableContent(e.dataTransfer)) return;
                e.preventDefault();
                dragDepth++;
                if (overlay) overlay.classList.remove('hidden');
            });

            window.addEventListener('dragover', (e) => {
                if (isEditorOpen() || !hasDroppableContent(e.dataTransfer)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                if (overlay && overlay.classList.contains('hidden')) {
                    overlay.classList.remove('hidden');
                }
            });

            window.addEventListener('dragleave', (e) => {
                if (isEditorOpen()) return;
                dragDepth = Math.max(0, dragDepth - 1);
                if (dragDepth === 0 || (e.clientX === 0 && e.clientY === 0)) {
                    hideOverlay();
                }
            });

            window.addEventListener('drop', async (e) => {
                if (isEditorOpen()) return;
                e.preventDefault();
                hideOverlay();
                closeOptionsMenu();

                const dt = e.dataTransfer;
                if (!dt) return;

                // 1. Fichiers images et PDF glissés depuis l'ordinateur
                const files = Array.from(dt.files || []);
                const imageFiles = files.filter(f => f.type && f.type.startsWith('image/'));
                const pdfFiles = files.filter(f => isPdfFile(f));

                if (imageFiles.length > 0 || pdfFiles.length > 0) {
                    const addedIds = [];
                    let lastTitle = '';
                    let addedImages = 0;
                    let addedPdfs = 0;

                    for (const file of imageFiles) {
                        try {
                            const { dataUrl, aspect, cleanName } = await readAndCompressImageFile(file);
                            const newId = 'card-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
                            const randomColor = ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)].hex;

                            getActiveItems().push({
                                id: newId,
                                type: 'image',
                                title: cleanName,
                                url: '',
                                description: '',
                                color: randomColor,
                                imageData: dataUrl,
                                imageAspect: aspect,
                                artStyle: 'planet'
                            });
                            addedIds.push(newId);
                            lastTitle = cleanName;
                            addedImages++;
                        } catch {
                            // Ignorer les fichiers corrompus
                        }
                    }

                    for (const file of pdfFiles) {
                        try {
                            const { pdfData, pdfName, pdfSize, cleanName } = await readPdfFile(file);
                            const newId = 'card-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
                            const randomColor = ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)].hex;

                            let previewData = null;
                            let previewAspect = 0.78;
                            try {
                                const preview = await renderPdfFirstPagePreview(pdfData);
                                previewData = preview.dataUrl;
                                previewAspect = preview.aspect;
                            } catch {
                                // Repli sur le visuel procédural si l'aperçu PDF.js échoue
                            }

                            getActiveItems().push({
                                id: newId,
                                type: 'pdf',
                                title: cleanName,
                                url: '',
                                description: '',
                                color: randomColor,
                                imageData: previewData,
                                imageAspect: previewAspect,
                                pdfData,
                                pdfName,
                                pdfSize,
                                artStyle: 'document'
                            });
                            addedIds.push(newId);
                            lastTitle = cleanName;
                            addedPdfs++;
                        } catch {
                            // Ignorer les fichiers PDF illisibles
                        }
                    }

                    if (addedIds.length > 0) {
                        const targetFilter = addedImages > 0 && addedPdfs === 0
                            ? 'image'
                            : (addedPdfs > 0 && addedImages === 0 ? 'pdf' : 'all');
                        if (state.filter !== 'all' && state.filter !== targetFilter) {
                            state.filter = 'all';
                            updateFilterButtonsUI();
                        }
                        saveState();
                        renderGalaxyMenuList();
                        rebuildCards3D(addedIds.length === 1 ? addedIds[0] : null);
                        if (!document.getElementById('modal-manager').classList.contains('hidden')) {
                            renderManagerList();
                        }
                        let msg;
                        if (addedIds.length === 1) {
                            msg = addedPdfs === 1
                                ? `PDF « ${lastTitle} » ajouté en 3D !`
                                : `Image « ${lastTitle} » ajoutée en 3D !`;
                        } else {
                            msg = `${addedIds.length} fichiers ajoutés en 3D !`;
                        }
                        showToast(msg, 'success');
                    } else {
                        showToast('Impossible de charger les fichiers déposés.', 'error');
                    }
                    return;
                }

                // 2. Liens de sites web ou images glissés depuis le navigateur
                const parsed = parseDroppedLinkData(dt);

                // Cas d'une image web glissée directement sans lien de page distinct
                if (parsed.imgSrc && (!parsed.url || parsed.url === parsed.imgSrc || looksLikeImageUrl(parsed.url))) {
                    try {
                        const { dataUrl, aspect } = await compressImageSource(parsed.imgSrc);
                        const newId = 'card-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
                        const title = parsed.imgAlt || 'Image web';
                        const randomColor = ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)].hex;

                        getActiveItems().push({
                            id: newId,
                            type: 'image',
                            title,
                            url: '',
                            description: '',
                            color: randomColor,
                            imageData: dataUrl,
                            imageAspect: aspect,
                            artStyle: 'planet'
                        });

                        if (state.filter !== 'all' && state.filter !== 'image') {
                            state.filter = 'all';
                            updateFilterButtonsUI();
                        }
                        saveState();
                        renderGalaxyMenuList();
                        rebuildCards3D(newId);
                        if (!document.getElementById('modal-manager').classList.contains('hidden')) {
                            renderManagerList();
                        }
                        showToast(`Image « ${title} » ajoutée en 3D !`, 'success');
                        return;
                    } catch {
                        // Si la sécurité CORS du site bloque la copie directe de l'image, on l'ajoute comme lien si possible
                    }
                }

                // Cas d'un lien de site web
                const finalUrl = parsed.url || extractValidUrl(parsed.imgSrc);
                if (finalUrl) {
                    const normalized = normalizeUrl(finalUrl);
                    const title = parsed.title || parsed.imgAlt || extractNiceTitleFromUrl(normalized);
                    const newId = 'card-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
                    const randomColor = ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)].hex;

                    getActiveItems().push({
                        id: newId,
                        type: 'website',
                        title,
                        url: normalized,
                        description: '',
                        color: randomColor,
                        imageData: null,
                        imageAspect: null,
                        artStyle: 'rings'
                    });

                    if (state.filter !== 'all' && state.filter !== 'website') {
                        state.filter = 'all';
                        updateFilterButtonsUI();
                    }
                    saveState();
                    renderGalaxyMenuList();
                    rebuildCards3D(newId);
                    if (!document.getElementById('modal-manager').classList.contains('hidden')) {
                        renderManagerList();
                    }
                    showToast(`Site « ${title} » ajouté en 3D ! Génération de l’aperçu…`, 'success');
                    generateWebsitePreviewForItem(newId, normalized);
                    return;
                }

                showToast('Déposez une image, un PDF ou un lien web valide.', 'error');
            });
        }

        // --- Gestionnaire de bibliothèque ---
        function renderManagerList() {
            const list = document.getElementById('manager-list');
            if (!list) return;

            const items = getActiveItems();

            if (items.length === 0) {
                list.innerHTML = `
                    <div class="text-center py-10 text-slate-400 text-xs">
                        Aucune carte enregistrée pour le moment.
                    </div>
                `;
                return;
            }

            const frag = document.createDocumentFragment();

            items.forEach(item => {
                const row = document.createElement('div');
                row.className = 'p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center gap-3 transition-all';

                const typeIcon = item.type === 'website' ? '🌐' : (item.type === 'pdf' ? '📄' : '🖼️');
                const thumbHtml = item.imageData
                    ? `<img src="${item.imageData}" alt="" loading="lazy" decoding="async" class="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10">`
                    : `<div class="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-lg font-bold border border-white/10" style="background: ${hexToRgba(item.color || '#0ea5e9', 0.25)}; color: #fff;">${typeIcon}</div>`;

                const subtitle = item.type === 'website'
                    ? (extractDomain(item.url) || 'Site Web')
                    : (item.type === 'pdf'
                        ? (item.description || (item.pdfName ? `${item.pdfName}${item.pdfSize ? ` (${formatFileSize(item.pdfSize)})` : ''}` : 'Document PDF'))
                        : (item.description || 'Image 3D'));

                row.innerHTML = `
                    ${thumbHtml}
                    <div class="min-w-0 flex-1">
                        <div class="text-sm font-semibold text-white truncate">${escapeHtml(item.title)}</div>
                        <div class="text-[11px] text-slate-400 truncate">${escapeHtml(subtitle)}</div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <button type="button" data-action="focus" title="Zoomer en 3D"
                            class="p-2 rounded-xl text-slate-300 hover:text-sky-300 hover:bg-white/10 transition-colors">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                        <button type="button" data-action="edit" title="Modifier"
                            class="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button type="button" data-action="delete" title="Supprimer"
                            class="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                `;

                row.querySelector('[data-action="focus"]').addEventListener('click', () => {
                    closeAllModals();
                    if (state.filter !== 'all' && state.filter !== item.type) {
                        state.filter = 'all';
                        updateFilterButtonsUI();
                        rebuildCards3D(item.id);
                    } else {
                        const idx = getFilteredItems().findIndex(x => x.id === item.id);
                        if (idx !== -1) selectCard(idx);
                    }
                });

                row.querySelector('[data-action="edit"]').addEventListener('click', () => {
                    document.getElementById('modal-manager').classList.add('hidden');
                    openEditorModal(item);
                });

                row.querySelector('[data-action="delete"]').addEventListener('click', () => {
                    askConfirm(
                        'Supprimer cette carte ?',
                        `« ${item.title} » sera retirée définitivement de votre espace 3D.`,
                        () => {
                            setActiveItems(getActiveItems().filter(x => x.id !== item.id));
                            saveState();
                            renderGalaxyMenuList();
                            rebuildCards3D();
                            renderManagerList();
                            showToast('Carte supprimée.', 'info');
                        }
                    );
                });

                frag.appendChild(row);
            });

            list.innerHTML = '';
            list.appendChild(frag);
        }

