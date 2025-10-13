/**
 * SearchPaginationManager
 * Handles pagination, auto-loading, and deduplication for search results
 *
 * @class SearchPaginationManager
 */
class SearchPaginationManager {
    /**
     * @param {Object} config - Configuration
     * @param {number} config.throttleMs - Load more throttle delay
     * @param {number} config.autoLoadMaxAttempts - Max auto-load attempts
     * @param {number} config.fillToBottomDelayMs - Fill to bottom delay
     * @param {Function} debugFn - Debug logging function
     */
    constructor(config, debugFn = null) {
        this.config = config;
        this.isDebugEnabled = debugFn;

        // Throttling state
        this._lastLoadMoreTime = null;
        this._loadMoreTrailingTimer = null;

        // Deduplication
        this.seenImageIds = new Set();

        // Lifecycle
        this._pendingTimeouts = new Set();
    }

    /**
     * Check if can load more results
     * @param {Object} state - Current state
     * @returns {boolean}
     */
    canLoadMore(state) {
        return state.isSearchActive &&
            !state.isLoading &&
            state.hasMore &&
            state.currentSearchTerm;
    }

    /**
     * Load more results with leading + trailing edge throttle
     * @param {Object} state - Current state
     * @param {Function} loadNextPageFn - Function to load next page
     * @param {Function} updateStateFn - Function to update state
     * @param {Function} handleErrorFn - Function to handle errors
     * @returns {Promise<void>}
     */
    async loadMoreResults(state, loadNextPageFn, updateStateFn, handleErrorFn) {
        if (!this.canLoadMore(state)) {
            return;
        }

        const now = Date.now();
        const timeSinceLastLoad = this._lastLoadMoreTime ? now - this._lastLoadMoreTime : Infinity;

        // Leading edge: execute immediately if throttle window passed
        if (timeSinceLastLoad >= this.config.throttleMs) {
            this._lastLoadMoreTime = now;

            try {
                await loadNextPageFn();
            } catch (error) {
                handleErrorFn(error);
            } finally {
                updateStateFn({ isLoading: false });
            }

            return;
        }

        // Trailing edge: schedule execution at end of throttle window
        if (!this._loadMoreTrailingTimer) {
            const delay = this.config.throttleMs - timeSinceLastLoad;

            this._loadMoreTrailingTimer = setTimeout(async() => {
                this._pendingTimeouts.delete(this._loadMoreTrailingTimer);
                this._loadMoreTrailingTimer = null;

                if (this.canLoadMore(state)) {
                    this._lastLoadMoreTime = Date.now();

                    try {
                        await loadNextPageFn();
                    } catch (error) {
                        handleErrorFn(error);
                    } finally {
                        updateStateFn({ isLoading: false });
                    }
                }
            }, delay);

            this._pendingTimeouts.add(this._loadMoreTrailingTimer);
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
     * Track image ID for deduplication
     * @param {string} id - Image ID
     */
    addSeenImageId(id) {
        this.seenImageIds.add(id);
    }

    /**
     * Auto-load more pages until visible count > 0 or backend exhausted
     * @param {Object} state - Current state
     * @param {Function} loadNextPageFn - Function to load next page
     * @param {Function} updateStateFn - Function to update state
     * @param {Function} handleErrorFn - Function to handle errors
     * @param {boolean} alive - Lifecycle flag
     * @returns {Promise<void>}
     */
    async autoLoadUntilVisible(state, loadNextPageFn, updateStateFn, handleErrorFn, alive) {
        // Early exit if cleaned up
        if (!alive) {
            return;
        }

        // Reset auto-load attempts on new search
        if (state.currentPage === 1) {
            updateStateFn({ autoLoadAttempts: 0 });
        }

        // Guard: prevent infinite loops
        if (state.autoLoadAttempts >= this.config.autoLoadMaxAttempts) {
            if (this.isDebugEnabled?.()) {
                console.log('⚠️ SEARCH: Auto-load max attempts reached');
            }

            return;
        }

        // Check if visible count is 0 but backend has more
        const { searchCounts: { visible: visibleCount }, hasMore, isLoading } = state;

        if (visibleCount === 0 && hasMore && !isLoading && alive) {
            if (this.isDebugEnabled?.()) {
                console.log('🔄 SEARCH: Auto-loading next page (visible=0, hasMore=true)');
            }

            updateStateFn({ autoLoadAttempts: state.autoLoadAttempts + 1 });

            try {
                // Bypass throttle by calling internal loader directly
                await loadNextPageFn();

                // Yield briefly to allow DOM updates
                await new Promise(resolve => setTimeout(resolve, 50));

                // Recursive check after loading
                await this.autoLoadUntilVisible(state, loadNextPageFn, updateStateFn, handleErrorFn, alive);
            } catch (error) {
                handleErrorFn(error);
            } finally {
                updateStateFn({ isLoading: false });
            }
        }
    }

    /**
     * Schedule fill to bottom check with lifecycle guard
     * @param {Function} checkFn - Function to check if should load more
     * @param {boolean} alive - Lifecycle flag
     */
    scheduleFillToBottom(checkFn, alive) {
        const timeoutId = setTimeout(() => {
            this._pendingTimeouts.delete(timeoutId);

            // Honor alive flag - exit if cleaned up
            if (!alive) {
                return;
            }

            checkFn();
        }, this.config.fillToBottomDelayMs);

        this._pendingTimeouts.add(timeoutId);
    }

    /**
     * Clear deduplication set
     */
    clearSeenIds() {
        this.seenImageIds.clear();
    }

    /**
     * Cleanup
     */
    cleanup() {
        // Clear trailing timer
        if (this._loadMoreTrailingTimer) {
            clearTimeout(this._loadMoreTrailingTimer);
            this._loadMoreTrailingTimer = null;
        }

        // Cancel all pending timeouts
        this._pendingTimeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        this._pendingTimeouts.clear();

        // Clear deduplication
        this.seenImageIds.clear();

        // Reset state
        this._lastLoadMoreTime = null;
    }
}

// Export for use in SearchManager
window.SearchPaginationManager = SearchPaginationManager;

