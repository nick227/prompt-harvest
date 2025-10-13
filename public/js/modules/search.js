/* global SearchIDGenerator, SearchCacheManager, SearchRetryStrategy, SearchEventEmitter */
/* global SearchAPIUtils, SearchPaginationManager, SearchFilterManager, SearchUIManager */
/* global SearchExecutionManager, SearchStateManager, SearchDisplayManager */
/* global SearchResultProcessor, SearchFeedIntegration, SearchCoordinator, SearchFilterCoordinator */
/* global SearchResultDisplay, SearchEventHandler, SearchPaginationHandler */

/**
 * SearchManager - Site-wide image search with modular architecture
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

        // Debug configuration
        this.debugEnabled = window.isDebugEnabled ? window.isDebugEnabled('SEARCH_FILTERING') : false;

        // Initialize modules
        this._initializeModules();
        this._initializeDOM();
    }

    _initializeModules() {
        this._initializeCoreUtilities();
        this._initializeManagers();
        this._initializeCoordinators();

        // Placeholder modules (initialized after feedManager is available)
        this.displayManager = null;
        this.resultProcessor = null;
        this.feedIntegration = null;
    }

    _initializeCoreUtilities() {
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
    }

    _initializeManagers() {
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

    _initializeCoordinators() {
        this.searchCoordinator = new window.SearchCoordinator(
            this.stateManager,
            this.executionManager,
            this.cacheManager,
            this.paginationManager,
            this.eventEmitter,
            () => this.isDebugEnabled()
        );

        this.filterCoordinator = new window.SearchFilterCoordinator(
            this.filterManager,
            this.stateManager,
            () => this.isDebugEnabled()
        );

        this.resultDisplay = new window.SearchResultDisplay(
            () => this.isDebugEnabled()
        );

        this.paginationHandler = new window.SearchPaginationHandler(
            this.stateManager,
            this.paginationManager
        );
    }

    _initializeDOM() {
        // Cached DOM elements
        this.domCache = {
            searchInput: null,
            promptOutput: null
        };

        // Event handler
        this.eventHandler = new window.SearchEventHandler(this.domCache);

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

    async waitForFeedManager(
        maxRetries = SearchManager.DEFAULTS.MAX_RETRIES,
        retryDelay = SearchManager.DEFAULTS.RETRY_DELAY_MS
    ) {
        let retries = 0;

        while (retries < maxRetries && this._alive) {
            if (window.feedManager?.apiManager) {
                this.feedManager = window.feedManager;
                this._initializeHelperModules();
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

    _initializeHelperModules() {
        this.displayManager = new window.SearchDisplayManager(
            this.feedManager,
            this.uiManager,
            () => this.isDebugEnabled()
        );

        this.resultProcessor = new window.SearchResultProcessor(
            this.stateManager,
            this.paginationManager,
            this.executionManager,
            this.eventEmitter,
            () => this.isDebugEnabled()
        );

        this.feedIntegration = new window.SearchFeedIntegration(
            this.feedManager,
            this.paginationManager,
            () => this.isDebugEnabled()
        );
    }

    setupSearchEventListeners() {
        const scrollHandler = () => {
            if (this.state.isSearchActive && this.state.hasMore && !this.state.isLoading) {
                this.loadMoreResults();
            }
        };

        const tagChangeHandler = event => {
            if (this.state.isSearchActive) {
                this.handleTagFilterChange(event.detail?.tags || []);
            }
        };

        this.eventHandler.setupSearchEventListeners(scrollHandler, tagChangeHandler);
    }

    setupImageSearch() {
        this.eventHandler.setupImageSearch(
            event => this.handleImageSearch(event),
            event => this.eventHandler.handleKeyboardShortcuts(
                event,
                () => this.clearSearch(),
                (value, force) => this.performSearch(value, force)
            ),
            SearchManager.DEFAULTS.DEBOUNCE_MS
        );
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
        // Update URL via SearchRouter if available
        if (window.searchRouter && window.searchRouter.isInitialized) {
            const currentRouterQuery = window.searchRouter.getQuery();

            if (currentRouterQuery !== query) {
                window.searchRouter.currentQuery = query;
                window.searchRouter.updateURL();
            }
        }

        const processResults = (results, q) => this.resultProcessor.processSearchResults(
            results, q, (r, q2) => this.displaySearchResults(r, q2)
        );
        const scheduleFill = () => this.feedIntegration.scheduleFillToBottom(
            () => this.loadMoreResults(), this._alive
        );
        const handleError = (error, requestId, q) => this.resultProcessor.handleSearchError(
            error, requestId, q, q2 => this.displayManager.showSearchError(q2)
        );
        const finalize = requestId => this.resultProcessor.finalizeSearch(
            requestId, loading => this.displayManager.setLoadingState(loading)
        );

        await this.searchCoordinator.performSearch(
            query,
            forceRefresh,
            this.feedManager,
            SearchManager.DEFAULTS.DUPLICATE_SEARCH_TTL_MS,
            processResults,
            scheduleFill,
            handleError,
            finalize,
            loading => this.displayManager.setLoadingState(loading),
            () => this.displayManager.clearFeedContent()
        );
    }

    async loadMoreResults() {
        await this.paginationHandler.loadMoreResults(
            this.state,
            () => this.loadNextPage(),
            updates => this.updateState(updates),
            error => this.resultProcessor.handleLoadMoreError(error)
        );
    }

    async loadNextPage() {
        const result = await this.resultProcessor.loadNextPage(
            this.feedManager, this.state, this.currentRequestId
        );

        if (result) {
            const autoLoad = () => this.paginationHandler.autoLoadUntilVisible(
                this.state,
                () => this.loadNextPage(),
                updates => this.updateState(updates),
                error => this.resultProcessor.handleLoadMoreError(error),
                this._alive
            );

            await this.resultProcessor.processPageResults(
                result.results,
                result.nextPage,
                (imgs, more, page) => this.paginationHandler.addPaginatedResults(
                    imgs,
                    more,
                    page,
                    imgs2 => this.feedIntegration.appendImagesToFeed(imgs2),
                    (q, show) => this.applyFilterToResults(q, show),
                    autoLoad
                )
            );
        }
    }

    async displaySearchResults(results, query) {
        const autoLoad = () => this.paginationHandler.autoLoadUntilVisible(
            this.state,
            () => this.loadNextPage(),
            updates => this.updateState(updates),
            error => this.resultProcessor.handleLoadMoreError(error),
            this._alive
        );

        await this.resultDisplay.displaySearchResults(
            results,
            query,
            q => this.displayManager.showNoResults(q, () => this.displayManager.clearFeedContent()),
            imgs => this.feedIntegration.appendImagesToFeed(imgs),
            q => this.applyFilterToResults(q),
            () => this.displayManager.hideFeedImages(),
            autoLoad,
            () => this.displayManager.startFeedImageMonitoring(() => this.state.isSearchActive)
        );
    }

    async applyFilterToResults(query = null, showIndicator = true) {
        await this.filterCoordinator.applyFilterToResults(
            this.feedManager,
            query,
            showIndicator,
            () => {
                this.filterCoordinator.updateSearchCounts(this.feedManager);
                this.displayManager.updateSearchIndicatorCounts(
                    this.state.currentSearchTerm,
                    this.state.searchCounts,
                    this.filterCoordinator.getCurrentFilter(this.feedManager)
                );
            },
            q => this.displayManager.showSearchActiveIndicator(
                q,
                this.state.searchCounts,
                this.filterCoordinator.getCurrentFilter(this.feedManager)
            ),
            q => this.uiManager.showWarningIndicator(q)
        );
    }

    async handleTagFilterChange(activeTags) {
        await this.filterCoordinator.handleTagFilterChange(
            this.feedManager,
            activeTags,
            () => {
                this.filterCoordinator.updateSearchCounts(this.feedManager);
                this.displayManager.updateSearchIndicatorCounts(
                    this.state.currentSearchTerm,
                    this.state.searchCounts,
                    this.filterCoordinator.getCurrentFilter(this.feedManager)
                );
            }
        );
    }

    async clearSearch() {
        // Clear URL via SearchRouter if available
        if (window.searchRouter && window.searchRouter.isInitialized) {
            window.searchRouter.currentQuery = '';
            window.searchRouter.updateURL();
        }

        if (this.domCache.searchInput) {
            this.domCache.searchInput.value = '';
        }
        this.executionManager.cancelAllSearches();
        this.stateManager.resetState();
        this.cacheManager.clearAll();
        this.paginationManager.clearSeenIds();
        this.displayManager.hideSearchActiveIndicator();
        this.feedIntegration.restoreFeedImages();

        if (this.feedManager) {
            await this.feedManager.refreshFeed();
        }
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

        if (this.displayManager) {
            this.displayManager.cleanup();
        }

        this.eventHandler.cleanup();
        this.paginationManager.cleanup();
        this.executionManager.cleanup();
        this.uiManager.cleanup();

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
