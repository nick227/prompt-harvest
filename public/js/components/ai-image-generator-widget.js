/**
 * AI Image Generator Widget - Reusable component for generating images with AI
 * Provides a clean, focused interface for image generation across the website
 */

class AIImageGeneratorWidget {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            // Default options
            placeholder: 'Describe the image you want to generate...',
            maxLength: 500,
            providers: [
                { value: 'dalle3', label: 'DALL-E 3 (High Quality)', cost: 1 },
                { value: 'dalle2', label: 'DALL-E 2 (Standard)', cost: 1 }
            ],
            defaultProvider: 'dalle3',
            showCost: true,
            allowRetry: true,
            autoFocus: false,
            theme: 'default', // default, compact, minimal
            ...options
        };

        this.isGenerating = false;
        this.generatedImage = null;
        this.eventListeners = new Map();

        this.init();
    }

    /**
     * Initialize the widget
     */
    init() {
        this.render();
        this.attachEventListeners();
        this.updateCost();
    }

    /**
     * Render the widget HTML
     */
    render() {
        const container = document.getElementById(this.containerId);

        if (!container) {
            console.error(`AI Image Generator Widget: Container with id "${this.containerId}" not found`);

            return;
        }

        const themeClass = this.options.theme !== 'default' ? `ai-generator-${this.options.theme}` : '';

        container.innerHTML = `
            <div class="ai-image-generator-widget ${themeClass}" data-widget-id="${this.containerId}">
                <!-- Generation Form -->
                <div class="ai-generator-form">
                    <div class="form-group">
                        <label for="${this.containerId}-prompt" class="form-label">
                            <i class="fas fa-magic" aria-hidden="true"></i>
                            Describe your image
                        </label>
                        <textarea
                            id="${this.containerId}-prompt"
                            class="form-textarea ai-prompt-input"
                            placeholder="${this.options.placeholder}"
                            maxlength="${this.options.maxLength}"
                            rows="3"
                            ${this.options.autoFocus ? 'autofocus' : ''}
                        ></textarea>
                        <div class="form-help">
                            <span class="char-count">0 / ${this.options.maxLength}</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="${this.containerId}-provider" class="form-label">
                            <i class="fas fa-robot" aria-hidden="true"></i>
                            AI Provider
                        </label>
                        <select id="${this.containerId}-provider" class="form-select ai-provider-select">
                            ${this.options.providers.map(provider => `<option value="${provider.value}" ${provider.value === this.options.defaultProvider ? 'selected' : ''}>
                                    ${provider.label}
                                </option>`
    ).join('')}
                        </select>
                    </div>

                    ${this.options.showCost
        ? `
                        <div class="generation-cost">
                            <i class="fas fa-coins" aria-hidden="true"></i>
                            <span>Cost: <span class="cost-amount">1 credit</span></span>
                        </div>
                    `
        : ''}

                    <div class="form-actions">
                        <button type="button" class="btn btn-primary generate-btn" disabled>
                            <i class="fas fa-magic" aria-hidden="true"></i>
                            <span class="btn-text">Generate Image</span>
                        </button>
                    </div>
                </div>

                <!-- Generation Preview -->
                <div class="ai-generator-preview hidden">
                    <div class="preview-header">
                        <h4><i class="fas fa-image" aria-hidden="true"></i> Generated Image</h4>
                        <div class="generation-status">
                            <span class="status-text">Ready to use</span>
                        </div>
                    </div>

                    <div class="generated-image-container">
                        <img class="generated-image" src="" alt="Generated image" />
                        <div class="image-actions">
                            <button type="button" class="btn btn-success use-image-btn">
                                <i class="fas fa-check" aria-hidden="true"></i>
                                Use This Image
                            </button>
                            ${this.options.allowRetry
        ? `
                                <button type="button" class="btn btn-secondary retry-btn">
                                    <i class="fas fa-redo" aria-hidden="true"></i>
                                    Try Again
                                </button>
                            `
        : ''}
                        </div>
                    </div>

                    <div class="generation-info">
                        <p class="generation-prompt">
                            <strong>Prompt:</strong> <span class="prompt-text"></span>
                        </p>
                        <p class="generation-provider">
                            <strong>Provider:</strong> <span class="provider-text"></span>
                        </p>
                    </div>
                </div>

                <!-- Loading State -->
                <div class="ai-generator-loading hidden">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Generating your image...</div>
                        <div class="loading-subtext">This may take a few moments</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const container = document.getElementById(this.containerId);

        if (!container) { return; }

        // Prompt input
        const promptInput = container.querySelector('.ai-prompt-input');

        if (promptInput) {
            promptInput.addEventListener('input', this.handlePromptInput.bind(this));
            promptInput.addEventListener('keydown', this.handlePromptKeydown.bind(this));
        }

        // Provider selection
        const providerSelect = container.querySelector('.ai-provider-select');

        if (providerSelect) {
            providerSelect.addEventListener('change', this.handleProviderChange.bind(this));
        }

        // Generate button
        const generateBtn = container.querySelector('.generate-btn');

        if (generateBtn) {
            generateBtn.addEventListener('click', this.handleGenerate.bind(this));
        }

        // Use image button
        const useImageBtn = container.querySelector('.use-image-btn');

        if (useImageBtn) {
            useImageBtn.addEventListener('click', this.handleUseImage.bind(this));
        }

        // Retry button
        const retryBtn = container.querySelector('.retry-btn');

        if (retryBtn) {
            retryBtn.addEventListener('click', this.handleRetry.bind(this));
        }
    }

    /**
     * Handle prompt input changes
     */
    handlePromptInput(event) {
        const prompt = event.target.value.trim();
        const charCount = event.target.value.length;
        const generateBtn = this.getGenerateButton();
        const charCountElement = this.getCharCountElement();

        // Update character count
        if (charCountElement) {
            charCountElement.textContent = `${charCount} / ${this.options.maxLength}`;
        }

        // Enable/disable generate button
        if (generateBtn) {
            generateBtn.disabled = prompt.length === 0 || this.isGenerating;
        }

        // Emit input event
        this.emit('input', { prompt, charCount });
    }

    /**
     * Handle prompt keydown (Enter to generate)
     */
    handlePromptKeydown(event) {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            const generateBtn = this.getGenerateButton();

            if (generateBtn && !generateBtn.disabled) {
                this.handleGenerate();
            }
        }
    }

    /**
     * Handle provider change
     */
    handleProviderChange(event) {
        this.updateCost();
        this.emit('providerChange', { provider: event.target.value });
    }

    /**
     * Handle generate button click
     */
    async handleGenerate() {
        const prompt = this.getPrompt();
        const provider = this.getProvider();

        if (!prompt.trim()) {
            this.emit('error', { message: 'Please enter a description for your image' });

            return;
        }

        if (this.isGenerating) {
            return;
        }

        this.isGenerating = true;
        this.showLoading();

        try {
            this.emit('generateStart', { prompt, provider });

            // This will be handled by the parent component
            // The widget just emits events and manages UI state
        } catch (error) {
            this.isGenerating = false;
            this.hideLoading();
            this.emit('error', { message: 'Failed to generate image', error });
        }
    }

    /**
     * Handle use image button click
     */
    handleUseImage() {
        if (this.generatedImage) {
            this.emit('useImage', {
                imageUrl: this.generatedImage.url,
                prompt: this.generatedImage.prompt,
                provider: this.generatedImage.provider
            });
        }
    }

    /**
     * Handle retry button click
     */
    handleRetry() {
        this.clearGeneratedImage();
        this.emit('retry');
    }

    /**
     * Show generated image
     */
    showGeneratedImage(imageUrl, prompt, provider) {
        this.generatedImage = { url: imageUrl, prompt, provider };

        const preview = this.getPreviewElement();
        const image = this.getGeneratedImageElement();
        const promptText = this.getPromptTextElement();
        const providerText = this.getProviderTextElement();

        if (image) {
            image.src = imageUrl;
        }
        if (promptText) {
            promptText.textContent = prompt;
        }
        if (providerText) {
            const providerLabel = this.options.providers.find(p => p.value === provider)?.label || provider;

            providerText.textContent = providerLabel;
        }

        this.hideLoading();
        this.hideForm();
        this.showPreview();
        this.updateStatus('Ready to use', 'success');

        this.emit('imageGenerated', { imageUrl, prompt, provider });
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.hideForm();
        this.hidePreview();
        this.showLoadingElement();
        this.updateStatus('Generating your image...', 'generating');
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.hideLoadingElement();
    }

    /**
     * Show error state
     */
    showError(message) {
        this.hideLoading();
        this.showForm();
        this.updateStatus(message, 'error');
        this.emit('error', { message });
    }

    /**
     * Clear generated image and reset
     */
    clearGeneratedImage() {
        this.generatedImage = null;
        this.hidePreview();
        this.showForm();
        this.updateStatus('Ready to generate', 'default');
    }

    /**
     * Reset widget to initial state
     */
    reset() {
        this.clearGeneratedImage();
        this.setPrompt('');
        this.setProvider(this.options.defaultProvider);
        this.isGenerating = false;
    }

    /**
     * Update cost display
     */
    updateCost() {
        const provider = this.getProvider();
        const costElement = this.getCostElement();

        if (costElement) {
            const providerData = this.options.providers.find(p => p.value === provider);
            const cost = providerData?.cost || 1;

            costElement.textContent = `${cost} credit${cost !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Update status display
     */
    updateStatus(text, type = 'default') {
        const statusElement = this.getStatusElement();

        if (statusElement) {
            statusElement.textContent = text;
            statusElement.className = `status-text ${type}`;
        }
    }

    /**
     * Show/hide elements
     */
    showForm() {
        const form = this.getFormElement();

        if (form) {
            form.classList.remove('hidden');
        }
    }

    hideForm() {
        const form = this.getFormElement();

        if (form) {
            form.classList.add('hidden');
        }
    }

    showPreview() {
        const preview = this.getPreviewElement();

        if (preview) {
            preview.classList.remove('hidden');
        }
    }

    hidePreview() {
        const preview = this.getPreviewElement();

        if (preview) {
            preview.classList.add('hidden');
        }
    }

    showLoadingElement() {
        const loading = this.getLoadingElement();

        if (loading) {
            loading.classList.remove('hidden');
        }
    }

    hideLoadingElement() {
        const loading = this.getLoadingElement();

        if (loading) {
            loading.classList.add('hidden');
        }
    }

    /**
     * Get form data
     */
    getPrompt() {
        const input = this.getPromptInput();

        return input ? input.value.trim() : '';
    }

    getProvider() {
        const select = this.getProviderSelect();

        return select ? select.value : this.options.defaultProvider;
    }

    /**
     * Set form data
     */
    setPrompt(prompt) {
        const input = this.getPromptInput();

        if (input) {
            input.value = prompt;
            this.handlePromptInput({ target: input });
        }
    }

    setProvider(provider) {
        const select = this.getProviderSelect();

        if (select) {
            select.value = provider;
            this.updateCost();
        }
    }

    /**
     * DOM element getters
     */
    getFormElement() {
        return document.querySelector(`#${this.containerId} .ai-generator-form`);
    }

    getPreviewElement() {
        return document.querySelector(`#${this.containerId} .ai-generator-preview`);
    }

    getLoadingElement() {
        return document.querySelector(`#${this.containerId} .ai-generator-loading`);
    }

    getPromptInput() {
        return document.querySelector(`#${this.containerId}-prompt`);
    }

    getProviderSelect() {
        return document.querySelector(`#${this.containerId}-provider`);
    }

    getGenerateButton() {
        return document.querySelector(`#${this.containerId} .generate-btn`);
    }

    getGeneratedImageElement() {
        return document.querySelector(`#${this.containerId} .generated-image`);
    }

    getPromptTextElement() {
        return document.querySelector(`#${this.containerId} .prompt-text`);
    }

    getProviderTextElement() {
        return document.querySelector(`#${this.containerId} .provider-text`);
    }

    getStatusElement() {
        return document.querySelector(`#${this.containerId} .status-text`);
    }

    getCostElement() {
        return document.querySelector(`#${this.containerId} .cost-amount`);
    }

    getCharCountElement() {
        return document.querySelector(`#${this.containerId} .char-count`);
    }

    /**
     * Event system
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);

            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data = {}) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for "${event}":`, error);
                }
            });
        }
    }

    /**
     * Public API methods
     */
    getGeneratedImage() {
        return this.generatedImage;
    }

    isGeneratingImage() {
        return this.isGenerating;
    }

    setGenerating(generating) {
        this.isGenerating = generating;
        const generateBtn = this.getGenerateButton();

        if (generateBtn) {
            generateBtn.disabled = generating || this.getPrompt().length === 0;
        }
    }

    destroy() {
        const container = document.getElementById(this.containerId);

        if (container) {
            container.innerHTML = '';
        }
        this.eventListeners.clear();
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.AIImageGeneratorWidget = AIImageGeneratorWidget;
}
