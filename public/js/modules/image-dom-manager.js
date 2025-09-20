/**
 * Image DOM Manager - Orchestrates image DOM operations using composition
 * Follows SOLID principles with clear separation of concerns
 *
 * Architecture:
 * - ImageElementFactory: Handles image element creation and loading states
 * - LoadingPlaceholderFactory: Manages loading placeholder creation
 * - ImageViewManager: Handles view operations and placeholder replacement
 * - ImageDataManager: Manages data normalization and validation
 */

class ImageDOMManager {
    constructor(config = {}) {
        this.config = this.createConfig({
            ...(window.IMAGE_CONFIG || {}),
            ...config
        });

        // Initialize composed services with error handling
        this.initializeServices();

        // Validate configuration
        this.validateConfiguration();
    }

    /**
     * Create configuration object with fallback
     * @param {Object} config - Configuration options
     * @returns {Object} Configuration object
     * @private
     */
    createConfig(config) {
        if (window.ImageDOMContracts?.ImageDOMConfig) {
            return new window.ImageDOMContracts.ImageDOMConfig(config);
        }

        // Fallback configuration object
        return {
            autoDownload: config.autoDownload || false,
            lazyLoading: config.lazyLoading !== false,
            errorHandling: config.errorHandling !== false,
            loadingStates: config.loadingStates !== false,
            dualViews: config.dualViews !== false,
            intersectionObserver: config.intersectionObserver !== false,
            validate: () => ({ isValid: true, errors: [] })
        };
    }

    /**
     * Initialize composed services with error handling
     * @private
     */
    initializeServices() {
        try {
            this.elementFactory = new window.ImageElementFactory();
            this.placeholderFactory = new window.LoadingPlaceholderFactory();
            this.viewManager = new window.ImageViewManager();
            this.dataManager = new window.ImageDataManager();
        } catch (error) {
            console.error('❌ Failed to initialize ImageDOMManager services:', error);
            this.createFallbackServices();
        }
    }

    /**
     * Create fallback services when main services fail
     * @private
     */
    createFallbackServices() {
        console.warn('⚠️ Using fallback services for ImageDOMManager');
        // Create minimal fallback implementations
        this.elementFactory = this.createFallbackElementFactory();
        this.placeholderFactory = this.createFallbackPlaceholderFactory();
        this.viewManager = this.createFallbackViewManager();
        this.dataManager = this.createFallbackDataManager();
    }

    /**
     * Create fallback element factory
     * @returns {Object} Fallback element factory
     * @private
     */
    createFallbackElementFactory() {
        return {
            createImageElement: imageData => {
                const img = document.createElement('img');

                img.src = imageData.url || '';
                img.alt = imageData.title || 'Generated Image';
                img.style.width = '100%';
                img.style.height = '150px';
                img.style.objectFit = 'cover';

                return img;
            },
            downloadImage: img => {
                const a = document.createElement('a');

                a.href = img.src;
                a.download = img.src.split('/').pop();
                a.click();
            }
        };
    }

    /**
     * Create fallback placeholder factory
     * @returns {Object} Fallback placeholder factory
     * @private
     */
    createFallbackPlaceholderFactory() {
        return {
            showLoadingPlaceholder: () => null,
            removeLoadingPlaceholder: () => {},
            createLoadingPlaceholder: () => {
                const li = document.createElement('li');

                li.className = 'image-item loading-placeholder';
                li.innerHTML = '<div>Loading...</div>';

                return li;
            }
        };
    }

    /**
     * Create fallback view manager
     * @returns {Object} Fallback view manager
     * @private
     */
    createFallbackViewManager() {
        return {
            insertImageIntoContainer: (img, imageData, container) => {
                const li = document.createElement('li');

                li.className = 'image-item';
                li.appendChild(img);
                container.appendChild(li);
            },
            toggleProcessingStyle: () => {}
        };
    }

    /**
     * Create fallback data manager
     * @returns {Object} Fallback data manager
     * @private
     */
    createFallbackDataManager() {
        return {
            normalizeImageData: imageData => imageData || {},
            validateImageData: () => ({ isValid: true, errors: [], warnings: [] }),
            getCurrentFilter: () => 'site',
            extractImageDataFromElement: img => ({
                id: img.dataset.id || 'unknown',
                url: img.src,
                title: img.alt || 'Generated Image'
            })
        };
    }

    /**
     * Validate configuration
     * @private
     */
    validateConfiguration() {
        const validation = this.config.validate();

        if (!validation.isValid) {
            console.warn('⚠️ ImageDOMManager configuration validation failed:', validation.errors);
        }
    }

    // ============================================================================
    // PUBLIC API - Main orchestration methods
    // ============================================================================

