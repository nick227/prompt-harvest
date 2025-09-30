/**
 * Prompt Helpers Form Component
 *
 * Dynamically generates form elements for prompt helpers based on centralized configuration.
 * This ensures consistency between frontend and backend and makes adding new helpers trivial.
 */

window.PromptHelpersForm = class PromptHelpersForm {
    /**
     * Generate HTML for all prompt helper checkboxes
     * @param {Object} options - Configuration options
     * @param {boolean} options.groupByCategory - Whether to group helpers by category
     * @param {string} options.containerClass - CSS class for the container
     * @param {string} options.itemClass - CSS class for each helper item
     * @returns {string} Generated HTML
     */
    static generateHTML(options = {}) {
        const {
            groupByCategory = true,
            containerClass = 'prompt-helpers-container',
            itemClass = 'prompt-helper-option'
        } = options;

        if (groupByCategory) {
            return this.generateGroupedHTML(containerClass, itemClass);
        } else {
            return this.generateSimpleHTML(containerClass, itemClass);
        }
    }

    /**
     * Generate HTML grouped by category
     * @param {string} containerClass - CSS class for the container
     * @param {string} itemClass - CSS class for each helper item
     * @returns {string} Generated HTML
     */
    static generateGroupedHTML(containerClass, itemClass) {
        const categories = window.getPromptHelperCategories();
        let html = `<div class="${containerClass}">`;

        categories.forEach(category => {
            const helpersInCategory = Object.entries(window.PROMPT_HELPERS)
                .filter(([, helper]) => helper.category === category);

            if (helpersInCategory.length > 0) {
                html += '<div class="space-y-3">';

                helpersInCategory.forEach(([key, helper]) => {
                    html += this.generateHelperHTML(key, helper, itemClass);
                });

                html += '</div>';
            }
        });

        html += '</div>';

        return html;
    }

    /**
     * Generate simple HTML without grouping
     * @param {string} containerClass - CSS class for the container
     * @param {string} itemClass - CSS class for each helper item
     * @returns {string} Generated HTML
     */
    static generateSimpleHTML(containerClass, itemClass) {
        let html = `<div class="${containerClass} space-y-3">`;

        Object.entries(window.PROMPT_HELPERS).forEach(([key, helper]) => {
            html += this.generateHelperHTML(key, helper, itemClass);
        });

        html += '</div>';

        return html;
    }

    /**
     * Generate HTML for a single helper
     * @param {string} key - Helper key
     * @param {Object} helper - Helper configuration
     * @param {string} itemClass - CSS class for the item
     * @returns {string} Generated HTML
     */
    static generateHelperHTML(key, helper, _itemClass) {
        return `
            <label class="flex items-center gap-3 cursor-pointer group">
                <input
                    type="checkbox"
                    name="${helper.key}"
                    id="${helper.key}"
                    class="text-blue-600 focus:ring-blue-500"
                    data-category="${helper.category}"
                >
                <span class="text-gray-200 group-hover:text-white transition-colors">
                    ${helper.label}
                </span>
            </label>
        `;
    }

    /**
     * Get all prompt helper values from form
     * @param {HTMLElement} container - Container element to search within
     * @returns {Object} Object with helper keys as properties and boolean values
     */
    static getFormValues(container = document) {
        const values = {};

        Object.keys(PROMPT_HELPERS).forEach(key => {
            const checkbox = container.querySelector(`input[name="${key}"]`);

            values[key] = checkbox ? checkbox.checked : false;
        });

        return values;
    }

    /**
     * Set prompt helper values in form
     * @param {Object} values - Object with helper keys as properties and boolean values
     * @param {HTMLElement} container - Container element to search within
     */
    static setFormValues(values, container = document) {
        Object.entries(values).forEach(([key, checked]) => {
            const checkbox = container.querySelector(`input[name="${key}"]`);

            if (checkbox) {
                checkbox.checked = Boolean(checked);
            }
        });
    }

    /**
     * Add event listeners for prompt helper changes
     * @param {Function} callback - Callback function to call when values change
     * @param {HTMLElement} container - Container element to search within
     */
    static addChangeListeners(callback, container = document) {
        Object.keys(PROMPT_HELPERS).forEach(key => {
            const checkbox = container.querySelector(`input[name="${key}"]`);

            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    callback(this.getFormValues(container));
                });
            }
        });
    }

    /**
     * Validate prompt helper values
     * @param {Object} values - Values to validate
     * @returns {Object} Validation result with isValid and errors
     */
    static validateValues(values) {
        const errors = [];

        Object.entries(values).forEach(([key, value]) => {
            if (!PROMPT_HELPERS[key]) {
                errors.push(`Unknown prompt helper: ${key}`);
            }
            if (typeof value !== 'boolean') {
                errors.push(`Invalid value for ${key}: expected boolean, got ${typeof value}`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get helper configuration by key
     * @param {string} key - Helper key
     * @returns {Object|null} Helper configuration or null if not found
     */
    static getHelperConfig(key) {
        return PROMPT_HELPERS[key] || null;
    }

    /**
     * Get all helper configurations
     * @returns {Object} All helper configurations
     */
    static getAllHelpers() {
        return PROMPT_HELPERS;
    }

    /**
     * Utility function to capitalize first letter
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    static capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
};
