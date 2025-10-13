/**
 * View Manager - Centralized View State Management
 *
 * Manages current view state, switching, and persistence.
 * Uses ViewRegistry as single source of truth.
 */

(function() {
    'use strict';

    class ViewManager {
        constructor(registry = window.ViewRegistry) {
            if (!registry) {
                throw new Error('ViewManager requires ViewRegistry to be loaded');
            }

            this.registry = registry;
            this.currentView = this.loadPreference();
            this.listeners = new Set();

        }

        /**
         * Get current view type
         * @returns {string} Current view type
         */
        getCurrentView() {
            return this.currentView;
        }

        /**
         * Get all supported view types
         * @returns {Array<string>} Array of view type names
         */
        getSupportedViews() {
            return this.registry.getViewTypes();
        }

        /**
         * Check if a view type is valid
         * @param {string} viewType - View type to check
         * @returns {boolean} True if valid
         */
        isValidView(viewType) {
            return this.registry.isValidView(viewType);
        }


        /**
         * Switch to a different view
         * @param {string} viewType - View type to switch to
         * @throws {Error} If view type is invalid
         */
        switchTo(viewType) {
            if (viewType === this.currentView) {

                return;
            }

            if (!this.isValidView(viewType)) {
                throw new Error(`Invalid view type: ${viewType}`);
            }

            const previousView = this.currentView;

            this.currentView = viewType;
            this.savePreference(viewType);
            this.notifyListeners(viewType, previousView);
        }

        /**
         * Load view preference from storage
         * @returns {string} Saved view type or default
         */
        loadPreference() {
            try {
                const saved = localStorage.getItem(this.registry.STORAGE_KEY);

                if (saved && this.registry.isValidView(saved)) {

                    return saved;
                }
            } catch (error) {
                console.warn('⚠️ VIEW MANAGER: Could not load preference:', error);
            }

            return this.registry.DEFAULT_VIEW;
        }

        /**
         * Save view preference to storage
         * @param {string} viewType - View type to save
         */
        savePreference(viewType) {
            try {
                localStorage.setItem(this.registry.STORAGE_KEY, viewType);
            } catch (error) {
                console.warn('⚠️ VIEW MANAGER: Could not save preference:', error);
            }
        }

        /**
         * Add a listener for view changes
         * @param {Function} listener - Callback function (receives newView, previousView)
         */
        addListener(listener) {
            this.listeners.add(listener);
        }

        /**
         * Remove a listener
         * @param {Function} listener - Callback function to remove
         */
        removeListener(listener) {
            this.listeners.delete(listener);
        }

        /**
         * Notify all listeners of view change
         * @param {string} newView - New view type
         * @param {string} previousView - Previous view type
         * @private
         */
        notifyListeners(newView, previousView) {
            this.listeners.forEach(listener => {
                try {
                    listener(newView, previousView);
                } catch (error) {
                    console.error('❌ VIEW MANAGER: Listener error:', error);
                }
            });
        }

    }

    // Export to window
    if (typeof window !== 'undefined') {
        window.ViewManager = ViewManager;
    }
})();

