/**
 * Search Router - Handles URL parameter-based search navigation
 * Manages ?q= parameter in URL and provides search routing functionality
 */
class SearchRouter {
    constructor() {
        this.currentQuery = '';
        this.searchManager = null;
        this.isInitialized = false;
        this.pendingQuery = null;
        this.isUpdatingFromSearch = false;
        this.popstateHandler = null;

        this.init();
    }

    init() {
        // Listen for browser back/forward navigation
        this.popstateHandler = () => this.handleURLChange();
        window.addEventListener('popstate', this.popstateHandler);

        // Handle initial URL parameters on page load
        this.handleInitialURL();

        // Wait for SearchManager to be available
        this.waitForSearchManager();
    }

    /**
     * Wait for SearchManager to be available with exponential backoff
     */
    async waitForSearchManager(maxRetries = 50, baseDelay = 100) {
        let retries = 0;

        while (retries < maxRetries) {
            if (window.searchManager?._initialized) {
                this.searchManager = window.searchManager;
                this.isInitialized = true;

                // If there was a pending query from URL, execute it now
                if (this.pendingQuery) {
                    const query = this.pendingQuery;

                    this.pendingQuery = null;
                    await this.executeSearch(query);
                }

                return;
            }

            retries++;
            // Exponential backoff with max 1 second delay
            const delay = Math.min(baseDelay * Math.pow(2, Math.min(retries - 1, 3)), 1000);

            await new Promise(resolve => setTimeout(resolve, delay));
        }

        console.warn('⚠️ SEARCH ROUTER: SearchManager not available, routing functionality limited');
    }

    /**
     * Handle initial URL parameters when page loads
     */
    handleInitialURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const queryParam = urlParams.get('q');

            if (queryParam) {
                const query = queryParam.trim();

                if (query) {
                    this.currentQuery = query;
                    // Store as pending - will execute when SearchManager is ready
                    this.pendingQuery = query;
                } else {
                    this.currentQuery = '';
                }
            } else {
                this.currentQuery = '';
            }
        } catch (error) {
            console.warn('⚠️ SEARCH ROUTER: Error handling initial URL:', error);
            this.currentQuery = '';
        }
    }

    /**
     * Handle URL changes (back/forward navigation)
     */
    handleURLChange() {
        if (this.isUpdatingFromSearch) {
            return;
        }

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const queryParam = urlParams.get('q');
            const newQuery = queryParam?.trim() || '';

            // Only trigger search if query actually changed
            if (newQuery !== this.currentQuery) {
                this.currentQuery = newQuery;

                if (newQuery) {
                    this.executeSearch(newQuery);
                } else {
                    this.clearSearch();
                }
            }
        } catch (error) {
            console.warn('⚠️ SEARCH ROUTER: Error handling URL change:', error);
        }
    }

    /**
     * Execute search with the given query
     * @param {string} query - Search query
     */
    async executeSearch(query) {
        if (!this.searchManager) {
            console.warn('⚠️ SEARCH ROUTER: SearchManager not ready');

            return;
        }

        if (!query?.trim()) {
            return;
        }

        try {
            await this.searchManager.triggerSearch(query, false);
        } catch (error) {
            console.error('❌ SEARCH ROUTER: Error executing search:', error);
        }
    }

    /**
     * Clear the search
     */
    clearSearch() {
        if (this.searchManager) {
            this.searchManager.clearSearch();
        }
    }

    /**
     * Set active search query and update URL
     * @param {string} query - Search query
     */
    setQuery(query) {
        const trimmedQuery = query?.trim() || '';

        if (trimmedQuery === this.currentQuery) {
            return;
        }

        this.currentQuery = trimmedQuery;
        this.updateURL();

        if (trimmedQuery) {
            this.executeSearch(trimmedQuery);
        } else {
            this.clearSearch();
        }
    }

    /**
     * Get current search query
     * @returns {string} Current search query
     */
    getQuery() {
        return this.currentQuery;
    }

    /**
     * Check if a search is currently active
     * @returns {boolean} True if search is active
     */
    isSearchActive() {
        return this.currentQuery.length > 0;
    }

    /**
     * Build URL with query parameter
     * @param {string} query - Query to include in URL
     * @returns {URL} URL object
     */
    buildURL(query = this.currentQuery) {
        const url = new URL(window.location);

        if (query) {
            url.searchParams.set('q', query);
        } else {
            url.searchParams.delete('q');
        }

        return url;
    }

    /**
     * Update URL with current search query
     */
    updateURL() {
        try {
            const url = this.buildURL();

            // Prevent infinite loop by setting flag
            this.isUpdatingFromSearch = true;
            window.history.pushState({}, '', url);

            // Reset flag after a short delay
            setTimeout(() => {
                this.isUpdatingFromSearch = false;
            }, 50);
        } catch (error) {
            console.warn('⚠️ SEARCH ROUTER: Error updating URL:', error);
            this.isUpdatingFromSearch = false;
        }
    }

    /**
     * Clear the search query
     */
    clearQuery() {
        if (!this.currentQuery) {
            return;
        }

        this.currentQuery = '';
        this.updateURL();
        this.clearSearch();
    }

    /**
     * Get URL string with current query
     * @returns {string} URL string with search parameter
     */
    getURLString() {
        try {
            return this.buildURL().toString();
        } catch (error) {
            console.warn('⚠️ SEARCH ROUTER: Error building URL string:', error);

            return window.location.href;
        }
    }

    /**
     * Navigate to a new URL with search query
     * @param {string} baseUrl - Base URL (optional, defaults to current location)
     * @param {string} query - Search query to set
     */
    navigateWithQuery(baseUrl = window.location.pathname, query = '') {
        try {
            const url = new URL(baseUrl, window.location.origin);
            const trimmedQuery = query?.trim() || '';

            if (trimmedQuery) {
                url.searchParams.set('q', trimmedQuery);
            }

            window.location.href = url.toString();
        } catch (error) {
            console.warn('⚠️ SEARCH ROUTER: Error navigating with query:', error);
        }
    }

    /**
     * Get a shareable URL for current search
     * @returns {string} Shareable URL
     */
    getShareableURL() {
        return this.getURLString();
    }

    /**
     * Cleanup method for proper memory management
     */
    cleanup() {
        if (this.popstateHandler) {
            window.removeEventListener('popstate', this.popstateHandler);
            this.popstateHandler = null;
        }

        this.searchManager = null;
        this.isInitialized = false;
        this.pendingQuery = null;
        this.currentQuery = '';
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.SearchRouter = SearchRouter;
    // Initialize search router (skip in test environment)
    if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
        window.searchRouter = new SearchRouter();
    }
}

