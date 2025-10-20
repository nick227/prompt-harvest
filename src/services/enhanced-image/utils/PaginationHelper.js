/**
 * Pagination Helper Utilities
 * Pure functions for calculating pagination metadata
 */

/**
 * Create pagination metadata
 * @param {number} page - Current page (1-based)
 * @param {number} limit - Items per page
 * @param {number} totalCount - Total items available
 * @returns {Object} Pagination metadata
 */
export const createPaginationMetadata = (page, limit, totalCount) => {
    const offset = (page - 1) * limit;
    const hasMore = (offset + limit) < totalCount;

    return {
        page,
        limit,
        totalCount,
        hasMore,
        totalPages: Math.ceil(totalCount / limit)
    };
};

/**
 * Convert 1-based page to 0-based offset
 * @param {number} page - Page number (1-based)
 * @returns {number} Zero-based page for repository queries
 */
export const convertPageToOffset = page => Math.max(0, page - 1);

/**
 * Normalize tags input to always be an array
 * Maintains backward compatibility: only arrays are kept, everything else becomes []
 * @param {Array|string|null} tags - Tags input
 * @returns {Array} Normalized tags array
 */
export const normalizeTags = tags => (Array.isArray(tags) ? tags : []);
