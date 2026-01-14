// Feed Constants - Centralized configuration and DOM selectors
const FEED_CONSTANTS = {
    // DOM Selectors
    SELECTORS: {
        OWNER_DROPDOWN: 'select[name="owner"]',
        PROMPT_OUTPUT: '.prompt-output',
        FEED_CONTAINER: 'section.images',
        IMAGE_WRAPPERS: '.image-wrapper',
        LOADING_SPINNER: '.feed-loading-indicator',
        FILTER_STATS: '.filter-stats'
    },

    // Filter Types
    FILTERS: {
        PUBLIC: 'public',
        PRIVATE: 'private',
        // Legacy aliases for backward compatibility
        SITE: 'public',
        USER: 'private'
    },

    // Default Values
    DEFAULTS: {
        CURRENT_FILTER: 'private',
        PAGE_SIZE: 20,
        RETRY_DELAY: 50,
        SCROLL_THRESHOLD: 100,
        REQUEST_LIMIT: 20,
        IMAGE_LIMIT: 30,
        SCROLL_DELAY: 2000
    },

    // Transition Timing
    TRANSITIONS: {
        FADE_OUT_DURATION: 200,
        FADE_IN_DURATION: 150,
        MIN_LOADING_DISPLAY: 300
    },

    // CSS Classes
    CLASSES: {
        HIDDEN: 'hidden',
        LOADING: 'loading',
        ACTIVE: 'active',
        INACTIVE: 'inactive',
        IMAGE_WRAPPER: 'image-wrapper',
        FILTER_ACTIVE: 'filter-active',
        TRANSITIONING: 'transitioning',
        FADE_OUT: 'fade-out',
        FADE_IN: 'fade-in'
    },

    // Event Names
    EVENTS: {
        AUTH_STATE_CHANGED: 'authStateChanged',
        FILTER_CHANGED: 'filterChanged',
        FEED_LOADED: 'feedLoaded',
        IMAGE_ADDED: 'imageAdded'
    },

    // API Endpoints
    ENDPOINTS: {
        USER_FEED: '/api/feed/user', // Use dedicated endpoint for user's own images
        SITE_FEED: '/api/feed/site'
    },

    // Cache Keys
    CACHE_KEYS: {
        USER_DATA: 'userData',
        SCROLL_POSITION: 'scrollPosition',
        FILTER_STATE: 'filterState'
    },

    // LocalStorage Keys
    LOCALSTORAGE: {
        SELECTED_FILTER: 'imageHarvest_selectedFilter'
    },

    // Messages
    MESSAGES: {
        LOGIN_PROMPT: 'Please log in to view your images',
        LOADING: 'Loading images...',
        NO_IMAGES: 'No images found',
        ERROR_LOADING: 'Error loading images'
    }
};

// Export for global access
if (typeof window !== 'undefined') {
    window.FEED_CONSTANTS = FEED_CONSTANTS;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FEED_CONSTANTS;
}
