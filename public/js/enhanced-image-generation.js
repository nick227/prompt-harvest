// Enhanced image generation with conservative retry logic and resource failure handling
class EnhancedImageGenerator {
    constructor() {
        this.isGenerating = false;
        this.retryCount = 0;
        this.maxRetries = 1; // Reduced to 1 retry only
        this.retryDelay = 3000; // 3 seconds
        this.timeout = 120000; // 2 minutes
        this.currentRequest = null;

        // Circuit breaker state
        this.circuitBreakerState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.failureThreshold = 3; // Reduced threshold
        this.lastFailureTime = null;
        this.resetTimeout = 60000; // 1 minute

        // Auto-generation state
        this.autoGenerationCounter = 0;
        this.autoGenerationMax = 1;
        this.isAutoGenerating = false;

        this.initialize();
    }

    initialize() {
        console.log('🔧 Enhanced Image Generator initialized with conservative retry logic');
        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        console.log('🔧 Enhanced Image Generation: setupEventListeners() called');

        // Override the existing generate button
        const generateBtn = document.querySelector('.btn-generate');
        console.log('🔍 Enhanced Image Generation: Generate button element:', generateBtn);

        if (generateBtn) {
            console.log('🔧 Enhanced Image Generation: Adding click listener to generate button');
            generateBtn.addEventListener('click', (e) => {
                console.log('🔧 Enhanced Image Generation: Button clicked, calling handleGenerateClick');
                e.preventDefault();
                this.handleGenerateClick(e);
            });
            console.log('✅ Enhanced Image Generation: Click listener added');
        } else {
            console.error('❌ Enhanced Image Generation: Generate button not found');
        }

        // Listen for provider changes
        document.addEventListener('change', (e) => {
            if (e.target.name === 'providers') {
                this.updateProviderStatus();
            }
        });

        // Add debug function for testing auto-generation
        window.testAutoGeneration = () => {
            console.log('🧪 Testing auto-generation...');
            console.log('Auto-generating state:', this.isAutoGenerating);
            console.log('Auto-generation counter:', this.autoGenerationCounter);
            console.log('Auto-generation max:', this.autoGenerationMax);
            console.log('Checkbox found:', !!document.querySelector('input[name="auto-generate"]'));
            console.log('Checkbox checked:', document.querySelector('input[name="auto-generate"]') && document.querySelector('input[name="auto-generate"]').checked);
            console.log('MaxNum value:', document.querySelector('input[name="maxNum"]') && document.querySelector('input[name="maxNum"]').value);

            this.checkAutoGenerationContinue();
        };
    }

    async handleGenerateClick(e) {
        console.log('🔧 Enhanced Image Generation: handleGenerateClick() called');
        console.log('🔍 Enhanced Image Generation: Event details:', e);

        if (this.isGenerating) {
            console.log('⚠️ Enhanced Image Generation: Generation already in progress');
            return;
        }

        if (this.circuitBreakerState === 'OPEN') {
            console.log('⚠️ Enhanced Image Generation: Circuit breaker is OPEN');
            this.showCircuitBreakerError();
            return;
        }

        console.log('🔧 Enhanced Image Generation: Getting prompt data...');

        // Reset auto-generation counter when user manually clicks
        this.autoGenerationCounter = 0;
        this.isAutoGenerating = false;

        const promptObj = this.getPromptData();
        console.log('🔍 Enhanced Image Generation: Prompt object:', promptObj);

        console.log('🔧 Enhanced Image Generation: Validating prompt...');
        if (!this.validatePrompt(promptObj)) {
            console.log('❌ Enhanced Image Generation: Prompt validation failed');
            return;
        }

        console.log('✅ Enhanced Image Generation: Prompt validated, calling generateImage...');

        // Check if this is the start of auto-generation
        const autoGenerateCheckbox = document.querySelector('input[name="auto-generate"]');
        if (autoGenerateCheckbox && autoGenerateCheckbox.checked) {
            console.log('🔄 Auto-generation checkbox is checked, will start auto-generation after first image');
        }

        await this.generateImage(promptObj);
    }

