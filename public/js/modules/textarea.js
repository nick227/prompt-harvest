// ============================================================================
// TEXTAREA MODULE - Main Entry Point (Refactored)
// ============================================================================

// Load modules in dependency order
// Note: These are loaded as regular scripts, not ES6 modules, to maintain compatibility with global variables

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize when dependencies are available
const initTextAreaManager = () => {
    // Check if already initialized
    if (window.textAreaManager) {
        return;
    }

    if (typeof TEXTAREA_CONFIG !== 'undefined' && typeof Utils !== 'undefined' && typeof window.TextAreaManager !== 'undefined') {
        try {
            window.textAreaManager = new window.TextAreaManager();
        } catch (error) {
            console.error('Failed to initialize TextAreaManager:', error);
            // Retry after a longer delay
            setTimeout(initTextAreaManager, 200);
        }
    } else {
        setTimeout(initTextAreaManager, 50);
    }
};

// Start initialization
initTextAreaManager();
