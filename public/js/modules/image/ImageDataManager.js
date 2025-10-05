/**
 * ImageDataManager - Handles data extraction, normalization, and manipulation
 * Follows Single Responsibility Principle for data operations
 */
class ImageDataManager {
    constructor() {
        this.dataValidators = this.initializeValidators();
    }

    /**
     * Initialize data validators
     * @returns {Object} Validator functions
     */
    initializeValidators() {
        return {
            hasValidUrl: (data) => data && data.url && data.url.trim() !== '',
            hasValidId: (data) => data && data.id && data.id.trim() !== '',
            hasValidPrompt: (data) => data && (data.prompt || data.final || data.original),
            isComplete: (data) => this.dataValidators.hasValidUrl(data) &&
                                  this.dataValidators.hasValidId(data) &&
                                  this.dataValidators.hasValidPrompt(data)
        };
    }

    /**
     * Normalize image data to standard format
     * @param {Object} imageData - Raw image data
     * @returns {Object} Normalized image data
     */
    normalizeImageData(imageData) {
        if (!imageData) {
            return this.createDefaultImageData();
        }

        return {
            id: this.extractId(imageData),
            url: this.extractUrl(imageData),
            title: this.extractTitle(imageData),
            prompt: this.extractPrompt(imageData),
            original: this.extractOriginalPrompt(imageData),
            final: this.extractFinalPrompt(imageData),
            provider: this.extractProvider(imageData),
            model: this.extractProvider(imageData), // Database provider column contains model name
            guidance: this.extractGuidance(imageData),
            rating: this.extractRating(imageData),
            isPublic: this.extractIsPublic(imageData),
            userId: this.extractUserId(imageData),
            username: this.extractUsername(imageData),
            createdAt: this.extractCreatedAt(imageData),
            providers: this.extractProviders(imageData),
            tags: this.extractTags(imageData) // ✅ Include tags field
        };
    }

    /**
     * Create default image data structure
     * @returns {Object} Default image data
     */
    createDefaultImageData() {
        return {
            id: `default_${Date.now()}`,
            url: '',
            title: 'Generated Image',
            prompt: '',
            original: '',
            final: '',
            provider: 'unknown',
            model: 'unknown', // Add model property
            guidance: '',
            rating: 0,
            isPublic: false,
            userId: null,
            username: null,
            createdAt: new Date().toISOString(),
            providers: [],
            tags: [] // ✅ Include tags field
        };
    }

    /**
     * Extract ID from image data
     * @param {Object} imageData - Image data
     * @returns {string} Extracted ID
     */
    extractId(imageData) {
        return imageData.id ||
               imageData.imageId ||
               imageData._id ||
               `generated_${Date.now()}`;
    }

    /**
     * Extract URL from image data
     * @param {Object} imageData - Image data
     * @returns {string} Extracted URL
     */
    extractUrl(imageData) {
        return imageData.url ||
               imageData.src ||
               imageData.imageUrl ||
               imageData.path || '';
    }

    /**
     * Extract title from image data
     * @param {Object} imageData - Image data
     * @returns {string} Extracted title
     */
    extractTitle(imageData) {
        // Use first 8 characters of prompt as title
        const prompt = imageData.prompt || imageData.original || '';
        if (prompt) {
            return prompt.substring(0, 8);
        }

        return imageData.title ||
               imageData.name ||
               imageData.filename ||
               'Generated Image';
    }

    /**
     * Extract prompt from image data
     * @param {Object} imageData - Image data
     * @returns {string} Extracted prompt
     */
    extractPrompt(imageData) {
        return imageData.prompt ||
               imageData.final ||
               imageData.original ||
               imageData.description || '';
    }

    /**
     * Extract original prompt from image data
     * @param {Object} imageData - Image data
     * @returns {string} Extracted original prompt
     */
    extractOriginalPrompt(imageData) {
        return imageData.original ||
               imageData.originalPrompt ||
               imageData.userPrompt || '';
    }

    /**
     * Extract final prompt from image data
     * @param {Object} imageData - Image data
     * @returns {string} Extracted final prompt
     */
    extractFinalPrompt(imageData) {
        return imageData.final ||
               imageData.finalPrompt ||
               imageData.enhancedPrompt ||
               imageData.prompt || '';
    }

    /**
     * Extract provider from image data
     * @param {Object} imageData - Image data
     * @returns {string} Extracted provider
     */
    extractProvider(imageData) {
        return imageData.provider ||
               imageData.model ||
               imageData.service ||
               'unknown';
    }

    /**
     * Extract guidance from image data
     * @param {Object} imageData - Image data
     * @returns {string} Extracted guidance
     */
    extractGuidance(imageData) {
        return imageData.guidance ||
               imageData.cfg ||
               imageData.cfgScale ||
               imageData.guidanceScale || '';
    }

    /**
     * Extract rating from image data
     * @param {Object} imageData - Image data
     * @returns {number} Extracted rating
     */
    extractRating(imageData) {
        const rating = imageData.rating ||
                      imageData.score ||
                      imageData.likes ||
                      0;
        return parseInt(rating) || 0;
    }

