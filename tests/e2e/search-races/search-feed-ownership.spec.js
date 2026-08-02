import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const feedManagerSource = readFileSync(
    new URL('../../../public/js/modules/feed/feed-manager-core.js', import.meta.url),
    'utf8'
);
const domOperationsSource = readFileSync(
    new URL('../../../public/js/modules/feed/feed-dom-operations.js', import.meta.url),
    'utf8'
);

const installFeedManagerClass = async page => {
    await page.evaluate(() => {
        window.FEED_CONFIG = {};
        window.FEED_CONSTANTS = {
            FILTERS: { PUBLIC: 'public', PRIVATE: 'private' },
            CLASSES: {
                HIDDEN: 'hidden',
                IMAGE_WRAPPER: 'image-wrapper',
                TRANSITIONING: 'transitioning'
            },
            EVENTS: { FILTER_CHANGED: 'filterChanged' }
        };
        window.__nativeSetTimeout = window.setTimeout;
        window.setTimeout = () => 0;
    });
    await page.addScriptTag({ content: feedManagerSource });
    await page.evaluate(() => {
        window.setTimeout = window.__nativeSetTimeout;
        delete window.__nativeSetTimeout;
    });
};

test('a feed response arriving after search activation cannot mutate the gallery', async ({ page }) => {
    await page.setContent('<div class="prompt-output"></div>');
    await installFeedManagerClass(page);

    const result = await page.evaluate(async () => {
        const manager = new window.FeedManager();
        const container = document.querySelector('.prompt-output');
        const calls = { cache: 0, clear: 0, append: 0 };
        let resolveFeed;

        window.searchManager = { state: { isSearchActive: false } };
        manager.apiManager = {
            isUserAuthenticated: () => true,
            loadFeedImages: () => new Promise(resolve => { resolveFeed = resolve; })
        };
        manager.cacheManager = { setCache() { calls.cache++; } };
        manager.domOperations = {
            getElement: () => container,
            clearFeedContent() { calls.clear++; container.innerHTML = ''; },
            showNoImagesMessage() {},
            showErrorMessage() {},
            showLoginPrompt() {}
        };
        manager.imageHandler = { addImageToFeed() { calls.append++; } };
        manager.uiManager = {
            startSmoothTransition: async () => {
                container.classList.add('transitioning');

                return container;
            },
            completeSmoothTransition: async element => element.classList.remove('transitioning'),
            setLoading() {}
        };
        manager.viewManager = { forceReapplyView() {} };
        manager.fillToBottomManager = { checkAndFillToBottom() {} };

        const pendingFeed = manager.loadFilterImages('public');

        // Let loadFilterImages advance through its initial transition await and
        // enter the mocked network request before search takes ownership.
        await Promise.resolve();
        await Promise.resolve();

        window.searchManager.state.isSearchActive = true;
        manager.invalidatePendingFeedRequests();
        container.innerHTML = '<div data-source="search" data-image-id="search-1"></div>';
        resolveFeed({ images: [{ id: 'feed-1', isPublic: true }], hasMore: false });

        return {
            applied: await pendingFeed,
            calls,
            html: container.innerHTML,
            transitioning: container.classList.contains('transitioning')
        };
    });

    expect(result.applied).toBe(false);
    expect(result.calls).toEqual({ cache: 0, clear: 0, append: 0 });
    expect(result.html).toContain('data-source="search"');
    expect(result.transitioning).toBe(false);
});

test('filter and infinite-scroll events cannot invoke feed loads during search', async ({ page }) => {
    await page.setContent('<div class="prompt-output"></div>');
    await installFeedManagerClass(page);

    const calls = await page.evaluate(async () => {
        const manager = new window.FeedManager();
        const result = { initial: 0, next: 0 };

        window.searchManager = { state: { isSearchActive: true } };
        manager.loadFilterImages = async () => { result.initial++; };
        manager.loadMoreImages = async () => { result.next++; };

        await manager.handleFilterChanged({ detail: { filter: 'private' } });
        await manager.handleLastImageVisible();

        return result;
    });

    expect(calls).toEqual({ initial: 0, next: 0 });
});

test('the pagination target follows the active owner and excludes hidden images', async ({ page }) => {
    await page.setContent(`
        <div class="prompt-output">
            <div class="image-wrapper" data-source="search"><img class="generated-image" id="search-last"></div>
            <div class="image-wrapper"><img class="generated-image" id="feed-last"></div>
            <div class="image-wrapper hidden"><img class="generated-image" id="hidden-last"></div>
        </div>
    `);
    await page.evaluate(() => {
        window.FEED_CONSTANTS = {
            SELECTORS: {
                PROMPT_OUTPUT: '.prompt-output',
                IMAGE_WRAPPERS: '.image-wrapper'
            },
            CLASSES: { HIDDEN: 'hidden' }
        };
    });
    await page.addScriptTag({ content: domOperationsSource });

    const targets = await page.evaluate(() => {
        const operations = new window.FeedDOMOperations();

        window.searchManager = { state: { isSearchActive: true } };
        const search = operations.getLastImageElement().id;

        window.searchManager.state.isSearchActive = false;

        return { search, feed: operations.getLastImageElement().id };
    });

    expect(targets).toEqual({ search: 'search-last', feed: 'feed-last' });
});
