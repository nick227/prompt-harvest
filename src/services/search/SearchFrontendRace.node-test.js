import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

import { JSDOM } from 'jsdom';

const feedConstants = {
    FILTERS: { PUBLIC: 'public', PRIVATE: 'private' },
    CLASSES: {
        HIDDEN: 'hidden',
        IMAGE_WRAPPER: 'image-wrapper',
        TRANSITIONING: 'transitioning'
    },
    EVENTS: { FILTER_CHANGED: 'filterChanged' }
};

const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return { promise, resolve, reject };
};

const loadBrowserClass = (relativePath, exportName, options = {}) => {
    const dom = options.dom || new JSDOM('<div class="prompt-output"></div>');
    const context = {
        window: dom.window,
        document: dom.window.document,
        console: { log() {}, warn() {}, error() {} },
        FEED_CONFIG: {},
        FEED_CONSTANTS: feedConstants,
        setTimeout: options.setTimeout || (() => 0),
        clearTimeout() {},
        ...options.globals
    };

    vm.runInNewContext(readFileSync(new URL(relativePath, import.meta.url), 'utf8'), context);

    return { BrowserClass: context.window[exportName], dom, context };
};

const createFeedManagerHarness = () => {
    const { BrowserClass: FeedManager, dom } = loadBrowserClass(
        '../../../public/js/modules/feed/feed-manager-core.js',
        'FeedManager'
    );
    const manager = new FeedManager();
    const container = dom.window.document.querySelector('.prompt-output');
    const calls = { cache: 0, clear: 0, append: 0, errors: 0, fill: 0 };

    manager.cacheManager = {
        setCache() { calls.cache++; },
        getCache: () => ({ currentPage: 1, hasMore: true }),
        addImagesToCache() {},
        updatePagination() {}
    };
    manager.domOperations = {
        getElement: () => container,
        clearFeedContent() {
            calls.clear++;
            container.innerHTML = '';
        },
        showNoImagesMessage() {},
        showErrorMessage() { calls.errors++; },
        showLoginPrompt() {},
        getLastImageElement: () => null
    };
    manager.imageHandler = {
        addImageToFeed() { calls.append++; }
    };
    manager.uiManager = {
        startSmoothTransition: async () => {
            container.classList.add('transitioning');

            return container;
        },
        completeSmoothTransition: async element => element.classList.remove('transitioning'),
        setLoading() {},
        getLoading: () => false,
        isElementInViewport: () => false
    };
    manager.viewManager = { forceReapplyView() {} };
    manager.fillToBottomManager = {
        checkAndFillToBottom() { calls.fill++; }
    };
    manager.filterManager = { getCurrentFilter: () => 'public' };
    manager.apiManager = { isUserAuthenticated: () => true };
    manager.tagRouter = null;

    return { manager, dom, container, calls };
};

test('a delayed feed response cannot overwrite search-owned DOM', async () => {
    const { manager, dom, container, calls } = createFeedManagerHarness();
    const response = deferred();

    dom.window.searchManager = { state: { isSearchActive: false } };
    manager.apiManager.loadFeedImages = () => response.promise;

    const pendingFeed = manager.loadFilterImages('public');

    dom.window.searchManager.state.isSearchActive = true;
    manager.invalidatePendingFeedRequests();
    container.innerHTML = '<div class="image-wrapper" data-source="search" data-image-id="result-1"></div>';
    response.resolve({ images: [{ id: 'feed-1', isPublic: true }], hasMore: false });

    assert.equal(await pendingFeed, false);
    assert.equal(calls.cache, 0);
    assert.equal(calls.clear, 0);
    assert.equal(calls.append, 0);
    assert.ok(container.querySelector('[data-image-id="result-1"][data-source="search"]'));
    assert.equal(container.classList.contains('transitioning'), false);
});

test('feed filter and infinite-scroll handlers are inert during search', async () => {
    const { manager, dom } = createFeedManagerHarness();
    let initialLoads = 0;
    let pageLoads = 0;

    dom.window.searchManager = { state: { isSearchActive: true } };
    manager.loadFilterImages = async () => { initialLoads++; };
    manager.loadMoreImages = async () => { pageLoads++; };

    await manager.handleFilterChanged({ detail: { filter: 'private' } });
    await manager.handleLastImageVisible();

    assert.equal(initialLoads, 0);
    assert.equal(pageLoads, 0);
});

test('starting a search invalidates feed requests before search retrieval', async () => {
    const { BrowserClass: SearchCoordinator } = loadBrowserClass(
        '../../../public/js/modules/search/SearchCoordinator.js',
        'SearchCoordinator'
    );
    let invalidated = false;
    const stateManager = {
        state: {},
        isDuplicateSearch: () => false,
        updateLastSearch() {},
        initializeSearch: () => 'search-request-1',
        isStaleResponse: () => false
    };
    const coordinator = new SearchCoordinator(
        stateManager,
        {
            searchImages: async () => {
                assert.equal(invalidated, true);

                return { images: [], total: 0, hasMore: false };
            }
        },
        { clearCacheFor() {} },
        { clearSeenIds() {} },
        { emitSearchEvent() {} },
        () => false
    );
    const noOp = () => {};

    await coordinator.performSearch(
        'cat',
        false,
        {
            apiManager: {},
            invalidatePendingFeedRequests() { invalidated = true; }
        },
        { scope: 'public', tags: [] },
        2000,
        async () => {},
        noOp,
        noOp,
        noOp,
        noOp,
        noOp
    );

    assert.equal(invalidated, true);
});

