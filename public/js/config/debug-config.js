/**
 * Debug Configuration
 * Toggle debug logging for different modules
 */

const DEBUG_CONFIG = {
    // Search filtering debug logs
    SEARCH_FILTERING: false,  // Set to true to enable verbose search filter logs

    // Feed management debug logs
    FEED_MANAGEMENT: false,

    // View system debug logs
    VIEW_SYSTEM: false,

    // Global debug flag (overrides all)
    GLOBAL_DEBUG: false
};

// Helper function to check if debug is enabled for a category
const isDebugEnabled = category => DEBUG_CONFIG.GLOBAL_DEBUG || DEBUG_CONFIG[category] || false;

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.DEBUG_CONFIG = DEBUG_CONFIG;
    window.isDebugEnabled = isDebugEnabled;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DEBUG_CONFIG, isDebugEnabled };
}

