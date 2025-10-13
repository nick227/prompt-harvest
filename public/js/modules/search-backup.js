/* global SearchIDGenerator, SearchCacheManager, SearchRetryStrategy, SearchEventEmitter, SearchAPIUtils */

/**
 * @typedef {Object} ImageItem
 * @property {string} id - Unique image identifier
 * @property {string} url - Image URL
 * @property {string} [src] - Alternative image source
 * @property {string} [prompt] - Generation prompt
 * @property {boolean} [isPublic] - Public visibility flag
 * @property {string[]} [tags] - Image tags
 */

/**
 * @typedef {Object} SearchResponse
 * @property {ImageItem[]} images - Array of image items
 * @property {boolean} hasMore - Whether more results exist
 * @property {number} total - Total result count
 * @property {Object} [meta] - Additional metadata
 */

/**
 * @typedef {Object} SearchCounts
 * @property {number} total - Total search results loaded
 * @property {number} public - Public search results
 * @property {number} private - Private search results
 * @property {number} visible - Currently visible (after filtering)
 */

/**
 * @typedef {Object} FeedManager
 * @property {Object} apiManager - API manager instance
 * @property {Object} [tabService] - Tab/filter service
 * @property {Object} [imageHandler] - Image handling service
 * @property {Object} [viewManager] - View management service
 * @property {Object} [domOperations] - DOM operations helper
 * @property {Object} [uiManager] - UI management helper
 * @property {Object} [filterManager] - Filter management
 * @property {Function} [refreshFeed] - Refresh feed method
 */

/**
 * SearchManager - Site-wide image search with performance enhancements
 * Uses extracted helpers for better code organization
 *
 * @class SearchManager
 */
class SearchManager {
    // Constants
    static DEFAULTS = {
        DEBOUNCE_MS: 300,
        MAX_RETRIES: 20,
        RETRY_DELAY_MS: 100,
        CACHE_MAX_SIZE: 50,
        CACHE_TTL_MS: 5 * 60 * 1000,
        CACHE_PER_QUERY_MAX: 10,
        FILL_TO_BOTTOM_DELAY_MS: 100,
        AUTO_LOAD_MAX_ATTEMPTS: 5,
        API_RETRY_MAX_ATTEMPTS: 3,
        API_RETRY_DELAY_MS: 1000,
        API_RETRY_MAX_BACKOFF_MS: 60 * 1000,
        LOAD_MORE_THROTTLE_MS: 500,
        FETCH_TIMEOUT_MS: 30 * 1000,
        DUPLICATE_SEARCH_TTL_MS: 2000
    };

