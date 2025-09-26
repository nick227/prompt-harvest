/**
 * ImageDOMContracts - Defines interfaces and contracts for image DOM operations
 * Provides clear contracts for better separation of concerns and testability
 */

/**
 * Interface for image element creation
 */
class IImageElementFactory {
    /**
     * Create image element with loading states and error handling
     * @param {Object} imageData - Image data object
     * @returns {HTMLImageElement} Created image element
     */
    createImageElement(imageData) {
        throw new Error('createImageElement must be implemented');
    }

    /**
     * Download an image
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data object
     */
    downloadImage(img, imageData) {
        throw new Error('downloadImage must be implemented');
    }
}

/**
 * Interface for loading placeholder creation
 */
class ILoadingPlaceholderFactory {
    /**
     * Create loading placeholder with dual views
     * @param {Object} promptObj - Prompt object
     * @returns {HTMLElement} Created loading placeholder
     */
    createLoadingPlaceholder(promptObj) {
        throw new Error('createLoadingPlaceholder must be implemented');
    }

    /**
     * Show loading placeholder in container
     * @param {Object} promptObj - Prompt object
     * @returns {HTMLElement|null} Created loading placeholder or null
     */
    showLoadingPlaceholder(promptObj) {
        throw new Error('showLoadingPlaceholder must be implemented');
    }

    /**
     * Remove loading placeholder from DOM
     */
    removeLoadingPlaceholder() {
        throw new Error('removeLoadingPlaceholder must be implemented');
    }
}

/**
 * Interface for view management
 */
class IImageViewManager {
    /**
     * Replace loading placeholder with actual image
     * @param {HTMLElement} loadingPlaceholder - Loading placeholder element
     * @param {HTMLElement} listItem - New list item with image
     */
    replaceLoadingPlaceholder(loadingPlaceholder, listItem) {
        throw new Error('replaceLoadingPlaceholder must be implemented');
    }

    /**
     * Insert image into container with proper structure
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data
     * @param {HTMLElement} container - Container element
     * @param {HTMLElement} loadingPlaceholder - Loading placeholder element
     */
    insertImageIntoContainer(img, imageData, container, loadingPlaceholder) {
        throw new Error('insertImageIntoContainer must be implemented');
    }

    /**
     * Toggle processing style on elements
     * @param {HTMLElement} element - Element to toggle (optional)
     */
    toggleProcessingStyle(element = null) {
        throw new Error('toggleProcessingStyle must be implemented');
    }
}

/**
 * Interface for data management
 */
class IImageDataManager {
    /**
     * Normalize image data to standard format
     * @param {Object} imageData - Raw image data
     * @returns {Object} Normalized image data
     */
    normalizeImageData(imageData) {
        throw new Error('normalizeImageData must be implemented');
    }

    /**
     * Extract image data from DOM element
     * @param {HTMLImageElement} img - Image element
     * @returns {Object} Extracted image data
     */
    extractImageDataFromElement(img) {
        throw new Error('extractImageDataFromElement must be implemented');
    }

    /**
     * Validate image data
     * @param {Object} imageData - Image data to validate
     * @returns {Object} Validation result
     */
    validateImageData(imageData) {
        throw new Error('validateImageData must be implemented');
    }
}

/**
 * Interface for image DOM orchestration
 */
class IImageDOMManager {
    /**
     * Add image to output (main entry point for new images)
     * @param {Object} imageData - Image data object
     * @param {boolean} download - Whether to auto-download
     * @returns {Object|null} Added image data or null
     */
    addImageToOutput(imageData, download = false) {
        throw new Error('addImageToOutput must be implemented');
    }

    /**
     * Show loading placeholder
     * @param {Object} promptObj - Prompt object
     * @returns {HTMLElement|null} Created loading placeholder or null
     */
    showLoadingPlaceholder(promptObj) {
        throw new Error('showLoadingPlaceholder must be implemented');
    }

    /**
     * Remove loading placeholder
     */
    removeLoadingPlaceholder() {
        throw new Error('removeLoadingPlaceholder must be implemented');
    }
}

/**
 * Configuration contract for image DOM operations
 */
