/**
 * SearchQueryBuilder
 * Responsibility: Build Prisma search queries
 * Follows: Single Responsibility Principle, Open/Closed Principle
 */

class SearchQueryBuilder {
    constructor() {
        this.searchFields = ['prompt', 'original', 'provider', 'model'];
    }

    /**
     * Build complete WHERE clause for search
     * @param {string|null} userId - Authenticated user ID
     * @param {string} searchTerm - Search term
     * @returns {Object} Prisma WHERE clause
     */
    buildWhereClause(userId, searchTerm) {
        const accessFilter = this.buildAccessFilter(userId);
        const searchConditions = this.buildSearchConditions(searchTerm);

        return this.combineFilters(accessFilter, searchConditions);
    }

    /**
     * Build access control filter
     * Open/Closed: Easy to extend with new access rules
     * @private
     */
    buildAccessFilter(userId) {
        const baseFilter = {
            isDeleted: false,
            isHidden: false
        };

        if (userId) {
            // Authenticated: User's own images OR public images
            return {
                ...baseFilter,
                OR: [
                    { userId },
                    { isPublic: true }
                ]
            };
        }

        // Not authenticated: Public images only
        return {
            ...baseFilter,
            isPublic: true
        };
    }

    /**
     * Build search term conditions
     * Supports multi-word queries: "cat flux" matches "cat" OR "flux"
     * Open/Closed: Easy to add new search fields
     * @private
     */
    buildSearchConditions(searchTerm) {
        // Split search term into words for multi-word support
        const words = searchTerm.trim().split(/\s+/).filter(Boolean);

        if (words.length === 0) {
            return { OR: [] };
        }

        // For each word, search across all fields
        // "cat flux" → (prompt contains "cat" OR provider contains "cat" OR ...)
        //           OR (prompt contains "flux" OR provider contains "flux" OR ...)
        const wordConditions = words.flatMap(word => this.searchFields.map(field => ({
            [field]: { contains: word }
        })));

        return { OR: wordConditions };
    }

    /**
     * Combine access filter with search conditions
     * Handles complex OR/AND nesting for Prisma
     * @private
     */
    combineFilters(accessFilter, searchConditions) {
        // If access filter has OR clause, use AND structure
        if (accessFilter.OR) {
            return {
                isDeleted: accessFilter.isDeleted,
                isHidden: accessFilter.isHidden,
                AND: [
                    { OR: accessFilter.OR },
                    searchConditions
                ]
            };
        }

        // Simple case: spread both filters
        return {
            ...accessFilter,
            ...searchConditions
        };
    }

    /**
     * Add new searchable field (Open/Closed Principle)
     * @param {string} fieldName - Name of field to search
     */
    addSearchField(fieldName) {
        if (!this.searchFields.includes(fieldName)) {
            this.searchFields.push(fieldName);
        }
    }
}

export default SearchQueryBuilder;