    constructor() {
        // Initialize UI components helper
        this.uiComponents = new window.SearchUIComponents(
            str => this.escapeHTML(str),
            () => this.clearSearch()
        );

        // Debug configuration
        this.debugEnabled = window.isDebugEnabled ? window.isDebugEnabled('SEARCH_FILTERING') : false;

        // Initialize extracted modules
        this.idGenerator = new window.SearchIDGenerator(
            `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        );

        this.cacheManager = new window.SearchCacheManager(
            {
                maxSize: SearchManager.DEFAULTS.CACHE_MAX_SIZE,
                ttlMs: SearchManager.DEFAULTS.CACHE_TTL_MS,
                perQueryMax: SearchManager.DEFAULTS.CACHE_PER_QUERY_MAX
            },
            () => this.isDebugEnabled()
        );

        this.retryStrategy = new window.SearchRetryStrategy(
            {
                maxAttempts: SearchManager.DEFAULTS.API_RETRY_MAX_ATTEMPTS,
                baseDelayMs: SearchManager.DEFAULTS.API_RETRY_DELAY_MS,
                maxBackoffMs: SearchManager.DEFAULTS.API_RETRY_MAX_BACKOFF_MS
            },
            () => this.isDebugEnabled()
        );

        this.eventEmitter = new window.SearchEventEmitter(
            () => this.isDebugEnabled()
        );

        // State management
        this.state = {
            currentSearchTerm: '',
            isSearchActive: false,
            currentPage: 1,
            hasMore: true,
            isLoading: false,
            autoLoadAttempts: 0,
            searchCounts: {
                total: 0,      // Total search results loaded
                public: 0,     // Public search results
                private: 0,    // Private search results
                visible: 0     // Currently visible (after filtering)
            }
        };

        // Request cancellation (use Set to track multiple concurrent requests)
        this.activeControllers = new Set();

        // Request ID tracking for stale response prevention
        this.currentRequestId = null;

        // In-memory deduplication set for search results
        this.seenImageIds = new Set();

        // Lifecycle flag for cancelable background loops
        this._alive = true;

        // Initialization flag to prevent duplicate setup
        this._initialized = false;

        // Pending timeout IDs for cleanup
        this._pendingTimeouts = new Set();

        // Last search query to skip duplicates
        this._lastSearchQuery = null;
        this._lastSearchTime = null;

        // Toast spam prevention
        this._lastErrorToastTime = null;
        this._activeToast = null;

        // Dependencies
        this.feedManager = null;

        // Cached DOM elements
        this.domCache = {
            searchInput: null,
            promptOutput: null
        };

        // Event listeners for cleanup
        this.eventListeners = [];
    }

    /**
     * Initialize search manager (idempotent - safe to call multiple times)
     */
    init() {
        if (this._initialized) {
            console.warn('⚠️ SEARCH: Already initialized, skipping duplicate init');

            return;
        }

        this._initialized = true;
        this.cacheDOM();
        this.setupImageSearch();
        this.waitForFeedManager();
    }

    // Cache DOM elements to avoid repeated queries
    cacheDOM() {
        this.domCache.searchInput = document.querySelector('input[name="search"]');
        this.domCache.promptOutput = document.querySelector('.prompt-output');
    }

    /**
     * Wait for feed manager to be ready with exponential backoff
     * Cancelable via _alive flag
     */
    async waitForFeedManager(
        maxRetries = SearchManager.DEFAULTS.MAX_RETRIES,
        retryDelay = SearchManager.DEFAULTS.RETRY_DELAY_MS
    ) {
        let retries = 0;

        while (retries < maxRetries && this._alive) {
            if (window.feedManager?.apiManager) {
                this.feedManager = window.feedManager;
                this.setupSearchEventListeners();

                return;
            }

            retries++;
            // Exponential backoff: 100, 200, 400, 800ms...
            const delay = retryDelay * Math.pow(2, Math.min(retries - 1, 3));

            await new Promise(resolve => setTimeout(resolve, delay));
        }

        if (!this._alive) {
            console.log('🛑 SEARCH: Cleanup called, stopping feed manager wait');

            return;
        }

        console.warn('⚠️ SEARCH: Feed manager not available, search functionality limited');
    }

    /**
     * Setup search event listeners with proper cleanup tracking
     * Guards against duplicate addEventListener calls
     */
    setupSearchEventListeners() {
        // Check if already set up (prevent duplicates)
        const hasScrollListener = this.eventListeners.some(
            listener => listener.target === window && listener.event === 'lastImageVisible'
        );

        if (hasScrollListener) {
            return; // Already setup
        }

        const scrollHandler = () => {
            if (this.state.isSearchActive && this.state.hasMore && !this.state.isLoading) {
                this.loadMoreResults();
            }
        };

        window.addEventListener('lastImageVisible', scrollHandler);
        this.eventListeners.push({ target: window, event: 'lastImageVisible', handler: scrollHandler });

        // Listen for tag changes to filter search results
        const tagChangeHandler = event => {
            if (this.state.isSearchActive) {
                this.handleTagFilterChange(event.detail?.tags || []);
            }
        };

        window.addEventListener('tagsChanged', tagChangeHandler);
        this.eventListeners.push({ target: window, event: 'tagsChanged', handler: tagChangeHandler });
    }

    /**
     * Setup image search input with event-leak guard
     */
    setupImageSearch() {
        if (!this.domCache.searchInput) {
            console.warn('⚠️ SEARCH: Search input not found');

            return;
        }

        // Check if already set up (prevent duplicates)
        const hasInputListener = this.eventListeners.some(
            listener => listener.target === this.domCache.searchInput && listener.event === 'input'
        );

        if (hasInputListener) {
            return; // Already setup
        }

        // Debounced search handler
        this.debouncedSearch = Utils.async.debounce(
            event => this.handleImageSearch(event),
            SearchManager.DEFAULTS.DEBOUNCE_MS
        );

        this.domCache.searchInput.addEventListener('input', this.debouncedSearch);
        this.eventListeners.push({
            target: this.domCache.searchInput,
            event: 'input',
            handler: this.debouncedSearch
        });

        // Keyboard shortcuts
        const keydownHandler = event => this.handleKeyboardShortcuts(event);

        this.domCache.searchInput.addEventListener('keydown', keydownHandler);
        this.eventListeners.push({
            target: this.domCache.searchInput,
            event: 'keydown',
            handler: keydownHandler
        });
    }

    // Handle keyboard shortcuts
    handleKeyboardShortcuts(event) {
        if (event.key === 'Escape') {
            this.clearSearch();
        } else if (event.key === 'Enter') {
            event.preventDefault();

            // Cancel pending debounced search
            if (this.debouncedSearch?.cancel) {
                this.debouncedSearch.cancel();
            }

            const searchValue = event.target.value.trim();

            if (searchValue) {
                // Enter key = manual refresh, force search even if duplicate
                this.performSearch(searchValue, true);
            }
        }
    }

    // Handle image search input
    async handleImageSearch(event) {
        const searchValue = event.target.value.trim();

        if (!searchValue) {
            this.clearSearch();

            return;
        }

        await this.performSearch(searchValue);
    }

    /**
     * Perform search with request cancellation
     * @param {string} query - Search query
     * @param {boolean} forceRefresh - Force search even if duplicate (e.g., manual Enter)
     */
    async performSearch(query, forceRefresh = false) {
        if (!this.feedManager) {
            console.error('❌ SEARCH: Feed manager not available');

            return;
        }

        // Skip duplicate searches (with TTL window and force escape hatch)
        const normalizedQuery = query.trim().toLowerCase();
        const now = Date.now();
        const timeSinceLastSearch = this._lastSearchTime ? now - this._lastSearchTime : Infinity;

        const isDuplicate = this._lastSearchQuery === normalizedQuery &&
            this.state.isSearchActive &&
            timeSinceLastSearch < SearchManager.DEFAULTS.DUPLICATE_SEARCH_TTL_MS;

        if (isDuplicate && !forceRefresh) {
            if (this.isDebugEnabled()) {
                console.log(`🔄 SEARCH: Skipping duplicate search for "${query}" (use Enter to force)`);
            }

            return;
        }

        this._lastSearchQuery = normalizedQuery;
        this._lastSearchTime = now;

        const requestId = this.initializeSearch(query);

        // Emit search:start event
        this.eventEmitter.emitSearchEvent('search:start', { query, requestId }, this.state);

        try {
            const results = await this.searchImages(query, 1);

            if (this.isStaleResponse(requestId)) {
                return;
            }

            await this.processSearchResults(results, query);
            this.scheduleFillToBottom();

            // Emit search:complete event
            this.eventEmitter.emitSearchEvent('search:complete', {
                query,
                requestId,
                totalResults: results.total,
                page: 1
            }, this.state);

        } catch (error) {
            // Emit search:error event
            this.eventEmitter.emitSearchEvent('search:error', { query, requestId, error: error.message }, this.state);

            this.handleSearchError(error, requestId, query);
        } finally {
            this.finalizeSearch(requestId);

            // Emit search:end event
            this.eventEmitter.emitSearchEvent('search:end', { query, requestId }, this.state);
        }
    }

    /**
     * Initialize search state and UI
     * @param {string} query - Search query
     * @returns {string} Request ID
     */
    initializeSearch(query) {
        this.cancelAllSearches();
        const requestId = this.generateRequestId();

        this.currentRequestId = requestId;

        // Clear deduplication set for new search
        this.seenImageIds.clear();

        // Clear cache for this query (refresh on new search)
        this.cacheManager.clearCacheFor(query);

        this.updateState({
            isSearchActive: true,
            currentSearchTerm: query,
            currentPage: 1,
            isLoading: true
        });

        this.setLoadingState(true);
        this.clearFeedContent();

        return requestId;
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
     * Process and display search results
     * @param {object} results - Search results
     * @param {string} query - Search query
     */
    async processSearchResults(results, query) {
        if (!SearchAPIUtils.validateSearchResults(results)) {
            throw new Error('Invalid search response');
        }

        this.updateState({ hasMore: results.hasMore ?? false });
        await this.displaySearchResults(results, query);
    }

    /**
     * Handle search errors
     * @param {Error} error - Error object
     * @param {string} requestId - Request ID
     * @param {string} query - Search query
     */
    handleSearchError(error, requestId, query) {
        if (error.name !== 'AbortError' && requestId === this.currentRequestId) {
            console.error('❌ SEARCH: Search failed:', error);
            this.showSearchError(query);
        }
    }

    /**
     * Finalize search (cleanup loading state)
     * Race-proof: only clears loading if this request is still current
     * @param {string} requestId - Request ID to validate
     */
    finalizeSearch(requestId) {
        // Only clear loading if this request is still current
        if (requestId === this.currentRequestId) {
            this.updateState({ isLoading: false });
            this.setLoadingState(false);
        }
    }

    // Cancel all active search requests
    cancelAllSearches() {
        this.activeControllers.forEach(controller => {
            try {
                controller.abort();
            } catch (error) {
                // Ignore errors during abort
            }
        });
        this.activeControllers.clear();
    }

    // Generate unique request ID
    generateRequestId() {
        return `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Search images via API with caching, cancellation, and retry logic
     * @param {string} query - Search query
     * @param {number} page - Page number
     * @returns {Promise<{images: Array, hasMore: boolean, total: number, meta: object}>}
     */
    async searchImages(query, page = 1) {
        if (!this.feedManager?.apiManager) {
            throw new Error('API manager not available');
        }

        const cacheKey = this.cacheManager.getCacheKey(query, page);

        // Check cache first (with TTL)
        const cachedResult = this.cacheManager.getFromCache(cacheKey);

        if (cachedResult) {
            return cachedResult;
        }

        // Create new AbortController for this specific request
        const abortController = new AbortController();

        this.activeControllers.add(abortController);

        try {
            const result = await this.searchImagesWithRetry(query, page, abortController.signal);

            // Validate schema with page number for stable synthetic IDs
            this.idGenerator.validateImageSchema(result.images, page);

            // Cache with timestamp
            this.cacheManager.addToCache(cacheKey, result);

            return result;
        } finally {
            // Remove controller from active set
            this.activeControllers.delete(abortController);
        }
    }

    /**
     * Search images with exponential backoff retry for 5xx and network errors
     * @param {string} query - Search query
     * @param {number} page - Page number
     * @param {AbortSignal} signal - Abort signal
     * @returns {Promise<object>}
     */
    async searchImagesWithRetry(query, page, signal) {
        let lastError;

        for (let attempt = 0; attempt < SearchManager.DEFAULTS.API_RETRY_MAX_ATTEMPTS; attempt++) {
            try {
                return await this.executeSearchRequest(query, page, signal);
            } catch (error) {
                lastError = error;

                if (this.retryStrategy.shouldNotRetry(error, attempt)) {
                    throw error;
                }

                // Parse Retry-After if it's a 429
                if (error.status === 429 && error.retryAfter) {
                    error.retryAfterMs = this.retryStrategy.parseRetryAfter(error.retryAfter);
                }

                await this.retryStrategy.delayRetry(attempt, error);
            }
        }

        throw lastError;
    }

    /**
     * Execute single search request with timeout and abort
     * Combines caller signal and timeout signal properly
     * @param {string} query - Search query
     * @param {number} page - Page number
     * @param {AbortSignal} signal - Abort signal from caller
     * @returns {Promise<object>}
     */
    async executeSearchRequest(query, page, signal) {
        const url = SearchAPIUtils.buildSearchURL(query, page);
        const token = this.feedManager.apiManager.getAuthToken();

        // Create combined abort signal (caller abort OR timeout)
        const timeoutController = new AbortController();
        let timeoutId;
        let onCallerAbort;

        // If caller signal aborts, also abort timeout controller
        if (signal) {
            onCallerAbort = () => timeoutController.abort();
            signal.addEventListener('abort', onCallerAbort, { once: true });
        }

        try {
            // Race between fetch and timeout
            const response = await Promise.race([
                fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    signal: timeoutController.signal // Use timeout controller (listens to both)
                }),
                new Promise((_, reject) => {
                    timeoutId = setTimeout(() => {
                        timeoutController.abort(); // Abort the fetch
                        reject(new Error('Request timeout'));
                    }, SearchManager.DEFAULTS.FETCH_TIMEOUT_MS);
                })
            ]);

            await SearchAPIUtils.validateResponseStatus(response);

            const data = await response.json();

            return SearchAPIUtils.parseSearchResponse(data);
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            // Clean up abort listener if using fallback approach
            if (signal && onCallerAbort && !('once' in EventTarget.prototype)) {
                try {
                    signal.removeEventListener('abort', onCallerAbort);
                } catch {
                    // Ignore cleanup errors
                }
            }
        }
    }


