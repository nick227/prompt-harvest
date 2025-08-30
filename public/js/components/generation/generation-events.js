/* global GenerationEvents */
// Generation Event Layer - Event handling and user interactions for image generation
class GenerationEvents {
    constructor(generationManager) {
        this.generationManager = generationManager;
        this.ui = generationManager.ui;
        this.isInitialized = false;
    }

    setupEventListeners() {

        // Note: Button click is handled by ImagesManager in modules/images.js
        // We only handle provider changes and debug events here
        this.setupProviderChangeEvents();
        this.setupDebugEvents();

        this.isInitialized = true;

    }

    setupProviderChangeEvents() {
        // Listen for provider changes
        document.addEventListener('change', e => {
            if (e.target.name === 'providers') {
                this.handleProviderChange(e);
            }
        });
    }

    setupDebugEvents() {
        // Debug functions for development
        window.testAutoGeneration = () => {

            const _status = this.generationManager.getStatus();

            this.generationManager.checkAutoGenerationContinue();
        };
        window.testButtonFunctionality = () => {

            const _btn = this.ui.getGenerateButton();

            if (_btn) {

                _btn.click();
            } else {
                console.error('❌ Button not found');
            }
        };
        window.showDebugPanel = () => {
            const debugPanel = this.ui.createDebugPanel();

            debugPanel.style.display = 'block';
            this.updateDebugPanel();
        };
        window.hideDebugPanel = () => {
            const debugPanel = document.getElementById('debug-panel');

            if (debugPanel) {
                debugPanel.style.display = 'none';
            }
        };
    }

    handleProviderChange(e) {

        this.generationManager.updateProviderStatus();
    }

    updateDebugPanel() {
        const _status = this.generationManager.getStatus();
        const selectedProviders = Array.from(this.ui.getProviderCheckboxes()).map(p => p.value);

        this.ui.updateDebugPanel({
            ...status,
            selectedProviders
        });
    }

    // Event cleanup
    cleanup() {
        this.isInitialized = false;
    }

    // Re-setup events (useful for debugging)
    reSetupEventListeners() {

        this.cleanup();
        this.setupEventListeners();
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.GenerationEvents = GenerationEvents;
}
