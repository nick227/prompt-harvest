/**
 * Tag Utilities - Centralized tag parsing and handling
 * Provides consistent tag parsing across the application
 */
class TagUtils {
    /**
     * Safely parse tags from dataset or string
     * @param {string|Array} tags - Tags as JSON string or array
     * @returns {Array} Parsed tags array
     */
    static parseTags(tags) {
        if (Array.isArray(tags)) {
            return tags;
        }

        if (typeof tags === 'string' && tags.trim()) {
            try {
                return JSON.parse(tags);
            } catch (error) {
                console.warn('Failed to parse tags JSON:', { tags, error: error.message });

                return [];
            }
        }

        return [];
    }

    /**
     * Safely stringify tags for dataset storage
     * @param {Array} tags - Tags array
     * @returns {string} JSON string or empty string
     */
    static stringifyTags(tags) {
        if (Array.isArray(tags) && tags.length > 0) {
            try {
                return JSON.stringify(tags);
            } catch (error) {
                console.warn('Failed to stringify tags:', { tags, error: error.message });

                return '';
            }
        }

        return '';
    }

    /**
     * Validate tags array
     * @param {Array} tags - Tags to validate
     * @returns {boolean} True if valid
     */
    static validateTags(tags) {
        return Array.isArray(tags) && tags.every(tag => typeof tag === 'string' && tag.trim().length > 0);
    }

    /**
     * Clean and normalize tags
     * @param {Array} tags - Tags to clean
     * @returns {Array} Cleaned tags
     */
    static cleanTags(tags) {
        if (!Array.isArray(tags)) {
            return [];
        }

        return tags
            .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
            .map(tag => tag.trim().toLowerCase())
            .filter((tag, index, arr) => arr.indexOf(tag) === index) // Remove duplicates
            .slice(0, 10); // Limit to 10 tags max
    }
}

// Export to global scope
window.TagUtils = TagUtils;