test('throttled pagination is awaited and traverses every page through exhaustion', async () => {
    const { BrowserClass: SearchPaginationManager } = loadBrowserClass(
        '../../../public/js/modules/search/search-pagination-manager.js',
        'SearchPaginationManager',
        {
            setTimeout,
            globals: { clearTimeout }
        }
    );
    const manager = new SearchPaginationManager({
        throttleMs: 5,
        autoLoadMaxAttempts: 5,
        fillToBottomDelayMs: 1
    });
    const state = {
        currentPage: 1,
        currentSearchTerm: 'cat',
        isSearchActive: true,
        isLoading: false,
        hasMore: true
    };
    const loadedPages = [];
    const updateState = updates => Object.assign(state, updates);
    const loadNextPage = async () => {
        const nextPage = state.currentPage + 1;

        loadedPages.push(nextPage);
        state.currentPage = nextPage;
        state.hasMore = nextPage < 4;
    };

    manager._lastLoadMoreTime = Date.now();

    while (state.hasMore) {
        const pendingLoad = manager.loadMoreResults(
            state,
            loadNextPage,
            updateState,
            error => { throw error; }
        );
        const duplicateLoad = await manager.loadMoreResults(
            state,
            loadNextPage,
            updateState,
            error => { throw error; }
        );

        assert.equal(duplicateLoad, false);
        assert.equal(await pendingLoad, true);
        assert.equal(state.isLoading, false);
    }

    assert.deepEqual(loadedPages, [2, 3, 4]);
});

test('fill-to-bottom discards a response when search activates mid-request', async () => {
    const { BrowserClass: FillToBottomManager } = loadBrowserClass(
        '../../../public/js/modules/feed/fill-to-bottom-manager.js',
        'FillToBottomManager'
    );
    const response = deferred();
    let searchActive = false;
    let generation = 1;
    let additions = 0;
    const feedManager = {
        isSearchActive: () => searchActive,
        getFeedRequestGeneration: () => generation,
        canApplyFeedResponse: requestGeneration => !searchActive && requestGeneration === generation,
        isRateLimited: false,
        isLoadingMore: false
    };
    const manager = new FillToBottomManager({
        imageHandler: { addImageToFeed() { additions++; } },
        apiManager: { loadMoreImages: () => response.promise },
        cacheManager: {
            getCache: () => ({ currentPage: 1, hasMore: true }),
            addImagesToCache() { additions++; },
            updatePagination() { additions++; }
        },
        feedManager,
        uiManager: { getLoading: () => false }
    });

    const pendingFill = manager.loadMoreContent('public');

    searchActive = true;
    generation++;
    response.resolve({ images: [{ id: 'feed-2' }], hasMore: false });

    assert.equal(await pendingFill, false);
    assert.equal(additions, 0);
});

test('last-image selection follows the active DOM owner and ignores hidden wrappers', () => {
    const dom = new JSDOM(`
        <div class="prompt-output">
            <div class="image-wrapper" data-source="search"><img class="generated-image" id="search-last"></div>
            <div class="image-wrapper"><img class="generated-image" id="feed-last"></div>
            <div class="image-wrapper hidden"><img class="generated-image" id="hidden-last"></div>
        </div>
    `);
    const { BrowserClass: FeedDOMOperations } = loadBrowserClass(
        '../../../public/js/modules/feed/feed-dom-operations.js',
        'FeedDOMOperations',
        { dom }
    );
    const operations = new FeedDOMOperations();

    dom.window.searchManager = { state: { isSearchActive: true } };
    assert.equal(operations.getLastImageElement().id, 'search-last');

    dom.window.searchManager.state.isSearchActive = false;
    assert.equal(operations.getLastImageElement().id, 'feed-last');
});

test('a search result replaces an existing feed-owned wrapper with the same ID', () => {
    const dom = new JSDOM(`
        <div class="prompt-output">
            <div class="image-wrapper" data-image-id="shared-id"></div>
        </div>
    `);

    dom.window.imageComponent = {
        createImageElement: () => dom.window.document.createElement('img')
    };

    const { BrowserClass: FeedImageHandler } = loadBrowserClass(
        '../../../public/js/modules/feed/feed-image-handler.js',
        'FeedImageHandler',
        { dom }
    );
    const container = dom.window.document.querySelector('.prompt-output');
    const handler = new FeedImageHandler(
        { getElement: () => container },
        { enhanceNewImageWrapper() {} }
    );

    const added = handler.addImageToFeed({
        id: 'shared-id',
        isPublic: true,
        userId: 'owner-1'
    }, 'search');

    assert.equal(added, true);
    assert.equal(container.children.length, 1);
    assert.equal(container.firstElementChild.dataset.source, 'search');
});
