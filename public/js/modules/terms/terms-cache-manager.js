// Terms Cache Manager - Handles caching of terms data and state
class TermsCacheManager {
    constructor() {
        this.terms = [];
        this.filteredTerms = [];
        this.isSearching = false;
        this.isLoading = false;
        this.lastSearchQuery = '';
        this.duplicateCheckCache = new Map();
    }

    // Set terms data
    setTerms(terms) {
        this.terms = terms;
        this.clearDuplicateCache();
    }

    // Get all terms
    getTerms() {
        return this.terms;
    }

    // Get filtered terms
    getFilteredTerms() {
        return this.filteredTerms;
    }

    // Set filtered terms
    setFilteredTerms(terms) {
        this.filteredTerms = terms;
    }

    // Check if searching
    getSearchingState() {
        return this.isSearching;
    }

    // Set searching state
    setSearching(searching) {
        this.isSearching = searching;
    }

    // Check if loading
    getLoadingState() {
        return this.isLoading;
    }

    // Set loading state
    setLoading(loading) {
        this.isLoading = loading;
    }

    // Get last search query
    getLastSearchQuery() {
        return this.lastSearchQuery;
    }

    // Set last search query
    setLastSearchQuery(query) {
        this.lastSearchQuery = query;
    }

    // Check if term exists (with caching)
    termExists(termWord) {
        // Validate input
        if (!termWord || typeof termWord !== 'string') {
            return false;
        }

        const key = termWord.toLowerCase();

        if (this.duplicateCheckCache.has(key)) {
            return this.duplicateCheckCache.get(key);
        }

        const exists = this.terms.some(term => {
            const existingWord = typeof term === 'string' ? term : term.word;

            return existingWord.toLowerCase() === key;
        });

        this.duplicateCheckCache.set(key, exists);

        return exists;
    }

    // Clear duplicate check cache
    clearDuplicateCache() {
        this.duplicateCheckCache.clear();
    }

    // Get term by word
    getTermByWord(termWord) {
        // Validate input
        if (!termWord || typeof termWord !== 'string') {
            return null;
        }

        return this.terms.find(term => {
            const existingWord = typeof term === 'string' ? term : term.word;

            // Skip if existingWord is undefined or null
            if (!existingWord) {
                return false;
            }

            return existingWord.toLowerCase() === termWord.toLowerCase();
        });
    }

    // Get valid terms count
    getValidTermsCount() {
        return this.terms.filter(term => {
            if (typeof term === 'string' && term) {
                return true;
            }
            if (typeof term === 'object' && term.word) {
                return true;
            }

            return false;
        }).length;
    }

    // Get filtered terms count
    getFilteredTermsCount() {
        return this.filteredTerms.length;
    }

    // Add term to cache
    addTerm(term) {
        this.terms.unshift(term); // Add to beginning
        this.clearDuplicateCache();
    }

    // Remove term from cache
    removeTerm(termWord) {
        // Validate input
        if (!termWord || typeof termWord !== 'string') {
            return false;
        }

        const index = this.terms.findIndex(term => {
            const existingWord = typeof term === 'string' ? term : term.word;

            // Skip if existingWord is undefined or null
            if (!existingWord) {
                return false;
            }

            return existingWord.toLowerCase() === termWord.toLowerCase();
        });

        if (index !== -1) {
            this.terms.splice(index, 1);
            this.clearDuplicateCache();

            return true;
        }

        return false;
    }

    // Update term in cache
    updateTerm(termWord, updatedTerm) {
        // Validate input
        if (!termWord || typeof termWord !== 'string') {
            return false;
        }

        const index = this.terms.findIndex(term => {
            const existingWord = typeof term === 'string' ? term : term.word;

            // Skip if existingWord is undefined or null
            if (!existingWord) {
                return false;
            }

            return existingWord.toLowerCase() === termWord.toLowerCase();
        });

        if (index !== -1) {
            this.terms[index] = updatedTerm;
            this.clearDuplicateCache();

            return true;
        }

        return false;
    }

    // Get cache statistics
    getCacheStats() {
        return {
            totalTerms: this.terms.length,
            filteredTerms: this.filteredTerms.length,
            validTerms: this.getValidTermsCount(),
            isSearching: this.isSearching,
            isLoading: this.isLoading,
            lastSearchQuery: this.lastSearchQuery,
            duplicateCacheSize: this.duplicateCheckCache.size
        };
    }

    // Clear all cache
    clearCache() {
        this.terms = [];
        this.filteredTerms = [];
        this.isSearching = false;
        this.isLoading = false;
        this.lastSearchQuery = '';
        this.clearDuplicateCache();
    }

    // Get terms with types count
    getTermsWithTypesCount() {
        return this.terms.filter(term => {
            if (typeof term === 'object' && term.types) {
                const types = this.getTermTypes(term);

                return types.length > 0;
            }

            return false;
        }).length;
    }

    // Get term types (helper method)
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

    // Get sample term data
    getSampleTerm() {
        return this.terms.length > 0 ? this.terms[0] : null;
    }

    // Check if cache is empty
    isEmpty() {
        return this.terms.length === 0;
    }

    // Get terms by type
    getTermsByType(typeName) {
        return this.terms.filter(term => {
            const types = this.getTermTypes(term);

            return types.includes(typeName);
        });
    }

    // Get unique types
    getUniqueTypes() {
        const allTypes = new Set();

        this.terms.forEach(term => {
            const types = this.getTermTypes(term);

            types.forEach(type => allTypes.add(type));
        });

        return Array.from(allTypes);
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.TermsCacheManager = TermsCacheManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TermsCacheManager;
}
