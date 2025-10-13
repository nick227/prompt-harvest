/**
 * SearchAPIUtils
 * Utilities for API interaction - URL building, response parsing, validation
 * Pure functions with no state
 *
 * @class SearchAPIUtils
 */
class SearchAPIUtils {
    /**
     * Build search URL with query parameters
     * @param {string} query - Search query
     * @param {number} page - Page number
     * @returns {string} Complete search URL
     */
    static buildSearchURL(query, page) {
        // Manually encode parameters to ensure + for spaces and proper encoding
        const encodedQuery = encodeURIComponent(query).replace(/%20/g, '+');
        const encodedPage = encodeURIComponent(page);

        return `/api/search/images?q=${encodedQuery}&page=${encodedPage}`;
    }

    /**
     * Parse search response into structured format
     * Handles multiple response formats from backend
     * @param {object} data - Raw API response
     * @returns {object} Normalized response
     */
    static parseSearchResponse(data) {
        const images = data.data?.items || data.images || data.items || [];

        return {
            images,
            hasMore: data.data?.hasMore ?? data.hasMore ?? false,
            total: data.data?.pagination?.total ??
                data.pagination?.total ??
                data.total ??
                images.length,
            meta: data.data?.meta || null
        };
    }

    /**
     * Validate search results structure
     * @param {object} results - Results to validate
     * @returns {boolean} True if valid
     */
    static validateSearchResults(results) {
        return !!(results && Array.isArray(results.images));
    }

    /**
     * Validate response status with rich error messages
     * @param {Response} response - Fetch response
     * @returns {Promise<void>}
     */
    static async validateResponseStatus(response) {
        // Handle 429 with Retry-After header
        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const error = new Error('Rate limited');

            error.status = 429;
            error.retryAfter = retryAfter; // Store raw header
            throw error;
        }

        // Client errors (4xx) - surface detailed error message
        if (response.status >= 400 && response.status < 500) {
            let errorMessage = `Search failed: ${response.status} ${response.statusText}`;

            // Try to get JSON error message for better diagnostics
            try {
                const errorData = await response.clone().json();

                if (errorData.error || errorData.message) {
                    errorMessage += ` - ${errorData.error || errorData.message}`;
                }
            } catch {
                // JSON parsing failed, use default message
            }

            const error = new Error(errorMessage);

            error.status = response.status;
            error.statusText = response.statusText;
            throw error;
        }

        // Server errors (5xx) should retry
        if (!response.ok) {
            const error = new Error(`Server error: ${response.status} ${response.statusText}`);

            error.status = response.status;
            error.statusText = response.statusText;
            throw error;
        }
    }
}

// Export for use in SearchManager
window.SearchAPIUtils = SearchAPIUtils;

