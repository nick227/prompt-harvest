/**
 * SearchScoringService
 *
 * Responsibility: Calculate relevance scores for search results
 * Follows: Single Responsibility Principle
 *
 * SCORING SYSTEM OVERVIEW:
 * ------------------------
 * Each image receives a score based on how well it matches the search term.
 * Higher scores = more relevant results = appear first in results.
 *
 * HOW SCORING WORKS:
 * ------------------
 * 1. Multi-word queries: Each word is scored separately and summed
 *    Example: "cat flux" → score("cat") + score("flux")
 *
 * 2. Multiple match types per word:
 *    - Exact match in prompt: +100 points
 *    - Starts with in prompt: +80 points
 *    - Contains in prompt: +50 points
 *    - Exact tag match: +70 points
 *    - Provider/model match: +30 points
 *
 * 3. All matching fields are scored:
 *    An image can score from prompt, tags, provider, and model simultaneously
 *
 * CONFIGURATION:
 * --------------
 * Pass custom weights to constructor to adjust scoring behavior.
 * See SearchOptions.js for pre-defined configurations.
 *
 * Example:
 *   const scorer = new SearchScoringService({
 *     exactMatch: 150,  // Boost exact matches
 *     exactTag: 100     // Prioritize tag matches
 *   });
 */

class SearchScoringService {
    constructor(config = {}) {
        // Scoring weights - can be customized via config
        // See SearchOptions.DEFAULT_SCORING for explanations
        // Uses ?? (nullish coalescing) to allow 0 values
        this.config = {
            EXACT_MATCH: config.exactMatch ?? 100,
            STARTS_WITH: config.startsWith ?? 80,
            CONTAINS: config.contains ?? 50,
            EXACT_TAG: config.exactTag ?? 70,
            TAG_STARTS: config.tagStarts ?? 40,
            TAG_CONTAINS: config.tagContains ?? 20,
            PROVIDER_MODEL: config.providerModel ?? 30,
            ORIGINAL_BONUS: config.originalBonus ?? 25
        };
    }

    /**
     * Calculate total relevance score for an image
     * Supports multi-word queries: each word scored separately
     * @param {Object} image - Image object with prompt, tags, etc.
     * @param {string} searchTerm - Normalized search term (lowercase)
     * @returns {number} Total relevance score
     */
    calculateScore(image, searchTerm) {
        // Split search term into words for multi-word support
        const words = searchTerm.trim().split(/\s+/).filter(Boolean);

        if (words.length === 0) {
            return 0;
        }

        // Score each word separately and sum
        // "cat flux" → score("cat") + score("flux")
        const totalScore = words.reduce((sum, word) => {
            let wordScore = 0;

            wordScore += this.scorePrompt(image.prompt, word);
            wordScore += this.scoreOriginalPrompt(image.original, image.prompt, word);
            wordScore += this.scoreTags(image.tags, word);
            wordScore += this.scoreProviderModel(image.provider, image.model, word);

            return sum + wordScore;
        }, 0);

        return totalScore;
    }

    /**
     * Score prompt field match
     */
    scorePrompt(prompt, searchTerm) {
        return this.scoreTextField(prompt, searchTerm, {
            exact: this.config.EXACT_MATCH,
            starts: this.config.STARTS_WITH,
            contains: this.config.CONTAINS
        });
    }

    /**
     * Score original prompt match (bonus if different from enhanced prompt)
     */
    scoreOriginalPrompt(original, prompt, searchTerm) {
        const originalLower = (original || '').toLowerCase();
        const promptLower = (prompt || '').toLowerCase();

        if (originalLower && originalLower !== promptLower && originalLower.includes(searchTerm)) {
            return this.config.ORIGINAL_BONUS;
        }

        return 0;
    }

    /**
     * Score all tags
     */
    scoreTags(tags, searchTerm) {
        if (!Array.isArray(tags) || tags.length === 0) {
            return 0;
        }

        return tags.reduce(
            (totalScore, tag) => totalScore + this.scoreTextField(tag, searchTerm, {
                exact: this.config.EXACT_TAG,
                starts: this.config.TAG_STARTS,
                contains: this.config.TAG_CONTAINS
            }),
            0
        );
    }

