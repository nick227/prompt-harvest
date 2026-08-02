/**
 * SearchController
 *
 * Handles image search endpoints
 * Follows project pattern: Class-based with dependency injection
 *
 * API ENDPOINT:
 * -------------
 * GET /api/search/images
 *
 * QUERY PARAMETERS:
 * -----------------
 * Required:
 *   q (string) - Search query
 *
 * Optional:
 *   page (number) - Page number (default: 1)
 *   limit (number) - Results per page (default: 50, max: 100)
 *
 * Filtering Options:
 *   exactOnly (boolean) - Only exact matches (default: false)
 *   matchType (string) - contains, exact, or startsWith
 *   minScore (number) - Minimum relevance score (default: 0)
 *   tagFilter (string) - Tag filter: 'any', 'with', 'without' (default: 'any')
 *   tags (string) - Comma-separated tags for specific tag matching
 *   scope (string) - all visible, public only, or the authenticated user's images
 *
 * EXAMPLES:
 * ---------
 * Basic search:
 *   GET /api/search/images?q=sunset
 *
 * Exact matches only:
 *   GET /api/search/images?q=cat&exactOnly=true
 *
 * Tagged images only:
 *   GET /api/search/images?q=nature&tagFilter=with
 *
 * High relevance only:
 *   GET /api/search/images?q=mountain&minScore=50
 *
 * Specific tags:
 *   GET /api/search/images?q=landscape&tags=sunset,mountain
 *
 * Combined filters:
 *   GET /api/search/images?q=portrait&tagFilter=with&minScore=70
 */

import { generateRequestId, logRequestStart, logRequestSuccess, logRequestError } from '../utils/RequestLogger.js';
import { formatErrorResponse } from '../utils/ResponseFormatter.js';
import SearchService from '../services/search/SearchService.js';
import SearchV2Service from '../services/search/SearchV2Service.js';
import databaseClient from '../database/PrismaClient.js';
import { createSearchConfig } from '../services/search/SearchOptions.js';

// Search configuration using centralized config builder
// To customize scoring weights, modify the scoring object:
// const SEARCH_CONFIG = createSearchConfig({
//   scoring: {
//     exactMatch: 150,  // Boost exact matches
//     exactTag: 100     // Prioritize tags
//   }
// });
const SEARCH_CONFIG = createSearchConfig();

export class SearchController {
    constructor(searchService = null) {
        // Dependency Injection: Allow service to be injected (for testing)
        // Or create default instance (for production)
        this.searchService = searchService || new SearchService(
            databaseClient.getClient(),
            SEARCH_CONFIG
        );
        this.searchV2Service = new SearchV2Service(databaseClient.getClient(), {
            validator: SEARCH_CONFIG.validator
        });
    }

