import crypto from 'node:crypto';

import SearchValidator from './SearchValidator.js';
import SearchCursor from './SearchCursor.js';
import FullTextSearchRepository from './FullTextSearchRepository.js';
import { validateSearchOptions } from './SearchOptions.js';

class SearchV2Service {
    constructor(prismaClient, config = {}) {
        this.validator = new SearchValidator(config.validator);
        this.repository = new FullTextSearchRepository(prismaClient);
        this.cursorSecret = config.cursorSecret;
    }

    async search({ query, limit, cursor: rawCursor, userId, ...rawOptions }) {
        const validation = this.validator.validateQuery(query);

        if (!validation.valid) {
            return { success: false, error: validation.error, status: validation.status };
        }

        const searchTerm = this.validator.normalizeSearchTerm(query);
        const pagination = this.validator.normalizePagination({ page: 1, limit });
        const options = validateSearchOptions(rawOptions);
        const cursorCodec = new SearchCursor(this.cursorSecret);
        let cursor;

        try {
            cursor = cursorCodec.decode(rawCursor, searchTerm, options);
        } catch (error) {
            return { success: false, error: error.message, status: 400 };
        }

        const rows = await this.repository.search({
            query: searchTerm,
            userId,
            scope: options.scope,
            tags: options.specificTags,
            limit: pagination.limit,
            cursor
        });
        const hasMore = rows.length > pagination.limit;
        const pageRows = rows.slice(0, pagination.limit);
        const total = pageRows.length > 0
            ? Number(pageRows[0].totalCount)
            : Number(cursor?.total || 0);
        const items = pageRows.map(row => this.transformRow(row));
        const lastRow = pageRows.at(-1);
        const nextCursor = hasMore && lastRow
            ? cursorCodec.encode({
                score: Number(lastRow.searchScore),
                createdAt: new Date(lastRow.createdAt).toISOString(),
                id: lastRow.id,
                total
            }, searchTerm, options)
            : null;

        return {
            success: true,
            data: {
                items,
                page: {
                    nextCursor,
                    hasMore,
                    returned: items.length,
                    total,
                    totalRelation: 'exact'
                },
                query: { raw: query, normalized: searchTerm, mode: 'fulltext' }
            }
        };
    }

    transformRow({ searchScore: _score, totalCount: _total, imageUrl, ...image }) {
        return { ...image, url: imageUrl, imageUrl };
    }

    async shadowCompare(v1Result, params) {
        const v2Result = await this.search(params);

        if (!v2Result.success) {
            return null;
        }

        const v1Ids = v1Result.images.map(image => image.id);
        const v2Ids = v2Result.data.items.map(image => image.id);
        const overlap = v1Ids.filter(id => v2Ids.includes(id)).length;

        return {
            queryHash: crypto.createHash('sha256')
                .update(params.query.trim().toLowerCase())
                .digest('hex')
                .slice(0, 16),
            v1Count: v1Ids.length,
            v2Count: v2Ids.length,
            overlap,
            topResultAgreement: v1Ids[0] === v2Ids[0]
        };
    }
}

export default SearchV2Service;
