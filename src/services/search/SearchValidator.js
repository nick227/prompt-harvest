/**
 * SearchValidator
 * Responsibility: Validate search input parameters
 * Follows: Single Responsibility Principle
 */

class SearchValidator {
    constructor(config = {}) {
        this.maxQueryLength = config.maxQueryLength || 500;
        this.maxLimit = config.maxLimit || 100;
        this.defaultLimit = config.defaultLimit || 50;
    }

    /**
     * Validate search query parameter
     * @param {string} query - Search query
     * @returns {{valid: boolean, error?: string, status?: number}}
     */
    validateQuery(query) {
        if (!query || query.trim().length === 0) {
            return {
                valid: false,
                error: 'Search query is required',
                status: 400
            };
        }

        if (query.length > this.maxQueryLength) {
            return {
                valid: false,
                error: `Search query too long (max ${this.maxQueryLength} characters)`,
                status: 400
            };
        }

        return { valid: true };
    }

    /**
     * Normalize and validate pagination parameters
     * @param {Object} params - { page, limit }
     * @returns {{page: number, limit: number, skip: number}}
     */
    normalizePagination({ page = 1, limit = this.defaultLimit }) {
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(
            this.maxLimit,
            Math.max(1, parseInt(limit, 10) || this.defaultLimit)
        );

        return {
            page: pageNum,
            limit: limitNum,
            skip: (pageNum - 1) * limitNum
        };
    }

    /**
     * Normalize search term (lowercase, trim)
     */
    normalizeSearchTerm(query) {
        return query.trim().toLowerCase();
    }
}

export default SearchValidator;

