/**
 * SearchManager - Site-wide image search with performance enhancements
 * Uses extracted helpers for better code organization
 */

class SearchManager {
    // Constants
    static DEFAULTS = {
        DEBOUNCE_MS: 300,
        MAX_RETRIES: 20,
        RETRY_DELAY_MS: 100,
        CACHE_MAX_SIZE: 50,
        FILL_TO_BOTTOM_DELAY_MS: 100
    };

    constructor() {
        // Initialize UI components helper
        this.uiComponents = new window.SearchUIComponents(str => this.escapeHTML(str));

        // Debug configuration (P3)
        this.debugEnabled = window.isDebugEnabled ? window.isDebugEnabled('SEARCH_FILTERING') : false;

        // State management
        this.state = {
            currentSearchTerm: '',
            isSearchActive: false,
            currentPage: 1,
            hasMore: true,
            isLoading: false,
            searchCounts: {
                total: 0,      // Total search results loaded
                public: 0,     // Public search results
                private: 0,    // Private search results
                visible: 0     // Currently visible (after filtering)
            }
        };

        // Cache with size limit
        this.searchCache = new Map();

        // Request cancellation
        this.abortController = null;

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

    // Initialize search manager
    init() {
        this.cacheDOM();
        this.setupImageSearch();
        this.waitForFeedManager();
    }

    // Cache DOM elements to avoid repeated queries
    cacheDOM() {
        this.domCache.searchInput = document.querySelector('input[name="search"]');
        this.domCache.promptOutput = document.querySelector('.prompt-output');
    }

    // Wait for feed manager to be ready with exponential backoff
    async waitForFeedManager(
        maxRetries = SearchManager.DEFAULTS.MAX_RETRIES,
        retryDelay = SearchManager.DEFAULTS.RETRY_DELAY_MS
    ) {
        let retries = 0;

        while (retries < maxRetries) {
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

        console.warn('⚠️ SEARCH: Feed manager not available, search functionality limited');
    }

    // Setup search event listeners with proper cleanup tracking
    setupSearchEventListeners() {
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

    // Setup image search input
    setupImageSearch() {
        if (!this.domCache.searchInput) {
            console.warn('⚠️ SEARCH: Search input not found');

            return;
        }

        // Debounced search handler
        const debouncedHandler = Utils.async.debounce(
            event => this.handleImageSearch(event),
            SearchManager.DEFAULTS.DEBOUNCE_MS
        );

        this.domCache.searchInput.addEventListener('input', debouncedHandler);
        this.eventListeners.push({
            target: this.domCache.searchInput,
            event: 'input',
            handler: debouncedHandler
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
            const searchValue = event.target.value.trim();

            if (searchValue) {
                // Cancel debounced search and execute immediately
                this.performSearch(searchValue);
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

    // Perform search with request cancellation
    async performSearch(query) {
        if (!this.feedManager) {
            console.error('❌ SEARCH: Feed manager not available');

            return;
        }

        // Cancel previous search if still running
        this.cancelCurrentSearch();

        try {
            // Update state
            this.updateState({
                isSearchActive: true,
                currentSearchTerm: query,
                currentPage: 1,
                isLoading: true
            });

            // Show loading
            this.setLoadingState(true);

            // Clear feed
            this.clearFeedContent();

            // Perform search
            const results = await this.searchImages(query, 1);

            // Validate results
            if (!this.validateSearchResults(results)) {
                throw new Error('Invalid search response');
            }

            // Update hasMore state
            this.updateState({ hasMore: results.hasMore ?? false });

            // Display results (await to ensure filter is applied before continuing)
            await this.displaySearchResults(results, query);

            // Check if need to fill to bottom (runs after filter applied)
            this.scheduleFillToBottom();

        } catch (error) {
            // Only show error if not aborted
            if (error.name !== 'AbortError') {
                console.error('❌ SEARCH: Search failed:', error);
                this.showSearchError(query);
            }
        } finally {
            this.updateState({ isLoading: false });
            this.setLoadingState(false);
        }
    }

    // Cancel current search request
    cancelCurrentSearch() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    // Search images via API with caching and cancellation
    async searchImages(query, page = 1) {
        if (!this.feedManager?.apiManager) {
            throw new Error('API manager not available');
        }

        const cacheKey = this.getCacheKey(query, page);

        // Check cache first
        const cachedResult = this.getFromCache(cacheKey);

        if (cachedResult) {
            return cachedResult;
        }

        // Create new AbortController for this request
        this.abortController = new AbortController();

        // Build search URL
        const url = this.buildSearchURL(query, page);

        // Get auth token
        const token = this.feedManager.apiManager.getAuthToken();

        // Perform search with cancellation support
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            signal: this.abortController.signal
        });

        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();

        // Parse and structure result
        const result = this.parseSearchResponse(data);

        // Cache with size limit
        this.addToCache(cacheKey, result);

        return result;
    }

    // Build search URL - search shows all accessible images
    buildSearchURL(query, page) {
        const params = new URLSearchParams({
            q: query,
            page: page.toString()
        });

        return `/api/search/images?${params.toString()}`;
    }

    // Parse search response into structured format
    parseSearchResponse(data) {
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

    // Load more search results (pagination)
    async loadMoreResults() {
        const canLoadMore = this.state.isSearchActive &&
            !this.state.isLoading &&
            this.state.hasMore &&
            this.state.currentSearchTerm;

        if (!canLoadMore) {
            return;
        }

        try {
            this.updateState({ isLoading: true });

            const nextPage = this.state.currentPage + 1;
            const results = await this.searchImages(this.state.currentSearchTerm, nextPage);

            if (results.images?.length > 0) {
                this.updateState({
                    currentPage: nextPage,
                    hasMore: results.hasMore ?? false
                });

                this.appendImagesToFeed(results.images);

                // Apply current filter to new paginated results (Issue #4 fix)
                const currentFilter = this.getCurrentFilter();

                if (this.feedManager?.tabService) {
                    this.feedManager.tabService.switchToFilter(currentFilter);
                }

                // Update counts after appending and filtering
                this.updateSearchCounts();
            } else {
                this.updateState({ hasMore: false });
            }

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('❌ SEARCH: Failed to load more results:', error);
            }
        } finally {
            this.updateState({ isLoading: false });
        }
    }

    // Display search results
    async displaySearchResults(results, query) {
        if (results.images.length === 0) {
            this.showNoResults(query);
        } else {
            // P3: Conditional debug logging
            if (this.isDebugEnabled()) {
                console.log(`\n🔍 DISPLAYING SEARCH RESULTS FOR: "${query}"`);
                console.log(`  Total Images: ${results.images.length}`);

                // Count public vs private before rendering
                const publicCount = results.images.filter(img => img.isPublic === true).length;
                const privateCount = results.images.length - publicCount;

                console.log(`  Public: ${publicCount}, Private: ${privateCount}`);
            }

            this.appendImagesToFeed(results.images);

            // Apply current owner filter immediately after adding images (P1 improvements)
            await this.applyFilterToResults(query);
        }
    }

    // Apply filter to search results with proper fallback and error handling (P1)
    async applyFilterToResults(query) {
        try {
            // Get current filter with proper fallback chain (P1 fix)
            const currentFilter = this.getCurrentFilter();

            // P3: Conditional debug logging
            if (this.isDebugEnabled()) {
                console.log(`  Current Owner Filter: "${currentFilter}"`);
                console.log('  Applying filter to search results...');
            }

            // Wait for HybridTabService to be initialized (P1 fix)
            // Only wait if it exists but isn't ready (Issue #8 fix)
            if (this.feedManager?.tabService && !this.feedManager.tabService.isInitialized) {
                await this.waitForHybridTabService();
            }

            // Apply filter (P1 error handling)
            if (this.feedManager?.tabService) {
                this.feedManager.tabService.switchToFilter(currentFilter);
            } else {
                console.warn('⚠️ SEARCH: TabService not available, showing all results');
            }

            // Ensure counts are updated after filter is applied
            this.updateSearchCounts();
            this.showSearchActiveIndicator(query);

        } catch (error) {
            console.error('❌ SEARCH: Failed to apply filter to search results:', error);

            // Fallback: show warning message instead of misleading counts (Issue #7 fix)
            const indicator = document.querySelector('.search-active-indicator');

            if (indicator) {
                indicator.innerHTML = `
                    <div style="color: #f59e0b;">
                        <strong>⚠️ Search:</strong> "${this.escapeHTML(query)}"
                        <span style="opacity: 0.8;">(Filter not applied - showing all results)</span>
                    </div>
                    <button onclick="window.searchManager.clearSearch()" style="
                        background: rgba(239, 68, 68, 0.2);
                        border: 1px solid rgba(239, 68, 68, 0.3);
                        color: #ef4444;
                        padding: 4px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 500;
                    ">Clear Search</button>
                `;
            }
        }
    }

    // Get current filter with proper fallback chain (P1 fix)
    getCurrentFilter() {
        // 1. Try FeedFilterManager (most authoritative)
        if (window.feedManager?.filterManager?.currentFilter) {
            return window.feedManager.filterManager.currentFilter;
        }

        // 2. Try HybridTabService (via tabService property)
        if (this.feedManager?.tabService?.currentFilter) {
            return this.feedManager.tabService.currentFilter;
        }

        // 3. Try reading from DOM
        const dropdown = document.querySelector('select[name="owner-filter"]');

        if (dropdown?.value) {
            return dropdown.value;
        }

        // 4. Final fallback
        return 'public';
    }

    // Wait for HybridTabService to be initialized (P1 fix)
    async waitForHybridTabService(timeout = 2000) {
        const startTime = Date.now();

        // Only wait if it exists but isn't initialized yet (Issue #8 & #9 fix)
        while (this.feedManager?.tabService && !this.feedManager.tabService.isInitialized) {
            if (Date.now() - startTime > timeout) {
                console.warn('⚠️ SEARCH: TabService initialization timeout');

                break;
            }

            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    // Append images to feed
    appendImagesToFeed(images) {
        images.forEach(image => {
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

    // Check if debug logging is enabled (P3)
    isDebugEnabled() {
        return this.debugEnabled || false;
    }

    // Schedule fill to bottom check
    scheduleFillToBottom() {
        setTimeout(() => {
            if (!this.feedManager.fillToBottomManager) {
                return;
            }

            const lastImage = this.feedManager.domOperations.getLastImageElement();

            if (lastImage && this.feedManager.uiManager.isElementInViewport(lastImage)) {
                this.loadMoreResults();
            }
        }, SearchManager.DEFAULTS.FILL_TO_BOTTOM_DELAY_MS);
    }

    // Clear search and restore feed
    async clearSearch() {
        // Clear input
        if (this.domCache.searchInput) {
            this.domCache.searchInput.value = '';
        }

        // Cancel any pending requests
        this.cancelCurrentSearch();

        // Reset state
        this.updateState({
            isSearchActive: false,
            currentSearchTerm: '',
            currentPage: 1,
            hasMore: true,
            isLoading: false
        });

        // Clear cache
        this.searchCache.clear();

        // Hide indicator
        this.hideSearchActiveIndicator();

        // Restore feed
        if (this.feedManager) {
            await this.feedManager.refreshFeed();
        }
    }

    // Cache management with size limit (LRU-like)
    getCacheKey(query, page) {
        // Search shows all accessible images, cache is per query only
        return `${query}-${page}`;
    }

    getFromCache(key) {
        return this.searchCache.get(key);
    }

    addToCache(key, value) {
        // Implement cache size limit
        if (this.searchCache.size >= SearchManager.DEFAULTS.CACHE_MAX_SIZE) {
            // Remove oldest entry (first key in Map)
            const firstKey = this.searchCache.keys().next().value;

            this.searchCache.delete(firstKey);
        }

        this.searchCache.set(key, value);
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

    validateSearchResults(results) {
        return results && Array.isArray(results.images);
    }

    // Delegate to UI components helper
    createMessageElement(config) {
        return this.uiComponents.createMessageElement(config);
    }

    // Update search counts from DOM (delegates to helper)
    updateSearchCounts() {
        this.state.searchCounts = window.SearchFilterHelpers.updateSearchCountsFromDOM();

        // Update indicator with current counts
        this.updateSearchIndicatorCounts();
    }

    // Show search active indicator
    showSearchActiveIndicator(query) {
        let indicator = document.querySelector('.search-active-indicator');

        if (!indicator) {
            indicator = this.createSearchIndicator();
        }

        this.updateSearchIndicator(indicator, query);
    }

    createSearchIndicator() {
        const indicator = this.uiComponents.createSearchIndicator();

        if (this.domCache.promptOutput?.parentElement) {
            this.domCache.promptOutput.parentElement.insertBefore(
                indicator,
                this.domCache.promptOutput
            );
        }

        return indicator;
    }

    updateSearchIndicator(indicator, query) {
        const counts = this.state.searchCounts;
        const currentFilter = this.getCurrentFilter();

        // P3: Conditional debug logging
        if (this.isDebugEnabled()) {
            console.log('\n🔍 SEARCH INDICATOR UPDATE:');
            console.log('  Counts:', counts);
            console.log('  Filter:', currentFilter);
        }

        // Get count text using helper - shows filtered count based on current filter
        const countText = this.uiComponents.getCountText(currentFilter, counts);

        if (this.isDebugEnabled()) {
            console.log(`  Display Text: "${countText}"`);
        }

        // Build HTML using helper
        indicator.innerHTML = this.uiComponents.buildIndicatorHTML(query, countText);
    }

    // Update indicator counts only (called after filtering)
    updateSearchIndicatorCounts() {
        const indicator = document.querySelector('.search-active-indicator');

        if (indicator && this.state.currentSearchTerm) {
            this.updateSearchIndicator(indicator, this.state.currentSearchTerm);
        }
    }

    // Handle tag filter changes within search results
    handleTagFilterChange(activeTags) {
        if (!this.feedManager?.tabService) {
            console.warn('⚠️ SEARCH: TabService not available');

            return;
        }

        const searchImages = document.querySelectorAll('.image-wrapper[data-source="search"]');

        // Get current filter once for entire method
        const currentFilter = this.getCurrentFilter();
        const { currentUserId } = this.feedManager.tabService;

        if (activeTags.length === 0) {
            // No tag filter - show all search results (respect owner filter)
            this.feedManager.tabService.switchToFilter(currentFilter);

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
    showSearchMessage(type, query) {
        this.clearFeedContent();

        if (!this.domCache.promptOutput) {
            return;
        }

        const config = this.uiComponents.getMessageConfig(type, query);
        const message = this.createMessageElement(config);

        this.domCache.promptOutput.appendChild(message);
    }

    // Show no results message
    showNoResults(query) {
        this.showSearchMessage('noResults', query);
    }

    // Show search error
    showSearchError(query) {
        this.showSearchMessage('error', query);
    }

    // Security: Escape HTML to prevent XSS
    escapeHTML(str) {
        const div = document.createElement('div');

        div.textContent = str;

        return div.innerHTML;
    }

    // Trigger search programmatically
    triggerSearch(searchTerm) {
        if (this.domCache.searchInput) {
            this.domCache.searchInput.value = searchTerm;
            this.performSearch(searchTerm);
        }
    }

    // Get current search state (for debugging)
    getState() {
        return {
            ...this.state,
            cacheSize: this.searchCache.size,
            hasAbortController: !!this.abortController,
            hasFeedManager: !!this.feedManager
        };
    }

    // Cleanup method for proper memory management
    cleanup() {
        // Cancel any pending requests
        this.cancelCurrentSearch();

        // Remove all event listeners
        this.eventListeners.forEach(({ target, event, handler }) => {
            target.removeEventListener(event, handler);
        });
        this.eventListeners = [];

        // Clear cache
        this.searchCache.clear();

        // Clear DOM cache
        this.domCache = {};

        // Reset state
        this.updateState({
            isSearchActive: false,
            currentSearchTerm: '',
            currentPage: 1,
            hasMore: true,
            isLoading: false
        });
    }
}

// Add CSS animation for fade effects
if (typeof document !== 'undefined') {
    const style = document.createElement('style');

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
