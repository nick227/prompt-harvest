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
    if (typeof TEXTAREA_CONFIG !== 'undefined' && typeof Utils !== 'undefined' && typeof window.TextAreaManager !== 'undefined') {
        window.textAreaManager = new window.TextAreaManager();
    } else {
        setTimeout(initTextAreaManager, 50);
    }
};

// Start initialization
initTextAreaManager();