    /**
     * Load more search results (pagination) with leading + trailing edge throttle
     */
    async loadMoreResults() {
        if (!this.canLoadMore()) {
            return;
        }

        const now = Date.now();
        const timeSinceLastLoad = this._lastLoadMoreTime ? now - this._lastLoadMoreTime : Infinity;

        // Leading edge: execute immediately if throttle window passed
        if (timeSinceLastLoad >= SearchManager.DEFAULTS.LOAD_MORE_THROTTLE_MS) {
            this._lastLoadMoreTime = now;

            try {
                await this.loadNextPage();
            } catch (error) {
                this.handleLoadMoreError(error);
            } finally {
                this.updateState({ isLoading: false });
            }

            return;
        }

        // Trailing edge: schedule execution at end of throttle window
        if (!this._loadMoreTrailingTimer) {
            const delay = SearchManager.DEFAULTS.LOAD_MORE_THROTTLE_MS - timeSinceLastLoad;

            this._loadMoreTrailingTimer = setTimeout(async() => {
                // Remove from pending timeouts when it fires
                this._pendingTimeouts.delete(this._loadMoreTrailingTimer);
                this._loadMoreTrailingTimer = null;

                if (this.canLoadMore() && this._alive) {
                    this._lastLoadMoreTime = Date.now();

                    try {
                        await this.loadNextPage();
                    } catch (error) {
                        this.handleLoadMoreError(error);
                    } finally {
                        this.updateState({ isLoading: false });
                    }
                }
            }, delay);

            this._pendingTimeouts.add(this._loadMoreTrailingTimer);
        }
    }

