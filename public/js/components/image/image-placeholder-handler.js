// ============================================================================
// IMAGE PLACEHOLDER HANDLER - Image Loading States and Error Handling
// ============================================================================

/**
 * ImagePlaceholderHandler - Handles image loading states, error handling, and placeholder display
 * Manages image loading lifecycle, error states, and fallback placeholder creation
 */
class ImagePlaceholderHandler {
    constructor(uiConfig = null) {
        this.uiConfig = uiConfig || new window.UIConfig();
        this.stylesInjected = false;
    }

    // ============================================================================
    // IMAGE LOADING MANAGEMENT
    // ============================================================================

    /**
     * Add comprehensive error handling to an image element
     * @param {HTMLImageElement} img - Image element to add handling to
     * @param {Object} imageData - Image data object containing metadata
     */
    addImageErrorHandling(img, imageData) {
        if (!img || !imageData) {
            console.warn('ImagePlaceholderHandler: Invalid parameters provided');

            return;
        }

        // Add loading state
        this.setLoadingState(img);

        // Handle successful load
        this.setupLoadHandler(img);

        // Handle load errors
        this.setupErrorHandler(img, imageData);

        // Setup timeout check for slow loading images
        this.setupTimeoutCheck(img, imageData);
    }

    /**
     * Set loading state on image element
     * @param {HTMLImageElement} img - Image element
     */
    setLoadingState(img) {
        img.classList.add(this.uiConfig.getClasses().imageLoading);
    }

    /**
     * Setup load success handler
     * @param {HTMLImageElement} img - Image element
     */
    setupLoadHandler(img) {
        img.onload = () => {
            img.classList.remove(this.uiConfig.getClasses().imageLoading);
            img.classList.add(this.uiConfig.getClasses().imageLoaded);
        };
    }

    /**
     * Setup error handler for image loading failures
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data object
     */
    setupErrorHandler(img, imageData) {
        img.onerror = () => {
            this.createImagePlaceholder(img, imageData);
        };
    }

    /**
     * Setup timeout check for slow loading images
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data object
     */
    setupTimeoutCheck(img, imageData) {
        const timeout = this.uiConfig.getSettings().placeholderTimeout;

        setTimeout(() => {
            if (img.complete && img.naturalWidth === 0) {
                this.createImagePlaceholder(img, imageData);
            }
        }, timeout);
    }

    // ============================================================================
    // PLACEHOLDER CREATION
    // ============================================================================

    /**
     * Create placeholder for failed image load
     * @param {HTMLImageElement} img - Image element to convert to placeholder
     * @param {Object} imageData - Image data object containing metadata
     */
    createImagePlaceholder(img, imageData) {
        if (!img || !imageData) {
            console.warn('ImagePlaceholderHandler: Cannot create placeholder - invalid parameters');

            return;
        }

        // Reset image element
        this.resetImageElement(img);

        // Apply placeholder styling
        this.applyPlaceholderStyling(img);

        // Set placeholder content
        this.setPlaceholderContent(img, imageData);

        // Ensure placeholder styles are injected
        this.ensurePlaceholderStyles();
    }

    /**
     * Reset image element to placeholder state
     * @param {HTMLImageElement} img - Image element
     */
    resetImageElement(img) {
        img.removeAttribute('src');
        img.classList.remove(
            this.uiConfig.getClasses().imageLoading,
            this.uiConfig.getClasses().imageLoaded
        );
        img.classList.add(this.uiConfig.getClasses().imagePlaceholder);
    }

    /**
     * Apply placeholder styling to image element
     * @param {HTMLImageElement} img - Image element
     */
    applyPlaceholderStyling(img) {
        const settings = this.uiConfig.getSettings();

        img.style.backgroundColor = '#f8f9fa';
        img.style.border = '2px dashed #dee2e6';
        img.style.display = 'flex';
        img.style.alignItems = 'center';
        img.style.justifyContent = 'center';
        img.style.minHeight = settings.defaultImageHeight;
        img.style.color = '#6c757d';
        img.style.fontSize = '14px';
        img.style.textAlign = 'center';
    }

    /**
     * Set placeholder content (icon and text)
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data object
     */
    setPlaceholderContent(img, imageData) {
        const settings = this.uiConfig.getSettings();

        // Set placeholder icon
        img.setAttribute('data-placeholder', settings.placeholderIcon);

        // Set placeholder text from prompt or fallback
        const promptText = imageData.prompt || imageData.original || '';
        const maxLength = settings.maxPromptDisplayLength;
        const displayText = promptText.length > maxLength
            ? `${promptText.substring(0, maxLength)}...`
            : (promptText || 'Image unavailable');

        img.setAttribute('data-text', displayText);
    }

    // ============================================================================
    // STYLE INJECTION
    // ============================================================================

    /**
     * Ensure placeholder styles are injected into document
     */
    ensurePlaceholderStyles() {
        if (this.stylesInjected) {
            return;
        }

        this.injectPlaceholderStyles();
        this.stylesInjected = true;
    }

    /**
     * Inject placeholder styles into document head
     */
    injectPlaceholderStyles() {
        const styleId = 'image-placeholder-styles';

        // Check if styles already exist
        if (document.getElementById(styleId)) {
            return;
        }

        const style = this.uiConfig.createElement('style');

        style.id = styleId;
        style.textContent = this.getPlaceholderStyles();
        document.head.appendChild(style);
    }

    /**
     * Get CSS styles for placeholder elements
     * @returns {string} CSS styles as string
     */
    getPlaceholderStyles() {
        return `
            .${this.uiConfig.getClasses().imagePlaceholder}::before {
                content: attr(data-placeholder);
                font-size: 24px;
                margin-bottom: 8px;
                display: block;
            }
            .${this.uiConfig.getClasses().imagePlaceholder}::after {
                content: attr(data-text);
                font-size: 12px;
                line-height: 1.4;
                max-width: 200px;
                word-wrap: break-word;
            }
            .${this.uiConfig.getClasses().imageLoading} {
                opacity: 0.7;
                animation: imageLoading 1.5s ease-in-out infinite;
            }
            @keyframes imageLoading {
                0%, 100% { opacity: 0.7; }
                50% { opacity: 0.3; }
            }
        `;
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Check if image is in loading state
     * @param {HTMLImageElement} img - Image element
     * @returns {boolean} True if image is loading
     */
    isLoading(img) {
        return img.classList.contains(this.uiConfig.getClasses().imageLoading);
    }

    /**
     * Check if image has loaded successfully
     * @param {HTMLImageElement} img - Image element
     * @returns {boolean} True if image has loaded
     */
    isLoaded(img) {
        return img.classList.contains(this.uiConfig.getClasses().imageLoaded);
    }

    /**
     * Check if image is showing placeholder
     * @param {HTMLImageElement} img - Image element
     * @returns {boolean} True if image is showing placeholder
     */
    isPlaceholder(img) {
        return img.classList.contains(this.uiConfig.getClasses().imagePlaceholder);
    }

    /**
     * Get placeholder text from image element
     * @param {HTMLImageElement} img - Image element
     * @returns {string} Placeholder text
     */
    getPlaceholderText(img) {
        return img.getAttribute('data-text') || '';
    }

    /**
     * Get placeholder icon from image element
     * @param {HTMLImageElement} img - Image element
     * @returns {string} Placeholder icon
     */
    getPlaceholderIcon(img) {
        return img.getAttribute('data-placeholder') || '';
    }
}

// ============================================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================================

// Make class available globally
window.ImagePlaceholderHandler = ImagePlaceholderHandler;
