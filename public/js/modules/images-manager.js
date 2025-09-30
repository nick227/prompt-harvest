/**
 * Main Images Manager - Orchestrator
 * Simplified version of original images.js - coordinates all image-related functionality
 */

class ImagesManager {
    constructor() {
        this.config = IMAGE_CONFIG;
        this.isInitialized = false;

        // Initialize sub-managers
        this.api = new ImageGenerationAPI();
        this.dom = new ImageDOMManager();
        this.ui = new ImageUIState();
    }

    init() {
        if (this.isInitialized) {
            return;
        }

        this.ui.setupEventListeners(this.handleGenerateClick.bind(this));
        this.isInitialized = true;
    }

    async generateImage(prompt, providers = [], options = {}) {

        // Check if user is authenticated
        if (!window.userApi || !window.userApi.isAuthenticated()) {
            console.error('❌ MANAGER: User must be logged in to generate images');
            throw new Error('You must be logged in to generate images. Please log in and try again.');
        }

        try {
            // Generate image via API with options
            const imageData = await this.api.generateImage(prompt, providers, options);

            // Add to DOM
            const img = this.dom.addImageToOutput(imageData, false);

            // Dispatch success event
            window.dispatchEvent(new CustomEvent('imageGenerated', {
                detail: {
                    imageData,
                    timestamp: new Date().toISOString()
                }
            }));

            // Check if auto-generation should continue
            this.checkAutoGenerationContinue();

            return img;
        } catch (error) {
            // Handle 402 Payment Required error specifically
            if (error.status === 402) {

                // Clear loading state before showing credit modal
                this.dom.removeLoadingPlaceholder();
                this.handleInsufficientCredits(error);

                return; // Don't throw, we've handled it
            }

            // Handle 500 server errors with user notification
            if (error.status === 500) {
                console.error('❌ MANAGER: Server error (500) - showing user notification');

                // Clear loading state before showing error notification
                this.dom.removeLoadingPlaceholder();
                this.showServerErrorNotification(error);
                return; // Don't throw, we've handled it
            }

            console.error('❌ MANAGER: Generation failed', error);
            throw error;
        }
    }

    async handleGenerateClick(e) {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        e.preventDefault();

        // Check authentication first
        if (!window.userApi || !window.userApi.isAuthenticated()) {
            this.ui.showAuthRequiredMessage();

            return;
        }

        // Guard against duplicate calls
        if (this.ui.isGenerating) {
            this.ui.showValidationErrors(`⚠️ DUPLICATE CALL [${requestId}]: Generation already in progress, ignoring`);

            return;
        }

        // Validate inputs
        const validation = this.ui.validateGenerationInputs();

        if (!validation.isValid) {
            this.ui.showValidationErrors(validation.errors);

            return;
        }

        console.log('✅ VALIDATION: All checks passed', {
            prompt: validation.prompt,
            providers: validation.providers
        });

        const promptObj = {
            prompt: validation.prompt,
            promptId: Date.now().toString(),
            original: validation.prompt
        };
        // Show loading state
        const loadingPlaceholder = this.dom.showLoadingPlaceholder(promptObj);
        this.ui.setGeneratingState(true);

        try {
            console.log('🔧 FLOW: Starting generateImage', {
                prompt: validation.prompt,
                providers: validation.providers,
                options: validation
            });

            await this.generateImage(validation.prompt, validation.providers, validation);

            this.ui.showGenerationSuccess();
        } catch (error) {
            // Only log if it's not a handled error (402, 500)
            if (error.status !== 402 && error.status !== 500) {
                console.error('❌ FLOW: generateImage failed', error);
            }
            this.ui.showGenerationError(error);
            this.dom.removeLoadingPlaceholder();

        } finally {
            this.ui.setGeneratingState(false);

        }
    }

