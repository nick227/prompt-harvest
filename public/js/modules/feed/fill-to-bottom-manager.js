// Fill to Bottom Manager - Ensures page is always filled to bottom
class FillToBottomManager {
    constructor(domManager, apiManager, cacheManager) {
        this.domManager = domManager;
        this.apiManager = apiManager;
        this.cacheManager = cacheManager;
        this.isChecking = false;
        this.checkTimeout = null;
        this.minFillHeight = 100; // Minimum pixels to fill below viewport
    }

    /**
     * Check if page needs more content to fill to bottom
     * @param {string} filter - Current filter (site/user)
     * @returns {Promise<boolean>} - True if more content was loaded
     */
    async checkAndFillToBottom(filter) {
        if (this.isChecking) {
            return false;
        }

        this.isChecking = true;

        try {
            const needsMore = this.needsMoreContent();

            if (needsMore) {
                // Page needs more content to fill to bottom
                return await this.loadMoreContent(filter);
            } else {
                // Page is adequately filled
                return false;
            }
        } finally {
            this.isChecking = false;
        }
    }

    /**
     * Check if the page needs more content to fill to bottom
     * @returns {boolean} - True if more content is needed
     */
    needsMoreContent() {
        const viewportHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Calculate how much content is below the current viewport
        const contentBelowViewport = documentHeight - (scrollTop + viewportHeight);


        // Need more content if there's less than minFillHeight pixels below viewport
        return contentBelowViewport < this.minFillHeight;
    }

    /**
     * Load more content to fill the page
     * @param {string} filter - Current filter
     * @returns {Promise<boolean>} - True if content was loaded
     */
    async loadMoreContent(filter) {
        const cache = this.cacheManager.getCache(filter);

        if (!cache || !cache.hasMore) {
            // No more content available to load
            return false;
        }

        // Loading more content to fill page

        try {
            const nextPage = cache.currentPage + 1;
            const result = await this.apiManager.loadMoreImages(filter, nextPage);

            if (result.images && result.images.length > 0) {
                // Add new images to cache
                this.cacheManager.addImagesToCache(filter, result.images);
                this.cacheManager.updatePagination(filter, nextPage, result.hasMore);

                // Add new images to DOM
                result.images.forEach(image => {
                    this.domManager.addImageToFeed(image, filter);
                });

                // Added images to fill page
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ FILL: Error loading more content:', error);
            return false;
        }
    }

    /**
     * Check and fill with debouncing to prevent excessive calls
     * @param {string} filter - Current filter
     * @param {number} delay - Delay in milliseconds (default 100ms)
     */
    checkAndFillWithDebounce(filter, delay = 100) {
        if (this.checkTimeout) {
            clearTimeout(this.checkTimeout);
        }

        this.checkTimeout = setTimeout(() => {
            this.checkAndFillToBottom(filter);
        }, delay);
    }

    /**
     * Force check and fill (no debouncing)
     * @param {string} filter - Current filter
     */
    async forceCheckAndFill(filter) {
        if (this.checkTimeout) {
            clearTimeout(this.checkTimeout);
            this.checkTimeout = null;
        }

        return await this.checkAndFillToBottom(filter);
    }

    /**
     * Set minimum fill height
     * @param {number} height - Minimum pixels to fill below viewport
     */
    setMinFillHeight(height) {
        this.minFillHeight = height;
    }

    /**
     * Get current fill status
     * @returns {Object} - Fill status information
     */
    getFillStatus() {
        const viewportHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const contentBelowViewport = documentHeight - (scrollTop + viewportHeight);

        return {
            viewportHeight,
            documentHeight,
            scrollTop,
            contentBelowViewport,
            minFillHeight: this.minFillHeight,
            needsMore: contentBelowViewport < this.minFillHeight,
            fillPercentage: Math.max(0, Math.min(100, (contentBelowViewport / this.minFillHeight) * 100))
        };
    }

    /**
     * Cleanup
     */
    cleanup() {
        if (this.checkTimeout) {
            clearTimeout(this.checkTimeout);
            this.checkTimeout = null;
        }
        this.isChecking = false;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FillToBottomManager = FillToBottomManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FillToBottomManager;
}
