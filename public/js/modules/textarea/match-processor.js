// ============================================================================
// MATCH PROCESSOR - Match Processing and API Logic
// ============================================================================

/**
 * Create HTML for match list items
 * @param {Array} matches - Array of match strings
 * @param {boolean} isSample - Whether these are sample matches
 * @returns {string} HTML string
 */
const createMatchListHTML = (matches, isSample = false) => matches.map(match => {
    const className = isSample ? 'sample' : '';

    return `<li class="${className}" title="${match}">${match}</li>`;
}).join('');

/**
 * Process match selection for replacement
 * @param {string} matchText - The selected match text
 * @param {boolean} isSample - Whether it's a sample match
 * @returns {string} Formatted replacement text
 */
const processMatchSelection = (matchText, isSample) => {
    if (isSample) {
        return `\${${matchText}}`;
    }

    if (matchText === ',') {
        return ', ';
    }

    return `\${${matchText}} `;
};

/**
 * Find triggering word position
 * @param {string} value - The text value
 * @param {string} triggeringWord - Word to find
 * @param {number} cursorPosition - Current cursor position
 * @returns {number} Position of word or -1 if not found
 */
const findTriggeringWordPosition = (value, triggeringWord, cursorPosition) => {
    const textBeforeCursor = value.slice(0, cursorPosition);

    return textBeforeCursor.lastIndexOf(triggeringWord);
};

/**
 * Replace triggering word
 * @param {string} value - The text value
 * @param {string} triggeringWord - Word to replace
 * @param {string} replacement - Replacement text
 * @param {number} wordPosition - Position of the word
 * @returns {Object} New value and cursor position
 */
const replaceTriggeringWord = (value, triggeringWord, replacement, wordPosition) => {
    const beforeWord = value.substring(0, wordPosition);
    const afterWord = value.substring(wordPosition + triggeringWord.length);
    const newValue = beforeWord + replacement + afterWord;
    const newCursorPosition = wordPosition + replacement.length;

    return {
        value: newValue,
        cursorPosition: newCursorPosition
    };
};

// ============================================================================
// MATCH PROCESSOR CLASS
// ============================================================================

class MatchProcessor {
    constructor() {
        this.lastMatchedWord = null;
    }

    /**
     * Get sample matches from API or fallback
     * @returns {Promise<string>} HTML string of sample matches
     */
    async getSampleMatches() {
        try {
            const results = await Utils.async.fetchJson(
                `${TEXTAREA_CONFIG.api.clauses}?limit=${TEXTAREA_CONFIG.limits.maxSamples}`
            );

            return createMatchListHTML(results, true);
        } catch (error) {
            console.warn('⚠️ Sample matches endpoint not available, using fallback:', error.message);

            return this.getFallbackSamples();
        }
    }

    /**
     * Get fallback sample matches
     * @returns {string} HTML string of fallback samples
     */
    getFallbackSamples() {
        const fallbackSamples = [
            'synonyms for beautiful', 'detailed', 'high quality', 'professional',
            'creative artistic description', 'examples of breathtaking', 'wonderful',
            'photogenic characteristics', 'cinematic', 'dramatic', 'vibrant'
        ];

        return createMatchListHTML(fallbackSamples, true);
    }

