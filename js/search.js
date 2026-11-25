        // =========================================================================
        // 8B. RECHERCHE RAPIDE (CTRL+K / LOUPE)
        // =========================================================================
        const searchState = {
            matches: [],
            activeIndex: 0
        };

        function normalizeSearchText(str) {
            return String(str || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
        }

        function getSearchTypeMeta(type) {
            if (type === 'pdf') return { label: 'PDF', icon: '📄' };
            if (type === 'image') return { label: 'Image', icon: '🖼️' };
            return { label: 'Site', icon: '🌐' };
        }

        function updateSearchResults(query = '') {
            const resultsEl = document.getElementById('search-results');
            const countEl = document.getElementById('search-count');
            const clearBtn = document.getElementById('btn-search-clear');
            if (!resultsEl || !countEl) return;

            const normalizedQuery = normalizeSearchText(query).trim();
            if (clearBtn) clearBtn.classList.toggle('hidden', normalizedQuery.length === 0);

            const terms = normalizedQuery ? normalizedQuery.split(/\s+/).filter(Boolean) : [];
            const activeGalaxyId = state.activeGalaxyId;

            // Lister toutes les cartes de toutes les galaxies (galaxie active en premier)
            const orderedGalaxies = [...state.galaxies].sort((a, b) => {
                if (a.id === activeGalaxyId) return -1;
                if (b.id === activeGalaxyId) return 1;
                return 0;
            });

            const matches = [];
            for (const galaxy of orderedGalaxies) {
                const items = Array.isArray(galaxy.items) ? galaxy.items : [];
                for (const item of items) {
                    if (terms.length > 0) {
                        const haystack = normalizeSearchText(
                            `${item.title || ''} ${item.description || ''} ${item.url || ''} ${item.pdfName || ''} ${galaxy.name || ''} ${item.type || ''}`
                        );
                        if (!terms.every(term => haystack.includes(term))) continue;
                    }
                    matches.push({ galaxy, item });
                }
            }

            searchState.matches = matches;
            searchState.activeIndex = matches.length > 0 ? 0 : -1;

            countEl.textContent = matches.length <= 1 ? `${matches.length} résultat` : `${matches.length} résultats`;
            resultsEl.innerHTML = '';

            if (matches.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'py-10 px-4 text-center text-sm text-slate-400';
                empty.textContent = normalizedQuery
                    ? 'Aucune carte ne correspond à votre recherche.'
                    : 'Aucune carte dans vos galaxies.';
                resultsEl.appendChild(empty);
                return;
            }

            matches.forEach((entry, idx) => {
                const { galaxy, item } = entry;
                const meta = getSearchTypeMeta(item.type);
                const row = document.createElement('button');
                row.type = 'button';
                row.dataset.searchIndex = String(idx);
                row.className = 'w-full text-left px-3 py-2.5 rounded-2xl flex items-center gap-3 transition-all border border-transparent';

                const subtitle = item.type === 'website' && item.url
                    ? extractDomain(item.url)
                    : (item.description || item.pdfName || meta.label);

                const accentColor = item.color || '#38bdf8';
                const galaxyColor = galaxy.color || '#38bdf8';

                row.innerHTML = `
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base border border-white/10"
                        style="background: ${hexToRgba(accentColor, 0.18)};">
                        ${meta.icon}
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                            <p class="text-sm font-semibold text-white truncate">${escapeHtml(item.title || 'Sans titre')}</p>
                            <span class="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-white/10 text-slate-300 shrink-0">${meta.label}</span>
                        </div>
                        <p class="text-xs text-slate-400 truncate">${escapeHtml(subtitle)}</p>
                    </div>
                    <span class="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-xl text-[11px] font-medium bg-white/5 border border-white/10 text-slate-300 shrink-0 max-w-[8.5rem]">
                        <span class="w-2 h-2 rounded-full shrink-0" style="background:${escapeHtml(galaxyColor)};"></span>
                        <span class="truncate">${escapeHtml(galaxy.name)}</span>
                    </span>
                `;

                row.addEventListener('mouseenter', () => setActiveSearchIndex(idx, false));
                row.addEventListener('click', () => selectSearchResult(idx));
                resultsEl.appendChild(row);
            });

            highlightActiveSearchRow(false);
        }

        function highlightActiveSearchRow(scrollIntoView = true) {
            const resultsEl = document.getElementById('search-results');
            if (!resultsEl) return;
            const rows = resultsEl.querySelectorAll('button[data-search-index]');
            rows.forEach((row, idx) => {
                const isActive = idx === searchState.activeIndex;
                row.classList.toggle('bg-white/15', isActive);
                row.classList.toggle('border-sky-400/40', isActive);
                row.classList.toggle('hover:bg-white/10', !isActive);
                if (isActive && scrollIntoView) {
                    row.scrollIntoView({ block: 'nearest' });
                }
            });
        }

        function setActiveSearchIndex(idx, scrollIntoView = true) {
            if (searchState.matches.length === 0) {
                searchState.activeIndex = -1;
                return;
            }
            const len = searchState.matches.length;
            searchState.activeIndex = ((idx % len) + len) % len;
            highlightActiveSearchRow(scrollIntoView);
        }

        function selectSearchResult(idx) {
            const entry = searchState.matches[idx];
            if (!entry) return;
            const { galaxy, item } = entry;

            closeSearchModal();

            if (state.activeGalaxyId !== galaxy.id) {
                switchGalaxy(galaxy.id);
            }

            if (state.filter !== 'all' && state.filter !== item.type) {
                state.filter = 'all';
                updateFilterButtonsUI();
                rebuildCards3D(item.id);
                return;
            }

            const targetIndex = cardMeshes.findIndex(mesh => mesh.userData?.item?.id === item.id);
            if (targetIndex !== -1) {
                selectCard(targetIndex);
            } else {
                rebuildCards3D(item.id);
            }
        }

        function openSearchModal() {
            closeOptionsMenu();
            const ctxMenu = document.getElementById('card-context-menu');
            if (ctxMenu) ctxMenu.classList.add('hidden');
            const modal = domCache.modalSearch || document.getElementById('modal-search');
            const input = document.getElementById('search-input');
            if (!modal || !input) return;

            modal.classList.remove('hidden');
            input.value = '';
            updateSearchResults('');
            requestAnimationFrame(() => input.focus());
        }

        function closeSearchModal() {
            const modal = domCache.modalSearch || document.getElementById('modal-search');
            if (modal) modal.classList.add('hidden');
        }

        function setupQuickSearchEvents() {
            const toggleBtn = document.getElementById('btn-search-toggle');
            const modal = domCache.modalSearch || document.getElementById('modal-search');
            const input = document.getElementById('search-input');
            const clearBtn = document.getElementById('btn-search-clear');

            if (toggleBtn) {
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (modal && !modal.classList.contains('hidden')) {
                        closeSearchModal();
                    } else {
                        openSearchModal();
                    }
                });
            }

            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) closeSearchModal();
                });
            }

            if (clearBtn && input) {
                clearBtn.addEventListener('click', () => {
                    input.value = '';
                    updateSearchResults('');
                    input.focus();
                });
            }

            if (input) {
                input.addEventListener('input', () => {
                    updateSearchResults(input.value);
                });

                input.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setActiveSearchIndex(searchState.activeIndex + 1, true);
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setActiveSearchIndex(searchState.activeIndex - 1, true);
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (searchState.activeIndex >= 0) {
                            selectSearchResult(searchState.activeIndex);
                        }
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        closeSearchModal();
                    }
                });
            }

            window.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                    e.preventDefault();
                    if (modal && !modal.classList.contains('hidden')) {
                        closeSearchModal();
                    } else {
                        openSearchModal();
                    }
                    return;
                }

                if (e.key === '/' && !isAnyModalOpen()) {
                    const tag = (document.activeElement?.tagName || '').toLowerCase();
                    if (tag !== 'input' && tag !== 'textarea' && !document.activeElement?.isContentEditable) {
                        e.preventDefault();
                        openSearchModal();
                    }
                }
            });
        }
