import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

import SearchService from './SearchService.js';
import SearchQueryBuilder from './SearchQueryBuilder.js';
import SearchScoringService from './SearchScoringService.js';
import { validateSearchOptions } from './SearchOptions.js';

const makeImage = (id, prompt, createdAt, overrides = {}) => ({
    id,
    imageUrl: `https://example.test/${id}.png`,
    prompt,
    original: prompt,
    provider: 'openai',
    model: 'dall-e',
    guidance: 10,
    isPublic: true,
    isHidden: false,
    rating: null,
    tags: [],
    taggedAt: null,
    createdAt: new Date(createdAt),
    userId: 'owner-1',
    ...overrides
});

const createPrisma = images => ({
    image: {
        findMany: async () => images
    },
    user: {
        findMany: async () => [{ id: 'owner-1', username: 'owner' }]
    }
});

const scoringConfig = {
    exactMatch: 100,
    startsWith: 80,
    contains: 50,
    exactTag: 70,
    tagStarts: 40,
    tagContains: 20,
    providerModel: 0,
    originalBonus: 0
};

test('SearchService ranks the complete candidate set before taking a page', async () => {
    const candidates = [
        makeImage('new-weak', 'a black cat in rain', '2026-08-01T00:00:00Z'),
        makeImage('new-prefix', 'cat portrait', '2026-07-01T00:00:00Z'),
        makeImage('old-exact', 'cat', '2020-01-01T00:00:00Z')
    ];
    const service = new SearchService(createPrisma(candidates), { scoring: scoringConfig });

    const firstPage = await service.search({ query: 'cat', page: 1, limit: 1 });
    const secondPage = await service.search({ query: 'cat', page: 2, limit: 1 });
    const thirdPage = await service.search({ query: 'cat', page: 3, limit: 1 });

    assert.deepEqual(firstPage.images.map(image => image.id), ['old-exact']);
    assert.deepEqual(secondPage.images.map(image => image.id), ['new-prefix']);
    assert.deepEqual(thirdPage.images.map(image => image.id), ['new-weak']);
    assert.equal(firstPage.total, 3);
    assert.equal(secondPage.total, 3);

    const firstResponse = service.buildResponse(firstPage, { requestId: 'r1', duration: 1 });
    const finalResponse = service.buildResponse(thirdPage, { requestId: 'r3', duration: 1 });

    assert.equal(firstResponse.data.pagination.total, 3);
    assert.equal(firstResponse.data.hasMore, true);
    assert.equal(finalResponse.data.hasMore, false);
});

test('exactOnly is retained and requires an exact prompt or tag match', () => {
    const options = validateSearchOptions({ exactOnly: true });
    const scorer = new SearchScoringService(scoringConfig);
    const images = [
        makeImage('contains', 'black cat', '2026-01-01T00:00:00Z'),
        makeImage('prompt', 'cat', '2025-01-01T00:00:00Z'),
        makeImage('tag', 'unrelated', '2024-01-01T00:00:00Z', { tags: ['cat'] })
    ];

    assert.equal(options.exactOnly, true);
    assert.deepEqual(
        scorer.scoreAndRankResults(images, 'cat', options).map(image => image.id),
        ['prompt', 'tag']
    );
});

test('matchType changes candidate and scoring semantics', () => {
    const scorer = new SearchScoringService(scoringConfig);
    const images = [
        makeImage('contains', 'black cat', '2026-01-01T00:00:00Z'),
        makeImage('prefix', 'cat portrait', '2025-01-01T00:00:00Z'),
        makeImage('exact', 'cat', '2024-01-01T00:00:00Z')
    ];

    assert.deepEqual(
        scorer.scoreAndRankResults(images, 'cat', { matchType: 'startsWith' }).map(image => image.id),
        ['exact', 'prefix']
    );
    assert.deepEqual(
        scorer.scoreAndRankResults(images, 'cat', { matchType: 'exact' }).map(image => image.id),
        ['exact']
    );
    assert.equal(validateSearchOptions({ matchType: 'exact' }).matchType, 'exact');
});

