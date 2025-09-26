/**
 * Consolidated Image Placeholder
 * Handles image loading placeholders and error states
 * Consolidates: image-placeholder-handler.js + image-placeholder.js + loading-placeholder-factory.js
 */

export class ImagePlaceholder {
    constructor() {
        this.isInitialized = false;
        this.placeholders = new Map();
        this.loadingPlaceholders = new Map();
        this.errorPlaceholders = new Map();
        
        // Placeholder configurations
        this.config = {
            loadingText: 'Loading...',
            errorText: 'Failed to load image',
            retryText: 'Retry',
            loadingSpinner: true,
            errorIcon: true,
            retryButton: true
        };
    }

    /**
     * Initialize image placeholder
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log('🖼️ IMAGE-PLACEHOLDER: Initializing placeholder system...');
            
            // Setup placeholder styles
            this.setupPlaceholderStyles();
            
            // Initialize placeholder components
            this.initializePlaceholderComponents();
            
            this.isInitialized = true;
            console.log('✅ IMAGE-PLACEHOLDER: Placeholder system initialized');
        } catch (error) {
            console.error('❌ IMAGE-PLACEHOLDER: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup placeholder styles
     */
    setupPlaceholderStyles() {
        // Create placeholder styles if they don't exist
        if (!document.querySelector('#image-placeholder-styles')) {
            const style = document.createElement('style');
            style.id = 'image-placeholder-styles';
            style.textContent = `
                .image-placeholder {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: #f5f5f5;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    min-height: 200px;
                    position: relative;
                }
                
                .image-placeholder.loading {
                    background-color: #f9f9f9;
                }
                
                .image-placeholder.error {
                    background-color: #fef2f2;
                    border-color: #fecaca;
                }
                
                .placeholder-content {
                    text-align: center;
                    color: #666;
                }
                
                .placeholder-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 10px;
                }
                
                .placeholder-icon {
                    font-size: 48px;
                    color: #ccc;
                    margin-bottom: 10px;
                }
                
                .placeholder-text {
                    font-size: 16px;
                    margin-bottom: 10px;
                }
                
                .placeholder-button {
                    background-color: #3498db;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .placeholder-button:hover {
                    background-color: #2980b9;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Initialize placeholder components
     */
    initializePlaceholderComponents() {
        // Setup image load event listeners
        this.setupImageLoadListeners();
        
        // Setup retry button listeners
        this.setupRetryButtonListeners();
    }

    /**
     * Setup image load event listeners
     */
    setupImageLoadListeners() {
        // Listen for image load events
        document.addEventListener('imageLoadStart', (e) => {
            this.showLoadingPlaceholder(e.detail.imageId, e.detail.container);
        });

        document.addEventListener('imageLoadSuccess', (e) => {
            this.hidePlaceholder(e.detail.imageId);
        });

        document.addEventListener('imageLoadError', (e) => {
            this.showErrorPlaceholder(e.detail.imageId, e.detail.container, e.detail.error);
        });
    }

    /**
     * Setup retry button listeners
     */
    setupRetryButtonListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.placeholder-retry-button')) {
                const imageId = e.target.dataset.imageId;
                this.retryImageLoad(imageId);
            }
        });
    }

    /**
     * Show loading placeholder
     * @param {string} imageId - Image ID
     * @param {HTMLElement} container - Container element
     */
    showLoadingPlaceholder(imageId, container) {
        const placeholder = this.createLoadingPlaceholder(imageId);
        this.placeholders.set(imageId, placeholder);
        this.loadingPlaceholders.set(imageId, placeholder);
        
        if (container) {
            container.appendChild(placeholder);
        }
    }

    /**
     * Show error placeholder
     * @param {string} imageId - Image ID
     * @param {HTMLElement} container - Container element
     * @param {Error} error - Error object
     */
    showErrorPlaceholder(imageId, container, error) {
        const placeholder = this.createErrorPlaceholder(imageId, error);
        this.placeholders.set(imageId, placeholder);
        this.errorPlaceholders.set(imageId, placeholder);
        
        if (container) {
            container.appendChild(placeholder);
        }
    }

    /**
     * Hide placeholder
     * @param {string} imageId - Image ID
     */
    hidePlaceholder(imageId) {
        const placeholder = this.placeholders.get(imageId);
        if (placeholder) {
            placeholder.remove();
            this.placeholders.delete(imageId);
            this.loadingPlaceholders.delete(imageId);
            this.errorPlaceholders.delete(imageId);
        }
    }

    /**
     * Create loading placeholder
     * @param {string} imageId - Image ID
     * @returns {HTMLElement} Placeholder element
     */
    createLoadingPlaceholder(imageId) {
        const placeholder = document.createElement('div');
        placeholder.className = 'image-placeholder loading';
        placeholder.dataset.imageId = imageId;
        
        const content = document.createElement('div');
        content.className = 'placeholder-content';
        
        if (this.config.loadingSpinner) {
            const spinner = document.createElement('div');
            spinner.className = 'placeholder-spinner';
            content.appendChild(spinner);
        }
        
        const text = document.createElement('div');
        text.className = 'placeholder-text';
        text.textContent = this.config.loadingText;
        content.appendChild(text);
        
        placeholder.appendChild(content);
        return placeholder;
    }

    /**
     * Create error placeholder
     * @param {string} imageId - Image ID
     * @param {Error} error - Error object
     * @returns {HTMLElement} Placeholder element
     */
    createErrorPlaceholder(imageId, error) {
        const placeholder = document.createElement('div');
        placeholder.className = 'image-placeholder error';
        placeholder.dataset.imageId = imageId;
        
        const content = document.createElement('div');
        content.className = 'placeholder-content';
        
        if (this.config.errorIcon) {
            const icon = document.createElement('div');
            icon.className = 'placeholder-icon';
            icon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            content.appendChild(icon);
        }
        
        const text = document.createElement('div');
        text.className = 'placeholder-text';
        text.textContent = this.config.errorText;
        content.appendChild(text);
        
        if (this.config.retryButton) {
            const button = document.createElement('button');
            button.className = 'placeholder-button placeholder-retry-button';
            button.textContent = this.config.retryText;
            button.dataset.imageId = imageId;
            content.appendChild(button);
        }
        
        placeholder.appendChild(content);
        return placeholder;
    }

    /**
     * Retry image load
     * @param {string} imageId - Image ID
     */
    retryImageLoad(imageId) {
        console.log(`🔄 IMAGE-PLACEHOLDER: Retrying image load for ${imageId}`);
        
        // Dispatch retry event
        const event = new CustomEvent('imageRetry', {
            detail: { imageId }
        });
        document.dispatchEvent(event);
    }

    /**
     * Show loading state for all images
     */
    showLoadingState() {
        document.querySelectorAll('img[data-image-id]').forEach(img => {
            const imageId = img.dataset.imageId;
            const container = img.parentElement;
            this.showLoadingPlaceholder(imageId, container);
        });
    }

    /**
     * Hide all placeholders
     */
    hideAllPlaceholders() {
        this.placeholders.forEach((placeholder, imageId) => {
            this.hidePlaceholder(imageId);
        });
    }

    /**
     * Show error state for all images
     */
    showErrorState() {
        document.querySelectorAll('img[data-image-id]').forEach(img => {
            const imageId = img.dataset.imageId;
            const container = img.parentElement;
            this.showErrorPlaceholder(imageId, container, new Error('Network error'));
        });
    }

    /**
     * Update placeholder configuration
     * @param {Object} config - New configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get placeholder by image ID
     * @param {string} imageId - Image ID
     * @returns {HTMLElement|null} Placeholder element
     */
    getPlaceholder(imageId) {
        return this.placeholders.get(imageId) || null;
    }

    /**
     * Check if placeholder exists
     * @param {string} imageId - Image ID
     * @returns {boolean} Whether placeholder exists
     */
    hasPlaceholder(imageId) {
        return this.placeholders.has(imageId);
    }

    /**
     * Get loading placeholders count
     * @returns {number} Loading placeholders count
     */
    getLoadingCount() {
        return this.loadingPlaceholders.size;
    }

    /**
     * Get error placeholders count
     * @returns {number} Error placeholders count
     */
    getErrorCount() {
        return this.errorPlaceholders.size;
    }

    /**
     * Get total placeholders count
     * @returns {number} Total placeholders count
     */
    getTotalCount() {
        return this.placeholders.size;
    }

    /**
     * Check if placeholder system is ready
     * @returns {boolean} Whether placeholder system is ready
     */
    isReady() {
        return this.isInitialized;
    }
}

// Export for ES6 modules
export { ImagePlaceholder };

// Global access for backward compatibility
if (typeof window !== 'undefined') {
    window.ImagePlaceholder = ImagePlaceholder;
}
