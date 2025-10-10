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
            downloadImage: async img => {
                try {
                    // Fetch the image as a blob to force Save As dialog
                    const response = await fetch(img.src);

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const blob = await response.blob();
                    const fileName = this.generateFileNameFromPrompt(img);

                    // Create object URL and download
                    const objectUrl = URL.createObjectURL(blob);

                    const a = document.createElement('a');

                    a.href = objectUrl;
                    a.download = fileName;
                    a.style.display = 'none';

                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);

                    // Clean up object URL
                    URL.revokeObjectURL(objectUrl);

                } catch (error) {
                    console.error('❌ DOWNLOAD: Blob download failed, trying fallback:', error);

                    // Fallback to old method
                    try {
                        const a = document.createElement('a');

                        a.href = img.src;
                        a.download = this.generateFileNameFromPrompt(img);
                        a.style.display = 'none';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    } catch (fallbackError) {
                        console.error('❌ DOWNLOAD: All download methods failed:', fallbackError);
                    }
                }
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
            getCurrentFilter: () => 'public',
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
    processImageOutput(imageData, _download) {
        // Validate and normalize image data
        const normalizedData = this.dataManager.normalizeImageData(imageData);
        const validation = this.dataManager.validateImageData(normalizedData);

        if (!validation.isValid) {
            console.error('❌ Invalid image data:', validation.errors);

            return null;
        }

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

        const currentFilter = this.dataManager.getCurrentFilter();
        const wasAdded = window.feedManager.uiManager.addImageToFeed(imageData, currentFilter);

        if (wasAdded) {

            // Handle auto download for feed manager path
            this.handleAutoDownloadForFeedManager(imageData);

            return imageData;
        }

        // Check if image already exists in DOM (might have been added via loading placeholder replacement)
        const existingImage = document.querySelector(`[data-image-id="${imageData.id}"]`);

        if (existingImage) {

            return imageData;
        }


        return this.addViaSimpleMethod(imageData);
    }

    /**
     * Add image via simple method (fallback)
     * @param {Object} imageData - Normalized image data
     * @returns {Object|null} Added image data or null
     * @private
     */
    addViaSimpleMethod(imageData) {

        const img = this.elementFactory.createImageElement(imageData);


        // Handle auto download after image element is created
        this.handleAutoDownload(img, imageData, false);

        const container = document.querySelector('.prompt-output');
        const loadingPlaceholders = document.querySelectorAll('.loading-placeholder');
        const loadingPlaceholder = loadingPlaceholders.length > 0 ? loadingPlaceholders[0] : null;


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
     * @param {boolean} download - Whether to download (legacy parameter, not used)
     * @private
     */
    handleAutoDownload(img, imageData, _download) {
        const autoDownload = document.querySelector('input[name="autoDownload"]:checked');

        console.log('📥 AUTO DOWNLOAD DEBUG:', {
            autoDownloadFound: !!autoDownload,
            autoDownloadChecked: autoDownload?.checked,
            allAutoDownloadCheckboxes: document.querySelectorAll('input[name="autoDownload"]').length,
            imageData: imageData.url || imageData.imageUrl
        });

        if (autoDownload) {
            this.downloadImageFile(imageData.url || imageData.imageUrl);
        }
        // Manual download - no auto action needed
    }

    /**
     * Handle auto download for feed manager path
     * @param {Object} imageData - Image data object
     * @private
     */
    handleAutoDownloadForFeedManager(imageData) {
        const autoDownload = document.querySelector('input[name="autoDownload"]:checked');

        console.log('📥 AUTO DOWNLOAD FEED MANAGER DEBUG:', {
            autoDownloadFound: !!autoDownload,
            autoDownloadChecked: autoDownload?.checked,
            allAutoDownloadCheckboxes: document.querySelectorAll('input[name="autoDownload"]').length,
            imageData: imageData.url || imageData.imageUrl
        });

        if (autoDownload) {
            this.downloadImageFile(imageData.url || imageData.imageUrl);
        }
        // Manual download - no auto action needed
    }

    /**
     * Improved download method that should show Save As dialog
     * @param {string} imageUrl - URL of the image to download
     * @private
     */
    downloadImageFile(imageUrl) {
        try {
            // Method 1: Try fetch + blob download (most reliable for Save As dialog)
            this.downloadImageAsBlob(imageUrl);
        } catch (error) {
            console.error('❌ AUTO DOWNLOAD: Blob download failed, trying fallback:', error);

            // Method 2: Fallback to anchor download
            try {
                const a = document.createElement('a');
                const fileName = this.generateFileName(imageUrl);

                a.href = imageUrl;
                a.download = fileName;
                a.style.display = 'none';

                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

            } catch (fallbackError) {
                console.error('❌ AUTO DOWNLOAD: All download methods failed:', fallbackError);
            }
        }
    }

    /**
     * Download image as blob to force Save As dialog
     * @param {string} imageUrl - URL of the image to download
     * @private
     */
    async downloadImageAsBlob(imageUrl) {
        try {

            // Fetch the image as a blob
            const response = await fetch(imageUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const fileName = this.generateFileName(imageUrl);

            // Create object URL and download
            const objectUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');

            a.href = objectUrl;
            a.download = fileName;
            a.style.display = 'none';

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Clean up object URL
            URL.revokeObjectURL(objectUrl);

        } catch (error) {
            console.error('❌ AUTO DOWNLOAD: Blob download failed:', error);
            throw error; // Re-throw to trigger fallback
        }
    }

    /**
     * Generate a proper filename for the download
     * @param {string} imageUrl - URL of the image
     * @returns {string} Generated filename
     * @private
     */
    generateFileName(imageUrl) {
        try {
            const { pathname } = new URL(imageUrl);
            const fileName = pathname.split('/').pop();

            // If no filename or extension, generate one
            if (!fileName || !fileName.includes('.')) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

                return `generated-image-${timestamp}.jpg`;
            }

            return decodeURIComponent(fileName);
        } catch (error) {
            // Fallback filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            return `generated-image-${timestamp}.jpg`;
        }
    }

    /**
     * Generate filename from final prompt (first 30 characters)
     * @param {HTMLImageElement} img - Image element
     * @returns {string} Sanitized filename
     * @private
     */
    generateFileNameFromPrompt(img) {
        // Get final prompt from dataset (check multiple possible fields)
        const finalPrompt = img.dataset.final ||
                           img.dataset.finalPrompt ||
                           img.dataset.enhancedPrompt ||
                           img.dataset.prompt ||
                           img.alt ||
                           'Generated Image';

        // Take first 30 characters
        const truncatedPrompt = finalPrompt.length > 30
            ? finalPrompt.substring(0, 30)
            : finalPrompt;

        // Sanitize filename - remove invalid characters but keep spaces
        const sanitized = truncatedPrompt
            .replace(/[<>:"/\\|?*.,;(){}[\]!@#$%^&+=`~]/g, '') // Remove invalid filename characters
            .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
            .trim(); // Remove leading/trailing spaces

        // Ensure we have a valid filename
        if (!sanitized || sanitized.length === 0) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            return `Generated Image ${timestamp}.jpg`;
        }

        // Add .jpg extension if not present
        return sanitized.endsWith('.jpg') ? sanitized : `${sanitized}.jpg`;
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
