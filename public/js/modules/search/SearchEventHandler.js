/**
 * SearchEventHandler - Handles search-related event setup and keyboard shortcuts
 * @class SearchEventHandler
 */
class SearchEventHandler {
    constructor(domCache) {
        this.domCache = domCache;
        this.eventListeners = [];
        this.debouncedSearch = null;
    }

    setupImageSearch(handleSearchCallback, handleKeyboardCallback, debounceMs) {
        if (!this.domCache.searchInput) {
            console.warn('⚠️ SEARCH: Search input not found');
            return;
        }

        const hasInputListener = this.eventListeners.some(
            listener => listener.target === this.domCache.searchInput && listener.event === 'input'
        );

        if (hasInputListener) { return; }

        this.debouncedSearch = Utils.async.debounce(handleSearchCallback, debounceMs);

        this.domCache.searchInput.addEventListener('input', this.debouncedSearch);
        this.eventListeners.push({
            target: this.domCache.searchInput,
            event: 'input',
            handler: this.debouncedSearch
        });

        this.domCache.searchInput.addEventListener('keydown', handleKeyboardCallback);
        this.eventListeners.push({
            target: this.domCache.searchInput,
            event: 'keydown',
            handler: handleKeyboardCallback
        });
    }

    setupSearchEventListeners(loadMoreCallback, handleTagCallback) {
        const hasScrollListener = this.eventListeners.some(
            listener => listener.target === window && listener.event === 'lastImageVisible'
        );

        if (hasScrollListener) { return; }

        window.addEventListener('lastImageVisible', loadMoreCallback);
        this.eventListeners.push({ target: window, event: 'lastImageVisible', handler: loadMoreCallback });

        window.addEventListener('tagsChanged', handleTagCallback);
        this.eventListeners.push({ target: window, event: 'tagsChanged', handler: handleTagCallback });
    }

    handleKeyboardShortcuts(event, clearCallback, performSearchCallback) {
        if (event.key === 'Escape') {
            clearCallback();
        } else if (event.key === 'Enter') {
            event.preventDefault();

            if (this.debouncedSearch?.cancel) {
                this.debouncedSearch.cancel();
            }

            const searchValue = event.target.value.trim();

            if (searchValue) {
                performSearchCallback(searchValue, true);
            }
        }
    }

    cleanup() {
        this.eventListeners.forEach(({ target, event, handler }) => {
            target.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }
}

window.SearchEventHandler = SearchEventHandler;

