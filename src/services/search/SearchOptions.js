/**
 * Search Options & Configuration
 *
 * Centralized configuration for search behavior across the application.
 * This file defines all available search options, match types, and scoring weights.
 *
 * HOW TO USE:
 * -----------
 * 1. Import the constants you need:
 *    import { MATCH_TYPES, TAG_FILTERS, DEFAULT_SCORING } from './SearchOptions.js'
 *
 * 2. Pass options to SearchService.search():
 *    searchService.search({
 *      query: 'cat',
 *      matchType: MATCH_TYPES.EXACT,
 *      tagFilter: TAG_FILTERS.WITH_TAGS,
 *      minScore: 70
 *    })
 *
 * 3. Customize scoring weights in SearchController:
 *    const config = {
 *      scoring: {
 *        exactMatch: 150,  // Higher weight for exact matches
 *        exactTag: 100
 *      }
 *    }
 */

/**
 * MATCH TYPES
 * -----------
 * Controls how search terms are matched against text fields (prompt, provider, model)
 *
 * CONTAINS (default):
 *   - Matches if search term appears anywhere in the field
 *   - Example: "cat" matches "black cat", "caterpillar", "scatter"
 *   - Most flexible, returns most results
 *
 * EXACT:
 *   - Matches only if field exactly equals search term (case-insensitive)
 *   - Example: "cat" matches "cat" or "Cat" but NOT "black cat"
 *   - Strictest matching, fewest results
 *
 * STARTS_WITH:
 *   - Matches if field starts with search term
 *   - Example: "cat" matches "cat" and "caterpillar" but NOT "black cat"
 *   - Middle ground between CONTAINS and EXACT
 */
export const MATCH_TYPES = {
    CONTAINS: 'contains',      // Default: most flexible
    EXACT: 'exact',            // Strictest: exact field match only
    STARTS_WITH: 'startsWith'  // Middle: field must start with term
};

/**
 * TAG FILTERS
 * -----------
 * Controls how search results are filtered by tags
 *
 * ANY (default):
 *   - Shows all results regardless of tags
 *   - No tag filtering applied
 *
 * WITH_TAGS:
 *   - Only show images that have at least one tag
 *   - Filters out untagged images
 *
 * WITHOUT_TAGS:
 *   - Only show images with no tags
 *   - Filters out all tagged images
 *
 * SPECIFIC_TAGS:
 *   - Only show images matching specific tags (provided separately)
 *   - Requires tags array in search options
 */
export const TAG_FILTERS = {
    ANY: 'any',              // Default: no tag filtering
    WITH_TAGS: 'with',       // Only images with tags
    WITHOUT_TAGS: 'without', // Only images without tags
    SPECIFIC_TAGS: 'specific' // Match specific tag list
};

/**
 * SCORING WEIGHTS
 * ---------------
 * Controls how different types of matches are scored for ranking
 * Higher scores = higher priority in results
 *
 * Default weights are optimized for general use:
 * - Exact prompt match (100): Highest priority
 * - Starts with in prompt (80): Very relevant
 * - Exact tag match (70): Important but less than prompt
 * - Contains in prompt (50): Moderate relevance
 * - Tag starts with (40): Less important
 * - Provider/Model match (30): Context clues
 * - Original prompt bonus (25): Additional context
 * - Tag contains (20): Lowest text priority
 *
 * HOW TO CUSTOMIZE:
 * ----------------
 * Pass custom weights to SearchService constructor:
 *
 * const config = {
 *   scoring: {
 *     exactMatch: 150,     // Boost exact matches
 *     exactTag: 120,       // Prioritize tag matches
 *     contains: 30,        // Reduce partial matches
 *     tagContains: 0       // Disable tag partial matching (set to 0)
 *   }
 * };
 *
 * const searchService = new SearchService(prisma, config);
 *
 * NOTE: You can set any weight to 0 to completely disable that match type.
 * Zero values are supported and will not fall back to defaults.
 */
export const DEFAULT_SCORING = {
    // Prompt field weights
    exactMatch: 100,    // Prompt exactly matches search term
    startsWith: 80,     // Prompt starts with search term
    contains: 50,       // Prompt contains search term

    // Tag field weights
    exactTag: 70,       // Tag exactly matches search term
    tagStarts: 40,      // Tag starts with search term
    tagContains: 20,    // Tag contains search term

    // Other fields
    providerModel: 30,  // Provider or model name matches
    originalBonus: 25   // Original (unenhanced) prompt bonus
};