    /**
     * Get matches for a specific word (enhanced with related terms matching)
     * @param {string} word - Word to get matches for
     * @returns {Promise<Array>} Array of matches
     */
    async getMatches(word) {
        try {
            // Early return for empty or invalid input
            if (!word || typeof word !== 'string' || word.trim().length === 0) {
                return [];
            }

            // Get all words from the /words endpoint
            const allWords = await Utils.async.fetchJson('/words');

            if (!Array.isArray(allWords)) {
                console.warn('⚠️ Invalid response from /words endpoint');
                return [];
            }

            const searchWord = word.toLowerCase().trim();
            const seenWords = new Set();
            const results = [];

            // Single pass through records with early termination for performance
            for (const record of allWords) {
                // Skip invalid records early
                if (!record || typeof record !== 'object' || typeof record.word !== 'string' || record.word.trim() === '') {
                    continue;
                }

                const mainWord = record.word.toLowerCase();
                const relatedTerms = Array.isArray(record.types) ? record.types : [];

                // Skip if we already have this word (avoid duplicates)
                if (seenWords.has(record.word)) {
                    continue;
                }

                let bestScore = 0;

                // Check main word matches (highest priority)
                if (mainWord === searchWord) {
                    bestScore = 100;
                } else if (mainWord.startsWith(searchWord)) {
                    bestScore = 80;
                } else if (mainWord.includes(searchWord)) {
                    bestScore = 60;
                }

                // Check related terms matches only if no main word match found
                if (bestScore === 0) {
                    for (const relatedTerm of relatedTerms) {
                        if (typeof relatedTerm !== 'string') {
                            continue;
                        }

                        const relatedTermLower = relatedTerm.toLowerCase();
                        if (relatedTermLower === searchWord) {
                            bestScore = 90;
                            break; // Found exact match, no need to check further
                        } else if (relatedTermLower.startsWith(searchWord)) {
                            bestScore = 70;
                        } else if (relatedTermLower.includes(searchWord) && bestScore < 50) {
                            bestScore = 50;
                        }
                    }
                }

                // Add to results if we found a match
                if (bestScore > 0) {
                    seenWords.add(record.word);
                    results.push({ word: record.word, score: bestScore });
                }
            }

            // Sort by score (highest first), then by word length (shorter first)
            results.sort((a, b) => {
                if (a.score !== b.score) {
                    return b.score - a.score;
                }
                return a.word.length - b.word.length;
            });

            // Extract just the word strings and limit results
            const limitedResults = results.slice(0, TEXTAREA_CONFIG.limits.wordType).map(r => r.word);

            console.log(`🔍 MATCH PROCESSOR: Found ${limitedResults.length} matches for "${word}":`, {
                totalMatches: results.length,
                finalResults: limitedResults,
                topMatches: results.slice(0, 3).map(r => ({ word: r.word, score: r.score }))
            });

            return limitedResults;

        } catch (error) {
            console.warn('⚠️ Word matching failed for:', word, error.message);
            return [];
        }
    }

    /**
     * Find matches for text before cursor
     * @param {string} textBeforeCursor - Text before cursor position
     * @returns {Promise<Array>} Array of matches
     */
    async findMatches(textBeforeCursor) {
        const wordsBeforeCursor = window.TextUtils.getWordsBeforeCursor(textBeforeCursor);

        for (let i = 1; i <= 3; i++) {
            if (wordsBeforeCursor.length >= i) {
                this.lastMatchedWord = wordsBeforeCursor.slice(-i).join(' ');

                try {
                    const matches = await this.getMatches(this.lastMatchedWord);

                    if (matches.length > 0) {
                        return matches;
                    }
                } catch (error) {
                    // Continue to next iteration
                }
            }
        }

        return [', ']; // Fallback
    }

    /**
     * Update matches display
     * @param {HTMLElement} matchesEl - Matches container element
     * @param {Array} matches - Array of matches to display
     */
    updateMatchesDisplay(matchesEl, matches) {
        matchesEl.innerHTML = createMatchListHTML(matches);
        StateManager.update('dropdownIsOpen', matches.length > 0);
    }

    /**
     * Check if text is ready for matching
     * @param {string} textBeforeCursor - Text before cursor
     * @returns {boolean} True if ready for matching
     */
    isReadyForMatching(textBeforeCursor) {
        return window.TextUtils.isWordLongEnough(window.TextUtils.getLastWord(textBeforeCursor));
    }

    /**
     * Reset match state
     */
    resetMatchState() {
        this.lastMatchedWord = null;
    }

    /**
     * Get the last matched word
     * @returns {string|null} Last matched word
     */
    getLastMatchedWord() {
        return this.lastMatchedWord;
    }
}

// ============================================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================================

// Make functions and class available globally
window.MatchProcessor = MatchProcessor;
window.MatchProcessorUtils = {
    createMatchListHTML,
    processMatchSelection,
    findTriggeringWordPosition,
    replaceTriggeringWord
};
