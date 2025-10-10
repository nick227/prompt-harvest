// Search Manager - Site-wide image search that reuses feed infrastructure
class SearchManager {
    constructor() {
        this.currentSearchTerm = '';
        this.isSearchActive = false;
        this.searchCache = new Map();
        this.currentPage = 1;
        this.hasMore = true;
        this.isLoading = false;
    }

    init() {
        this.setupImageSearch();
        this.waitForFeedManager();
    }

    // Wait for feed manager to be ready
    async waitForFeedManager(maxRetries = 20, retryDelay = 100) {
        let retries = 0;

        while (retries < maxRetries) {
            if (window.feedManager?.apiManager) {
                this.feedManager = window.feedManager;
                this.setupSearchEventListeners();

                return;
            }

            retries++;
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }

        console.warn('⚠️ SEARCH: Feed manager not available, search functionality limited');
    }

    // Setup search event listeners
    setupSearchEventListeners() {
        // Listen for infinite scroll when in search mode
        window.addEventListener('lastImageVisible', () => {
            if (this.isSearchActive && this.hasMore && !this.isLoading) {
                this.loadMoreResults();
            }
        });
    }

    // Setup image search input
    setupImageSearch() {
        const searchInput = document.querySelector('input[name="search"]');

        if (!searchInput) {
            console.warn('⚠️ SEARCH: Search input not found');

            return;
        }

        // Debounced search handler
        searchInput.addEventListener('input', Utils.async.debounce(event => {
            this.handleImageSearch(event);
        }, 300));

        // Clear search on ESC key
        searchInput.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                this.clearSearch();
            }
        });

        // Search on Enter key (immediate, no debounce)
        searchInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                const searchValue = event.target.value.trim();

                if (searchValue) {
                    this.performSearch(searchValue);
                }
            }
        });
    }

    // Handle image search input
    async handleImageSearch(event) {
        const searchValue = event.target.value.trim();

        if (!searchValue) {
            this.clearSearch();

            return;
        }

        // Perform search
        await this.performSearch(searchValue);
    }

    // Perform search using backend API
    async performSearch(query) {
        if (!this.feedManager) {
            console.error('❌ SEARCH: Feed manager not available');

            return;
        }

        try {
            // Mark search as active
            this.isSearchActive = true;
            this.currentSearchTerm = query;
            this.currentPage = 1;
            this.isLoading = true;

            // Show loading state
            this.feedManager.uiManager.setLoading(true);

            // Clear current feed
            this.feedManager.domOperations.clearFeedContent();

            // Perform search via API
            const results = await this.searchImages(query, 1);

            if (!results || !results.images) {
                throw new Error('Invalid search response');
            }

            // Store results
            this.hasMore = results.hasMore ?? false;

            // Display results using existing feed infrastructure
            if (results.images.length === 0) {
                this.showNoResults(query);
            } else {
                results.images.forEach(image => {
                    this.feedManager.imageHandler.addImageToFeed(image, 'search');
                });

                // Update UI to show search is active
                this.showSearchActiveIndicator(query, results.images.length);
            }

            // Reapply view after images are loaded
            if (this.feedManager.viewManager?.forceReapplyView) {
                this.feedManager.viewManager.forceReapplyView();
            }

            // Check if we need to fill to bottom
            setTimeout(() => {
                if (this.feedManager.fillToBottomManager) {
                    const lastImage = this.feedManager.domOperations.getLastImageElement();

                    if (lastImage && this.feedManager.uiManager.isElementInViewport(lastImage)) {
                        this.loadMoreResults();
                    }
                }
            }, 100);

        } catch (error) {
            console.error('❌ SEARCH: Search failed:', error);
            this.showSearchError(query);
        } finally {
            this.isLoading = false;
            this.feedManager.uiManager.setLoading(false);
        }
    }

    // Search images via API
    async searchImages(query, page = 1) {
        if (!this.feedManager?.apiManager) {
            throw new Error('API manager not available');
        }

        const cacheKey = `${query}-${page}`;

        // Check cache first
        if (this.searchCache.has(cacheKey)) {
            return this.searchCache.get(cacheKey);
        }

        // Build search URL
        const currentFilter = this.feedManager.filterManager?.getCurrentFilter() || 'public';
        const url = `/api/search/images?q=${encodeURIComponent(query)}&page=${page}&filter=${currentFilter}`;

        // Get auth token
        const token = this.feedManager.apiManager.getAuthToken();

        // Perform search
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();

        // Handle response structure from formatPaginatedResponse
        // Structure: { success, data: { items, pagination, hasMore, meta } }
        const images = data.data?.items || data.images || data.items || [];

        const result = {
            images,
            hasMore: data.data?.hasMore ?? data.hasMore ?? false,
            total: data.data?.pagination?.total ?? data.pagination?.total ?? data.total ?? images.length,
            meta: data.data?.meta || null
        };

        // Cache the result
        this.searchCache.set(cacheKey, result);

        return result;
    }

    // Load more search results (pagination)
    async loadMoreResults() {
        if (!this.isSearchActive || this.isLoading || !this.hasMore || !this.currentSearchTerm) {
            return;
        }

        try {
            this.isLoading = true;
            this.currentPage++;

            const results = await this.searchImages(this.currentSearchTerm, this.currentPage);

            if (results.images && results.images.length > 0) {
                this.hasMore = results.hasMore ?? false;

                results.images.forEach(image => {
                    this.feedManager.imageHandler.addImageToFeed(image, 'search');
                });

                // Reapply view after new images are loaded
                if (this.feedManager.viewManager?.forceReapplyView) {
                    this.feedManager.viewManager.forceReapplyView();
                }
            } else {
                this.hasMore = false;
            }

        } catch (error) {
            console.error('❌ SEARCH: Failed to load more results:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // Clear search and restore feed
    async clearSearch() {
        const searchInput = document.querySelector('input[name="search"]');

        if (searchInput) {
            searchInput.value = '';
        }

        this.isSearchActive = false;
        this.currentSearchTerm = '';
        this.currentPage = 1;
        this.hasMore = true;
        this.searchCache.clear();

        // Hide search indicator
        this.hideSearchActiveIndicator();

        // Restore normal feed
        if (this.feedManager) {
            await this.feedManager.refreshFeed();
        }
    }

    // Show search active indicator
    showSearchActiveIndicator(query, resultCount) {
        let indicator = document.querySelector('.search-active-indicator');

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'search-active-indicator';
            indicator.style.cssText = `
                background: rgba(59, 130, 246, 0.1);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: var(--text-primary, #e5e7eb);
            `;

            const promptOutput = document.querySelector('.prompt-output');

            if (promptOutput?.parentElement) {
                promptOutput.parentElement.insertBefore(indicator, promptOutput);
            }
        }

        indicator.innerHTML = `
            <div>
                <strong>Search:</strong> "${query}"
                <span style="opacity: 0.7;">(${resultCount} result${resultCount !== 1 ? 's' : ''})</span>
            </div>
            <button onclick="window.searchManager.clearSearch()" style="
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #ef4444;
                padding: 4px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            ">Clear Search</button>
        `;
    }

    // Hide search active indicator
    hideSearchActiveIndicator() {
        const indicator = document.querySelector('.search-active-indicator');

        if (indicator) {
            indicator.remove();
        }
    }

    // Show no results message
    showNoResults(query) {
        this.feedManager.domOperations.clearFeedContent();

        const promptOutput = document.querySelector('.prompt-output');

        if (!promptOutput) {
            return;
        }

        const message = document.createElement('div');

        message.style.cssText = `
            text-align: center;
            padding: 60px 20px;
            color: var(--text-secondary, #9ca3af);
        `;

        message.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
            <h3 style="margin-bottom: 8px; color: var(--text-primary, #e5e7eb);">No results found</h3>
            <p>No images found for "${query}"</p>
            <button onclick="window.searchManager.clearSearch()" style="
                margin-top: 16px;
                padding: 8px 16px;
                background: rgba(59, 130, 246, 0.2);
                border: 1px solid rgba(59, 130, 246, 0.3);
                color: #3b82f6;
                border-radius: 6px;
                cursor: pointer;
            ">Clear Search</button>
        `;

        promptOutput.appendChild(message);
    }

    // Show search error
    showSearchError(query) {
        this.feedManager.domOperations.clearFeedContent();

        const promptOutput = document.querySelector('.prompt-output');

        if (!promptOutput) {
            return;
        }

        const message = document.createElement('div');

        message.style.cssText = `
            text-align: center;
            padding: 60px 20px;
            color: var(--text-secondary, #9ca3af);
        `;

        message.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <h3 style="margin-bottom: 8px; color: var(--text-primary, #e5e7eb);">Search failed</h3>
            <p>Unable to search for "${query}". Please try again.</p>
            <button onclick="window.searchManager.clearSearch()" style="
                margin-top: 16px;
                padding: 8px 16px;
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #ef4444;
                border-radius: 6px;
                cursor: pointer;
            ">Clear Search</button>
        `;

        promptOutput.appendChild(message);
    }

    // Trigger search programmatically
    triggerSearch(searchTerm) {
        const searchInput = document.querySelector('input[name="search"]');

        if (searchInput) {
            searchInput.value = searchTerm;
            this.performSearch(searchTerm);
        }
    }
}

// Export for global access
window.SearchManager = SearchManager;
window.searchManager = new SearchManager();