    /**
     * Extract isPublic flag from image data
     * @param {Object} imageData - Image data
     * @returns {boolean} Extracted isPublic flag
     */
    extractIsPublic(imageData) {
        return Boolean(imageData.isPublic ||
                      imageData.public ||
                      imageData.shared ||
                      false);
    }

    /**
     * Extract user ID from image data
     * @param {Object} imageData - Image data
     * @returns {string|null} Extracted user ID
     */
    extractUserId(imageData) {
        return imageData.userId ||
               imageData.user_id ||
               imageData.ownerId ||
               imageData.owner_id ||
               null;
    }

    /**
     * Extract username from image data
     * @param {Object} imageData - Image data
     * @returns {string|null} Extracted username
     */
    extractUsername(imageData) {
        return imageData.username ||
               imageData.userName ||
               imageData.creator ||
               imageData.author ||
               (imageData.userId ? 'Unknown User' : 'Anonymous');
    }

    /**
     * Extract created date from image data
     * @param {Object} imageData - Image data
     * @returns {string} Extracted created date
     */
    extractCreatedAt(imageData) {
        return imageData.createdAt ||
               imageData.created_at ||
               imageData.timestamp ||
               imageData.date ||
               new Date().toISOString();
    }

    /**
     * Extract providers array from image data
     * @param {Object} imageData - Image data
     * @returns {Array} Extracted providers array
     */
    extractProviders(imageData) {
        if (Array.isArray(imageData.providers)) {
            return imageData.providers;
        }

        if (imageData.provider) {
            return [imageData.provider];
        }

        return [];
    }

    /**
     * Extract tags from image data
     * @param {Object} imageData - Image data
     * @returns {Array} Extracted tags
     */
    extractTags(imageData) {
        if (window.TagUtils) {
            return window.TagUtils.parseTags(imageData.tags);
        }

        // Fallback to original implementation
        if (Array.isArray(imageData.tags)) {
            return imageData.tags;
        }

        if (typeof imageData.tags === 'string') {
            try {
                return JSON.parse(imageData.tags);
            } catch (error) {
                console.warn('Failed to parse tags JSON:', error);
                return [];
            }
        }

        return [];
    }

    /**
     * Extract image data from DOM element
     * @param {HTMLImageElement} img - Image element
     * @returns {Object} Extracted image data
     */
    extractImageDataFromElement(img) {
        // Extracting image data from element
        const rawData = {
            id: img.dataset.id || img.dataset.imageId,
            url: img.src,
            title: img.alt,
            prompt: img.dataset.prompt || img.dataset.final,
            original: img.dataset.original,
            final: img.dataset.final || img.dataset.prompt,
            provider: img.dataset.provider,
            model: img.dataset.model, // Add model field
            guidance: img.dataset.guidance,
            rating: img.dataset.rating,
            isPublic: img.dataset.isPublic,
            userId: img.dataset.userId,
            username: img.dataset.username,
            createdAt: img.dataset.createdAt,
            tags: window.TagUtils ? window.TagUtils.parseTags(img.dataset.tags) : (img.dataset.tags ? JSON.parse(img.dataset.tags) : []) // ✅ Include tags with centralized parsing
        };

        // Raw data extracted from element
        return this.normalizeImageData(rawData);
    }

    /**
     * Validate image data
     * @param {Object} imageData - Image data to validate
     * @returns {Object} Validation result
     */
    validateImageData(imageData) {
        const errors = [];
        const warnings = [];

        if (!this.dataValidators.hasValidUrl(imageData)) {
            errors.push('Invalid or missing URL');
        }

        if (!this.dataValidators.hasValidId(imageData)) {
            errors.push('Invalid or missing ID');
        }

        if (!this.dataValidators.hasValidPrompt(imageData)) {
            warnings.push('No prompt information available');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            isComplete: this.dataValidators.isComplete(imageData)
        };
    }

    /**
     * Get current user information
     * @returns {Object|null} Current user data
     */
    getCurrentUser() {
        return window.ImageDOMUtils?.getCurrentUser?.() || null;
    }

    /**
     * Get current filter type
     * @returns {string} Current filter type
     */
    getCurrentFilter() {
        const currentUser = this.getCurrentUser();
        return currentUser ? 'user' : 'site';
    }

    /**
     * Create image data for download
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data
     * @returns {Object} Download data
     */
    createDownloadData(img, imageData) {
        const fileName = this.extractFileName(img.src);

        return {
            url: img.src,
            fileName,
            imageData: this.normalizeImageData(imageData),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Extract file name from URL
     * @param {string} url - Image URL
     * @returns {string} Extracted file name
     */
    extractFileName(url) {
        try {
            return decodeURIComponent(url.split('/').pop());
        } catch (error) {
            return `image_${Date.now()}.jpg`;
        }
    }

    /**
     * Merge image data with defaults
     * @param {Object} imageData - Image data
     * @param {Object} defaults - Default values
     * @returns {Object} Merged image data
     */
    mergeWithDefaults(imageData, defaults = {}) {
        const defaultData = {
            ...this.createDefaultImageData(),
            ...defaults
        };

        return {
            ...defaultData,
            ...imageData,
            // Ensure arrays are properly handled
            providers: imageData.providers || defaultData.providers
        };
    }
}

// Export for global access
window.ImageDataManager = ImageDataManager;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageDataManager;
}