    /**
     * Add image to output (main entry point for new images)
     * @param {Object} imageData - Image data object
     * @param {boolean} download - Whether to auto-download
     * @returns {Object|null} Added image data or null
     */
    addImageToOutput(imageData, download = false) {
        console.log('🖼️ DOM INSERT: addImageToOutput called', { imageData, download });

        try {
            return this.processImageOutput(imageData, download);
        } catch (error) {
            console.error('❌ addImageToOutput failed:', error);

            return null;
        }
    }

    /**
     * Show loading placeholder
     * @param {Object} promptObj - Prompt object
     * @returns {HTMLElement|null} Created loading placeholder or null
     */
    showLoadingPlaceholder(promptObj) {
        return this.placeholderFactory.showLoadingPlaceholder(promptObj);
    }

    /**
     * Remove loading placeholder
     */
    removeLoadingPlaceholder() {
        this.placeholderFactory.removeLoadingPlaceholder();
    }

    /**
     * Toggle processing style on elements
     * @param {HTMLElement} element - Element to toggle (optional)
     */
    toggleProcessingStyle(element = null) {
        this.viewManager.toggleProcessingStyle(element);
    }

    // ============================================================================
    // PRIVATE METHODS - Internal orchestration logic
    // ============================================================================

    /**
     * Process image output with proper error handling and validation
     * @param {Object} imageData - Image data object
     * @param {boolean} download - Whether to auto-download
     * @returns {Object|null} Processed image data or null
     * @private
     */
    processImageOutput(imageData, download) {
        // Validate and normalize image data
        const normalizedData = this.dataManager.normalizeImageData(imageData);
        const validation = this.dataManager.validateImageData(normalizedData);

        if (!validation.isValid) {
            console.error('❌ Invalid image data:', validation.errors);

            return null;
        }

        // Handle auto download
        this.handleAutoDownload(null, normalizedData, download);

        // Choose rendering strategy
        if (this.shouldUseFeedManager()) {
            return this.addViaFeedManager(normalizedData);
        }

        return this.addViaSimpleMethod(normalizedData);
    }

    /**
     * Check if feed manager should be used
     * @returns {boolean} True if feed manager is available
     * @private
     */
    shouldUseFeedManager() {
        return window.feedManager && window.feedManager.uiManager;
    }

    /**
     * Add image via feed manager (preferred method)
     * @param {Object} imageData - Normalized image data
     * @returns {Object|null} Added image data or null
     * @private
     */
    addViaFeedManager(imageData) {
        console.log('🖼️ DOM INSERT: Using feed manager rendering system');

        const currentFilter = this.dataManager.getCurrentFilter();
        const wasAdded = window.feedManager.uiManager.addImageToFeed(imageData, currentFilter);

        if (wasAdded) {
            console.log('✅ DOM INSERT: Image added via feed manager');

            return imageData;
        }

        console.log('⚠️ DOM INSERT: Feed manager failed to add image, falling back to simple method');

        return this.addViaSimpleMethod(imageData);
    }

    /**
     * Add image via simple method (fallback)
     * @param {Object} imageData - Normalized image data
     * @returns {Object|null} Added image data or null
     * @private
     */
    addViaSimpleMethod(imageData) {
        console.log('🖼️ DOM INSERT: Using fallback simple rendering');

        const img = this.elementFactory.createImageElement(imageData);

        console.log('🖼️ DOM INSERT: Image element created', !!img);

        const container = document.querySelector('.prompt-output');
        const loadingPlaceholders = document.querySelectorAll('.loading-placeholder');
        const loadingPlaceholder = loadingPlaceholders.length > 0 ? loadingPlaceholders[0] : null;

        console.log('🖼️ DOM INSERT: Container found:', !!container);
        console.log('🖼️ DOM INSERT: Loading placeholders found:', loadingPlaceholders.length);
        console.log('🖼️ DOM INSERT: Using placeholder:', loadingPlaceholder);

        if (container) {
            this.viewManager.insertImageIntoContainer(img, imageData, container, loadingPlaceholder);
        } else {
            console.error('❌ Container .prompt-output not found');

            document.body.appendChild(img);
        }

        return imageData;
    }

    /**
     * Handle auto download functionality
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data object
     * @param {boolean} download - Whether to download
     * @private
     */
    handleAutoDownload(img, imageData, download) {
        const autoDownload = document.querySelector('input[name="autoDownload"]:checked');

        if (download && autoDownload) {
            this.elementFactory.downloadImage(img, imageData);
        }
    }

    // ============================================================================
    // UTILITY METHODS - Convenience methods for external access
    // ============================================================================

    /**
     * Get composed service instances (for advanced usage)
     * @returns {Object} Service instances
     */
    getServices() {
        return {
            elementFactory: this.elementFactory,
            placeholderFactory: this.placeholderFactory,
            viewManager: this.viewManager,
            dataManager: this.dataManager
        };
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = this.createConfig({
            ...this.config,
            ...newConfig
        });
        this.validateConfiguration();
    }

}

// Export for global access
window.ImageDOMManager = ImageDOMManager;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageDOMManager;
}
