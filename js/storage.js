        // =========================================================================
        // 2. GESTION DES GALAXIES, PERSISTANCE INDEXEDDB / LOCALSTORAGE & FILTRES
        // =========================================================================
        const IDB_NAME = 'Portail3D_DB';
        const IDB_VERSION = 1;
        const IDB_STORE = 'app_state';
        let idbPromise = null;

        function openStorageDB() {
            if (idbPromise) return idbPromise;
            if (typeof indexedDB === 'undefined') {
                return Promise.resolve(null);
            }
            idbPromise = new Promise((resolve) => {
                try {
                    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
                    req.onupgradeneeded = () => {
                        const db = req.result;
                        if (!db.objectStoreNames.contains(IDB_STORE)) {
                            db.createObjectStore(IDB_STORE);
                        }
                    };
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => resolve(null);
                } catch {
                    resolve(null);
                }
            });
            return idbPromise;
        }

        async function idbGet(key) {
            const db = await openStorageDB();
            if (!db) return null;
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(IDB_STORE, 'readonly');
                    const store = tx.objectStore(IDB_STORE);
                    const req = store.get(key);
                    req.onsuccess = () => resolve(req.result ?? null);
                    req.onerror = () => resolve(null);
                } catch {
                    resolve(null);
                }
            });
        }

        async function idbSet(key, value) {
            const db = await openStorageDB();
            if (!db) return false;
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(IDB_STORE, 'readwrite');
                    const store = tx.objectStore(IDB_STORE);
                    store.put(value, key);
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                } catch {
                    resolve(false);
                }
            });
        }
        function cloneDefaultItems() {
            return DEFAULT_ITEMS.map(item => ({ ...item }));
        }

        function pickNextGalaxyColor() {
            const used = new Set(state.galaxies.map(g => (g.color || '').toLowerCase()));
            const unused = ACCENT_COLORS.find(c => !used.has(c.hex.toLowerCase()));
            return unused ? unused.hex : ACCENT_COLORS[state.galaxies.length % ACCENT_COLORS.length].hex;
        }

        function getNextGalaxyName() {
            const usedNames = new Set(state.galaxies.map(g => (g.name || '').trim().toLowerCase()));
            let n = 1;
            while (usedNames.has(`galaxie ${n}`)) {
                n++;
            }
            return `Galaxie ${n}`;
        }

        function createGalaxyObject(overrides = {}) {
            const index = state.galaxies.length;
            const rawTheme = typeof overrides.themeIndex === 'number' ? overrides.themeIndex : (index % THEMES.length);
            return {
                id: overrides.id || ('galaxy-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)),
                name: (typeof overrides.name === 'string' && overrides.name.trim()) ? overrides.name.trim() : getNextGalaxyName(),
                color: overrides.color || pickNextGalaxyColor(),
                themeIndex: ((rawTheme % THEMES.length) + THEMES.length) % THEMES.length,
                items: Array.isArray(overrides.items) ? overrides.items : cloneDefaultItems()
            };
        }

        function ensureDefaultGalaxy() {
            if (!Array.isArray(state.galaxies) || state.galaxies.length === 0) {
                const first = createGalaxyObject({
                    id: 'galaxy-1',
                    name: 'Galaxie 1',
                    color: ACCENT_COLORS[0].hex,
                    themeIndex: 0,
                    items: cloneDefaultItems()
                });
                state.galaxies = [first];
                state.activeGalaxyId = first.id;
            } else if (!state.galaxies.some(g => g.id === state.activeGalaxyId)) {
                state.activeGalaxyId = state.galaxies[0].id;
            }
        }

        function getActiveGalaxy() {
            ensureDefaultGalaxy();
            return state.galaxies.find(g => g.id === state.activeGalaxyId) || state.galaxies[0];
        }

        function getActiveItems() {
            return getActiveGalaxy().items;
        }

        function setActiveItems(items) {
            getActiveGalaxy().items = Array.isArray(items) ? items : [];
        }

        async function loadState() {
            try {
                let parsed = await idbGet(ACTIVE_STORAGE_KEY);
                let migratedFromLocalStorage = false;

                if (!parsed) {
                    let raw = null;
                    try {
                        raw = localStorage.getItem(ACTIVE_STORAGE_KEY);
                    } catch {
                        raw = null;
                    }
                    if (raw) {
                        parsed = JSON.parse(raw);
                        migratedFromLocalStorage = true;
                    } else if (PRELOADED_STATE) {
                        parsed = JSON.parse(JSON.stringify(PRELOADED_STATE));
                    }
                }

                if (!parsed || typeof parsed !== 'object') {
                    ensureDefaultGalaxy();
                    return;
                }

                if (Array.isArray(parsed.galaxies) && parsed.galaxies.length > 0) {
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
                } else {
                    // Migration automatique depuis l'ancien format mono-galaxie
                    let migratedItems = cloneDefaultItems();
                    let cleanedDemos = false;
                    if (Array.isArray(parsed.items)) {
                        const onlyLegacyDemos = parsed.items.length > 0 &&
                            parsed.items.every(item => typeof item.id === 'string' && item.id.startsWith('demo-'));
                        migratedItems = onlyLegacyDemos ? [] : parsed.items;
                        cleanedDemos = onlyLegacyDemos;
                    }
                    const migratedTheme = typeof parsed.themeIndex === 'number'
                        ? ((parsed.themeIndex % THEMES.length) + THEMES.length) % THEMES.length
                        : 0;
                    state.galaxies = [{
                        id: 'galaxy-1',
                        name: 'Galaxie 1',
                        color: ACCENT_COLORS[0].hex,
                        themeIndex: migratedTheme,
                        items: migratedItems
                    }];
                    state.activeGalaxyId = 'galaxy-1';
                    if (cleanedDemos) {
                        saveState();
                    }
                }

                if (typeof parsed.autoRotate === 'boolean') {
                    state.autoRotate = parsed.autoRotate;
                }
                if (['all', 'website', 'image', 'pdf'].includes(parsed.filter)) {
                    state.filter = parsed.filter;
                }
                ensureDefaultGalaxy();

                if (migratedFromLocalStorage) {
                    saveState();
                }
            } catch {
                state.galaxies = [];
                ensureDefaultGalaxy();
            }
        }

        function saveState() {
            ensureDefaultGalaxy();
            const payload = {
                galaxies: state.galaxies,
                activeGalaxyId: state.activeGalaxyId,
                autoRotate: state.autoRotate,
                filter: state.filter
            };

            let localSaved = false;
            try {
                localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(payload));
                localSaved = true;
            } catch {
                localSaved = false;
            }

            idbSet(ACTIVE_STORAGE_KEY, payload).then((idbSaved) => {
                if (!idbSaved && !localSaved) {
                    showToast('Espace de stockage plein : pensez à exporter le site HTML ou en JSON.', 'error');
                }
            });
        }

        /**
         * Exporte une copie HTML autonome du site web déjà remplie avec toutes les galaxies, cartes, images et réglages actuels
         */
        async function exportFilledWebsiteHtml() {
            try {
                ensureDefaultGalaxy();
                const docClone = document.documentElement.cloneNode(true);

                // Nettoyer les feuilles de style injectées dynamiquement par Tailwind CDN
                const head = docClone.querySelector('head');
                if (head) {
                    head.querySelectorAll('style').forEach(styleEl => {
                        if (styleEl.id !== 'app-styles') {
                            styleEl.remove();
                        }
                    });

                    // Remplacer les scripts vendor locaux par les CDN pour un export autonome
                    const vendorMap = {
                        'vendor/tailwind.cdn.js': 'https://cdn.tailwindcss.com',
                        'vendor/three.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
                        'vendor/pdf.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
                    };
                    head.querySelectorAll('script[src]').forEach(scriptEl => {
                        const src = scriptEl.getAttribute('src');
                        if (src && vendorMap[src]) {
                            scriptEl.setAttribute('src', vendorMap[src]);
                        }
                    });

                    // Inliner css/styles.css dans <style id="app-styles">
                    const cssLink = head.querySelector('link[href="css/styles.css"]');
                    if (cssLink) {
                        try {
                            const cssResp = await fetch('css/styles.css');
                            if (cssResp.ok) {
                                const styleEl = document.createElement('style');
                                styleEl.id = 'app-styles';
                                styleEl.textContent = await cssResp.text();
                                cssLink.replaceWith(styleEl);
                            }
                        } catch {
                            // Conserver le lien tel quel si hors-ligne/file://
                        }
                    }
                }

                // Réinitialiser les zones dynamiques et les états d'interface ouverts
                const body = docClone.querySelector('body');
                if (body) {
                    body.removeAttribute('style');

                    // Inliner les modules JS (js/*.js) dans l'export autonome
                    const moduleScripts = Array.from(body.querySelectorAll('script[src^="js/"]'));
                    if (moduleScripts.length > 0) {
                        const bundledParts = [];
                        let allFetched = true;
                        for (const scriptEl of moduleScripts) {
                            const src = scriptEl.getAttribute('src');
                            try {
                                const resp = await fetch(src);
                                if (!resp.ok) {
                                    allFetched = false;
                                    break;
                                }
                                bundledParts.push(await resp.text());
                            } catch {
                                allFetched = false;
                                break;
                            }
                        }
                        if (allFetched && bundledParts.length > 0) {
                            const inlineScript = document.createElement('script');
                            inlineScript.textContent = '\n' + bundledParts.join('\n\n') + '\n';
                            moduleScripts[0].replaceWith(inlineScript);
                            for (let i = 1; i < moduleScripts.length; i++) {
                                moduleScripts[i].remove();
                            }
                        }
                    }
                }

                const clearIds = [
                    'canvas-container',
                    'galaxy-switcher',
                    'galaxy-menu-list',
                    'manager-list',
                    'color-swatches',
                    'toast-container',
                    'pdf-viewer-pages',
                    'search-results'
                ];
                clearIds.forEach(id => {
                    const el = docClone.querySelector(`#${id}`);
                    if (el) el.innerHTML = '';
                });

                const canvasContainer = docClone.querySelector('#canvas-container');
                if (canvasContainer) canvasContainer.classList.remove('pointer-card');

                const hideIds = [
                    'empty-state',
                    'options-menu',
                    'modal-editor',
                    'modal-manager',
                    'modal-confirm',
                    'modal-pdf-viewer',
                    'modal-web-viewer',
                    'modal-search',
                    'global-drop-overlay',
                    'dropzone-preview-wrapper',
                    'pdf-dropzone-loaded'
                ];
                hideIds.forEach(id => {
                    const el = docClone.querySelector(`#${id}`);
                    if (el) el.classList.add('hidden');
                });

                const placeholder = docClone.querySelector('#dropzone-placeholder');
                if (placeholder) placeholder.classList.remove('hidden');

                const pdfPlaceholder = docClone.querySelector('#pdf-dropzone-placeholder');
                if (pdfPlaceholder) pdfPlaceholder.classList.remove('hidden');

                const pdfLoading = docClone.querySelector('#pdf-viewer-loading');
                if (pdfLoading) pdfLoading.classList.add('hidden');

                const previewImg = docClone.querySelector('#dropzone-preview');
                if (previewImg) previewImg.setAttribute('src', '');

                const toggleBtn = docClone.querySelector('#btn-options-toggle');
                if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');

                const gearIcon = docClone.querySelector('#icon-options-gear');
                if (gearIcon) gearIcon.removeAttribute('style');

                const confirmDialog = docClone.querySelector('#confirm-dialog');
                if (confirmDialog) confirmDialog.removeAttribute('style');

                const autoRotateKnob = docClone.querySelector('#autorotate-knob');
                if (autoRotateKnob) autoRotateKnob.removeAttribute('style');

                ['count-all', 'count-website', 'count-image', 'count-pdf'].forEach(id => {
                    const el = docClone.querySelector(`#${id}`);
                    if (el) el.textContent = '0';
                });

                // Injecter les données actuelles dans la balise JSON dédiée (échappée pour HTML)
                let dataScript = docClone.querySelector('#preloaded-state');
                if (!dataScript) {
                    dataScript = document.createElement('script');
                    dataScript.id = 'preloaded-state';
                    dataScript.type = 'application/json';
                    const mainScript = body ? body.querySelector('script:last-of-type') : null;
                    if (body && mainScript) {
                        body.insertBefore(dataScript, mainScript);
                    } else if (body) {
                        body.appendChild(dataScript);
                    }
                }

                const exportPayload = {
                    version: 2,
                    exportId: 'exp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                    exportedAt: new Date().toISOString(),
                    activeGalaxyId: state.activeGalaxyId,
                    autoRotate: state.autoRotate,
                    filter: state.filter,
                    galaxies: state.galaxies
                };

                dataScript.textContent = JSON.stringify(exportPayload)
                    .replace(/</g, '\\u003c')
                    .replace(/>/g, '\\u003e')
                    .replace(/&/g, '\\u0026')
                    .replace(/\u2028/g, '\\u2028')
                    .replace(/\u2029/g, '\\u2029');

                const htmlContent = '<!DOCTYPE html>\n' + docClone.outerHTML;
                const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'portail-3d-site.html';
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);

                const totalCards = state.galaxies.reduce((sum, g) => sum + (Array.isArray(g.items) ? g.items.length : 0), 0);
                const galaxyCount = state.galaxies.length;
                showToast(
                    `Site HTML exporté (${galaxyCount} galaxie${galaxyCount > 1 ? 's' : ''}, ${totalCards} carte${totalCards > 1 ? 's' : ''}).`,
                    'success'
                );
            } catch {
                showToast('Impossible d’exporter le site HTML.', 'error');
            }
        }

        function getFilteredItems() {
            const items = getActiveItems();
            if (state.filter === 'all') return items;
            return items.filter(item => item.type === state.filter);
        }

        function updateFilterCounts() {
            const items = getActiveItems();
            let webCount = 0;
            let imgCount = 0;
            let pdfCount = 0;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type === 'website') webCount++;
                else if (items[i].type === 'image') imgCount++;
                else if (items[i].type === 'pdf') pdfCount++;
            }
            const allEl = document.getElementById('count-all');
            const webEl = document.getElementById('count-website');
            const imgEl = document.getElementById('count-image');
            const pdfEl = document.getElementById('count-pdf');
            if (allEl) allEl.textContent = items.length;
            if (webEl) webEl.textContent = webCount;
            if (imgEl) imgEl.textContent = imgCount;
            if (pdfEl) pdfEl.textContent = pdfCount;
        }

        function getGalaxyIconSvg(sizeClass = 'w-4 h-4') {
            return `
                <svg class="${sizeClass}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="3.3" fill="currentColor" />
                    <ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(-28 12 12)" stroke="currentColor" stroke-width="1.8" opacity="0.88" />
                    <circle cx="18.2" cy="8.5" r="1.35" fill="currentColor" opacity="0.95" />
                </svg>
            `;
        }

        /**
         * Affiche le sélecteur de galaxies en haut à droite avec le nom de chaque galaxie
         * Double-clic sur une galaxie pour la renommer directement
         */
        function renderGalaxySwitcher() {
            const container = document.getElementById('galaxy-switcher');
            if (!container) return;
            ensureDefaultGalaxy();
            const frag = document.createDocumentFragment();

            state.galaxies.forEach((galaxy) => {
                const isActive = galaxy.id === state.activeGalaxyId;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.title = `${galaxy.name} (double-clic pour renommer)`;
                btn.setAttribute('aria-label', galaxy.name);
                btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
                btn.className = `h-8 px-2.5 rounded-xl flex items-center gap-1.5 shrink-0 transition-all duration-200 active:scale-95 text-xs font-semibold ${
                    isActive ? 'text-white' : 'text-slate-300 opacity-75 hover:opacity-100 hover:bg-white/10'
                }`;
                if (isActive) {
                    btn.style.backgroundColor = hexToRgba(galaxy.color, 0.24);
                    btn.style.boxShadow = `0 0 0 1.5px ${hexToRgba(galaxy.color, 0.75)}, 0 0 14px ${hexToRgba(galaxy.color, 0.45)}`;
                }

                const iconSpan = document.createElement('span');
                iconSpan.className = 'shrink-0 flex items-center justify-center';
                iconSpan.style.color = galaxy.color;
                iconSpan.innerHTML = getGalaxyIconSvg('w-4 h-4');

                const nameSpan = document.createElement('span');
                nameSpan.className = 'max-w-[7.5rem] truncate';
                nameSpan.textContent = galaxy.name;

                btn.appendChild(iconSpan);
                btn.appendChild(nameSpan);

                btn.addEventListener('click', () => {
                    switchGalaxy(galaxy.id);
                });

                btn.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    startInlineRenameGalaxy(galaxy.id, btn, nameSpan);
                });

                frag.appendChild(btn);
            });

            container.innerHTML = '';
            container.appendChild(frag);
        }

        function startInlineRenameGalaxy(galaxyId, hostEl, labelEl) {
            const galaxy = state.galaxies.find(g => g.id === galaxyId);
            if (!galaxy || !hostEl || !labelEl) return;

            const input = document.createElement('input');
            input.type = 'text';
            input.value = galaxy.name;
            input.maxLength = 24;
            input.className = 'w-24 sm:w-28 px-1.5 py-0.5 rounded-lg bg-slate-950/90 border border-sky-400/70 text-xs font-semibold text-white focus:outline-none';

            labelEl.replaceWith(input);
            input.focus();
            input.select();

            let finished = false;
            const commit = (save) => {
                if (finished) return;
                finished = true;
                if (save) {
                    const trimmed = input.value.trim();
                    if (trimmed && trimmed !== galaxy.name) {
                        galaxy.name = trimmed;
                        saveState();
                        showToast(`Galaxie renommée : ${trimmed}`, 'success');
                    }
                }
                renderGalaxySwitcher();
                renderGalaxyMenuList();
            };

            input.addEventListener('click', (e) => e.stopPropagation());
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commit(true);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    commit(false);
                }
            });
            input.addEventListener('blur', () => commit(true));
        }

        /**
         * Affiche la liste des galaxies dans le menu roue dentelée (sélection + renommage + suppression)
         */
        function renderGalaxyMenuList() {
            const list = document.getElementById('galaxy-menu-list');
            if (!list) return;
            ensureDefaultGalaxy();
            const frag = document.createDocumentFragment();

            const canDelete = state.galaxies.length > 1;

            state.galaxies.forEach((galaxy) => {
                const isActive = galaxy.id === state.activeGalaxyId;
                const row = document.createElement('div');
                row.className = `w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between gap-1.5 ${
                    isActive ? 'bg-white/15 text-white' : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`;

                const selectBtn = document.createElement('button');
                selectBtn.type = 'button';
                selectBtn.className = 'flex items-center gap-2 min-w-0 flex-1 text-left py-0.5';

                const iconSpan = document.createElement('span');
                iconSpan.className = 'shrink-0 flex items-center justify-center';
                iconSpan.style.color = galaxy.color;
                iconSpan.innerHTML = getGalaxyIconSvg('w-4 h-4');

                const nameSpan = document.createElement('span');
                nameSpan.className = 'truncate';
                nameSpan.textContent = galaxy.name;

                const countSpan = document.createElement('span');
                countSpan.className = 'ml-auto px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-mono text-slate-300 shrink-0';
                countSpan.textContent = galaxy.items.length;

                selectBtn.appendChild(iconSpan);
                selectBtn.appendChild(nameSpan);
                selectBtn.appendChild(countSpan);

                selectBtn.addEventListener('click', () => {
                    switchGalaxy(galaxy.id);
                });
                row.appendChild(selectBtn);

                const renameBtn = document.createElement('button');
                renameBtn.type = 'button';
                renameBtn.title = `Renommer ${galaxy.name}`;
                renameBtn.setAttribute('aria-label', `Renommer ${galaxy.name}`);
                renameBtn.className = 'p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-sky-500/15 transition-colors shrink-0';
                renameBtn.innerHTML = `
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                `;
                renameBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    startInlineRenameGalaxy(galaxy.id, selectBtn, nameSpan);
                });
                row.appendChild(renameBtn);

                if (canDelete) {
                    const delBtn = document.createElement('button');
                    delBtn.type = 'button';
                    delBtn.title = `Supprimer ${galaxy.name}`;
                    delBtn.setAttribute('aria-label', `Supprimer ${galaxy.name}`);
                    delBtn.className = 'p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors shrink-0';
                    delBtn.innerHTML = `
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    `;
                    delBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        confirmDeleteGalaxy(galaxy.id);
                    });
                    row.appendChild(delBtn);
                }

                frag.appendChild(row);
            });

            list.innerHTML = '';
            list.appendChild(frag);
        }

        function switchGalaxy(galaxyId) {
            const target = state.galaxies.find(g => g.id === galaxyId);
            if (!target) return;
            const changed = state.activeGalaxyId !== target.id;
            state.activeGalaxyId = target.id;
            state.selectedIndex = -1;

            if (changed) {
                cameraOrbit.targetYaw += 0.55;
                cameraOrbit.targetZoom = 16.5;
            }

            applyTheme(target.themeIndex, false);
            updateFilterButtonsUI();
            renderGalaxySwitcher();
            renderGalaxyMenuList();
            rebuildCards3D();
            backfillMissingWebsitePreviews();
            if (!document.getElementById('modal-manager').classList.contains('hidden')) {
                renderManagerList();
            }
            saveState();
        }

        function addGalaxy() {
            const newGalaxy = createGalaxyObject();
            state.galaxies.push(newGalaxy);
            switchGalaxy(newGalaxy.id);
            showToast(`${newGalaxy.name} créée !`, 'success');
        }

        function confirmDeleteGalaxy(galaxyId) {
            if (state.galaxies.length <= 1) {
                showToast('Vous devez conserver au moins une galaxie.', 'error');
                return;
            }
            const galaxy = state.galaxies.find(g => g.id === galaxyId);
            if (!galaxy) return;

            const cardCount = galaxy.items.length;
            const details = cardCount > 0
                ? `« ${galaxy.name} » et ses ${cardCount} carte${cardCount > 1 ? 's' : ''} seront supprimées définitivement.`
                : `« ${galaxy.name} » sera supprimée définitivement.`;

            askConfirm('Supprimer cette galaxie ?', details, () => {
                const idx = state.galaxies.findIndex(g => g.id === galaxyId);
                if (idx === -1 || state.galaxies.length <= 1) return;
                const wasActive = state.activeGalaxyId === galaxyId;
                state.galaxies.splice(idx, 1);

                if (wasActive) {
                    const nextGalaxy = state.galaxies[Math.min(idx, state.galaxies.length - 1)];
                    state.activeGalaxyId = nextGalaxy.id;
                    state.selectedIndex = -1;
                    applyTheme(nextGalaxy.themeIndex, false);
                    rebuildCards3D();
                } else {
                    pruneCardTextureCache();
                }

                saveState();
                updateFilterButtonsUI();
                renderGalaxySwitcher();
                renderGalaxyMenuList();
                if (!document.getElementById('modal-manager').classList.contains('hidden')) {
                    renderManagerList();
                }
                showToast(`${galaxy.name} supprimée.`, 'info');
            });
        }