    /**
     * Check if can load more results
     * @returns {boolean}
     */
    canLoadMore() {
        return this.state.isSearchActive &&
            !this.state.isLoading &&
            this.state.hasMore &&
            this.state.currentSearchTerm;
    }

    /**
     * Load next page of results
     * Uses currentRequestId for stale check (pagination tied to active search)
     */
    async loadNextPage() {
        this.updateState({ isLoading: true });

        const nextPage = this.state.currentPage + 1;
        const searchRequestId = this.currentRequestId;

        // Emit search:page event
        this.eventEmitter.emitSearchEvent('search:page', {
            query: this.state.currentSearchTerm,
            page: nextPage,
            requestId: searchRequestId
        }, this.state);

        const results = await this.searchImages(this.state.currentSearchTerm, nextPage);

        // Check if search was cancelled/replaced while loading
        if (searchRequestId !== this.currentRequestId) {
            return;
        }

        await this.processPageResults(results, nextPage);
    }

    /**
     * Process page results
     * @param {object} results - Search results
     * @param {number} nextPage - Next page number
     */
    async processPageResults(results, nextPage) {
        if (!results.images?.length) {
            this.updateState({ hasMore: false });

            return;
        }

        const newImages = this.deduplicateImages(results.images);

        if (newImages.length > 0) {
            await this.addPaginatedResults(newImages, results.hasMore, nextPage);
        } else {
            this.updateState({ hasMore: false });
        }
    }

