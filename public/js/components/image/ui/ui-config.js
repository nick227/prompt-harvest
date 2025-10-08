// UI Configuration and Utilities
class UIConfig {
    constructor() {
        this.config = this.getConfig();
    }

    getConfig() {
        return {
            classes: {
                image: 'generated-image',
                imageWrapper: 'image-wrapper',
                rating: 'image-rating',
                fullscreenContainer: 'fullscreen-container'
            },
            selectors: {
                fullscreenContainer: '.fullscreen-container'
            }
        };
    }

    // Helper method for element creation with fallback
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

    // Get configuration
    getClasses() {
        return this.config.classes;
    }

    getSelectors() {
        return this.config.selectors;
    }
}

// Export for CommonJS and global scope
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIConfig };
}

// Make class available globally
if (typeof window !== 'undefined') {
    window.UIConfig = UIConfig;
}
