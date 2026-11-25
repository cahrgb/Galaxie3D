        // =========================================================================
        // 1. CONFIGURATION, THÈMES 3D, COULEURS & DONNÉES PAR DÉFAUT
        // =========================================================================
        const STORAGE_KEY = 'portail3d_sparse_v1';

        function readPreloadedState() {
            try {
                const el = document.getElementById('preloaded-state');
                if (!el || !el.textContent || !el.textContent.trim()) return null;
                const parsed = JSON.parse(el.textContent);
                return (parsed && typeof parsed === 'object') ? parsed : null;
            } catch {
                return null;
            }
        }

        const PRELOADED_STATE = readPreloadedState();
        const ACTIVE_STORAGE_KEY = (PRELOADED_STATE && typeof PRELOADED_STATE.exportId === 'string' && PRELOADED_STATE.exportId)
            ? `${STORAGE_KEY}_${PRELOADED_STATE.exportId}`
            : STORAGE_KEY;

        const ACCENT_COLORS = [
            { name: 'Bleu Ciel', hex: '#0ea5e9' },
            { name: 'Indigo', hex: '#6366f1' },
            { name: 'Violet', hex: '#a855f7' },
            { name: 'Rose Néon', hex: '#ec4899' },
            { name: 'Corail', hex: '#f43f5e' },
            { name: 'Ambre', hex: '#f59e0b' },
            { name: 'Émeraude', hex: '#10b981' },
            { name: 'Turquoise', hex: '#14b8a6' }
        ];

        const THEMES = [
            {
                name: 'Cosmos Spatial',
                bg: 0x050816,
                cssBg: '#050816',
                fog: 0x050816,
                starPrimary: 0x38bdf8,
                starSecondary: 0x818cf8,
                lightA: 0x38bdf8,
                lightB: 0xa855f7
            },
            {
                name: 'Aurore Boréale',
                bg: 0x041218,
                cssBg: '#041218',
                fog: 0x041218,
                starPrimary: 0x34d399,
                starSecondary: 0x22d3ee,
                lightA: 0x10b981,
                lightB: 0x06b6d4
            },
            {
                name: 'Nébuleuse Pourpre',
                bg: 0x12051b,
                cssBg: '#12051b',
                fog: 0x12051b,
                starPrimary: 0xf472b6,
                starSecondary: 0xc084fc,
                lightA: 0xec4899,
                lightB: 0x8b5cf6
            }
        ];

        // Aucun élément par défaut : l'espace 3D démarre entièrement vide
        const DEFAULT_ITEMS = [];

        // État global de l'application (multi-galaxies, par défaut aucune carte sélectionnée)
        const state = {
            galaxies: [],
            activeGalaxyId: null,
            autoRotate: true,
            filter: 'all',
            selectedIndex: -1,
            editingType: 'website',
            editingColor: ACCENT_COLORS[0].hex,
            editingImageData: null,
            editingImageAspect: null,
            editingPdfData: null,
            editingPdfName: '',
            editingPdfSize: 0,
            confirmCallback: null
        };

        // Références DOM mises en cache pour éviter les recherches répétées dans la boucle d'animation
        const domCache = {
            canvasContainer: null,
            modalEditor: null,
            modalManager: null,
            modalConfirm: null,
            modalPdfViewer: null,
            modalWebViewer: null,
            modalSearch: null,
            optionsMenu: null
        };

        function initDomCache() {
            domCache.canvasContainer = document.getElementById('canvas-container');
            domCache.modalEditor = document.getElementById('modal-editor');
            domCache.modalManager = document.getElementById('modal-manager');
            domCache.modalConfirm = document.getElementById('modal-confirm');
            domCache.modalPdfViewer = document.getElementById('modal-pdf-viewer');
            domCache.modalWebViewer = document.getElementById('modal-web-viewer');
            domCache.modalSearch = document.getElementById('modal-search');
            domCache.optionsMenu = document.getElementById('options-menu');
        }