    /**
     * Deduplicate images using in-memory Set
     * @param {Array} images - Images to deduplicate
     * @returns {Array} Deduplicated images
     */
    deduplicateImages(images) {
        return images.filter(img => {
            if (this.seenImageIds.has(img.id)) {
                return false;
            }

            this.seenImageIds.add(img.id);

            return true;
        });
    }

    /**
     * Add paginated results to feed
     * @param {Array} newImages - New images to add
     * @param {boolean} hasMore - Whether more results exist
     * @param {number} nextPage - Next page number
     */
    async addPaginatedResults(newImages, hasMore, nextPage) {
        this.updateState({
            currentPage: nextPage,
            hasMore: hasMore ?? false
        });

        this.appendImagesToFeed(newImages);

        // Use consolidated filter method (no indicator for pagination)
        await this.applyFilterToResults(null, false);

        await this.autoLoadUntilVisible();
    }

    /**
     * Handle load more error
     * @param {Error} error - Error object
     */
    handleLoadMoreError(error) {
        if (error.name !== 'AbortError') {
            console.error('❌ SEARCH: Failed to load more results:', error);
        }
    }

    /**
     * Display search results
     * @param {object} results - Search results
     * @param {string} query - Search query
     */
    async displaySearchResults(results, query) {
        if (results.images.length === 0) {
            this.showNoResults(query);
        } else {
            if (this.isDebugEnabled()) {
                console.log(`\n🔍 DISPLAYING SEARCH RESULTS FOR: "${query}"`);
                console.log(`  Total Images: ${results.images.length}`);

                const publicCount = results.images.filter(img => img.isPublic === true).length;
                const privateCount = results.images.length - publicCount;

                console.log(`  Public: ${publicCount}, Private: ${privateCount}`);
            }

            this.appendImagesToFeed(results.images);
            await this.applyFilterToResults(query);

            // Auto-load more if visible count is 0 but backend has more
            await this.autoLoadUntilVisible();
        }
    }

    /**
     * Auto-load more pages until visible count > 0 or backend exhausted
     * Bypasses throttling by calling internal page loader directly
     * Prevents empty screen when filters hide all results but more pages exist
     * Cancelable via _alive flag
     */
    async autoLoadUntilVisible() {
        // Early exit if cleaned up
        if (!this._alive) {
            return;
        }

        // Reset auto-load attempts on new search
        if (this.state.currentPage === 1) {
            this.updateState({ autoLoadAttempts: 0 });
        }

        // Guard: prevent infinite loops
        if (this.state.autoLoadAttempts >= SearchManager.DEFAULTS.AUTO_LOAD_MAX_ATTEMPTS) {
            if (this.isDebugEnabled()) {
                console.log('⚠️ SEARCH: Auto-load max attempts reached');
            }

            return;
        }

        // Check if visible count is 0 but backend has more
        const { searchCounts: { visible: visibleCount }, hasMore, isLoading } = this.state;

        if (visibleCount === 0 && hasMore && !isLoading && this._alive) {
            if (this.isDebugEnabled()) {
                console.log('🔄 SEARCH: Auto-loading next page (visible=0, hasMore=true)');
            }

            this.updateState({ autoLoadAttempts: this.state.autoLoadAttempts + 1 });

            try {
                // Bypass throttle by calling internal loader directly
                await this.loadNextPage();

                // Yield briefly to allow DOM updates
                await new Promise(resolve => setTimeout(resolve, 50));

                // Recursive check after loading (will check _alive again)
                await this.autoLoadUntilVisible();
            } catch (error) {
                this.handleLoadMoreError(error);
            } finally {
                this.updateState({ isLoading: false });
            }
        }
    }