    /**
     * Handle server error (500) with user notification
     * @param {Error} error - Error object with status 500
     */
    showServerErrorNotification(error) {

        let errorMessage = 'Image generation failed due to a server error. Please try again.';

        // Try to extract more specific error information
        if (error.data && error.data.error) {
            const serverError = error.data.error;
            if (typeof serverError === 'string') {
                errorMessage = `Server Error: ${serverError}`;
            } else if (serverError.message) {
                errorMessage = `Server Error: ${serverError.message}`;
            }
        }

        // Show simple browser alert
        alert(errorMessage);

        // Remove loading placeholder
        this.dom.removeLoadingPlaceholder();
    }

    /**
     * Handle insufficient credits error (402)
     * @param {Error} error - Error object with status 402
     */
    handleInsufficientCredits(error) {

        // Use the credits modal service to show the modal
        if (window.creditsModalService) {
            window.creditsModalService.showCreditsModal(error.data);
        } else {
            console.error('❌ MANAGER: CreditsModalService not available');

            // Fallback to basic alert
            const required = error.data?.required || 1;
            const current = error.data?.current || 0;
            const message = `Insufficient Credits!\n\nYou need ${required} credits to generate this image, ` +
                `but you only have ${current} credits.\n\nPlease add more credits to continue.`;

            alert(message);
        }
    }

    checkAutoGenerationContinue() {

        // Skip auto-generation check if this was triggered by auto-generation itself
        if (window.generationComponent &&
            window.generationComponent.manager &&
            window.generationComponent.manager.isAutoGeneratedClick) {

            return;
        }

        // Check if generation component is available
        if (window.generationComponent && window.generationComponent.checkAutoGenerationContinue) {

            window.generationComponent.checkAutoGenerationContinue();
        } else {

        }
    }

    // Public API methods for backward compatibility
    initialize() {
        this.init();
    }

    refresh() {
        this.ui.setupEventListeners(this.handleGenerateClick.bind(this));
    }

    generateImageGlobal(prompt, providers) {
        return this.generateImage(prompt, providers);
    }

    addImageToOutput(_results, download) {
        return this.dom.addImageToOutput(_results, download);
    }

    addImageToOutputGlobal(_results, download) {
        return this.addImageToOutput(_results, download);
    }

    cleanup() {
        this.ui.cleanup();
        this.isInitialized = false;
    }
}

// Initialize when dependencies are available
let imagesManager = null;

const initImagesManager = () => {
    if (typeof IMAGE_CONFIG !== 'undefined') {
        imagesManager = new ImagesManager();

        // Wait for DOM to be ready before initializing
        // Note: Don't auto-initialize here - let app.js handle initialization to avoid conflicts
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                // Only init if not already initialized by app.js
                if (!imagesManager.isInitialized) {
                    imagesManager.init();
                }
            });
        } else if (!imagesManager.isInitialized) {
            // Only init if not already initialized by app.js
            imagesManager.init();
        }

        // Export functions for global access (maintaining backward compatibility)
        const generateImage = (prompt, providers, options = {}) => imagesManager.generateImage(prompt, providers, options);
        const addImageToOutput = (_results, download) => imagesManager.addImageToOutput(_results, download);

        // Export for testing
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = ImagesManager;
        }

        // Export for global access
        if (typeof window !== 'undefined') {
            window.ImagesManager = ImagesManager;
            window.imagesManager = imagesManager;
            window.generateImage = generateImage;
            window.addImageToOutput = addImageToOutput;

            // Add test function for debugging
            window.testImagesManagerButton = () => {
                const btn = document.querySelector('.btn-generate');

                if (btn) {
                    btn.click();
                } else {
                    console.error('❌ Button not found');
                }
            };
        }
    } else {
        // Retry after a short delay
        setTimeout(initImagesManager, 50);
    }
};

// Export for global access
if (typeof window !== 'undefined') {
    window.ImagesManager = ImagesManager;
    window.imagesManager = new ImagesManager();
}

// Start initialization
initImagesManager();