    getPromptData() {
        const promptInput = document.querySelector('#prompt-textarea');
        const guidanceElmTop = document.querySelector('select[name="guidance-top"]');
        const guidanceElmBottom = document.querySelector('select[name="guidance-bottom"]');
        const checkedProviders = Array.from(document.querySelectorAll('input[name="providers"]:checked')).map(input => input.value);

        // Fix guidance calculation - handle empty values
        const guidanceValTop = guidanceElmTop && guidanceElmTop.value ? parseInt(guidanceElmTop.value) : 10;
        const guidanceValBottom = guidanceElmBottom && guidanceElmBottom.value ? parseInt(guidanceElmBottom.value) : 10;

        // Ensure we have valid numbers and guidanceValTop >= guidanceValBottom
        const top = Math.max(guidanceValTop, guidanceValBottom);
        const bottom = Math.min(guidanceValTop, guidanceValBottom);
        const guidanceVal = Math.abs(Math.floor(Math.random() * (top - bottom)) + bottom);

        console.log('🔍 Guidance calculation:', {
            guidanceElmTop: guidanceElmTop?.value,
            guidanceElmBottom: guidanceElmBottom?.value,
            guidanceValTop,
            guidanceValBottom,
            top,
            bottom,
            guidanceVal
        });

        const multiplierInput = document.querySelector('#multiplier');
        const mixupCheckbox = document.querySelector('input[name="mixup"]');
        const mashupCheckbox = document.querySelector('input[name="mashup"]');

        return {
            prompt: promptInput ? promptInput.value.trim() : '',
            providers: checkedProviders,
            guidance: guidanceVal,
            multiplier: multiplierInput && multiplierInput.value.trim() ? true : false,
            mixup: mixupCheckbox ? mixupCheckbox.checked : false,
            mashup: mashupCheckbox ? mashupCheckbox.checked : false,
            promptId: Date.now().toString(),
            original: promptInput ? promptInput.value.trim() : ''
        };
    }

    validatePrompt(promptObj) {
        const errors = [];

        if (!promptObj.prompt || promptObj.prompt.trim().length === 0) {
            errors.push('Prompt is required');
        }

        if (!promptObj.providers || promptObj.providers.length === 0) {
            errors.push('At least one provider must be selected');
        }

        if (promptObj.prompt.length > 1000) {
            errors.push('Prompt exceeds maximum length of 1000 characters');
        }

        if (errors.length > 0) {
            this.showValidationError(errors);
            return false;
        }

        return true;
    }

    async generateImage(promptObj) {
        this.isGenerating = true;
        this.retryCount = 0;

        const loadingPlaceholder = this.createLoadingPlaceholder(promptObj);
        this.showLoadingState(loadingPlaceholder);

        try {
            const result = await this.generateWithConservativeRetry(promptObj);

            if (result.error) {
                this.handleErrorResponse(result, loadingPlaceholder);
            } else {
                this.handleSuccessResponse(result, loadingPlaceholder);
            }

        } catch (error) {
            console.error('❌ Image generation failed:', error);
            this.handleError(error, loadingPlaceholder);
        } finally {
            this.isGenerating = false;
            this.hideLoadingState();
        }
    }