    /**
     * Apply filter to search results with proper fallback and error handling
     * Consolidated method to avoid double work
     * @param {string|null} query - Search query (for indicator display)
     * @param {boolean} showIndicator - Whether to show search indicator
     */
    async applyFilterToResults(query = null, showIndicator = true) {
        try {
            const currentFilter = this.getCurrentFilter();

            if (this.isDebugEnabled()) {
                console.log(`  Current Owner Filter: "${currentFilter}"`);
                console.log('  Applying filter to search results...');
            }

            // Wait for HybridTabService to be initialized if needed
            if (this.feedManager?.tabService && !this.feedManager.tabService.isInitialized) {
                await this.waitForHybridTabService();
            }

            // Apply filter (consolidated path)
            if (this.feedManager?.tabService) {
                this.feedManager.tabService.switchToFilter(currentFilter);

                // Wait for DOM to settle (double RAF for reliability)
                await new Promise(resolve => {
                    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
                });
            } else {
                console.warn('⚠️ SEARCH: TabService not available, showing all results');
            }

            this.updateSearchCounts();

            if (showIndicator && query) {
                this.showSearchActiveIndicator(query);
            }

        } catch (error) {
            console.error('❌ SEARCH: Failed to apply filter to search results:', error);

            // Fallback: show warning message
            if (query) {
                const indicator = document.querySelector('.search-active-indicator');

                if (indicator) {
                    this.uiComponents.buildWarningIndicatorContent(indicator, query);
                }
            }
        }
    }

    /**
     * Get current filter with proper fallback chain
     * Prefers this.feedManager.filterManager to avoid cross-instance drift
     * @returns {string} Current filter ('public', 'private', 'all')
     */
    getCurrentFilter() {
        // Try FeedFilterManager (most authoritative) - prefer instance reference
        if (this.feedManager?.filterManager?.currentFilter) {
            return this.feedManager.filterManager.currentFilter;
        }

        // Try HybridTabService
        if (this.feedManager?.tabService?.currentFilter) {
            return this.feedManager.tabService.currentFilter;
        }

        // Try reading from DOM
        const dropdown = document.querySelector('select[name="owner-filter"]');

        if (dropdown?.value) {
            return dropdown.value;
        }

        // Final fallback
        return 'public';
    }

    /**
     * Wait for HybridTabService to be initialized with lifecycle guard
     * @param {number} timeout - Maximum wait time in ms
     */
    async waitForHybridTabService(timeout = 2000) {
        const startTime = Date.now();

        while (this.feedManager?.tabService && !this.feedManager.tabService.isInitialized && this._alive) {
            if (Date.now() - startTime > timeout) {
                console.warn('⚠️ SEARCH: TabService initialization timeout');
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 50));
        }

