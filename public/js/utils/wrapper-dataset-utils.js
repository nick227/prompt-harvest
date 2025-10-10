/**
 * Wrapper Dataset Utilities
 * Provides standardized methods for setting wrapper dataset attributes
 * Ensures consistency across all image wrapper creators
 */

class WrapperDatasetUtils {
    /**
     * Set all standard wrapper dataset attributes
     * @param {HTMLElement} wrapper - Wrapper element
     * @param {Object} imageData - Image data object
     * @param {string} filter - Filter type ('user', 'site', etc.)
     */
    static setWrapperDataset(wrapper, imageData, filter = null) {
        if (!wrapper || !imageData) {
            console.error('❌ WRAPPER DATASET: Invalid wrapper or imageData');
            return;
        }

        // Core identifiers (REQUIRED)
        wrapper.dataset.imageId = imageData.id || imageData.imageId || 'unknown';
        wrapper.dataset.userId = imageData.userId || '';

        // Filter and visibility
        if (filter !== null) {
            wrapper.dataset.filter = filter;
        }
        wrapper.dataset.isPublic = (imageData.isPublic || false).toString();

        // Image metadata
        if (imageData.provider) {
            wrapper.dataset.provider = imageData.provider;
        }
        if (imageData.model) {
            wrapper.dataset.model = imageData.model;
        }
        if (imageData.rating != null) {
            wrapper.dataset.rating = imageData.rating.toString();
        }
        if (imageData.guidance) {
            wrapper.dataset.guidance = imageData.guidance;
        }

        // User information
        if (imageData.username) {
            wrapper.dataset.username = imageData.username;
        }
        if (imageData.createdAt) {
            wrapper.dataset.createdAt = imageData.createdAt;
        }

        // Tags and metadata
        if (imageData.tags) {
            wrapper.dataset.tags = window.TagUtils
                ? window.TagUtils.stringifyTags(imageData.tags)
                : JSON.stringify(imageData.tags);
        }
        if (imageData.taggedAt) {
            wrapper.dataset.taggedAt = imageData.taggedAt;
        }
        if (imageData.taggingMetadata) {
            wrapper.dataset.taggingMetadata = JSON.stringify(imageData.taggingMetadata);
        }
    }

    /**
     * Update specific wrapper dataset attributes
     * @param {HTMLElement} wrapper - Wrapper element
     * @param {Object} updates - Object with attributes to update
     */
    static updateWrapperDataset(wrapper, updates) {
        if (!wrapper || !updates) {
            return;
        }

        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined) {
                wrapper.dataset[key] = updates[key];
            }
        });
    }

    /**
     * Get complete dataset from wrapper
     * @param {HTMLElement} wrapper - Wrapper element
     * @returns {Object} Dataset object
     */
    static getWrapperDataset(wrapper) {
        if (!wrapper || !wrapper.dataset) {
            return {};
        }

        return {
            imageId: wrapper.dataset.imageId,
            userId: wrapper.dataset.userId,
            username: wrapper.dataset.username,
            filter: wrapper.dataset.filter,
            isPublic: wrapper.dataset.isPublic === 'true',
            provider: wrapper.dataset.provider,
            model: wrapper.dataset.model,
            rating: parseInt(wrapper.dataset.rating) || 0,
            guidance: wrapper.dataset.guidance,
            createdAt: wrapper.dataset.createdAt,
            tags: wrapper.dataset.tags ? JSON.parse(wrapper.dataset.tags) : [],
            taggedAt: wrapper.dataset.taggedAt,
            taggingMetadata: wrapper.dataset.taggingMetadata
                ? JSON.parse(wrapper.dataset.taggingMetadata)
                : null
        };
    }

    /**
     * Validate wrapper has required dataset attributes
     * @param {HTMLElement} wrapper - Wrapper element
     * @returns {Object} Validation result with isValid and missing fields
     */
    static validateWrapperDataset(wrapper) {
        const required = ['imageId', 'userId', 'isPublic'];
        const missing = [];

        required.forEach(attr => {
            if (!wrapper.dataset[attr]) {
                missing.push(attr);
            }
        });

        return {
            isValid: missing.length === 0,
            missing,
            warnings: this.getWarnings(wrapper)
        };
    }

    /**
     * Get warnings for optional but recommended attributes
     * @param {HTMLElement} wrapper - Wrapper element
     * @returns {Array} Array of warning messages
     * @private
     */
    static getWarnings(wrapper) {
        const warnings = [];
        const recommended = ['username', 'provider', 'model', 'createdAt'];

        recommended.forEach(attr => {
            if (!wrapper.dataset[attr]) {
                warnings.push(`Missing recommended attribute: ${attr}`);
            }
        });

        return warnings;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.WrapperDatasetUtils = WrapperDatasetUtils;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WrapperDatasetUtils;
}

