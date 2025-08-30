/* global GenerationManager */
// Generation Component - Main entry point using separated architecture
class GenerationComponent {
    constructor() {
        this.manager = new GenerationManager();
        this.isInitialized = false;
    }

    init() {

        // Wait for DOM to be ready before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initialize();
            });
        } else {
            this.initialize();
        }
    }

    initialize() {
        this.manager.init();
        this.isInitialized = true;

    }

    // Public API Methods - Backward compatibility
    setupEventListeners() {
        return this.manager.events.setupEventListeners();
    }

    // Delegate all methods to the manager for backward compatibility

    async handleGenerateClick(e) {
        return this.manager.events.handleGenerateClick(e);
    }

    getPromptData() {
        return this.manager.getPromptData();
    }

    validatePrompt(promptObj) {
        return this.manager.validatePrompt(promptObj);
    }

    async generateImage(promptObj) {
        return this.manager.generateImage(promptObj);
    }

    showValidationError(errors) {
        return this.manager.ui.showValidationError(errors);
    }

    showError(message) {
        return this.manager.ui.showError(message);
    }

    showNotification(message, type) {
        return this.manager.ui.showNotification(message, type);
    }

    updateUI() {
        return this.manager.updateUI();
    }

    // Auto-generation methods
    stopAutoGeneration() {
        return this.manager.stopAutoGeneration();
    }

    checkAutoGenerationContinue() {
        return this.manager.checkAutoGenerationContinue();
    }

    generateNextImage() {
        return this.manager.generateNextImage();
    }

    updateProviderStatus() {
        return this.manager.updateProviderStatus();
    }

    // Public methods for external access
    getStatus() {
        return this.manager.getStatus();
    }

    // Configuration methods
    updateValidationRules(newRules) {
        return this.manager.updateValidationRules(newRules);
    }

    getValidationRules() {
        return this.manager.getValidationRules();
    }

    // Statistics methods
    getGenerationStats() {
        return this.manager.getGenerationStats();
    }

    // Export/Import methods
    exportGenerationSettings() {
        return this.manager.exportGenerationSettings();
    }

    importGenerationSettings(settings) {
        return this.manager.importGenerationSettings(settings);
    }

    // Prompt analysis
    analyzePrompt(prompt) {
        return this.manager.analyzePrompt(prompt);
    }

    // Provider management
    validateProviders(_providers) {
        return this.manager.validateProviders(_providers);
    }

    // Error handling
    handleError(error, context) {
        return this.manager.handleError(error, context);
    }

    // Cleanup methods
    cleanup() {
        return this.manager.cleanup();
    }

    // Re-initialization
    reInitialize() {
        return this.manager.reInitialize();
    }

    // Debug methods
    enableDebugMode() {
        return this.manager.enableDebugMode();
    }

    disableDebugMode() {
        return this.manager.disableDebugMode();
    }

    // Manual test method for debugging
    testButtonClick() {

        const _btn = document.querySelector('.btn-generate');

        if (_btn) {

            _btn.click();
            setTimeout(() => { /* Empty block */ }, 1000);
        } else {
            console.error('❌ Button not found');
        }
    }

    // Comprehensive debug method
    debugGenerationFlow() {

        // Check component status

        // Check button
        const _btn = document.querySelector('.btn-generate');

        // Check generateImage function

        // Check form data
        const promptData = this.manager?.getPromptData();

        // Check validation
        if (promptData) {
            const _isValid = this.manager?.validatePrompt(promptData);

        }

        // Check providers
        const _providers = document.querySelectorAll('input[name="providers"]:checked');

    }

    // Performance monitoring
    startPerformanceTimer() {
        return this.manager.startPerformanceTimer();
    }

    endPerformanceTimer() {
        return this.manager.endPerformanceTimer();
    }

    // Event re-setup (for debugging)
    reSetupEventListeners() {
        return this.manager.events.reSetupEventListeners();
    }

    // Backward compatibility methods
    getPromptDataLegacy() {
        return this.manager.getPromptData();
    }

    validatePromptLegacy(promptObj) {
        return this.manager.validatePrompt(promptObj);
    }

    generateImageLegacy(promptObj) {
        return this.manager.generateImage(promptObj);
    }
}

// Initialize global instance
if (typeof window !== 'undefined') {
    window.GenerationComponent = GenerationComponent;
    window.generationComponent = new GenerationComponent();

    // Initialize the component when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.generationComponent.init();
        });
    } else {
        window.generationComponent.init();
    }

    // Add global test function
    window.testGenerationButton = () => {
        if (window.generationComponent) {
            window.generationComponent.testButtonClick();
        } else {
            console.error('❌ Generation component not available');
        }
    };

    // Add global debug function
    window.debugGenerationFlow = () => {
        if (window.generationComponent) {
            window.generationComponent.debugGenerationFlow();
        } else {
            console.error('❌ Generation component not available');
        }
    };
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GenerationComponent;
}
