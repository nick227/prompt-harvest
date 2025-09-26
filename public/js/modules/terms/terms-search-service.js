// Terms Search Service - Handles search functionality for terms
class TermsSearchService {
    constructor() {
        this.terms = [];
        this.searchStats = {
            totalTerms: 0,
            totalTypes: 0,
            searchCount: 0
        };
    }

    // Set terms for search
    setTerms(terms) {
        this.terms = terms;
        this.updateStats();
    }

    // Update search statistics
    updateStats() {
        this.searchStats.totalTerms = this.terms.length;
        this.searchStats.totalTypes = this.terms.reduce((total, term) => {
            const types = this.getTermTypes(term);

            return total + types.length;
        }, 0);
    }

    // Get types for a term
    getTermTypes(term) {
        if (typeof term === 'object' && term.types) {
            if (Array.isArray(term.types)) {
                return term.types;
            } else if (typeof term.types === 'string') {
                try {
                    return JSON.parse(term.types);
                } catch (e) {
                    return [];
                }
            } else if (typeof term.types === 'object') {
                return term.types;
            }
        }

        return [];
    }

    // Search terms with fuzzy matching
    search(query) {
        if (!query || query.trim().length < window.TERMS_CONSTANTS.SEARCH.MIN_SEARCH_LENGTH) {
            return [];
        }

        const searchQuery = query.toLowerCase().trim();

        this.searchStats.searchCount++;

        const results = [];

        this.terms.forEach((term, index) => {
            const termWord = typeof term === 'string' ? term : term.word;

            // Skip if termWord is undefined or null
            if (!termWord) {
                return;
            }

            const types = this.getTermTypes(term);

            // Search in term word
            const termMatch = this.searchInTerm(termWord, searchQuery);

            if (termMatch) {
                results.push({
                    originalTerm: term,
                    word: termWord,
                    types,
                    index,
                    matchDetails: termMatch
                });
            }

            // Search in related types
            types.forEach(type => {
                const typeMatch = this.searchInType(type, searchQuery);

                if (typeMatch) {
                    results.push({
                        originalTerm: term,
                        word: termWord,
                        types,
                        index,
                        matchDetails: typeMatch
                    });
                }
            });
        });

        // Remove duplicates and sort by relevance
        const uniqueResults = this.removeDuplicates(results);

        return this.sortByRelevance(uniqueResults, searchQuery);
    }

    // Search in term word
    searchInTerm(termWord, query) {
        // Validate inputs
        if (!termWord || typeof termWord !== 'string') {
            return null;
        }

        if (!query || typeof query !== 'string') {
            return null;
        }

        const lowerTerm = termWord.toLowerCase();

        // Exact match
        if (lowerTerm === query) {
            return {
                type: 'term-exact',
                matchText: termWord,
                relevance: 100
            };
        }

        // Starts with
        if (lowerTerm.startsWith(query)) {
            return {
                type: 'term-starts',
                matchText: termWord,
                relevance: 90
            };
        }

        // Contains
        if (lowerTerm.includes(query)) {
            return {
                type: 'term-contains',
                matchText: termWord,
                relevance: 70
            };
        }

        // Fuzzy match
        if (this.fuzzyMatch(lowerTerm, query)) {
            return {
                type: 'term-fuzzy',
                matchText: termWord,
                relevance: 50
            };
        }

        return null;
    }

    // Search in type
    searchInType(type, query) {
        // Validate inputs
        if (!type || typeof type !== 'string') {
            return null;
        }

        if (!query || typeof query !== 'string') {
            return null;
        }

        const lowerType = type.toLowerCase();

        // Exact match
        if (lowerType === query) {
            return {
                type: 'related-exact',
                matchText: type,
                relevance: 80
            };
        }

        // Starts with
        if (lowerType.startsWith(query)) {
            return {
                type: 'related-starts',
                matchText: type,
                relevance: 70
            };
        }

        // Contains
        if (lowerType.includes(query)) {
            return {
                type: 'related-contains',
                matchText: type,
                relevance: 60
            };
        }

        return null;
    }

    // Fuzzy matching algorithm
    fuzzyMatch(text, query) {
        let queryIndex = 0;

        for (let i = 0; i < text.length && queryIndex < query.length; i++) {
            if (text[i] === query[queryIndex]) {
                queryIndex++;
            }
        }

        return queryIndex === query.length;
    }

    // Remove duplicate results
    removeDuplicates(results) {
        const seen = new Set();

        return results.filter(result => {
            const key = `${result.index}-${result.matchDetails.type}`;

            if (seen.has(key)) {
                return false;
            }
            seen.add(key);

            return true;
        });
    }

    // Sort results by relevance
    sortByRelevance(results, _query) {
        return results.sort((a, b) => {
            // First by relevance score
            if (a.matchDetails.relevance !== b.matchDetails.relevance) {
                return b.matchDetails.relevance - a.matchDetails.relevance;
            }

            // Then by term length (shorter terms first)
            if (a.word.length !== b.word.length) {
                return a.word.length - b.word.length;
            }

            // Finally alphabetically
            return a.word.localeCompare(b.word);
        }).slice(0, window.TERMS_CONSTANTS.SEARCH.MAX_MATCHES);
    }

    // Get accent classes for search results
    getAccentClasses(matchDetails) {
        const accentMap = {
            'term-exact': 'ring-2 ring-green-500 bg-green-900 bg-opacity-20',
            'term-starts': 'ring-1 ring-blue-500 bg-blue-900 bg-opacity-20',
            'term-contains': 'ring-1 ring-yellow-500 bg-yellow-900 bg-opacity-20',
            'term-fuzzy': 'ring-1 ring-gray-500 bg-gray-900 bg-opacity-20',
            'related-exact': 'ring-2 ring-purple-500 bg-purple-900 bg-opacity-20',
            'related-starts': 'ring-1 ring-purple-500 bg-purple-900 bg-opacity-20',
            'related-contains': 'ring-1 ring-purple-500 bg-purple-900 bg-opacity-20'
        };

        return accentMap[matchDetails.type] || '';
    }

    // Get match badge for search results
    getMatchBadge(matchDetails) {
        const badgeMap = {
            'term-exact': { text: 'Exact', class: 'bg-green-600 text-white' },
            'term-starts': { text: 'Starts', class: 'bg-blue-600 text-white' },
            'term-contains': { text: 'Contains', class: 'bg-yellow-600 text-black' },
            'term-fuzzy': { text: 'Fuzzy', class: 'bg-gray-600 text-white' },
            'related-exact': { text: 'Type Exact', class: 'bg-purple-600 text-white' },
            'related-starts': { text: 'Type Starts', class: 'bg-purple-600 text-white' },
            'related-contains': { text: 'Type Contains', class: 'bg-purple-600 text-white' }
        };

        return badgeMap[matchDetails.type] || null;
    }

    // Get search statistics
    getStats() {
        return { ...this.searchStats };
    }

    // Safe HTML escaping
    escapeHtml(text) {
        const div = document.createElement('div');

        div.textContent = text;

        return div.innerHTML;
    }

    // Check if term exists
    termExists(termWord) {
        return this.terms.some(term => {
            const existingWord = typeof term === 'string' ? term : term.word;

            return existingWord.toLowerCase() === termWord.toLowerCase();
        });
    }

    // Get term by word
    getTermByWord(termWord) {
        return this.terms.find(term => {
            const existingWord = typeof term === 'string' ? term : term.word;

            return existingWord.toLowerCase() === termWord.toLowerCase();
        });
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.TermsSearchService = TermsSearchService;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TermsSearchService;
}