/**
 * SCORE THRESHOLDS
 * ----------------
 * Minimum scores for filtering results by quality/relevance
 *
 * Use these to filter out low-quality matches:
 * - EXACT_ONLY: Only exact matches (prompt or tag)
 * - HIGH_RELEVANCE: Strong matches only
 * - MEDIUM_RELEVANCE: Good matches
 * - LOW_RELEVANCE: Weak matches (default: any score > 0)
 *
 * EXAMPLE:
 * --------
 * searchService.search({
 *   query: 'sunset',
 *   minScore: SCORE_THRESHOLDS.HIGH_RELEVANCE  // Only high-quality matches
 * })
 */
export const SCORE_THRESHOLDS = {
    EXACT_ONLY: 70,        // Only exact prompt/tag matches
    HIGH_RELEVANCE: 50,    // Strong matches (exact/starts with)
    MEDIUM_RELEVANCE: 30,  // Good matches (contains, provider)
    LOW_RELEVANCE: 0       // Any match (default)
};

/**
 * DEFAULT SEARCH OPTIONS
 * ----------------------
 * Default configuration used when options are not specified
 *
 * EXAMPLE CONFIGURATIONS:
 * -----------------------
 *
 * 1. Strict Exact Match Search:
 * {
 *   matchType: MATCH_TYPES.EXACT,
 *   minScore: SCORE_THRESHOLDS.EXACT_ONLY,
 *   tagFilter: TAG_FILTERS.WITH_TAGS
 * }
 *
 * 2. Broad Flexible Search:
 * {
 *   matchType: MATCH_TYPES.CONTAINS,
 *   minScore: SCORE_THRESHOLDS.LOW_RELEVANCE,
 *   tagFilter: TAG_FILTERS.ANY
 * }
 *
 * 3. Tagged Images Only:
 * {
 *   matchType: MATCH_TYPES.CONTAINS,
 *   tagFilter: TAG_FILTERS.WITH_TAGS,
 *   minScore: SCORE_THRESHOLDS.MEDIUM_RELEVANCE
 * }
 */
export const DEFAULT_SEARCH_OPTIONS = {
    matchType: MATCH_TYPES.CONTAINS,            // Flexible matching
    tagFilter: TAG_FILTERS.ANY,                 // No tag filtering
    minScore: SCORE_THRESHOLDS.HIGH_RELEVANCE,  // Only high-quality matches (filters out provider/model-only)
    specificTags: []                            // For SPECIFIC_TAGS filter
};

/**
 * VALIDATION CONFIG
 * -----------------
 * Limits for search input validation
 */
export const VALIDATION_CONFIG = {
    maxQueryLength: 500,  // Maximum search query length
    maxLimit: 100,        // Maximum results per page
    defaultLimit: 50,     // Default results per page
    minQueryLength: 1     // Minimum search query length
};

/**
 * REPOSITORY CONFIG
 * -----------------
 * Database query configuration
 */
export const REPOSITORY_CONFIG = {
    overfetchMultiplier: 2  // Fetch 2x more results for scoring flexibility
};

/**
 * Helper function to validate search options
 * @param {Object} options - Search options to validate
 * @returns {Object} Validated and normalized options
 */
export const validateSearchOptions = (options = {}) => {
    const validated = { ...DEFAULT_SEARCH_OPTIONS };

    // Validate matchType
    if (options.matchType && Object.values(MATCH_TYPES).includes(options.matchType)) {
        validated.matchType = options.matchType;
    }

    // Validate tagFilter
    if (options.tagFilter && Object.values(TAG_FILTERS).includes(options.tagFilter)) {
        validated.tagFilter = options.tagFilter;
    }

    // Validate minScore
    if (typeof options.minScore === 'number' && options.minScore >= 0) {
        validated.minScore = options.minScore;
    }

    // Validate specificTags
    if (Array.isArray(options.specificTags)) {
        validated.specificTags = options.specificTags.filter(tag => typeof tag === 'string');
    }

    return validated;
};

/**
 * Helper function to create full search configuration
 * Merges custom config with defaults
 *
 * @param {Object} customConfig - Custom configuration overrides
 * @returns {Object} Complete search configuration
 */
export const createSearchConfig = (customConfig = {}) => ({
    validator: {
        ...VALIDATION_CONFIG,
        ...customConfig.validator
    },
    repository: {
        ...REPOSITORY_CONFIG,
        ...customConfig.repository
    },
    scoring: {
        ...DEFAULT_SCORING,
        ...customConfig.scoring
    }
});