class ImageDOMConfig {
    constructor(config = {}) {
        this.autoDownload = config.autoDownload || false;
        this.lazyLoading = config.lazyLoading !== false; // Default true
        this.errorHandling = config.errorHandling !== false; // Default true
        this.loadingStates = config.loadingStates !== false; // Default true
        this.dualViews = config.dualViews !== false; // Default true
        this.intersectionObserver = config.intersectionObserver !== false; // Default true
    }

    /**
     * Validate configuration
     * @returns {Object} Validation result
     */
    validate() {
        const errors = [];

        if (typeof this.autoDownload !== 'boolean') {
            errors.push('autoDownload must be a boolean');
        }

        if (typeof this.lazyLoading !== 'boolean') {
            errors.push('lazyLoading must be a boolean');
        }

        if (typeof this.errorHandling !== 'boolean') {
            errors.push('errorHandling must be a boolean');
        }

        if (typeof this.loadingStates !== 'boolean') {
            errors.push('loadingStates must be a boolean');
        }

        if (typeof this.dualViews !== 'boolean') {
            errors.push('dualViews must be a boolean');
        }

        if (typeof this.intersectionObserver !== 'boolean') {
            errors.push('intersectionObserver must be a boolean');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

/**
 * Result contract for image operations
 */
class ImageOperationResult {
    constructor(success = false, data = null, error = null, metadata = {}) {
        this.success = success;
        this.data = data;
        this.error = error;
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();
    }

    /**
     * Create success result
     * @param {*} data - Result data
     * @param {Object} metadata - Additional metadata
     * @returns {ImageOperationResult} Success result
     */
    static success(data, metadata = {}) {
        return new ImageOperationResult(true, data, null, metadata);
    }

    /**
     * Create error result
     * @param {Error|string} error - Error information
     * @param {Object} metadata - Additional metadata
     * @returns {ImageOperationResult} Error result
     */
    static error(error, metadata = {}) {
        return new ImageOperationResult(false, null, error, metadata);
    }

    /**
     * Check if result is successful
     * @returns {boolean} True if successful
     */
    isSuccess() {
        return this.success === true;
    }

    /**
     * Check if result is error
     * @returns {boolean} True if error
     */
    isError() {
        return this.success === false;
    }
}

/**
 * Event contract for image DOM events
 */
class ImageDOMEvent {
    constructor(type, data = {}, source = null) {
        this.type = type;
        this.data = data;
        this.source = source;
        this.timestamp = new Date().toISOString();
        this.id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create image load event
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data
     * @returns {ImageDOMEvent} Image load event
     */
    static imageLoad(img, imageData) {
        return new ImageDOMEvent('image:load', { img, imageData }, 'ImageElementFactory');
    }

    /**
     * Create image error event
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data
     * @param {Error} error - Error object
     * @returns {ImageDOMEvent} Image error event
     */
    static imageError(img, imageData, error) {
        return new ImageDOMEvent('image:error', { img, imageData, error }, 'ImageElementFactory');
    }

    /**
     * Create placeholder created event
     * @param {HTMLElement} placeholder - Placeholder element
     * @param {Object} promptObj - Prompt object
     * @returns {ImageDOMEvent} Placeholder created event
     */
    static placeholderCreated(placeholder, promptObj) {
        return new ImageDOMEvent('placeholder:created', { placeholder, promptObj }, 'LoadingPlaceholderFactory');
    }

    /**
     * Create placeholder replaced event
     * @param {HTMLElement} placeholder - Old placeholder element
     * @param {HTMLElement} newElement - New element
     * @param {Object} imageData - Image data
     * @returns {ImageDOMEvent} Placeholder replaced event
     */
    static placeholderReplaced(placeholder, newElement, imageData) {
        return new ImageDOMEvent('placeholder:replaced', { placeholder, newElement, imageData }, 'ImageViewManager');
    }
}

// Export interfaces and contracts
window.ImageDOMContracts = {
    IImageElementFactory,
    ILoadingPlaceholderFactory,
    IImageViewManager,
    IImageDataManager,
    IImageDOMManager,
    ImageDOMConfig,
    ImageOperationResult,
    ImageDOMEvent
};

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        IImageElementFactory,
        ILoadingPlaceholderFactory,
        IImageViewManager,
        IImageDataManager,
        IImageDOMManager,
        ImageDOMConfig,
        ImageOperationResult,
        ImageDOMEvent
    };
}
