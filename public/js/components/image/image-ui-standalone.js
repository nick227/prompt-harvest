// ============================================================================
// IMAGE UI STANDALONE - Main Entry Point (Refactored)
// ============================================================================

// Load modules in dependency order
// Note: These are loaded as regular scripts, not ES6 modules, to maintain compatibility with global variables

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize when dependencies are available
const initImageUI = () => {
    if (typeof window.ImageUI !== 'undefined') {
        // ImageUI is already available from the loaded modules
        console.log('✅ ImageUI components loaded successfully');
    } else {
        // Retry after a short delay
        setTimeout(initImageUI, 50);
    }
};

// Start initialization
initImageUI();
