/**
 * AI Image Generator - Complete integration of widget and service
 * Provides a ready-to-use AI image generator component
 */

class AIImageGenerator {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            // Default options
            placeholder: 'Describe the image you want to generate...',
            maxLength: 500,
            providers: aiImageGeneratorService.getProviders(),
            defaultProvider: 'dalle3',
            showCost: true,
            allowRetry: true,
            autoFocus: false,
            theme: 'default',
            // Generation options
            useProfileEndpoint: false, // Use profile avatar endpoint vs general image endpoint
            onImageGenerated: null,
            onError: null,
            onUseImage: null,
            ...options
        };

        this.widget = null;
        this.isGenerating = false;

        this.init();
    }

    /**
     * Initialize the generator
     */
    init() {
        console.log('🔍 AI-GENERATOR: Initializing AI Image Generator');
        console.log('🔍 AI-GENERATOR: Service available:', !!window.aiImageGeneratorService);
        console.log('🔍 AI-GENERATOR: Widget available:', !!window.AIImageGeneratorWidget);

        // Check authentication
        if (!window.aiImageGeneratorService || !window.aiImageGeneratorService.isAuthenticated()) {
            console.error('🔍 AI-GENERATOR: Authentication failed');
            this.showAuthError();
            return;
        }

        console.log('🔍 AI-GENERATOR: Creating widget for container:', this.containerId);

        try {
            // Create widget
            this.widget = new window.AIImageGeneratorWidget(this.containerId, this.options);
            console.log('🔍 AI-GENERATOR: Widget created successfully');

            // Attach event listeners
            this.attachEventListeners();
            console.log('🔍 AI-GENERATOR: Event listeners attached');
        } catch (error) {
            console.error('🔍 AI-GENERATOR: Failed to create widget:', error);
        }
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        if (!this.widget) {
            return;
        }

        // Handle generation start
        this.widget.on('generateStart', async (data) => {
            await this.handleGenerateStart(data);
        });

        // Handle use image
        this.widget.on('useImage', (data) => {
            this.handleUseImage(data);
        });

        // Handle retry
        this.widget.on('retry', () => {
            this.handleRetry();
        });

        // Handle errors
        this.widget.on('error', (data) => {
            this.handleError(data);
        });
    }

    /**
     * Handle generation start
     */
    async handleGenerateStart(data) {
        const { prompt, provider } = data;

        // Validate prompt
        const validation = aiImageGeneratorService.validatePrompt(prompt);
        if (!validation.valid) {
            this.widget.showError(validation.message);
            return;
        }

        this.isGenerating = true;
        this.widget.setGenerating(true);

        try {
            // Choose endpoint based on options
            const generateFunction = this.options.useProfileEndpoint
                ? aiImageGeneratorService.generateImage.bind(aiImageGeneratorService)
                : aiImageGeneratorService.generateGeneralImage.bind(aiImageGeneratorService);

            // Generate image
            const result = await generateFunction(prompt, provider);

            if (result.success) {
                this.widget.showGeneratedImage(result.imageUrl, result.prompt, result.provider);

                // Call custom callback
                if (this.options.onImageGenerated) {
                    this.options.onImageGenerated(result);
                }
            } else {
                this.widget.showError(result.error);
            }
        } catch (error) {
            console.error('Generation failed:', error);
            this.widget.showError('Failed to generate image. Please try again.');
        } finally {
            this.isGenerating = false;
            this.widget.setGenerating(false);
        }
    }

    /**
     * Handle use image
     */
    handleUseImage(data) {
        // Call custom callback
        if (this.options.onUseImage) {
            this.options.onUseImage(data);
        }
    }

    /**
     * Handle retry
     */
    handleRetry() {
        // Widget handles the UI reset
        // This is just for any custom logic
    }

    /**
     * Handle error
     */
    handleError(data) {
        // Call custom error callback
        if (this.options.onError) {
            this.options.onError(data);
        }
    }

    /**
     * Show authentication error
     */
    showAuthError() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="ai-generator-auth-error">
                <div class="auth-error-content">
                    <i class="fas fa-lock" aria-hidden="true"></i>
                    <h3>Authentication Required</h3>
                    <p>Please log in to generate images with AI.</p>
                    <button class="btn btn-primary" onclick="window.location.href='/login'">
                        <i class="fas fa-sign-in-alt" aria-hidden="true"></i>
                        Log In
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Public API methods
     */
    getWidget() {
        return this.widget;
    }

    getGeneratedImage() {
        return this.widget ? this.widget.getGeneratedImage() : null;
    }

    isGeneratingImage() {
        return this.isGenerating;
    }

    reset() {
        if (this.widget) {
            this.widget.reset();
        }
    }

    setPrompt(prompt) {
        if (this.widget) {
            this.widget.setPrompt(prompt);
        }
    }

    setProvider(provider) {
        if (this.widget) {
            this.widget.setProvider(provider);
        }
    }

    destroy() {
        if (this.widget) {
            this.widget.destroy();
        }
    }

    /**
     * Static factory methods for common use cases
     */
    static createProfileAvatarGenerator(containerId, onUseImage) {
        return new AIImageGenerator(containerId, {
            placeholder: 'Describe your avatar (e.g., professional headshot, friendly smile, business attire)',
            useProfileEndpoint: true,
            onUseImage: onUseImage,
            theme: 'default'
        });
    }

    static createGeneralImageGenerator(containerId, onUseImage) {
        return new AIImageGenerator(containerId, {
            placeholder: 'Describe the image you want to create...',
            useProfileEndpoint: false,
            onUseImage: onUseImage,
            theme: 'default'
        });
    }

    static createCompactGenerator(containerId, onUseImage) {
        return new AIImageGenerator(containerId, {
            placeholder: 'Describe your image...',
            useProfileEndpoint: false,
            onUseImage: onUseImage,
            theme: 'compact',
            showCost: false
        });
    }

    static createMinimalGenerator(containerId, onUseImage) {
        return new AIImageGenerator(containerId, {
            placeholder: 'Describe your image...',
            useProfileEndpoint: false,
            onUseImage: onUseImage,
            theme: 'minimal',
            showCost: false,
            allowRetry: false
        });
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.AIImageGenerator = AIImageGenerator;
}
