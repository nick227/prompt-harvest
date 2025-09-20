// ============================================================================
// UI CONFIGURATION - Configuration and Constants for Image UI Components
// ============================================================================

/**
 * UIConfig - Configuration and basic DOM element creation
 * Handles all configuration constants, CSS classes, selectors, and DOM utilities
 */
class UIConfig {
    constructor() {
        this.config = this.getConfig();
    }

    // ============================================================================
    // CONFIGURATION GETTERS
    // ============================================================================

    /**
     * Get complete configuration object
     * @returns {Object} Configuration object with classes, selectors, and settings
     */
    getConfig() {
        return {
            classes: {
                image: 'generated-image',
                imageWrapper: 'image-wrapper',
                rating: 'image-rating',
                fullscreenContainer: 'full-screen',
                infoBox: 'info-box',
                navigationControls: 'fullscreen-controls',
                button: '',
                toggleButton: 'info-box-toggle',
                publicStatusToggle: 'info-box-public-toggle',
                navigationSpacer: 'navigation-spacer',
                imageLoading: 'image-loading',
                imageLoaded: 'image-loaded',
                imagePlaceholder: 'image-placeholder'
            },
            selectors: {
                fullscreenContainer: '.full-screen',
                infoBox: '.info-box',
                navigationControls: '.navigation-controls',
                rating: '.image-rating',
                publicStatusToggle: '.public-status-toggle'
            },
            settings: {
                placeholderTimeout: 100,
                placeholderIcon: '🖼️',
                maxPromptDisplayLength: 30,
                defaultImageHeight: '150px'
            }
        };
    }

    /**
     * Get CSS classes configuration
     * @returns {Object} Object containing all CSS class names
     */
    getClasses() {
        return this.config.classes;
    }

    /**
     * Get CSS selectors configuration
     * @returns {Object} Object containing all CSS selectors
     */
    getSelectors() {
        return this.config.selectors;
    }

    /**
     * Get settings configuration
     * @returns {Object} Object containing all settings and constants
     */
    getSettings() {
        return this.config.settings;
    }

    // ============================================================================
    // DOM UTILITIES
    // ============================================================================

    /**
     * Create DOM element with optional class name
     * @param {string} tag - HTML tag name
     * @param {string} className - Optional CSS class name
     * @returns {HTMLElement} Created DOM element
     */
    createElement(tag, className = '') {
        if (typeof Utils !== 'undefined' && Utils.dom && Utils.dom.createElement) {
            return Utils.dom.createElement(tag, className);
        }

        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        return element;
    }

    /**
     * Create element with multiple classes
     * @param {string} tag - HTML tag name
     * @param {Array<string>} classNames - Array of CSS class names
     * @returns {HTMLElement} Created DOM element
     */
    createElementWithClasses(tag, classNames = []) {
        const element = this.createElement(tag);

        if (classNames.length > 0) {
            element.className = classNames.join(' ');
        }

        return element;
    }

    /**
     * Create element with attributes
     * @param {string} tag - HTML tag name
     * @param {Object} attributes - Object of attributes to set
     * @returns {HTMLElement} Created DOM element
     */
    createElementWithAttributes(tag, attributes = {}) {
        const element = this.createElement(tag);

        Object.keys(attributes).forEach(key => {
            if (key === 'className' || key === 'class') {
                element.className = attributes[key];
            } else if (key === 'textContent') {
                element.textContent = attributes[key];
            } else if (key === 'innerHTML') {
                element.innerHTML = attributes[key];
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });

        return element;
    }

    // ============================================================================
    // CONFIGURATION VALIDATION
    // ============================================================================

    /**
     * Validate configuration object
     * @returns {boolean} True if configuration is valid
     */
    validateConfig() {
        const requiredKeys = ['classes', 'selectors', 'settings'];

        return requiredKeys.every(key => Object.prototype.hasOwnProperty.call(this.config, key));
    }

    /**
     * Get configuration summary for debugging
     * @returns {Object} Summary of configuration
     */
    getConfigSummary() {
        return {
            classCount: Object.keys(this.config.classes).length,
            selectorCount: Object.keys(this.config.selectors).length,
            settingCount: Object.keys(this.config.settings).length,
            isValid: this.validateConfig()
        };
    }
}

// ============================================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================================

// Make class available globally
window.UIConfig = UIConfig;
