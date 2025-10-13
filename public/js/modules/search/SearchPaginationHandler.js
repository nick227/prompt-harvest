/**
 * SearchPaginationHandler - Handles pagination-related operations
 * @class SearchPaginationHandler
 */
class SearchPaginationHandler {
    constructor(stateManager, paginationManager) {
        this.stateManager = stateManager;
        this.paginationManager = paginationManager;
    }

    async loadMoreResults(state, loadNextPageCallback, updateStateCallback, handleErrorCallback) {
        await this.paginationManager.loadMoreResults(
            state,
            loadNextPageCallback,
            updateStateCallback,
            handleErrorCallback
        );
    }

    async addPaginatedResults(newImages, hasMore, nextPage, appendCallback, applyFilterCallback, autoLoadCallback) {
        this.stateManager.updateState({
            currentPage: nextPage,
            hasMore: hasMore ?? false
        });

        appendCallback(newImages);
        await applyFilterCallback(null, false);
        await autoLoadCallback();
    }

    async autoLoadUntilVisible(state, loadNextPageCallback, updateStateCallback, handleErrorCallback, aliveFlag) {
        await this.paginationManager.autoLoadUntilVisible(
            state,
            loadNextPageCallback,
            updateStateCallback,
            handleErrorCallback,
            aliveFlag
        );
    }
}

window.SearchPaginationHandler = SearchPaginationHandler;