test('query builder includes exact tag discovery and server-side owner scope', () => {
    const builder = new SearchQueryBuilder();
    const publicQuery = builder.buildWhereClause(null, 'forest', {
        scope: 'public',
        matchType: 'contains'
    });
    const privateQuery = builder.buildWhereClause('owner-1', 'forest', {
        scope: 'private',
        matchType: 'contains'
    });

    assert.equal(publicQuery.isPublic, true);
    assert.equal(privateQuery.userId, 'owner-1');
    assert.ok(publicQuery.OR.some(
        condition => condition.tags?.path === '$' &&
            condition.tags.array_contains?.includes('forest')
    ));
    assert.ok(publicQuery.OR.some(condition => condition.taggedAt?.not === null));
});

test('anonymous private scope cannot fall back to public results', () => {
    const query = new SearchQueryBuilder().buildWhereClause(null, 'cat', {
        scope: 'private'
    });

    assert.equal(query.userId, '__anonymous_user_cannot_match__');
    assert.equal(query.isPublic, undefined);
});

const loadBrowserClass = (relativePath, exportName, globals = {}) => {
    const context = {
        window: {},
        console: { log() {}, warn() {}, error() {} },
        ...globals
    };

    vm.runInNewContext(readFileSync(new URL(relativePath, import.meta.url), 'utf8'), context);

    return context.window[exportName];
};

test('browser search cache keys include server-side filters', () => {
    const SearchCacheManager = loadBrowserClass(
        '../../../public/js/modules/search/search-cache-manager.js',
        'SearchCacheManager'
    );
    const cache = new SearchCacheManager({ maxSize: 50, ttlMs: 1000, perQueryMax: 10 });

    const publicKey = cache.getCacheKey('cat', 1, { scope: 'public', tags: ['red'] });
    const privateKey = cache.getCacheKey('cat', 1, { scope: 'private', tags: ['red'] });
    const otherTagKey = cache.getCacheKey('cat', 1, { scope: 'public', tags: ['blue'] });

    assert.notEqual(publicKey, privateKey);
    assert.notEqual(publicKey, otherTagKey);
});

test('browser search requests send owner and tag filters to the API', () => {
    const SearchAPIUtils = loadBrowserClass(
        '../../../public/js/modules/search/search-api-utils.js',
        'SearchAPIUtils',
        { URLSearchParams }
    );
    const url = SearchAPIUtils.buildSearchURL('red fox', 2, {
        scope: 'private',
        tags: ['forest', 'night']
    });
    const parsed = new URL(url, 'https://example.test');

    assert.equal(parsed.searchParams.get('q'), 'red fox');
    assert.equal(parsed.searchParams.get('page'), '2');
    assert.equal(parsed.searchParams.get('scope'), 'private');
    assert.equal(parsed.searchParams.get('tags'), 'forest,night');
});

test('SearchCoordinator preserves cache on non-forced searches', async () => {
    const SearchCoordinator = loadBrowserClass(
        '../../../public/js/modules/search/SearchCoordinator.js',
        'SearchCoordinator'
    );
    let clearCount = 0;
    const stateManager = {
        state: {},
        isDuplicateSearch: () => false,
        updateLastSearch() {},
        initializeSearch: () => 'request-1',
        isStaleResponse: () => false
    };
    const coordinator = new SearchCoordinator(
        stateManager,
        { searchImages: async () => ({ images: [], total: 0, hasMore: false }) },
        { clearCacheFor: () => { clearCount += 1; } },
        { clearSeenIds() {} },
        { emitSearchEvent() {} },
        () => false
    );
    const noOp = () => {};

    await coordinator.performSearch(
        'cat',
        false,
        { apiManager: {} },
        { scope: 'public', tags: [] },
        2000,
        async () => {},
        noOp,
        noOp,
        noOp,
        noOp,
        noOp
    );

    assert.equal(clearCount, 0);
});