        if (!this._alive) {
            console.log('🛑 SEARCH: Cleanup called, stopping TabService wait');
        }
    }

    /**
     * Append images to feed and track in dedup set
     * @param {Array} images - Images to append
     */
    appendImagesToFeed(images) {
        images.forEach(image => {
            // Track ID for deduplication
            this.seenImageIds.add(image.id);

            // Add to feed (feedManager sets data-image-id attribute)
            this.feedManager.imageHandler.addImageToFeed(image, 'search');
        });

        // Reapply view after new images
        this.reapplyView();
    }

    // Reapply view styling
    reapplyView() {
        if (this.feedManager.viewManager?.forceReapplyView) {
            this.feedManager.viewManager.forceReapplyView();
        }
    }

    // Check if debug logging is enabled
    isDebugEnabled() {
        return this.debugEnabled || false;
    }


    /**
     * Schedule fill to bottom check with lifecycle guard
     */
    scheduleFillToBottom() {
        const timeoutId = setTimeout(() => {
            this._pendingTimeouts.delete(timeoutId);

            // Honor _alive flag - exit if cleaned up
            if (!this._alive) {
                return;
            }

            if (!this.feedManager?.fillToBottomManager) {
                return;
            }

            const lastImage = this.feedManager.domOperations?.getLastImageElement();

            if (lastImage && this.feedManager.uiManager?.isElementInViewport(lastImage)) {
                this.loadMoreResults();
            }
        }, SearchManager.DEFAULTS.FILL_TO_BOTTOM_DELAY_MS);

        this._pendingTimeouts.add(timeoutId);
    }

    // Clear search and restore feed
    async clearSearch() {
        // Clear input
        if (this.domCache.searchInput) {
            this.domCache.searchInput.value = '';
        }

        // Cancel all active searches
        this.cancelAllSearches();

        // Reset state
        this.updateState({
            isSearchActive: false,
            currentSearchTerm: '',
            currentPage: 1,
            hasMore: true,
            isLoading: false,
            autoLoadAttempts: 0
        });

        // Clear cache
        this.cacheManager.clearAll();

        // Clear deduplication set
        this.seenImageIds.clear();

        // Reset request tracking
        this.currentRequestId = null;
        this._lastSearchQuery = null;
        this._lastSearchTime = null;

        // Hide indicator
        this.hideSearchActiveIndicator();

        // Restore feed
        if (this.feedManager) {
            await this.feedManager.refreshFeed();
        }
    }


    // State management helpers
    updateState(updates) {
        Object.assign(this.state, updates);
    }

    // UI helper methods
    setLoadingState(isLoading) {
        if (this.feedManager?.uiManager) {
            this.feedManager.uiManager.setLoading(isLoading);
        }
    }

    clearFeedContent() {
        if (this.feedManager?.domOperations) {
            this.feedManager.domOperations.clearFeedContent();
        }
    }

    // Delegate to UI components helper
    createMessageElement(config) {
        return this.uiComponents.createMessageElement(config);
    }

    /**
     * Update search counts from DOM (delegates to helper with guards)
     */
    updateSearchCounts() {
        // Guard: check if helpers are loaded
        if (!window.SearchFilterHelpers) {
            console.error('❌ SEARCH: SearchFilterHelpers not loaded');

            // Fallback to manual count
            this.state.searchCounts = {
                total: document.querySelectorAll('.image-wrapper[data-source="search"]').length,
                public: 0,
                private: 0,
                visible: document.querySelectorAll('.image-wrapper[data-source="search"]:not(.hidden)').length
            };

            return;
        }

        this.state.searchCounts = window.SearchFilterHelpers.updateSearchCountsFromDOM();

        // Debug: verify count accuracy
        if (this.isDebugEnabled()) {
            const actualVisible = document.querySelectorAll('.image-wrapper[data-source="search"]:not(.hidden)').length;
            const reportedVisible = this.state.searchCounts.visible;

            if (actualVisible !== reportedVisible) {
                console.error('⚠️ COUNT MISMATCH:', {
                    reported: reportedVisible,
                    actual: actualVisible,
                    difference: reportedVisible - actualVisible
                });
            }
        }

        // Update indicator with current counts
        this.updateSearchIndicatorCounts();
    }

    // Show search active indicator
    showSearchActiveIndicator(query) {
        let indicator = document.querySelector('.search-active-indicator');

        if (!indicator) {
            indicator = this.uiComponents.createSearchIndicator();

            if (this.domCache.promptOutput?.parentElement) {
                this.domCache.promptOutput.parentElement.insertBefore(
                    indicator,
                    this.domCache.promptOutput
                );
            }
        }

        this.updateSearchIndicator(indicator, query);
    }

    updateSearchIndicator(indicator, query) {
        const counts = this.state.searchCounts;
        const currentFilter = this.getCurrentFilter();

        if (this.isDebugEnabled()) {
            console.log('\n🔍 SEARCH INDICATOR UPDATE:');
            console.log('  Counts:', counts);
            console.log('  Filter:', currentFilter);
        }

        const countText = this.uiComponents.getCountText(currentFilter, counts);

        if (this.isDebugEnabled()) {
            console.log(`  Display Text: "${countText}"`);
        }

        this.uiComponents.buildIndicatorContent(indicator, query, countText);
    }

    // Update indicator counts only (called after filtering)
    updateSearchIndicatorCounts() {
        const indicator = document.querySelector('.search-active-indicator');

        if (indicator && this.state.currentSearchTerm) {
            this.updateSearchIndicator(indicator, this.state.currentSearchTerm);
        }
    }

    // Handle tag filter changes within search results
    async handleTagFilterChange(activeTags) {
        if (!this.feedManager?.tabService) {
            console.warn('⚠️ SEARCH: TabService not available');

            return;
        }

        // Guard: check if helpers are available
        if (!window.SearchFilterHelpers) {
            console.error('❌ SEARCH: SearchFilterHelpers not loaded');

            return;
        }

        const searchImages = document.querySelectorAll('.image-wrapper[data-source="search"]');

        // Get current filter once for entire method
        const currentFilter = this.getCurrentFilter();
        const { currentUserId } = this.feedManager.tabService;

        if (activeTags.length === 0) {
            // No tag filter - show all search results (respect owner filter)
            if (this.feedManager?.tabService) {
                this.feedManager.tabService.switchToFilter(currentFilter);
            }

            return;
        }

        // Filter search results by tags
        searchImages.forEach(wrapper => {
            const imageTags = window.SearchFilterHelpers.getImageTags(wrapper);
            const hasMatchingTag = activeTags.some(tag => imageTags.includes(tag.toLowerCase()));

            // Apply both tag filter AND owner filter using helper
            const passesOwnerFilter = window.SearchFilterHelpers.shouldShowForOwnerFilter(
                wrapper,
                currentFilter,
                currentUserId
            );

            const shouldShow = hasMatchingTag && passesOwnerFilter;

            wrapper.classList.toggle('hidden', !shouldShow);
        });

        // Wait for DOM to settle (double RAF for reliability)
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

        // Update counts after filtering
        this.updateSearchCounts();
    }

    hideSearchActiveIndicator() {
        const indicator = document.querySelector('.search-active-indicator');

        if (indicator) {
            indicator.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => indicator.remove(), 300);
        }
    }

    // Show search message (unified method for no results and errors)
    showSearchMessage(type, query, clearContent = true) {
        if (clearContent) {
            this.clearFeedContent();
        }

        if (!this.domCache.promptOutput) {
            return;
        }

        const config = this.uiComponents.getMessageConfig(type, query);
        const message = this.createMessageElement(config);

        if (clearContent) {
            this.domCache.promptOutput.appendChild(message);
        } else {
            // Non-blocking toast for errors
            this.showErrorToast(query);
        }
    }

    /**
     * Show non-blocking error toast with rate limiting (singleton)
     * @param {string} query - Search query that failed
     */
    showErrorToast(query) {
        const now = Date.now();
        const TOAST_RATE_LIMIT_MS = 5000; // Max one toast per 5 seconds

        // Rate limit: prevent toast spam
        if (this._lastErrorToastTime && now - this._lastErrorToastTime < TOAST_RATE_LIMIT_MS) {
            if (this.isDebugEnabled()) {
                console.log('🔇 SEARCH: Toast rate-limited, skipping');
            }

            return;
        }

        this._lastErrorToastTime = now;

        // Remove existing toast if present (singleton)
        if (this._activeToast && this._activeToast.parentElement) {
            this._activeToast.remove();
        }

        const toast = document.createElement('div');

        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(239, 68, 68, 0.95);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;

        toast.innerHTML = `
            <strong>⚠️ Search Error</strong><br>
            <small>Unable to search for "${this.escapeHTML(query)}"</small>
        `;

        document.body.appendChild(toast);
        this._activeToast = toast;

        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                toast.remove();

                if (this._activeToast === toast) {
                    this._activeToast = null;
                }
            }, 300);
        }, 3000);
    }

    // Show no results message
    showNoResults(query) {
        this.showSearchMessage('noResults', query, true);
    }

    /**
     * Show search error (non-blocking toast, keeps existing results)
     * @param {string} query - Search query
     */
    showSearchError(query) {
        this.showErrorToast(query);
    }

    // Security: Escape HTML to prevent XSS
    escapeHTML(str) {
        const div = document.createElement('div');

        div.textContent = str;

        return div.innerHTML;
    }

    /**
     * Trigger search programmatically
     * @param {string} searchTerm - Search term
     * @param {boolean} forceRefresh - Force refresh even if duplicate
     */
    triggerSearch(searchTerm, forceRefresh = false) {
        if (this.domCache.searchInput) {
            this.domCache.searchInput.value = searchTerm;
            this.performSearch(searchTerm, forceRefresh);
        }
    }

    /**
     * Get current search state (for debugging)
     * @returns {object} Current state with diagnostics
     */
    getState() {
        return {
            ...this.state,
            cache: this.cacheManager.getStats(),
            activeRequests: this.activeControllers.size,
            currentRequestId: this.currentRequestId,
            hasFeedManager: !!this.feedManager,
            lastLoadMoreTime: this._lastLoadMoreTime,
            lastSearchQuery: this._lastSearchQuery,
            lastSearchTime: this._lastSearchTime,
            alive: this._alive,
            initialized: this._initialized
        };
    }

    /**
     * Cleanup method for proper memory management
     * Sets _alive=false to cancel background loops and pending timeouts
     */
    cleanup() {
        // Stop background loops
        this._alive = false;

        // Cancel all pending timeouts
        this._pendingTimeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        this._pendingTimeouts.clear();

        // Clear trailing timer
        if (this._loadMoreTrailingTimer) {
            clearTimeout(this._loadMoreTrailingTimer);
            this._loadMoreTrailingTimer = null;
        }

        // Cancel all active requests
        this.cancelAllSearches();

        // Remove all event listeners
        this.eventListeners.forEach(({ target, event, handler }) => {
            target.removeEventListener(event, handler);
        });
        this.eventListeners = [];

        // Clear cache
        this.cacheManager.clearAll();

        // Clear deduplication set
        this.seenImageIds.clear();

        // Clear DOM cache
        this.domCache = {};

        // Reset state
        this.updateState({
            isSearchActive: false,
            currentSearchTerm: '',
            currentPage: 1,
            hasMore: true,
            isLoading: false,
            autoLoadAttempts: 0
        });

        // Reset request tracking
        this.currentRequestId = null;
        this._lastLoadMoreTime = null;
        this._lastSearchQuery = null;
        this._lastSearchTime = null;

        // Reset initialization flag
        this._initialized = false;
    }
}

// Add CSS animation for fade effects (only once)
if (typeof document !== 'undefined' && !document.getElementById('search-manager-styles')) {
    const style = document.createElement('style');

    style.id = 'search-manager-styles';
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
        }
    `;
    document.head.appendChild(style);
}

// Export for global access
window.SearchManager = SearchManager;
window.searchManager = new SearchManager();
