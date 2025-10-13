/* global SearchAPIUtils */

/**
 * SearchResultProcessor - Handles search result processing and pagination
 * @class SearchResultProcessor
 */
class SearchResultProcessor {
    constructor(
        stateManager,
        paginationManager,
        executionManager,
        eventEmitter,
        debugCallback
    ) {
        this.stateManager = stateManager;
        this.paginationManager = paginationManager;
        this.executionManager = executionManager;
        this.eventEmitter = eventEmitter;
        this.isDebugEnabled = debugCallback;
    }

    async processSearchResults(results, query, displayCallback) {
        if (!SearchAPIUtils.validateSearchResults(results)) {
            throw new Error('Invalid search response');
        }

        this.stateManager.updateState({ hasMore: results.hasMore ?? false });
        await displayCallback(results, query);
    }

    async loadNextPage(feedManager, state, currentRequestId) {
        this.stateManager.updateState({ isLoading: true });

        const nextPage = state.currentPage + 1;

        this.eventEmitter.emitSearchEvent('search:page', {
            query: state.currentSearchTerm,
            page: nextPage,
            requestId: currentRequestId
        }, state);

        const results = await this.executionManager.searchImages(feedManager, state.currentSearchTerm, nextPage);

        if (currentRequestId !== this.stateManager.currentRequestId) {
            return null;
        }

        return { results, nextPage };
    }

    async processPageResults(results, nextPage, addResultsCallback) {
        if (!results.images?.length) {
            this.stateManager.updateState({ hasMore: false });
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
            await addResultsCallback(newImages, results.hasMore, nextPage);
        } else {
            this.stateManager.updateState({ hasMore: false });
        }
    }

    handleSearchError(error, requestId, query, showErrorCallback) {
        if (error.name !== 'AbortError' && requestId === this.stateManager.currentRequestId) {
            console.error('❌ SEARCH: Search failed:', error);
            showErrorCallback(query);
        }
    }

    finalizeSearch(requestId, setLoadingCallback) {
        if (requestId === this.stateManager.currentRequestId) {
            this.stateManager.updateState({ isLoading: false });
            setLoadingCallback(false);
        }
    }

    handleLoadMoreError(error) {
        if (error.name !== 'AbortError') {
            console.error('❌ SEARCH: Failed to load more results:', error);
        }
    }
}

window.SearchResultProcessor = SearchResultProcessor;

