/**
 * SearchFilterManager
 * Handles filtering of search results and count updates
 *
 * @class SearchFilterManager
 */
class SearchFilterManager {
    /**
     * @param {Function} debugFn - Debug logging function
     */
    constructor(debugFn = null) {
        this.isDebugEnabled = debugFn;
    }

    /**
     * Get current filter with proper fallback chain
     * @param {Object} feedManager - Feed manager instance
     * @returns {string} Current filter ('public', 'private', 'all')
     */
    getCurrentFilter(feedManager) {
        // Try FeedFilterManager (most authoritative)
        if (feedManager?.filterManager?.currentFilter) {
            return feedManager.filterManager.currentFilter;
        }

        // Try HybridTabService
        if (feedManager?.tabService?.currentFilter) {
            return feedManager.tabService.currentFilter;
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
     * Apply filter to search results
     * @param {Object} feedManager - Feed manager instance
     * @param {string|null} query - Search query (for indicator display)
     * @param {boolean} showIndicator - Whether to show search indicator
     * @param {Function} updateCountsFn - Function to update counts
     * @param {Function} showIndicatorFn - Function to show indicator
     * @param {Function} showWarningFn - Function to show warning
     * @returns {Promise<void>}
     */
    async applyFilterToResults(feedManager, query, showIndicator, updateCountsFn, showIndicatorFn, showWarningFn) {
        try {
            const currentFilter = this.getCurrentFilter(feedManager);

            if (this.isDebugEnabled?.()) {
                console.log('🔄 APPLYING FILTER TO SEARCH RESULTS:', {
                    query,
                    currentFilter
                });
            }

            // SIMPLIFIED: Let HybridTabService handle the filtering
            // It already knows to filter only search results when search is active
            if (feedManager?.tabService) {
                feedManager.tabService.switchToFilter(currentFilter);
            } else {
                console.warn('⚠️ SEARCH: TabService not available');
            }

            // Wait for DOM to settle
            await new Promise(resolve => {
                requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            });

            updateCountsFn();

            const afterCounts = this.updateSearchCounts();

            if (this.isDebugEnabled?.()) {
                console.log('✅ FILTER APPLIED:', {
                    query,
                    currentFilter,
                    visible: afterCounts.visible,
                    public: afterCounts.public,
                    private: afterCounts.private
                });
            }

            if (showIndicator && query) {
                showIndicatorFn(query);
            }

        } catch (error) {
            console.error('❌ SEARCH: Failed to apply filter to search results:', error);

            if (query) {
                showWarningFn(query);
            }
        }
    }

    /**
     * Wait for HybridTabService to be initialized
     * @param {Object} feedManager - Feed manager instance
     * @param {number} timeout - Maximum wait time in ms
     * @param {Function} isAliveFn - Function that returns alive status
     * @returns {Promise<void>}
     */
    async waitForHybridTabService(feedManager, timeout = 2000, isAliveFn = () => true) {
        const startTime = Date.now();

        while (feedManager?.tabService && !feedManager.tabService.isInitialized && isAliveFn()) {
            if (Date.now() - startTime > timeout) {
                console.warn('⚠️ SEARCH: TabService initialization timeout');
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 50));
        }

        if (!isAliveFn()) {
            console.log('🛑 SEARCH: Cleanup called, stopping TabService wait');
        }
    }

    /**
     * Handle tag filter changes within search results
     * @param {Object} feedManager - Feed manager instance
     * @param {Array} activeTags - Active tags
     * @param {Function} updateCountsFn - Function to update counts
     * @returns {Promise<void>}
     */
    async handleTagFilterChange(feedManager, activeTags, updateCountsFn) {
        if (!feedManager?.tabService) {
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
        const currentFilter = this.getCurrentFilter(feedManager);
        const { currentUserId } = feedManager.tabService;

        if (activeTags.length === 0) {
            // No tag filter - show all search results (respect owner filter)
            if (feedManager?.tabService) {
                feedManager.tabService.switchToFilter(currentFilter);
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
        updateCountsFn();
    }

    /**
     * Update search counts from DOM
     * @returns {Object} Search counts
     */
    updateSearchCounts() {
        // Guard: check if helpers are loaded
        if (!window.SearchFilterHelpers) {
            console.error('❌ SEARCH: SearchFilterHelpers not loaded');

            // Fallback to manual count
            return {
                total: document.querySelectorAll('.image-wrapper[data-source="search"]').length,
                public: 0,
                private: 0,
                visible: document.querySelectorAll('.image-wrapper[data-source="search"]:not(.hidden)').length
            };
        }

        return window.SearchFilterHelpers.updateSearchCountsFromDOM();
    }
}

// Export for use in SearchManager
window.SearchFilterManager = SearchFilterManager;

