/**
 * SearchCoordinator - Coordinates search execution and event handling
 * @class SearchCoordinator
 */
class SearchCoordinator {
    constructor(
        stateManager,
        executionManager,
        cacheManager,
        paginationManager,
        eventEmitter,
        debugCallback
    ) {
        this.stateManager = stateManager;
        this.executionManager = executionManager;
        this.cacheManager = cacheManager;
        this.paginationManager = paginationManager;
        this.eventEmitter = eventEmitter;
        this.isDebugEnabled = debugCallback;
    }

    async performSearch(
        query,
        forceRefresh,
        feedManager,
        duplicateSearchTtl,
        processResultsCallback,
        scheduleFillCallback,
        handleErrorCallback,
        finalizeCallback,
        setLoadingCallback,
        clearFeedCallback
    ) {
        if (!feedManager) {
            console.error('❌ SEARCH: Feed manager not available');
            return;
        }

        // Check for duplicate
        if (this.stateManager.isDuplicateSearch(query, duplicateSearchTtl) && !forceRefresh) {
            if (this.isDebugEnabled()) {
                console.log(`🔄 SEARCH: Skipping duplicate search for "${query}" (use Enter to force)`);
            }
            return;
        }

        this.stateManager.updateLastSearch(query);

        const requestId = this.stateManager.initializeSearch(query);

        this.paginationManager.clearSeenIds();
        this.cacheManager.clearCacheFor(query);
        setLoadingCallback(true);
        clearFeedCallback();

        this.eventEmitter.emitSearchEvent('search:start', { query, requestId }, this.stateManager.state);

        try {
            const results = await this.executionManager.searchImages(feedManager, query, 1);

            if (this.stateManager.isStaleResponse(requestId)) {
                return;
            }

            await processResultsCallback(results, query);
            scheduleFillCallback();

            this.eventEmitter.emitSearchEvent('search:complete', {
                query,
                requestId,
                totalResults: results.total,
                page: 1
            }, this.stateManager.state);

        } catch (error) {
            this.eventEmitter.emitSearchEvent('search:error', { query, requestId, error: error.message }, this.stateManager.state);
            handleErrorCallback(error, requestId, query);
        } finally {
            finalizeCallback(requestId);
            this.eventEmitter.emitSearchEvent('search:end', { query, requestId }, this.stateManager.state);
        }
    }
}

window.SearchCoordinator = SearchCoordinator;