    async generateWithConservativeRetry(promptObj) {
        // Conservative retry: only retry on specific transient errors, never on resource failures
        try {
            return await this.makeGenerationRequest(promptObj);
        } catch (error) {
            // Check if this is a retryable error (only network timeouts and temporary server issues)
            if (this.isRetryableError(error) && this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`🔄 Conservative retry (${this.retryCount}/${this.maxRetries}): ${error.message}`);

                // Show retry notification
                this.showNotification(`Retrying due to temporary issue... (${this.retryCount}/${this.maxRetries})`, 'warning');

                // Wait before retry
                await this.delay(this.retryDelay);

                // Try one more time
                return await this.makeGenerationRequest(promptObj);
            }

            // If not retryable or max retries reached, throw the error
            throw error;
        }
    }

    isRetryableError(error) {
        // VERY conservative: only retry on specific transient network issues
        const retryableErrors = [
            'Request timeout',
            'Network error',
            'ECONNRESET',
            'ETIMEDOUT',
            'ENOTFOUND',
            'Temporary server error'
        ];

        const errorMessage = error.message.toLowerCase();

        // Only retry on network timeouts and temporary server issues
        return retryableErrors.some(retryableError =>
            errorMessage.includes(retryableError.toLowerCase())
        );
    }

    async makeGenerationRequest(promptObj) {
        const data = {
            prompt: promptObj.prompt,
            providers: promptObj.providers,
            guidance: promptObj.guidance,
            multiplier: promptObj.multiplier,
            mixup: promptObj.mixup,
            mashup: promptObj.mashup,
            promptId: promptObj.promptId,
            original: promptObj.original
        };

        console.log('🚀 Sending enhanced generation request:', {
            prompt: data.prompt.substring(0, 50) + '...',
            providers: data.providers,
            guidance: data.guidance,
            multiplier: data.multiplier,
            mixup: data.mixup,
            mashup: data.mashup
        });

        try {
            const result = await imageApi.generateImage(
                data.prompt,
                data.providers,
                data.guidance,
                {
                    multiplier: data.multiplier,
                    mixup: data.mixup,
                    mashup: data.mashup,
                    promptId: data.promptId,
                    original: data.original
                }
            );

            this.onSuccess();
            return result;
        } catch (error) {
            console.error('🔍 Detailed error information:', {
                error: error,
                message: error.message,
                response: error.response,
                status: error.status,
                statusText: error.statusText
            });
            
            // Try to extract error details from response
            if (error.response) {
                try {
                    const errorData = await error.response.json();
                    console.error('🔍 Server error response:', errorData);
                    throw new Error(`Server error: ${JSON.stringify(errorData)}`);
                } catch (parseError) {
                    console.error('🔍 Could not parse error response:', parseError);
                    throw error;
                }
            }
            
            throw error;
        }
    }

    handleSuccessResponse(result, loadingPlaceholder) {
        console.log('✅ Image generation successful:', result);
        console.log('🔍 Full result object:', JSON.stringify(result, null, 2));

        // Extract data from the nested structure
        const data = result.data || result;
        console.log('🔍 Extracted data:', data);

        const imageData = {
            id: data.imageId || data.id || result.requestId || 'unknown',
            url: data.image || data.imageUrl || data.url || `uploads/${data.imageName}`,
            title: data.prompt || result.prompt || 'Image',
            prompt: data.prompt || result.prompt || '',
            original: data.original || result.original || '',
            provider: data.providerName || data.provider || result.provider || '',
            guidance: data.guidance || result.guidance || '',
            rating: data.rating || result.rating || ''
        };

        console.log('🔍 Processed image data:', imageData);

        this.replaceLoadingPlaceholder(loadingPlaceholder, imageData);
        // Temporarily disable refreshFeed to test for duplicates
        // this.refreshFeed();

        // Check if auto-generation should continue
        this.checkAutoGenerationContinue();
    }

    handleErrorResponse(errorResult, loadingPlaceholder) {
        console.error('❌ Server returned error:', errorResult);

        const errorMessage = this.formatErrorMessage(errorResult);
        this.showError(errorMessage, loadingPlaceholder);

        // Update circuit breaker state based on error type
        this.updateCircuitBreakerState(errorResult.error?.type);
    }

    handleError(error, loadingPlaceholder) {
        console.error('❌ Generation error:', error);

        const errorMessage = this.formatErrorMessage({
            error: {
                type: 'UNKNOWN_ERROR',
                message: error.message
            }
        });

        this.showError(errorMessage, loadingPlaceholder);
        this.onFailure(error);

        // Stop auto-generation on error
        this.stopAutoGeneration();
    }

    formatErrorMessage(errorResult) {
        const errorType = errorResult.error?.type || 'UNKNOWN_ERROR';
        const message = errorResult.error?.message || 'An unexpected error occurred';

        switch (errorType) {
            case 'VALIDATION_ERROR':
                return `Validation Error: ${message}`;

            case 'TIMEOUT_ERROR':
                return `Timeout Error: ${message}`;

            case 'PROVIDER_ERROR':
                return `Provider Error: ${message}`;

            case 'SERVICE_UNAVAILABLE':
                return `Service Unavailable: ${message}`;

            case 'CONTENT_POLICY_VIOLATION':
                return `Content Policy Violation: ${message}`;

            case 'RATE_LIMIT_EXCEEDED':
                return `Rate Limit Exceeded: ${message}`;

            case 'RESOURCE_FAILURE':
                return `Resource Failure: ${message}`;

            default:
                return `Error: ${message}`;
        }
    }

    updateCircuitBreakerState(errorType) {
        // More aggressive circuit breaker for resource failures
        const circuitBreakerErrors = [
            'SERVICE_UNAVAILABLE',
            'PROVIDER_ERROR',
            'TIMEOUT_ERROR',
            'RESOURCE_FAILURE'
        ];

        if (circuitBreakerErrors.includes(errorType)) {
            this.onFailure(new Error(errorType));
        }
    }

    onSuccess() {
        this.failureCount = 0;
        this.circuitBreakerState = 'CLOSED';
        console.log('✅ Circuit breaker: Success recorded');
    }

    onFailure(error) {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        console.error(`❌ Circuit breaker: Failure recorded (${this.failureCount}/${this.failureThreshold})`);

        if (this.failureCount >= this.failureThreshold) {
            this.circuitBreakerState = 'OPEN';
            console.log('🚨 Circuit breaker: OPEN state activated');

            // Schedule reset
            setTimeout(() => {
                this.circuitBreakerState = 'HALF_OPEN';
                console.log('🔄 Circuit breaker: HALF_OPEN state activated');
            }, this.resetTimeout);
        }
    }

    showCircuitBreakerError() {
        const timeUntilReset = this.getTimeUntilReset();
        const message = `Service temporarily unavailable. Please try again in ${Math.ceil(timeUntilReset / 1000)} seconds.`;

        this.showNotification(message, 'error');
    }

    getTimeUntilReset() {
        if (!this.lastFailureTime) return 0;
        const elapsed = Date.now() - this.lastFailureTime;
        return Math.max(0, this.resetTimeout - elapsed);
    }

    showValidationError(errors) {
        const message = `Validation failed:\n${errors.join('\n')}`;
        this.showNotification(message, 'error');
    }

    showError(message, loadingPlaceholder) {
        console.error('❌ Error:', message);

        if (loadingPlaceholder) {
            this.replaceLoadingPlaceholderWithError(loadingPlaceholder, message);
        } else {
            this.showNotification(message, 'error');
        }
    }

    createLoadingPlaceholder(promptObj) {
        const li = document.createElement('li');
        li.className = 'image-item loading-placeholder';

        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper loading';
        wrapper.style.cssText = `
            width: 100%;
            height: 150px;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #f5f5f5;
            border-radius: 3px;
            position: relative;
            border: 2px dashed #ccc;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            text-align: center;
            color: #666;
        `;

        const spinner = document.createElement('div');
        spinner.innerHTML = '⏳';
        spinner.style.cssText = `
            font-size: 24px;
            margin-bottom: 8px;
            animation: spin 1s linear infinite;
        `;

        const text = document.createElement('div');
        text.textContent = 'Generating...';
        text.style.cssText = `
            font-size: 12px;
            font-weight: bold;
        `;

        const promptPreview = document.createElement('div');
        promptPreview.textContent = promptObj.prompt.length > 30
            ? `${promptObj.prompt.substring(0, 30)}...`
            : promptObj.prompt;
        promptPreview.style.cssText = `
            font-size: 10px;
            margin-top: 4px;
            color: #999;
        `;

        content.appendChild(spinner);
        content.appendChild(text);
        content.appendChild(promptPreview);
        wrapper.appendChild(content);
        li.appendChild(wrapper);

        return li;
    }

    showLoadingState(loadingPlaceholder) {
        console.log('🔧 showLoadingState() called');
        console.log('🔍 Loading placeholder:', loadingPlaceholder);

        const container = document.querySelector('.prompt-output');
        console.log('🔍 Container:', container);

        if (container && loadingPlaceholder) {
            console.log('✅ Adding loading placeholder to container');
            container.insertBefore(loadingPlaceholder, container.firstChild);
            console.log('✅ Loading placeholder added');
        } else {
            console.error('❌ Container or loading placeholder not found');
        }

        const generateBtn = document.querySelector('.btn-generate');
        if (generateBtn) {
            console.log('🔧 Updating button state to processing...');
            generateBtn.classList.add('processing');
            generateBtn.textContent = 'Generating...';
            generateBtn.disabled = true;
            console.log('✅ Button state updated');
        }
    }

    hideLoadingState() {
        const generateBtn = document.querySelector('.btn-generate');
        if (generateBtn) {
            generateBtn.classList.remove('processing');
            generateBtn.textContent = 'START';
            generateBtn.disabled = false;
        }
    }

    replaceLoadingPlaceholder(loadingPlaceholder, imageData) {
        console.log('🔧 replaceLoadingPlaceholder() called');
        console.log('🔍 Loading placeholder:', loadingPlaceholder);
        console.log('🔍 Image data:', imageData);

        if (!loadingPlaceholder) {
            console.log('❌ No loading placeholder provided');
            return;
        }

        if (window.imageComponent && typeof window.imageComponent.createImageWrapper === 'function') {
            console.log('✅ imageComponent found, creating image wrapper...');
            const wrapper = window.imageComponent.createImageWrapper(imageData);
            console.log('🔍 Created wrapper:', wrapper);

            loadingPlaceholder.innerHTML = '';
            loadingPlaceholder.appendChild(wrapper);
            loadingPlaceholder.classList.remove('loading-placeholder');
            console.log('✅ Loading placeholder replaced with image');
        } else {
            console.error('❌ imageComponent not found or createImageWrapper method not available');
        }
    }

    replaceLoadingPlaceholderWithError(loadingPlaceholder, message) {
        if (!loadingPlaceholder) return;

        loadingPlaceholder.innerHTML = `
            <div class="image-wrapper error" style="
                width: 100%;
                height: 150px;
                display: flex;
                justify-content: center;
                align-items: center;
                background-color: #fee;
                border-radius: 3px;
                border: 2px dashed #fcc;
                color: #c33;
                text-align: center;
                padding: 10px;
                font-size: 12px;
            ">
                <div>
                    <div style="font-size: 16px; margin-bottom: 5px;">❌</div>
                    <div>${message}</div>
                </div>
            </div>
        `;
        loadingPlaceholder.classList.remove('loading-placeholder');
    }

    refreshFeed() {
        console.log('🔧 refreshFeed() called - checking if feedManager exists');
        if (window.feedManager && typeof window.feedManager.refreshFeed === 'function') {
            console.log('🔧 Calling feedManager.refreshFeed()');
            setTimeout(() => {
                window.feedManager.refreshFeed();
            }, 1000);
        } else {
            console.log('⚠️ feedManager not found or refreshFeed method not available');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
            animation: slideIn 0.3s ease-out;
        `;

        // Set background color based on type
        switch (type) {
            case 'error':
                notification.style.backgroundColor = '#dc3545';
                break;
            case 'success':
                notification.style.backgroundColor = '#28a745';
                break;
            case 'warning':
                notification.style.backgroundColor = '#ffc107';
                notification.style.color = '#212529';
                break;
            default:
                notification.style.backgroundColor = '#17a2b8';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    updateUI() {
        // Update provider status
        this.updateProviderStatus();
    }

    // Auto-generation methods
    stopAutoGeneration() {
        if (this.isAutoGenerating) {
            this.isAutoGenerating = false;
            this.autoGenerationCounter = 0;
            console.log('🔄 Auto-generation stopped');
        }
    }

    checkAutoGenerationContinue() {
        const autoGenerateCheckbox = document.querySelector('input[name="auto-generate"]');
        const maxNumInput = document.querySelector('input[name="maxNum"]');

        if (!autoGenerateCheckbox || !autoGenerateCheckbox.checked) {
            console.log('🔄 Auto-generation not enabled or checkbox unchecked');
            return; // Auto-generation not enabled
        }

        // Get current maxNum value (user might have changed it)
        const maxValue = maxNumInput ? parseInt(maxNumInput.value) : 1;
        const maxNum = Math.max(1, Math.min(10, maxValue || 1));

        if (!this.isAutoGenerating) {
            // Start auto-generation
            this.autoGenerationCounter = 0;
            this.autoGenerationMax = maxNum;
            this.isAutoGenerating = true;
            console.log(`🚀 Auto-generation started: ${this.autoGenerationMax} images`);
        }

        this.autoGenerationCounter++;
        console.log(`🔄 Generated ${this.autoGenerationCounter} of ${this.autoGenerationMax} images`);

        if (this.autoGenerationCounter < this.autoGenerationMax) {
            // Continue with next generation
            console.log(`🔄 Scheduling next auto-generation in 1 second...`);
            setTimeout(() => {
                this.generateNextImage();
            }, 1000);
        } else {
            // Reached max, stop auto-generation
            console.log('✅ Auto-generation completed: reached maximum count');
            this.stopAutoGeneration();
        }
    }

    generateNextImage() {
        console.log('🔄 Auto-generating next image...');

        // Use the same validation as manual generation
        const promptObj = this.getPromptData();

        if (!this.validatePrompt(promptObj)) {
            console.log('❌ Auto-generation validation failed, stopping');
            this.stopAutoGeneration();
            return;
        }

        console.log(`🔄 Auto-generating image ${this.autoGenerationCounter + 1} of ${this.autoGenerationMax}...`);

        // Generate the image using the same method
        this.generateImage(promptObj);
    }

    updateProviderStatus() {
        const checkedProviders = document.querySelectorAll('input[name="providers"]:checked');
        const generateBtn = document.querySelector('.btn-generate');

        if (generateBtn) {
            if (checkedProviders.length === 0) {
                generateBtn.disabled = true;
                generateBtn.title = 'Please select at least one provider';
            } else {
                generateBtn.disabled = false;
                generateBtn.title = `Selected providers: ${Array.from(checkedProviders).map(p => p.value).join(', ')}`;
            }
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public methods for external access
    getStatus() {
        return {
            isGenerating: this.isGenerating,
            circuitBreakerState: this.circuitBreakerState,
            failureCount: this.failureCount,
            retryCount: this.retryCount
        };
    }

    resetCircuitBreaker() {
        this.circuitBreakerState = 'CLOSED';
        this.failureCount = 0;
        this.lastFailureTime = null;
        console.log('🔄 Circuit breaker manually reset');
    }
}

// Initialize enhanced image generator
window.enhancedImageGenerator = new EnhancedImageGenerator();

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

console.log('✅ Enhanced Image Generator loaded with conservative retry logic');
