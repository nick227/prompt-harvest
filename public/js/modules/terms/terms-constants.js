// Terms Constants - Shared constants for terms functionality
const TERMS_CONSTANTS = {
    // DOM Selectors
    SELECTORS: {
        ADD_BUTTON: '#addTerm',
        TERM_INPUT: '#newTerm',
        CLEAR_BUTTON: '#clearSearch',
        SEARCH_INPUT: '#searchInput',
        TERMS_LIST: '#termsList',
        MESSAGE_CONTAINER: '#termMessageContainer',
        EMPTY_STATE: '#emptyState',
        TERM_COUNT: '#termCount',
        SEARCH_RESULTS: '#searchResults',
        SEARCH_RESULTS_CONTENT: '#searchResultsContent'
    },
    CLASSES: {
        TERM_ROW: 'term-row',
        SKELETON_ROW: 'skeleton-row',
        HIDDEN: 'hidden',
        LOADING: 'loading',
        TOGGLE_TEXT: 'toggle-text',
        TOGGLE_ICON: 'toggle-icon',
        RELATED_TERMS_SECTION: 'related-terms-section'
    },
    EVENTS: {
        TERM_ADDED: 'termAdded',
        SEARCH_PERFORMED: 'searchPerformed',
        TERMS_LOADED: 'termsLoaded',
        DUPLICATE_DETECTED: 'duplicateDetected'
    },
    // API Endpoints
    ENDPOINTS: {
        LOAD_TERMS: '/words',
        ADD_TERM: '/ai/word/add',
        DELETE_TERM: '/ai/word/delete',
        UPDATE_TERM: '/ai/word/update',
        SEARCH_TERMS: '/ai/word/search',
        GET_STATS: '/ai/word/stats',
        USER_AUTH: '/api/user'
    },
    MESSAGE_TYPES: {
        SUCCESS: 'success',
        ERROR: 'error',
        INFO: 'info'
    },
    SEARCH: {
        MIN_SEARCH_LENGTH: 2,
        MAX_MATCHES: 10,
        DROPDOWN_DELAY: 200
    },
    DEFAULTS: {
        DEBOUNCE_DELAY: 300,
        HIDE_DELAY_SUCCESS: 3000,
        HIDE_DELAY_ERROR: 5000,
        PROGRESS_INTERVAL: 500,
        SKELETON_COUNT: 3
    },
    // Animation delays
    ANIMATION: {
        PROGRESSIVE_DELAY: 80
    }
};

// Export for global access
if (typeof window !== 'undefined') {
    window.TERMS_CONSTANTS = TERMS_CONSTANTS;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TERMS_CONSTANTS;
}
