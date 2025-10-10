/**
 * View Registry - Central Configuration for All Views
 *
 * This is the SINGLE SOURCE OF TRUTH for all view types in the application.
 * To add a new view, simply add an entry here.
 */

(function() {
    'use strict';

    /**
     * View Configuration Schema:
     * - className: CSS class for the view element
     * - containerClass: CSS class for the parent container
     * - displayStyle: CSS display value when view is active
     * - selector: Query selector to find view elements
     * - priority: Order in which views are created (lower = first)
     * - enabled: Whether the view is currently enabled
     */
    const VIEW_REGISTRY = {
        compact: {
            className: 'compact-view',
            containerClass: 'compact',
            displayStyle: 'block',
            selector: '.compact-view',
            priority: 1,
            enabled: true,
            metadata: {
                icon: '⊞',
                label: 'Compact',
                description: 'Grid view with thumbnails'
            }
        },

        list: {
            className: 'list-view',
            containerClass: 'list-wrapper',
            displayStyle: 'flex',
            selector: '.list-view',
            priority: 2,
            enabled: true,
            metadata: {
                icon: '☰',
                label: 'List',
                description: 'Detailed list with metadata'
            }
        },

        full: {
            className: 'full-view',
            containerClass: 'full',
            displayStyle: 'block',
            selector: '.full-view',
            priority: 3,
            enabled: true, // ✅ ENABLED!
            metadata: {
                icon: '◫',
                label: 'Full',
                description: 'Full width image view'
            }
        }
    };

    /**
     * Get all enabled views
     * @returns {Object} Enabled views from registry
     */
    function getEnabledViews() {
        return Object.entries(VIEW_REGISTRY)
            .filter(([_, config]) => config.enabled)
            .reduce((acc, [key, config]) => {
                acc[key] = config;

                return acc;
            }, {});
    }

    /**
     * Get all view types (keys)
     * @returns {Array<string>} Array of view type names
     */
    function getViewTypes() {
        return Object.keys(getEnabledViews());
    }

    /**
     * Check if a view type is valid and enabled
     * @param {string} viewType - View type to check
     * @returns {boolean} True if valid and enabled
     */
    function isValidView(viewType) {
        return viewType in VIEW_REGISTRY && VIEW_REGISTRY[viewType].enabled;
    }

    /**
     * Get configuration for a specific view
     * @param {string} viewType - View type
     * @returns {Object|null} View configuration or null if not found
     */
    function getViewConfig(viewType) {
        return VIEW_REGISTRY[viewType] || null;
    }

    /**
     * Get all class names for cleanup operations
     * @returns {Array<string>} Array of all view class names
     */
    function getAllClassNames() {
        return Object.values(VIEW_REGISTRY).map(config => config.className);
    }

    /**
     * Get all container class names for cleanup operations
     * @returns {Array<string>} Array of all container class names
     */
    function getAllContainerClasses() {
        return Object.values(VIEW_REGISTRY).map(config => config.containerClass);
    }

    /**
     * Get views sorted by priority
     * @returns {Array<[string, Object]>} Sorted array of [key, config] pairs
     */
    function getViewsByPriority() {
        return Object.entries(getEnabledViews())
            .sort((a, b) => a[1].priority - b[1].priority);
    }

    // Export to window
    if (typeof window !== 'undefined') {
        window.ViewRegistry = {
            // Configuration
            VIEWS: VIEW_REGISTRY,

            // Query methods
            getEnabledViews,
            getViewTypes,
            isValidView,
            getViewConfig,
            getAllClassNames,
            getAllContainerClasses,
            getViewsByPriority,

            // Constants
            DEFAULT_VIEW: 'list',
            STORAGE_KEY: 'imageViewPreference'
        };
    }
})();