    /**
     * Search images endpoint
     * GET /api/search/images?q=sunset&page=1&limit=50
     *
     * Searches across: prompt, original, provider, model, tags
     *
     * Supports filtering options via query params:
     * - exactOnly: true/false
     * - matchType: contains/exact/startsWith
     * - minScore: number
     * - tagFilter: 'any', 'with', 'without'
     * - tags: 'tag1,tag2,tag3' (comma-separated)
     * - scope: 'all', 'public', 'private'
     *
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    async searchImages(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            const {
                q: query,
                page,
                limit,
                exactOnly,
                matchType,
                minScore,
                tagFilter,
                tags,
                scope
            } = req.query;
            const userId = req.user?.id;

            // Parse search options from query params
            const searchOptions = this.parseSearchOptions({
                exactOnly,
                matchType,
                minScore,
                tagFilter,
                tags,
                scope
            });

            // Log request start
            logRequestStart(requestId, req, 'Search Images', {
                query,
                page,
                limit,
                userId: userId || 'anonymous',
                options: searchOptions
            });

            // Execute search via service
            const searchResult = await this.searchService.search({
                query,
                page,
                limit,
                userId,
                ...searchOptions
            });

            // Handle validation errors
            if (!searchResult.success && searchResult.error) {
                return res.status(searchResult.status).json({
                    success: false,
                    message: searchResult.error
                });
            }

            // Build response
            const duration = Date.now() - startTime;
            const response = this.searchService.buildResponse(searchResult, {
                requestId,
                duration
            });

            // Log success
            logRequestSuccess(requestId, 'Search Images', duration, {
                query: searchResult.searchTerm,
                filter: searchResult.filter,
                resultCount: searchResult.images.length,
                total: searchResult.total,
                page: searchResult.pagination.page
            });

            this.runV2ShadowSearch({
                query,
                page,
                limit,
                userId,
                ...searchOptions
            }, searchResult, requestId);

            return res.json(response);

        } catch (error) {
            // Handle unexpected errors
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse(error, requestId, duration);

            logRequestError(requestId, 'Search Images', duration, error);
            console.error('❌ SEARCH: Search failed:', error);

            return res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    async searchImagesV2(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            const { q: query, limit, cursor, tags, scope } = req.query;
            const options = this.parseSearchOptions({
                tags,
                scope
            });
            const result = await this.searchV2Service.search({
                query,
                limit,
                cursor,
                userId: req.user?.id,
                ...options
            });

            if (!result.success) {
                return res.status(result.status).json({ success: false, message: result.error });
            }

            return res.json({
                ...result,
                requestId,
                durationMs: Date.now() - startTime
            });
        } catch (error) {
            const errorResponse = formatErrorResponse(error, requestId, Date.now() - startTime);

            logRequestError(requestId, 'Search Images V2', Date.now() - startTime, error);

            return res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    runV2ShadowSearch(params, v1Result, requestId) {
        const shadowPercent = Math.min(100, Math.max(0, Number(process.env.SEARCH_V2_SHADOW_PERCENT) || 0));
        const page = Math.max(1, parseInt(params.page, 10) || 1);

        if (page !== 1 || params.exactOnly ||
            (params.matchType && params.matchType !== 'contains') ||
            shadowPercent === 0 || Math.random() * 100 >= shadowPercent) {
            return;
        }

        this.searchV2Service.shadowCompare(v1Result, params)
            .then(comparison => {
                if (comparison) {
                    console.log('SEARCH_V2_SHADOW', { requestId, ...comparison });
                }
            })
            .catch(error => {
                console.warn('SEARCH_V2_SHADOW_FAILED', { requestId, error: error.message });
            });
    }

    /**
     * Parse search options from query parameters
     * Converts string query params to proper types
     *
     * @private
     * @param {Object} queryParams - Raw query parameters
     * @returns {Object} Parsed search options
     */
    parseSearchOptions(queryParams) {
        const options = {};

        // Parse exactOnly (boolean)
        if (queryParams.exactOnly !== undefined) {
            options.exactOnly = queryParams.exactOnly === 'true' ||
                               queryParams.exactOnly === '1' ||
                               queryParams.exactOnly === true;
        }

        if (queryParams.matchType) {
            const validMatchTypes = ['contains', 'exact', 'startsWith'];

            if (validMatchTypes.includes(queryParams.matchType)) {
                options.matchType = queryParams.matchType;
            }
        }

        if (queryParams.scope) {
            const validScopes = ['all', 'public', 'private'];

            if (validScopes.includes(queryParams.scope)) {
                options.scope = queryParams.scope;
            }
        }

        // Parse minScore (number)
        if (queryParams.minScore !== undefined) {
            const score = parseInt(queryParams.minScore, 10);

            if (!isNaN(score) && score >= 0) {
                options.minScore = score;
            }
        }

        // Parse tagFilter (string)
        if (queryParams.tagFilter) {
            const validFilters = ['any', 'with', 'without', 'specific'];

            if (validFilters.includes(queryParams.tagFilter)) {
                options.tagFilter = queryParams.tagFilter;
            }
        }

        // Parse tags (comma-separated string to array)
        if (queryParams.tags) {
            options.specificTags = queryParams.tags
                .split(',')
                .map(tag => tag.trim())
                .filter(Boolean);
        }

        return options;
    }
}

// Export singleton instance for use in routes
// (Follows your pattern from other controllers)
export const searchController = new SearchController();
