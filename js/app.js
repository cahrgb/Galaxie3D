
        // =========================================================================
        // 10. DÉMARRAGE DE L'APPLICATION DÈS QUE LE DOM EST PRÊT
        // =========================================================================
        async function bootstrapApp() {
            initDomCache();
            await loadState();
            renderGalaxySwitcher();
            renderGalaxyMenuList();
            updateFilterButtonsUI();
            updateAutoRotateUI();
            setupUIEvents();
            setupGlobalDragAndDrop();

            if (typeof THREE !== 'undefined') {
                initThreeScene();
                setup3DInteractions();
                startAnimationLoop();
                backfillMissingWebsitePreviews();
            } else {
                showToast('Impossible de charger Three.js (vérifiez votre connexion).', 'error');
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bootstrapApp);
        } else {
            bootstrapApp();
        }
