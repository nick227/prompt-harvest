/**
 * SearchService (Facade Pattern)
 *
 * Responsibility: Coordinate search operations
 * Follows: Facade Pattern, Dependency Inversion
 *
 * OVERVIEW:
 * ---------
 * This service orchestrates the entire search flow:
 * 1. Validates search parameters
 * 2. Builds database query
 * 3. Fetches results from database
 * 4. Scores and ranks results
 * 5. Transforms results for API response
 *
 * HOW TO USE SEARCH OPTIONS:
 * --------------------------
 * Pass options to the search() method:
 *
 * Example 1 - Exact matches only:
 *   searchService.search({
 *     query: 'sunset',
 *     userId: '123',
 *     exactOnly: true  // Only exact prompt/tag matches
 *   })
 *
 * Example 2 - Tagged images only:
 *   searchService.search({
 *     query: 'nature',
 *     tagFilter: 'with'  // Only images with tags
 *   })
 *
 * Example 3 - High relevance only:
 *   searchService.search({
 *     query: 'cat',
 *     minScore: 50  // Only high-quality matches
 *   })
 *
 * Example 4 - Specific tags:
 *   searchService.search({
 *     query: 'landscape',
 *     specificTags: ['sunset', 'mountain']
 *   })
 *
 * See SearchOptions.js for all available options and configurations.
 */

import SearchValidator from './SearchValidator.js';
import SearchQueryBuilder from './SearchQueryBuilder.js';
import SearchRepository from './SearchRepository.js';
import SearchScoringService from './SearchScoringService.js';
import SearchResultTransformer from './SearchResultTransformer.js';
import { validateSearchOptions } from './SearchOptions.js';

class SearchService {
    constructor(prismaClient, config = {}) {
        // Dependency Injection: All dependencies passed in
        this.validator = new SearchValidator(config.validator);
        this.queryBuilder = new SearchQueryBuilder();
        this.repository = new SearchRepository(prismaClient, config.repository);
        this.scorer = new SearchScoringService(config.scoring);
        this.transformer = new SearchResultTransformer();
    }

    /**
     * Execute complete search operation
     * Orchestrates all search services
     *
     * PARAMETERS:
     * -----------
     * @param {Object} params - Search parameters
     * @param {string} params.query - Search query string (required)
     * @param {string} params.userId - User ID for auth filtering (optional)
     * @param {number} params.page - Page number (optional, default: 1)
     * @param {number} params.limit - Results per page (optional, default: 50)
     *
     * FILTERING OPTIONS (all optional):
     * ---------------------------------
     * @param {boolean} params.exactOnly - Only exact matches (default: false)
     * @param {number} params.minScore - Minimum score threshold (default: 0)
     * @param {string} params.tagFilter - Tag filter: 'any', 'with', 'without' (default: 'any')
     * @param {Array} params.specificTags - Array of specific tags to match (default: [])
     *
     * @returns {Promise<Object>} Search results or validation error
     */
    async search({ query, page, limit, userId, ...searchOptions }) {
        // 1. Validate input
        const validation = this.validator.validateQuery(query);

        if (!validation.valid) {
            return {
                success: false,
                error: validation.error,
                status: validation.status
            };
        }

        // 2. Normalize parameters
        const pagination = this.validator.normalizePagination({ page, limit });
        const searchTerm = this.validator.normalizeSearchTerm(query);

        // 3. Validate and normalize search options
        const options = validateSearchOptions(searchOptions);

        // 4. Build query
        const whereClause = this.queryBuilder.buildWhereClause(userId, searchTerm);

        // 5. Execute search
        const { images, total } = await this.repository.searchImages(
            whereClause,
            pagination
        );

        // 6. Score and rank results with options
        const scoredImages = this.scorer.scoreAndRankResults(
            images,
            searchTerm,
            pagination.limit,
            options
        );

        // 7. Return structured results
        return {
            success: true,
            images: scoredImages,
            total,
            pagination,
            searchTerm,
            filter: userId ? 'authenticated' : 'public',
            appliedOptions: options  // Include options in response for debugging
        };
    }

    /**
     * Build complete API response
     */
    buildResponse(searchResult, requestMeta) {
        if (!searchResult.success) {
            return searchResult; // Return validation error as-is
        }

        return this.transformer.buildResponse({
            images: searchResult.images,
            total: searchResult.total,
            pagination: searchResult.pagination,
            searchMeta: {
                query: searchResult.searchTerm,
                filter: searchResult.filter
            },
            requestMeta
        });
    }
}

export default SearchService;

