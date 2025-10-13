/**
 * SearchStateManager
 * Handles search state management and validation
 *
 * @class SearchStateManager
 */
class SearchStateManager {
    constructor() {
        // State management
        this.state = {
            currentSearchTerm: '',
            isSearchActive: false,
            currentPage: 1,
            hasMore: true,
            isLoading: false,
            autoLoadAttempts: 0,
            searchCounts: {
                total: 0,
                public: 0,
                private: 0,
                visible: 0
            }
        };

        // Request tracking
        this.currentRequestId = null;

        // Duplicate search tracking
        this._lastSearchQuery = null;
        this._lastSearchTime = null;
    }

    /**
     * Update state
     * @param {Object} updates - State updates
     */
    updateState(updates) {
        Object.assign(this.state, updates);
    }

    /**
     * Get current state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Update search counts
     * @param {Object} counts - New counts
     */
    updateSearchCounts(counts) {
        this.state.searchCounts = counts;
    }

    /**
     * Check if response is stale
     * @param {string} requestId - Request ID to check
     * @returns {boolean}
     */
    isStaleResponse(requestId) {
        return requestId !== this.currentRequestId;
    }

    /**
     * Generate unique request ID
     * @returns {string}
     */
    generateRequestId() {
        return `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check if search is duplicate
     * @param {string} query - Search query
     * @param {number} duplicateTTL - Duplicate search TTL in ms
     * @returns {boolean}
     */
    isDuplicateSearch(query, duplicateTTL) {
        const normalizedQuery = query.trim().toLowerCase();
        const now = Date.now();
        const timeSinceLastSearch = this._lastSearchTime ? now - this._lastSearchTime : Infinity;

        return this._lastSearchQuery === normalizedQuery &&
            this.state.isSearchActive &&
            timeSinceLastSearch < duplicateTTL;
    }

    /**
     * Update last search tracking
     * @param {string} query - Search query
     */
    updateLastSearch(query) {
        this._lastSearchQuery = query.trim().toLowerCase();
        this._lastSearchTime = Date.now();
    }

    /**
     * Initialize search state
     * @param {string} query - Search query
     * @returns {string} Request ID
     */
    initializeSearch(query) {
        const requestId = this.generateRequestId();

        this.currentRequestId = requestId;

        this.updateState({
            isSearchActive: true,
            currentSearchTerm: query,
            currentPage: 1,
            isLoading: true
        });

        return requestId;
    }

    /**
     * Reset search state
     */
    resetState() {
        this.updateState({
            isSearchActive: false,
            currentSearchTerm: '',
            currentPage: 1,
            hasMore: true,
            isLoading: false,
            autoLoadAttempts: 0
        });

        this.currentRequestId = null;
        this._lastSearchQuery = null;
        this._lastSearchTime = null;
    }

    /**
     * Get diagnostic state
     * @param {Object} cacheStats - Cache statistics
     * @param {number} activeRequests - Active request count
     * @param {number} lastLoadMoreTime - Last load more time
     * @param {boolean} alive - Alive flag
     * @param {boolean} initialized - Initialized flag
     * @returns {Object} Diagnostic state
     */
    getDiagnosticState(cacheStats, activeRequests, lastLoadMoreTime, alive, initialized) {
        return {
            ...this.state,
            cache: cacheStats,
            activeRequests,
            currentRequestId: this.currentRequestId,
            lastLoadMoreTime,
            lastSearchQuery: this._lastSearchQuery,
            lastSearchTime: this._lastSearchTime,
            alive,
            initialized
        };
    }
}

// Export for use in SearchManager
window.SearchStateManager = SearchStateManager;