    /**
     * Score provider and model matches
     */
    scoreProviderModel(provider, model, searchTerm) {
        const providerLower = (provider || '').toLowerCase();
        const modelLower = (model || '').toLowerCase();
        let score = 0;

        if (providerLower.includes(searchTerm)) {
            score += this.config.PROVIDER_MODEL;
        }

        if (modelLower.includes(searchTerm)) {
            score += this.config.PROVIDER_MODEL;
        }

        return score;
    }

    /**
     * Generic text field scoring with exact/starts/contains logic
     * DRY: Eliminates repetitive if-else chains
     * @private
     */
    scoreTextField(text, searchTerm, weights) {
        const textLower = (text || '').toLowerCase();

        if (!textLower) {
            return 0;
        }

        if (textLower === searchTerm) {
            return weights.exact;
        }

        if (textLower.startsWith(searchTerm)) {
            return weights.starts;
        }

        if (textLower.includes(searchTerm)) {
            return weights.contains;
        }

        return 0;
    }

    /**
     * Process multiple images and return scored, sorted results
     *
     * FILTERING OPTIONS:
     * ------------------
     * Pass options object to control result filtering:
     *
     * options.minScore (number):
     *   - Minimum score threshold to include in results
     *   - Default: 0 (include all matches)
     *   - Example: minScore: 70 (only exact matches)
     *
     * options.exactOnly (boolean):
     *   - If true, only include exact prompt or exact tag matches
     *   - Overrides minScore if set
     *   - Example: exactOnly: true
     *
     * options.tagFilter (string):
     *   - 'any': No tag filtering (default)
     *   - 'with': Only images with at least one tag
     *   - 'without': Only images without tags
     *   - Example: tagFilter: 'with'
     *
     * options.specificTags (array):
     *   - Array of tag names to match
     *   - Only includes images with at least one matching tag
     *   - Example: specificTags: ['sunset', 'nature']
     *
     * EXAMPLE USAGE:
     * --------------
     * // Only exact matches
     * scoreAndRankResults(images, 'cat', 50, { exactOnly: true })
     *
     * // High relevance only
     * scoreAndRankResults(images, 'cat', 50, { minScore: 50 })
     *
     * // Tagged images only
     * scoreAndRankResults(images, 'cat', 50, { tagFilter: 'with' })
     *
     * @param {Array} images - Images to score
     * @param {string} searchTerm - Search term
     * @param {number} limit - Max results to return
     * @param {Object} options - Filtering options (optional)
     * @returns {Array} Scored and filtered results
     */
    scoreAndRankResults(images, searchTerm, limit, options = {}) {
        const {
            minScore = 0,
            exactOnly = false,
            tagFilter = 'any',
            specificTags = []
        } = options;

        return images
            .map(image => ({
                ...image,
                searchScore: this.calculateScore(image, searchTerm)
            }))
            .filter(img => {
                // Always filter out zero scores (no match at all)
                if (img.searchScore <= 0) {
                    return false;
                }

                // Score filtering
                if (exactOnly) {
                    // Only exact matches (prompt or tag)
                    // Exact prompt = 100, Exact tag = 70
                    return img.searchScore >= this.config.EXACT_TAG;
                }

                if (img.searchScore < minScore) {
                    return false;
                }

                // Tag filtering
                if (tagFilter === 'with' && (!img.tags || img.tags.length === 0)) {
                    return false;
                }

                if (tagFilter === 'without' && img.tags?.length > 0) {
                    return false;
                }

                // Specific tag matching
                if (specificTags.length > 0) {
                    const imageTags = (img.tags || []).map(t => t.toLowerCase());
                    const hasMatchingTag = specificTags.some(
                        tag => imageTags.includes(tag.toLowerCase())
                    );

                    if (!hasMatchingTag) {
                        return false;
                    }
                }

                return true;
            })
            .sort((a, b) => b.searchScore - a.searchScore)
            .slice(0, limit);
    }
}

export default SearchScoringService;

