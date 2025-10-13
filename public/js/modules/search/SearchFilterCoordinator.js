/**
 * SearchFilterCoordinator - Coordinates filter application and count updates
 * @class SearchFilterCoordinator
 */
class SearchFilterCoordinator {
    constructor(filterManager, stateManager, debugCallback) {
        this.filterManager = filterManager;
        this.stateManager = stateManager;
        this.isDebugEnabled = debugCallback;
    }

    async applyFilterToResults(feedManager, query, showIndicator, updateCountsCallback, showIndicatorCallback, showWarningCallback) {
        await this.filterManager.applyFilterToResults(
            feedManager,
            query,
            showIndicator,
            updateCountsCallback,
            showIndicatorCallback,
            showWarningCallback
        );
    }

    async handleTagFilterChange(feedManager, activeTags, updateCountsCallback) {
        await this.filterManager.handleTagFilterChange(
            feedManager,
            activeTags,
            updateCountsCallback
        );
    }

    updateSearchCounts(feedManager) {
        const counts = this.filterManager.updateSearchCounts();

        if (this.isDebugEnabled()) {
            console.log('🔢 SEARCH COUNTS UPDATED:', {
                total: counts.total,
                visible: counts.visible,
                public: counts.public,
                private: counts.private,
                currentFilter: this.filterManager.getCurrentFilter(feedManager)
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

        return counts;
    }

    getCurrentFilter(feedManager) {
        return this.filterManager.getCurrentFilter(feedManager);
    }
}

window.SearchFilterCoordinator = SearchFilterCoordinator;

