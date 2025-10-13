/* global SearchIDGenerator, SearchCacheManager, SearchRetryStrategy, SearchEventEmitter */
/* global SearchAPIUtils, SearchPaginationManager, SearchFilterManager, SearchUIManager */
/* global SearchExecutionManager, SearchStateManager */

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
 * SearchManager - Site-wide image search with modular architecture
 * Orchestrates specialized modules for execution, pagination, filtering, and UI
 *
 * @class SearchManager
 */
class SearchManager {
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
        // Lifecycle flags
        this._alive = true;
        this._initialized = false;
        this.feedManager = null;
        this.eventListeners = [];

        // Debug configuration
        this.debugEnabled = window.isDebugEnabled ? window.isDebugEnabled('SEARCH_FILTERING') : false;

        // Initialize modules
        this._initializeModules();
        this._initializeDOM();
    }

    _initializeModules() {
        // Core utilities
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

        // State and business logic
        this.stateManager = new window.SearchStateManager();

        this.paginationManager = new window.SearchPaginationManager(
            {
                throttleMs: SearchManager.DEFAULTS.LOAD_MORE_THROTTLE_MS,
                autoLoadMaxAttempts: SearchManager.DEFAULTS.AUTO_LOAD_MAX_ATTEMPTS,
                fillToBottomDelayMs: SearchManager.DEFAULTS.FILL_TO_BOTTOM_DELAY_MS
            },
            () => this.isDebugEnabled()
        );

        this.filterManager = new window.SearchFilterManager(
            () => this.isDebugEnabled()
        );

        this.executionManager = new window.SearchExecutionManager(
            {
                apiRetryMaxAttempts: SearchManager.DEFAULTS.API_RETRY_MAX_ATTEMPTS,
                fetchTimeoutMs: SearchManager.DEFAULTS.FETCH_TIMEOUT_MS
            },
            this.idGenerator,
            this.cacheManager,
            this.retryStrategy,
            () => this.isDebugEnabled()
        );
    }

    _initializeDOM() {
        // Cached DOM elements
        this.domCache = {
            searchInput: null,
            promptOutput: null
        };

        // UI components
        this.uiComponents = new window.SearchUIComponents(
            str => this.escapeHTML(str),
            () => this.clearSearch()
        );

        this.uiManager = new window.SearchUIManager(
            this.uiComponents,
            this.domCache,
            str => this.escapeHTML(str),
            () => this.isDebugEnabled()
        );
    }

    // Delegate to state manager
    get state() { return this.stateManager.state; }
    updateState(updates) { this.stateManager.updateState(updates); }
    get currentRequestId() { return this.stateManager.currentRequestId; }
    set currentRequestId(value) { this.stateManager.currentRequestId = value; }

    /**
     * Initialize search manager (idempotent)
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

    cacheDOM() {
        this.domCache.searchInput = document.querySelector('input[name="search"]');
        this.domCache.promptOutput = document.querySelector('.prompt-output');
    }

    async waitForFeedManager(maxRetries = SearchManager.DEFAULTS.MAX_RETRIES, retryDelay = SearchManager.DEFAULTS.RETRY_DELAY_MS) {
        let retries = 0;

        while (retries < maxRetries && this._alive) {
            if (window.feedManager?.apiManager) {
                this.feedManager = window.feedManager;
                this.setupSearchEventListeners();

                return;
            }

            retries++;
            const delay = retryDelay * Math.pow(2, Math.min(retries - 1, 3));

            await new Promise(resolve => setTimeout(resolve, delay));
        }

        if (!this._alive) {
            console.log('🛑 SEARCH: Cleanup called, stopping feed manager wait');

            return;
        }

        console.warn('⚠️ SEARCH: Feed manager not available, search functionality limited');
    }

    setupSearchEventListeners() {
        const hasScrollListener = this.eventListeners.some(
            listener => listener.target === window && listener.event === 'lastImageVisible'
        );

        if (hasScrollListener) { return; }

        const scrollHandler = () => {
            if (this.state.isSearchActive && this.state.hasMore && !this.state.isLoading) {
                this.loadMoreResults();
            }
        };

        window.addEventListener('lastImageVisible', scrollHandler);
        this.eventListeners.push({ target: window, event: 'lastImageVisible', handler: scrollHandler });

        const tagChangeHandler = event => {
            if (this.state.isSearchActive) {
                this.handleTagFilterChange(event.detail?.tags || []);
            }
        };

        window.addEventListener('tagsChanged', tagChangeHandler);
        this.eventListeners.push({ target: window, event: 'tagsChanged', handler: tagChangeHandler });
    }

    setupImageSearch() {
        if (!this.domCache.searchInput) {
            console.warn('⚠️ SEARCH: Search input not found');

            return;
        }

        const hasInputListener = this.eventListeners.some(
            listener => listener.target === this.domCache.searchInput && listener.event === 'input'
        );

        if (hasInputListener) { return; }

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

        const keydownHandler = event => this.handleKeyboardShortcuts(event);

        this.domCache.searchInput.addEventListener('keydown', keydownHandler);
        this.eventListeners.push({
            target: this.domCache.searchInput,
            event: 'keydown',
            handler: keydownHandler
        });
    }

    handleKeyboardShortcuts(event) {
        if (event.key === 'Escape') {
            this.clearSearch();
        } else if (event.key === 'Enter') {
            event.preventDefault();

            if (this.debouncedSearch?.cancel) {
                this.debouncedSearch.cancel();
            }

            const searchValue = event.target.value.trim();

            if (searchValue) {
                this.performSearch(searchValue, true);
            }
        }
    }

    async handleImageSearch(event) {
        const searchValue = event.target.value.trim();

        if (!searchValue) {
            this.clearSearch();

            return;
        }

        await this.performSearch(searchValue);
    }

    async performSearch(query, forceRefresh = false) {
        if (!this.feedManager) {
            console.error('❌ SEARCH: Feed manager not available');

            return;
        }

        // Check for duplicate
        if (this.stateManager.isDuplicateSearch(query, SearchManager.DEFAULTS.DUPLICATE_SEARCH_TTL_MS) && !forceRefresh) {
            if (this.isDebugEnabled()) {
                console.log(`🔄 SEARCH: Skipping duplicate search for "${query}" (use Enter to force)`);
            }

            return;
        }

        this.stateManager.updateLastSearch(query);

        const requestId = this.stateManager.initializeSearch(query);

        this.paginationManager.clearSeenIds();
        this.cacheManager.clearCacheFor(query);
        this.setLoadingState(true);
        this.clearFeedContent();

        this.eventEmitter.emitSearchEvent('search:start', { query, requestId }, this.state);

        try {
            const results = await this.executionManager.searchImages(this.feedManager, query, 1);

            if (this.stateManager.isStaleResponse(requestId)) {
                return;
            }

            await this.processSearchResults(results, query);
            this.scheduleFillToBottom();

            this.eventEmitter.emitSearchEvent('search:complete', {
                query,
                requestId,
                totalResults: results.total,
                page: 1
            }, this.state);

        } catch (error) {
            this.eventEmitter.emitSearchEvent('search:error', { query, requestId, error: error.message }, this.state);
            this.handleSearchError(error, requestId, query);
        } finally {
            this.finalizeSearch(requestId);
            this.eventEmitter.emitSearchEvent('search:end', { query, requestId }, this.state);
        }
    }

    async processSearchResults(results, query) {
        if (!SearchAPIUtils.validateSearchResults(results)) {
            throw new Error('Invalid search response');
        }

        this.updateState({ hasMore: results.hasMore ?? false });
        await this.displaySearchResults(results, query);
    }

    handleSearchError(error, requestId, query) {
        if (error.name !== 'AbortError' && requestId === this.currentRequestId) {
            console.error('❌ SEARCH: Search failed:', error);
            this.showSearchError(query);
        }
    }

    finalizeSearch(requestId) {
        if (requestId === this.currentRequestId) {
            this.updateState({ isLoading: false });
            this.setLoadingState(false);
        }
    }

    async loadMoreResults() {
        await this.paginationManager.loadMoreResults(
            this.state,
            () => this.loadNextPage(),
            updates => this.updateState(updates),
            error => this.handleLoadMoreError(error)
        );
    }

    async loadNextPage() {
        this.updateState({ isLoading: true });

        const nextPage = this.state.currentPage + 1;
        const searchRequestId = this.currentRequestId;

        this.eventEmitter.emitSearchEvent('search:page', {
            query: this.state.currentSearchTerm,
            page: nextPage,
            requestId: searchRequestId
        }, this.state);

        const results = await this.executionManager.searchImages(this.feedManager, this.state.currentSearchTerm, nextPage);

        if (searchRequestId !== this.currentRequestId) {
            return;
        }

        await this.processPageResults(results, nextPage);
    }

    async processPageResults(results, nextPage) {
        if (!results.images?.length) {
            this.updateState({ hasMore: false });

            return;
        }

        const newImages = this.paginationManager.deduplicateImages(results.images);

        if (this.isDebugEnabled()) {
            const publicCount = newImages.filter(img => img.isPublic).length;
            const privateCount = newImages.length - publicCount;

            console.log(`📄 PAGE ${nextPage}: Loaded ${newImages.length} new images`, {
                totalImages: results.images.length,
                newImages: newImages.length,
                duplicatesRemoved: results.images.length - newImages.length,
                publicImages: publicCount,
                privateImages: privateCount,
                hasMore: results.hasMore
            });
        }

        if (newImages.length > 0) {
            await this.addPaginatedResults(newImages, results.hasMore, nextPage);
        } else {
            this.updateState({ hasMore: false });
        }
    }

    async addPaginatedResults(newImages, hasMore, nextPage) {
        this.updateState({
            currentPage: nextPage,
            hasMore: hasMore ?? false
        });

        this.appendImagesToFeed(newImages);
        await this.applyFilterToResults(null, false);
        await this.autoLoadUntilVisible();
    }

    handleLoadMoreError(error) {
        if (error.name !== 'AbortError') {
            console.error('❌ SEARCH: Failed to load more results:', error);
        }
    }

    async displaySearchResults(results, query) {
        if (results.images.length === 0) {
            this.showNoResults(query);
        } else {
            const publicCount = results.images.filter(img => img.isPublic).length;
            const privateCount = results.images.length - publicCount;

            if (this.isDebugEnabled()) {
                console.log(`\n🎨 DISPLAYING SEARCH RESULTS FOR: "${query}"`, {
                    totalImages: results.images.length,
                    publicImages: publicCount,
                    privateImages: privateCount,
                    breakdown: results.images.map(img => ({
                        id: img.id,
                        isPublic: img.isPublic,
                        prompt: img.prompt?.substring(0, 40)
                    }))
                });
            }

            this.appendImagesToFeed(results.images);
            await this.applyFilterToResults(query);

            // CRITICAL: Hide feed images AFTER search results are displayed
            this.hideFeedImages();

            await this.autoLoadUntilVisible();

            // Final check: hide any feed images that loaded during search
            this.hideFeedImages();

            // Start continuous monitoring to hide feed images during search
            this.startFeedImageMonitoring();
        }
    }

    startFeedImageMonitoring() {
        // Clear any existing monitor
        if (this._feedMonitorInterval) {
            clearInterval(this._feedMonitorInterval);
        }

        // Check every 500ms for new feed images and hide them
        this._feedMonitorInterval = setInterval(() => {
            if (!this.state.isSearchActive) {
                clearInterval(this._feedMonitorInterval);
                this._feedMonitorInterval = null;

                return;
            }

            const feedImages = document.querySelectorAll('.image-wrapper:not([data-source="search"]):not(.hidden)');

            if (feedImages.length > 0) {
                if (this.isDebugEnabled()) {
                    console.log(`⚠️ Found ${feedImages.length} unhidden feed images, hiding them...`);
                }
                feedImages.forEach(img => img.classList.add('hidden'));
            }
        }, 500);
    }

    async autoLoadUntilVisible() {
        await this.paginationManager.autoLoadUntilVisible(
            this.state,
            () => this.loadNextPage(),
            updates => this.updateState(updates),
            error => this.handleLoadMoreError(error),
            this._alive
        );
    }

    async applyFilterToResults(query = null, showIndicator = true) {
        await this.filterManager.applyFilterToResults(
            this.feedManager,
            query,
            showIndicator,
            () => this.updateSearchCounts(),
            q => this.showSearchActiveIndicator(q),
            q => this.uiManager.showWarningIndicator(q)
        );
    }

    async handleTagFilterChange(activeTags) {
        await this.filterManager.handleTagFilterChange(
            this.feedManager,
            activeTags,
            () => this.updateSearchCounts()
        );
    }

    updateSearchCounts() {
        const counts = this.filterManager.updateSearchCounts();

        if (this.isDebugEnabled()) {
            console.log('🔢 SEARCH COUNTS UPDATED:', {
                total: counts.total,
                visible: counts.visible,
                public: counts.public,
                private: counts.private,
                currentFilter: this.filterManager.getCurrentFilter(this.feedManager)
            });
        }

        this.stateManager.updateSearchCounts(counts);

        // Debug verification
        if (this.isDebugEnabled()) {
            const actualVisible = document.querySelectorAll('.image-wrapper[data-source="search"]:not(.hidden)').length;

            if (actualVisible !== counts.visible) {
                console.error('⚠️ COUNT MISMATCH:', {
                    reported: counts.visible,
                    actual: actualVisible,
                    difference: counts.visible - actualVisible // eslint-disable-line
                });
            }
        }

        this.updateSearchIndicatorCounts();
    }

    showSearchActiveIndicator(query) {
        this.uiManager.showSearchActiveIndicator(
            query,
            this.state.searchCounts,
            this.filterManager.getCurrentFilter(this.feedManager)
        );
    }

    updateSearchIndicatorCounts() {
        this.uiManager.updateSearchIndicatorCounts(
            this.state.currentSearchTerm,
            this.state.searchCounts,
            this.filterManager.getCurrentFilter(this.feedManager)
        );
    }

    appendImagesToFeed(images) {
        if (this.isDebugEnabled()) {
            console.log(`📌 APPENDING ${images.length} IMAGES TO FEED:`, {
                publicImages: images.filter(img => img.isPublic).length,
                privateImages: images.filter(img => !img.isPublic).length,
                imageIds: images.map(img => `${img.id}(${img.isPublic ? 'public' : 'private'})`)
            });
        }

        images.forEach(image => {
            this.paginationManager.addSeenImageId(image.id);
            this.feedManager.imageHandler.addImageToFeed(image, 'search');
        });

        this.reapplyView();
    }

    reapplyView() {
        if (this.feedManager.viewManager?.forceReapplyView) {
            this.feedManager.viewManager.forceReapplyView();
        }
    }

    scheduleFillToBottom() {
        this.paginationManager.scheduleFillToBottom(() => {
            if (!this.feedManager?.fillToBottomManager) {
                return;
            }

            const lastImage = this.feedManager.domOperations?.getLastImageElement();

            if (lastImage && this.feedManager.uiManager?.isElementInViewport(lastImage)) {
                this.loadMoreResults();
            }
        }, this._alive);
    }

    async clearSearch() {
        if (this.domCache.searchInput) {
            this.domCache.searchInput.value = '';
        }

        this.executionManager.cancelAllSearches();
        this.stateManager.resetState();
        this.cacheManager.clearAll();
        this.paginationManager.clearSeenIds();
        this.uiManager.hideSearchActiveIndicator();

        // Restore feed images before refreshing
        if (this.feedManager?.domOperations) {
            this.feedManager.domOperations.restoreFeedImages();
        }

        if (this.feedManager) {
            await this.feedManager.refreshFeed();
        }
    }

    // UI helper methods (delegate to feedManager)
    setLoadingState(isLoading) {
        if (this.feedManager?.uiManager) {
            this.feedManager.uiManager.setLoading(isLoading);
        }
    }

    clearFeedContent() {
        if (this.feedManager?.domOperations) {
            this.feedManager.domOperations.clearFeedContent();
        }

        // Hide any existing feed images
        this.hideFeedImages();
    }

    hideFeedImages() {
        // Hide ALL feed images (those without data-source="search")
        const feedImages = document.querySelectorAll('.image-wrapper:not([data-source="search"])');

        if (this.isDebugEnabled()) {
            const allImages = document.querySelectorAll('.image-wrapper');
            const searchImages = document.querySelectorAll('.image-wrapper[data-source="search"]');

            console.log('🙈 HIDING FEED IMAGES:');
            console.log(`  → Total images in DOM: ${allImages.length}`);
            console.log(`  → Feed images (not search): ${feedImages.length}`);
            console.log(`  → Search images: ${searchImages.length}`);
        }

        let hiddenCount = 0;

        feedImages.forEach(img => {
            if (!img.classList.contains('hidden')) {
                img.classList.add('hidden');
                hiddenCount++;
            }
        });

        if (this.isDebugEnabled() && hiddenCount > 0) {
            console.log(`  → Total hidden: ${hiddenCount}`);
        }
    }

    // Delegate to UI manager
    showNoResults(query) {
        this.uiManager.showNoResults(query, () => this.clearFeedContent());
    }

    showSearchError(query) {
        this.uiManager.showSearchError(query);
    }

    // Security
    escapeHTML(str) {
        const div = document.createElement('div');

        div.textContent = str;

        return div.innerHTML;
    }

    isDebugEnabled() {
        return this.debugEnabled || false;
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
        return this.stateManager.getDiagnosticState(
            this.cacheManager.getStats(),
            this.executionManager.activeControllers.size,
            this.paginationManager._lastLoadMoreTime,
            this._alive,
            this._initialized
        );
    }

    /**
     * Cleanup method for proper memory management
     */
    cleanup() {
        this._alive = false;

        // Clear feed monitor
        if (this._feedMonitorInterval) {
            clearInterval(this._feedMonitorInterval);
            this._feedMonitorInterval = null;
        }

        this.paginationManager.cleanup();
        this.executionManager.cleanup();
        this.uiManager.cleanup();

        this.eventListeners.forEach(({ target, event, handler }) => {
            target.removeEventListener(event, handler);
        });
        this.eventListeners = [];

        this.cacheManager.clearAll();
        this.stateManager.resetState();

        this.domCache = {};
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

