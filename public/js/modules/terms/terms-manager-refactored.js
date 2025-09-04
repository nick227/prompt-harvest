// Terms Manager - Main orchestrator for terms functionality
class TermsManager {
    constructor() {
        this.isInitialized = false;
        this.cacheManager = new TermsCacheManager();
        this.domManager = new TermsDOMManager();
        this.apiManager = new TermsAPIManager();
        this.uiManager = new TermsUIManager(this.domManager);
        this.searchService = new TermsSearchService();

        // Bind methods
        this.handleTermAdded = this.handleTermAdded.bind(this);
        this.handleTermDeleted = this.handleTermDeleted.bind(this);
        this.handleSearchPerformed = this.handleSearchPerformed.bind(this);
        this.handleDuplicateDetected = this.handleDuplicateDetected.bind(this);
    }

    // Initialize terms manager
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Initialize UI manager first
            this.uiManager.init();

            // Setup event listeners
            this.setupEventListeners();

            // Load initial terms
            await this.loadTerms();

            this.isInitialized = true;
            console.log('Terms Manager initialized successfully');
        } catch (error) {
            console.error('Error initializing Terms Manager:', error);
            throw error;
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Listen for custom events
        document.addEventListener(window.TERMS_CONSTANTS.EVENTS.TERM_ADDED, this.handleTermAdded);
        document.addEventListener('termDeleted', this.handleTermDeleted);
        document.addEventListener(window.TERMS_CONSTANTS.EVENTS.SEARCH_PERFORMED, this.handleSearchPerformed);
        document.addEventListener(window.TERMS_CONSTANTS.EVENTS.DUPLICATE_DETECTED, this.handleDuplicateDetected);
    }

    // Handle term added event
    async handleTermAdded(event) {
        const { term } = event.detail;

        await this.addTerm(term);
    }

    // Handle term deleted event
    async handleTermDeleted(event) {
        const { term } = event.detail;

        await this.deleteTerm(term);
    }

    // Handle search performed event
    async handleSearchPerformed(event) {
        const { query } = event.detail;

        await this.performSearch(query);
    }

    // Handle duplicate detected event
    handleDuplicateDetected(event) {
        const { term } = event.detail;

        this.uiManager.showMessage(
            window.TERMS_CONSTANTS.MESSAGE_TYPES.ERROR,
            `Term "${term}" already exists`
        );
    }

    // Load terms
    async loadTerms() {
        try {
            this.cacheManager.setLoading(true);
            this.uiManager.showLoading();

            const terms = await this.apiManager.loadTerms();

            // Set terms in cache and search service
            this.cacheManager.setTerms(terms);
            this.searchService.setTerms(terms);

            // Update UI
            this.updateTermsDisplay();
            this.updateTermCount();

            // Show success message
            this.uiManager.showMessage(
                window.TERMS_CONSTANTS.MESSAGE_TYPES.SUCCESS,
                `Loaded ${terms.length} terms successfully`
            );

        } catch (error) {
            console.error('Error loading terms:', error);
            this.uiManager.showMessage(
                window.TERMS_CONSTANTS.MESSAGE_TYPES.ERROR,
                'Failed to load terms. Please try again.'
            );
        } finally {
            this.cacheManager.setLoading(false);
            this.uiManager.hideLoading();
        }
    }

    // Add term
    async addTerm(termWord) {
        try {
            // Validate term
            const validatedTerm = this.apiManager.validateTermWord(termWord);

            // Check for duplicates
            if (this.cacheManager.termExists(validatedTerm)) {
                this.dispatchEvent(window.TERMS_CONSTANTS.EVENTS.DUPLICATE_DETECTED, { term: validatedTerm });

                return;
            }

            this.cacheManager.setLoading(true);
            this.uiManager.showLoading();

            // Add term via API
            const addedTerm = await this.apiManager.addTerm(validatedTerm);

            // Add to cache
            this.cacheManager.addTerm(addedTerm);
            this.searchService.setTerms(this.cacheManager.getTerms());

            // Update UI
            this.updateTermsDisplay();
            this.updateTermCount();

            // Clear input
            this.domManager.clearValue('termInput');

            // Show success message
            this.uiManager.showMessage(
                window.TERMS_CONSTANTS.MESSAGE_TYPES.SUCCESS,
                `Term "${validatedTerm}" added successfully`
            );

        } catch (error) {
            console.error('Error adding term:', error);
            this.uiManager.showMessage(
                window.TERMS_CONSTANTS.MESSAGE_TYPES.ERROR,
                error.message || 'Failed to add term. Please try again.'
            );
        } finally {
            this.cacheManager.setLoading(false);
            this.uiManager.hideLoading();
        }
    }

    // Delete term
    async deleteTerm(termWord) {
        try {
            this.cacheManager.setLoading(true);
            this.uiManager.showLoading();

            // Delete term via API
            await this.apiManager.deleteTerm(termWord);

            // Remove from cache
            this.cacheManager.removeTerm(termWord);
            this.searchService.setTerms(this.cacheManager.getTerms());

            // Update UI
            this.updateTermsDisplay();
            this.updateTermCount();

            // Show success message
            this.uiManager.showMessage(
                window.TERMS_CONSTANTS.MESSAGE_TYPES.SUCCESS,
                `Term "${termWord}" deleted successfully`
            );

        } catch (error) {
            console.error('Error deleting term:', error);
            this.uiManager.showMessage(
                window.TERMS_CONSTANTS.MESSAGE_TYPES.ERROR,
                error.message || 'Failed to delete term. Please try again.'
            );
        } finally {
            this.cacheManager.setLoading(false);
            this.uiManager.hideLoading();
        }
    }

    // Update term
    async updateTerm(termWord, updatedData) {
        try {
            this.cacheManager.setLoading(true);
            this.uiManager.showLoading();

            // Update term via API
            const updatedTerm = await this.apiManager.updateTerm(termWord, updatedData);

            // Update in cache
            this.cacheManager.updateTerm(termWord, updatedTerm);
            this.searchService.setTerms(this.cacheManager.getTerms());

            // Update UI
            this.updateTermsDisplay();

            // Show success message
            this.uiManager.showMessage(
                window.TERMS_CONSTANTS.MESSAGE_TYPES.SUCCESS,
                `Term "${termWord}" updated successfully`
            );

        } catch (error) {
            console.error('Error updating term:', error);
            this.uiManager.showMessage(
                window.TERMS_CONSTANTS.MESSAGE_TYPES.ERROR,
                error.message || 'Failed to update term. Please try again.'
            );
        } finally {
            this.cacheManager.setLoading(false);
            this.uiManager.hideLoading();
        }
    }

    // Perform search
    async performSearch(query) {
        try {
            this.cacheManager.setSearching(true);
            this.uiManager.domManager.setSearching(true);

            // Use search service for client-side search
            const searchResults = this.searchService.search(query);

            // Update filtered terms in cache
            this.cacheManager.setFilteredTerms(searchResults);
            this.cacheManager.setLastSearchQuery(query);

            // Update search results display
            this.updateSearchResultsDisplay(searchResults);

            // Show search results
            this.uiManager.showSearchResults();

        } catch (error) {
            console.error('Error performing search:', error);
            this.uiManager.showMessage(
                window.TERMS_CONSTANTS.MESSAGE_TYPES.ERROR,
                'Search failed. Please try again.'
            );
        } finally {
            this.cacheManager.setSearching(false);
            this.uiManager.domManager.setSearching(false);
        }
    }

    // Update terms display
    updateTermsDisplay() {
        const terms = this.cacheManager.getTerms();

        if (terms.length === 0) {
            this.domManager.showEmptyState();

            return;
        }

        this.domManager.hideEmptyState();
        this.domManager.clearTermsList();

        // Add skeleton rows for progressive loading
        this.domManager.addSkeletonRows();

        // Add terms progressively
        terms.forEach((term, index) => {
            setTimeout(() => {
                // Remove skeleton rows only once for the first term
                if (index === 0) {
                    this.domManager.removeSkeletonRows();
                }
                this.domManager.addTermToList(term, index);
            }, index * window.TERMS_CONSTANTS.ANIMATION.PROGRESSIVE_DELAY);
        });
    }

    // Update search results display
    updateSearchResultsDisplay(searchResults) {
        this.domManager.clearSearchResults();

        if (searchResults.length === 0) {
            const noResultsItem = document.createElement('div');

            noResultsItem.className = 'search-result-item no-results';
            noResultsItem.textContent = 'No matching terms found';
            this.domManager.getElement('searchResultsContent').appendChild(noResultsItem);

            return;
        }

        searchResults.forEach(result => {
            this.domManager.addSearchResult(
                result.originalTerm,
                result.matchDetails.type,
                result.matchDetails.matchText
            );
        });
    }

    // Update term count
    updateTermCount() {
        const count = this.cacheManager.getValidTermsCount();

        this.domManager.updateTermCount(count);
    }

    // Get terms
    getTerms() {
        return this.cacheManager.getTerms();
    }

    // Get filtered terms
    getFilteredTerms() {
        return this.cacheManager.getFilteredTerms();
    }

    // Get term by word
    getTermByWord(termWord) {
        return this.cacheManager.getTermByWord(termWord);
    }

    // Check if term exists
    termExists(termWord) {
        return this.cacheManager.termExists(termWord);
    }

    // Get cache statistics
    getCacheStats() {
        return this.cacheManager.getCacheStats();
    }

    // Get search statistics
    getSearchStats() {
        return this.searchService.getStats();
    }

    // Clear cache
    clearCache() {
        this.cacheManager.clearCache();
        this.searchService.setTerms([]);
        this.updateTermsDisplay();
        this.updateTermCount();
    }

    // Refresh terms
    async refreshTerms() {
        await this.loadTerms();
    }

    // Export terms
    exportTerms(format = 'json') {
        const terms = this.cacheManager.getTerms();

        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(terms, null, 2);
            case 'csv':
                return this.convertToCSV(terms);
            case 'txt':
                return terms.map(term => {
                    const word = typeof term === 'string' ? term : term.word;
                    const types = this.getTermTypes(term);

                    return types.length > 0 ? `${word} (${types.join(', ')})` : word;
                }).join('\n');
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    // Convert terms to CSV
    convertToCSV(terms) {
        const headers = ['Word', 'Types'];
        const rows = terms.map(term => {
            const word = typeof term === 'string' ? term : term.word;
            const types = this.getTermTypes(term);

            return [word, types.join('; ')];
        });

        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }

    // Get term types helper
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

    // Dispatch custom event
    dispatchEvent(eventName, data = {}) {
        const event = new CustomEvent(eventName, {
            detail: data,
            bubbles: true,
            cancelable: true
        });

        document.dispatchEvent(event);
    }

    // Cleanup
    cleanup() {
        // Remove event listeners
        document.removeEventListener(window.TERMS_CONSTANTS.EVENTS.TERM_ADDED, this.handleTermAdded);
        document.removeEventListener('termDeleted', this.handleTermDeleted);
        document.removeEventListener(window.TERMS_CONSTANTS.EVENTS.SEARCH_PERFORMED, this.handleSearchPerformed);
        document.removeEventListener(window.TERMS_CONSTANTS.EVENTS.DUPLICATE_DETECTED, this.handleDuplicateDetected);

        // Cleanup UI manager
        this.uiManager.cleanup();

        this.isInitialized = false;
    }
}

// Initialize terms manager
let termsManager = null;

const initTermsManager = () => {
    if (typeof window.TERMS_CONSTANTS !== 'undefined') {
        termsManager = new TermsManager();

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                termsManager.init();
            });
        } else {
            termsManager.init();
        }

        // Export for global access
        if (typeof window !== 'undefined') {
            window.TermsManager = TermsManager;
            window.termsManager = termsManager;

            // Backward compatibility aliases
            window.SimpleTermsManager = TermsManager;
            window.simpleTermsManager = termsManager;
        }

        // Export for module systems
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = TermsManager;
        }
    } else {
        // Retry if constants not loaded yet
        setTimeout(initTermsManager, 100);
    }
};

// Start initialization
initTermsManager();
