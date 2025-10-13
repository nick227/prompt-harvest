/**
 * SearchDisplayManager - Handles display and UI delegation for search
 * @class SearchDisplayManager
 */
class SearchDisplayManager {
    constructor(feedManager, uiManager, debugCallback) {
        this.feedManager = feedManager;
        this.uiManager = uiManager;
        this.isDebugEnabled = debugCallback;
        this._feedMonitorInterval = null;
    }

    setLoadingState(isLoading) {
        if (this.feedManager?.uiManager) {
            this.feedManager.uiManager.setLoading(isLoading);
        }
    }

    clearFeedContent() {
        if (this.feedManager?.domOperations) {
            this.feedManager.domOperations.clearFeedContent();
        }
        this.hideFeedImages();
    }

    hideFeedImages() {
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

    startFeedImageMonitoring(isSearchActiveCallback) {
        if (this._feedMonitorInterval) {
            clearInterval(this._feedMonitorInterval);
        }

        this._feedMonitorInterval = setInterval(() => {
            if (!isSearchActiveCallback()) {
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

    showNoResults(query, clearCallback) {
        this.uiManager.showNoResults(query, clearCallback);
    }

    showSearchError(query) {
        this.uiManager.showSearchError(query);
    }

    showSearchActiveIndicator(query, searchCounts, currentFilter) {
        this.uiManager.showSearchActiveIndicator(query, searchCounts, currentFilter);
    }

    updateSearchIndicatorCounts(searchTerm, searchCounts, currentFilter) {
        this.uiManager.updateSearchIndicatorCounts(searchTerm, searchCounts, currentFilter);
    }

    hideSearchActiveIndicator() {
        this.uiManager.hideSearchActiveIndicator();
    }

    cleanup() {
        if (this._feedMonitorInterval) {
            clearInterval(this._feedMonitorInterval);
            this._feedMonitorInterval = null;
        }
    }
}

window.SearchDisplayManager = SearchDisplayManager;

