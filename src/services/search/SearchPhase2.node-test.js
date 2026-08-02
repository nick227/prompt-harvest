import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import SearchCursor from './SearchCursor.js';
import FullTextSearchRepository from './FullTextSearchRepository.js';
import SearchV2Service from './SearchV2Service.js';

test('signed cursors round-trip and are bound to query filters', () => {
    const codec = new SearchCursor('test-secret');
    const filters = { scope: 'public', specificTags: ['forest'] };
    const encoded = codec.encode({
        score: 3.5,
        createdAt: '2026-08-01T00:00:00.000Z',
        id: 'image-1',
        total: 10
    }, 'red fox', filters);

    assert.equal(codec.decode(encoded, 'red fox', filters).id, 'image-1');
    assert.throws(
        () => codec.decode(encoded, 'blue fox', filters),
        /does not match/
    );
    assert.throws(
        () => codec.decode(`${encoded}broken`, 'red fox', filters),
        /Invalid search cursor/
    );
});

test('FULLTEXT query applies access, tags, stable ordering, and limit plus one', () => {
    const repository = new FullTextSearchRepository({});
    const { sql, params } = repository.buildQuery({
        query: 'red fox',
        userId: 'user-1',
        scope: 'private',
        tags: ['forest'],
        limit: 30,
        cursor: {
            score: 2.5,
            createdAt: '2026-08-01T00:00:00.000Z',
            id: 'image-1'
        }
    });

    assert.match(sql, /MATCH\(sd\.prompt/);
    assert.match(sql, /i\.userId = \?/);
    assert.match(sql, /JSON_CONTAINS/);
    assert.match(sql, /ORDER BY searchScore DESC, createdAt DESC, id DESC/);
    assert.equal(params.at(-1), 31);
});

test('v2 service emits exact totals and a continuation cursor', async () => {
    const service = new SearchV2Service({}, { cursorSecret: 'test-secret' });

    service.repository = {
        search: async () => [
            {
                id: 'one',
                imageUrl: 'one.png',
                createdAt: new Date('2026-08-02T00:00:00Z'),
                searchScore: 5,
                totalCount: 3n
            },
            {
                id: 'two',
                imageUrl: 'two.png',
                createdAt: new Date('2026-08-01T00:00:00Z'),
                searchScore: 4,
                totalCount: 3n
            }
        ]
    };

    const result = await service.search({ query: 'forest', limit: 1, scope: 'public' });

    assert.equal(result.success, true);
    assert.equal(result.data.items.length, 1);
    assert.equal(result.data.page.total, 3);
    assert.equal(result.data.page.hasMore, true);
    assert.ok(result.data.page.nextCursor);
});

test('migration creates, backfills, indexes, and synchronizes search documents', () => {
    const migration = readFileSync(new URL(
        '../../../prisma/migrations/20260802000000_add_image_search_documents/migration.sql',
        import.meta.url
    ), 'utf8');

    assert.match(migration, /CREATE TABLE `image_search_documents`/);
    assert.match(migration, /FULLTEXT INDEX `image_search_fulltext`/);
    assert.match(migration, /INSERT INTO `image_search_documents`/);
    assert.match(migration, /AFTER INSERT ON `images`/);
    assert.match(migration, /AFTER UPDATE ON `images`/);
});
