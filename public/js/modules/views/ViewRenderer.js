/**
 * View Renderer - Handles DOM Manipulation for Views
 *
 * Responsible for showing/hiding views, updating classes, and applying styles.
 * Pure rendering logic with no state management.
 */

(function() {
    'use strict';

    class ViewRenderer {
        constructor(registry = window.ViewRegistry) {
            if (!registry) {
                throw new Error('ViewRenderer requires ViewRegistry to be loaded');
            }

            this.registry = registry;
        }

        /**
         * Show a specific view type
         * @param {string} viewType - View type to show
         * @param {HTMLElement} container - Optional container to scope the operation
         */
        show(viewType, container = document) {
            const config = this.registry.getViewConfig(viewType);

            if (!config) {
                console.warn(`⚠️ VIEW RENDERER: Unknown view type: ${viewType}`);

                return;
            }

            const elements = container.querySelectorAll(config.selector);

            elements.forEach(el => {
                el.style.display = config.displayStyle;
            });

            console.log(`🎨 VIEW RENDERER: Showed ${elements.length} ${viewType} elements`);
        }

        /**
         * Hide a specific view type
         * @param {string} viewType - View type to hide
         * @param {HTMLElement} container - Optional container to scope the operation
         */
        hide(viewType, container = document) {
            const config = this.registry.getViewConfig(viewType);

            if (!config) {
                return;
            }

            const elements = container.querySelectorAll(config.selector);

            elements.forEach(el => {
                el.style.display = 'none';
            });
        }

        /**
         * Hide all views
         * @param {HTMLElement} container - Optional container to scope the operation
         */
        hideAll(container = document) {
            const views = this.registry.getViewTypes();

            views.forEach(viewType => {
                this.hide(viewType, container);
            });
        }

        /**
         * Switch to a view (hide all others, show this one)
         * @param {string} viewType - View type to switch to
         * @param {HTMLElement} container - Optional container to scope the operation
         */
        switchTo(viewType, container = document) {
            this.hideAll(container);
            this.show(viewType, container);
        }

        /**
         * Update wrapper view visibility
         * @param {HTMLElement} wrapper - Wrapper element
         * @param {string} viewType - View type to show
         */
        updateWrapper(wrapper, viewType) {
            if (!wrapper) {
                return;
            }

            const views = this.registry.getViewTypes();

            // Hide all views in this wrapper
            views.forEach(vType => {
                const config = this.registry.getViewConfig(vType);
                const viewElement = wrapper.querySelector(config.selector);

                if (viewElement) {
                    viewElement.style.display = 'none';
                }
            });

            // Show the active view
            const activeConfig = this.registry.getViewConfig(viewType);

            if (activeConfig) {
                const viewElement = wrapper.querySelector(activeConfig.selector);

                if (viewElement) {
                    viewElement.style.display = activeConfig.displayStyle;
                }
            }
        }

        /**
         * Update container classes
         * @param {HTMLElement} container - Container element
         * @param {string} viewType - View type
         */
        updateContainerClasses(container, viewType) {
            if (!container) {
                console.warn('⚠️ VIEW RENDERER: No container provided for updateContainerClasses');

                return;
            }

            // Remove all view-related classes
            const allClasses = this.registry.getAllContainerClasses();

            console.log(`🎨 VIEW RENDERER: Removing classes:`, allClasses);
            allClasses.forEach(className => {
                container.classList.remove(className);
            });

            // Add new class
            const config = this.registry.getViewConfig(viewType);

            if (config) {
                console.log(`🎨 VIEW RENDERER: Adding class '${config.containerClass}' to container`);
                container.classList.add(config.containerClass);

                console.log(`🎨 VIEW RENDERER: Container classes now:`, container.className);
            } else {
                console.error(`❌ VIEW RENDERER: No config found for view type: ${viewType}`);
            }
        }

        /**
         * Apply view to all wrappers in a container
         * @param {HTMLElement} container - Container with wrappers
         * @param {string} viewType - View type to apply
         */
        applyToAllWrappers(container, viewType) {
            if (!container) {
                return;
            }

            const wrappers = container.querySelectorAll('.image-wrapper');

            console.log(`🎨 VIEW RENDERER: Applying ${viewType} to ${wrappers.length} wrappers`);

            wrappers.forEach(wrapper => {
                this.updateWrapper(wrapper, viewType);
            });

            // Update container classes
            this.updateContainerClasses(container, viewType);
        }

        /**
         * Get view element from wrapper
         * @param {HTMLElement} wrapper - Wrapper element
         * @param {string} viewType - View type
         * @returns {HTMLElement|null} View element or null
         */
        getViewElement(wrapper, viewType) {
            if (!wrapper) {
                return null;
            }

            const config = this.registry.getViewConfig(viewType);

            if (!config) {
                return null;
            }

            return wrapper.querySelector(config.selector);
        }

        /**
         * Check if wrapper has a specific view
         * @param {HTMLElement} wrapper - Wrapper element
         * @param {string} viewType - View type
         * @returns {boolean} True if view exists
         */
        hasView(wrapper, viewType) {
            return this.getViewElement(wrapper, viewType) !== null;
        }

        /**
         * Check if wrapper has all views
         * @param {HTMLElement} wrapper - Wrapper element
         * @returns {boolean} True if all views exist
         */
        hasAllViews(wrapper) {
            const views = this.registry.getViewTypes();

            return views.every(viewType => this.hasView(wrapper, viewType));
        }
    }

    // Export to window
    if (typeof window !== 'undefined') {
        window.ViewRenderer = ViewRenderer;
    }
})();

