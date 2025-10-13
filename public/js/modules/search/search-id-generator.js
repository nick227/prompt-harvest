/**
 * SearchIDGenerator
 * Handles synthetic ID generation and validation for search results
 * Pure functions with no external dependencies
 *
 * @class SearchIDGenerator
 */
class SearchIDGenerator {
    /**
     * @param {string} sessionSalt - Unique session identifier
     */
    constructor(sessionSalt) {
        this.sessionSalt = sessionSalt;
    }

    /**
     * Validate image schema - ensure images is array of objects with id
     * @param {Array} images - Images to validate
     * @param {number} page - Page number for stable ID generation
     */
    validateImageSchema(images, page = 1) {
        if (!Array.isArray(images)) {
            throw new Error('Invalid schema: images must be an array');
        }

        images.forEach((image, index) => {
            if (!image || typeof image !== 'object') {
                throw new Error(`Invalid schema: image at index ${index} is not an object`);
            }

            // Synthesize id if missing using stable hash
            if (!image.id) {
                image.id = this.generateSyntheticId(image, page, index);
                console.warn(`⚠️ SEARCH: Image at index ${index} missing id, synthesized: ${image.id}`);
            }
        });
    }

    /**
     * Generate stable synthetic ID from image data with session salt
     * @param {object} image - Image object
     * @param {number} page - Page number
     * @param {number} index - Index in page
     * @returns {string} Stable synthetic ID
     */
    generateSyntheticId(image, page, index) {
        // Try to use stable properties for hash
        let hashSource;

        try {
            hashSource = image.url || image.src || image.prompt || JSON.stringify(image);
        } catch (error) {
            // JSON.stringify can throw on circular structures
            hashSource = image.url || image.src || image.prompt || `fallback-${page}-${index}`;
            console.warn(`⚠️ SEARCH: JSON.stringify failed for image at p${page}-i${index}, using fallback`);
        }

        // Include session salt to prevent cross-session collisions
        const saltedSource = `${this.sessionSalt}:${hashSource}`;
        const hash = this.simpleHash(saltedSource);

        return `synthetic-${hash}-p${page}-i${index}`;
    }

    /**
     * Simple string hash function for stable IDs
     * Uses basic algorithm without bitwise operators
     * @param {string} str - String to hash
     * @returns {string} Hash string
     */
    simpleHash(str) {
        let hash = 0;

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);

            hash = ((hash * 31) + char) % 2147483647;
        }

        return Math.abs(hash).toString(36);
    }
}

// Export for use in SearchManager
window.SearchIDGenerator = SearchIDGenerator;

