// ============================================================================
// FULLSCREEN COMPONENTS - Fullscreen View Components
// ============================================================================

/**
 * FullscreenComponents - Handles creation of fullscreen view components
 * Creates fullscreen containers, images, info boxes, and related UI elements
 */
class FullscreenComponents {
    constructor(uiConfig = null) {
        this.uiConfig = uiConfig || new window.UIConfig();

        // Initialize unified info box component
        this.unifiedInfoBox = new window.UnifiedInfoBox(this.uiConfig);
    }

    // ============================================================================
    // FULLSCREEN CONTAINER
    // ============================================================================

    /**
     * Create fullscreen container element
     * @returns {HTMLElement} Fullscreen container element
     */
    createFullscreenContainer() {
        const container = this.uiConfig.createElement('div');

        container.className = this.uiConfig.getClasses().fullscreenContainer;
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-label', 'Fullscreen image view');
        container.setAttribute('tabindex', '-1');

        // Add fullscreen styles
        this.applyFullscreenStyles(container);

        return container;
    }

    /**
     * Apply fullscreen container styles
     * @param {HTMLElement} container - Container element
     */
    applyFullscreenStyles(container) {
        // Only set display: none by default, let CSS handle the rest
        container.style.display = 'none';
    }

    // ============================================================================
    // FULLSCREEN IMAGE CONTAINER
    // ============================================================================

    /**
     * Create fullscreen image container that can hold image, controls, and info box
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Fullscreen image container element
     * @throws {Error} If imageData is invalid
     */
    createFullscreenImageContainer(imageData) {
        if (!imageData || !imageData.id) {
            throw new Error('ImageData with id is required');
        }

        const container = this.uiConfig.createElement('div');

        container.className = 'fullscreen-image-container';
        container.style.position = 'relative';
        container.style.maxWidth = '90vw';
        container.style.maxHeight = '90vh';
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';

        // Create and add the image
        const img = this.createFullscreenImage(imageData);

        container.appendChild(img);

        return container;
    }

    // ============================================================================
    // FULLSCREEN IMAGE
    // ============================================================================

    /**
     * Create fullscreen image element
     * @param {Object} imageData - Image data object
     * @returns {HTMLImageElement} Fullscreen image element
     * @throws {Error} If imageData is invalid
     */
    createFullscreenImage(imageData) {
        if (!imageData || !imageData.id) {
            throw new Error('ImageData with id is required');
        }

        const img = this.uiConfig.createElement('img');

        img.className = 'fullscreen-image';
        img.src = imageData.url || '';
        img.alt = this.generateFullscreenAltText(imageData);
        img.id = `fullscreen-image-${imageData.id}`;

        // Set data attributes
        this.setFullscreenImageDataAttributes(img, imageData);

        // Set image zoom
        this.setFullscreenImageZoom(img);

        // Apply fullscreen image styles
        this.applyFullscreenImageStyles(img);

        return img;
    }

    /**
     * Set image zoom functionality for fullscreen image
     * @param {HTMLImageElement} img - Image element
     */
    setFullscreenImageZoom(img) {
        this.initializeImageZoom(img);
        this.setupZoomFunctionality(img);
    }

    /**
     * Initialize image zoom properties
     * @param {HTMLImageElement} img - Image element
     */
    initializeImageZoom(img) {
        img.style.cursor = 'zoom-in';
        img.style.transition = 'transform 0.2s ease';
        img.style.userSelect = 'none';

        // Initialize position and zoom if not set
        if (!img.dataset.zoom) {
            img.dataset.zoom = '1';
        }
        if (!img.dataset.translateX) {
            img.dataset.translateX = '0';
        }
        if (!img.dataset.translateY) {
            img.dataset.translateY = '0';
        }
    }


    /**
     * Setup zoom functionality for the image
     * @param {HTMLImageElement} img - Image element
     */
    setupZoomFunctionality(img) {
        // Click event listener for zoom functionality
        img.addEventListener('click', e => {
            e.stopPropagation();

            const currentZoom = parseFloat(img.dataset.zoom);
            const newZoom = currentZoom >= 3 ? 1 : currentZoom + 0.5;

            img.dataset.zoom = newZoom.toString();

            // Reset position when zooming
            img.dataset.translateX = '0';
            img.dataset.translateY = '0';

            img.style.transform = `scale(${newZoom}) translate(0px, 0px)`;

            // Update cursor based on zoom level
            img.style.cursor = newZoom >= 3 ? 'zoom-out' : 'zoom-in';
        });

        // Double-click event listener to reset zoom and position
        img.addEventListener('dblclick', e => {
            e.stopPropagation();

            // Reset zoom and position to default
            img.dataset.zoom = '1';
            img.dataset.translateX = '0';
            img.dataset.translateY = '0';

            img.style.transform = 'scale(1) translate(0px, 0px)';
            img.style.cursor = 'zoom-in';
        });
    }

    /**
     * Set data attributes for fullscreen image
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data object
     */
    setFullscreenImageDataAttributes(img, imageData) {
        const dataAttributes = [
            'id', 'url', 'prompt', 'original', 'final', 'provider', 'model',
            'guidance', 'seed', 'steps', 'rating', 'isPublic', 'createdAt'
        ];

        dataAttributes.forEach(attr => {
            if (imageData[attr] !== undefined) {
                img.setAttribute(`data-${attr}`, imageData[attr]);
            }
        });
    }

    /**
     * Apply fullscreen image styles
     * @param {HTMLImageElement} img - Image element
     */
    applyFullscreenImageStyles(img) {
        img.style.maxWidth = '90%';
        img.style.maxHeight = '90%';
        img.style.objectFit = 'contain';
        img.style.borderRadius = '8px';
        img.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
        img.style.cursor = 'default';
    }

    // ============================================================================
    // INFO BOX
    // ============================================================================

    /**
     * Create modern info box element with image metadata
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Info box element
     * @throws {Error} If imageData is invalid
     */
    createInfoBox(imageData) {
        if (!imageData || !imageData.id) {
            throw new Error('ImageData with id is required');
        }

        // Use unified info box with FullscreenComponents configuration
        return this.unifiedInfoBox.createInfoBox(imageData, {
            titleSource: 'id',
            titleElement: 'h3',
            contentClass: 'info-box-content collapsed',
            useUIConfig: true,
            addDataAction: true
        });
    }


    // ============================================================================
    // STYLING METHODS
    // ============================================================================

    /**
     * Apply info box styles
     * @param {HTMLElement} infoBox - Info box element
     */
    applyInfoBoxStyles(infoBox) {
        // Let CSS handle positioning and styling
        // Only set essential styles that CSS doesn't provide
        infoBox.style.fontSize = '14px';
        infoBox.style.lineHeight = '1.4';
    }

    // ============================================================================
    // FULLSCREEN VISIBILITY CONTROL
    // ============================================================================

    /**
     * Show fullscreen container
     * @param {HTMLElement} container - Fullscreen container element
     */
    showFullscreenContainer(container) {
        if (container) {
            container.style.display = 'flex';
            container.setAttribute('aria-hidden', 'false');
        }
    }

    /**
     * Hide fullscreen container
     * @param {HTMLElement} container - Fullscreen container element
     */
    hideFullscreenContainer(container) {
        if (container) {
            container.style.display = 'none';
            container.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * Toggle fullscreen container visibility
     * @param {HTMLElement} container - Fullscreen container element
     * @returns {boolean} True if container is now visible
     */
    toggleFullscreenContainer(container) {
        if (container) {
            const isVisible = container.style.display === 'flex';

            if (isVisible) {
                this.hideFullscreenContainer(container);

                return false;
            } else {
                this.showFullscreenContainer(container);

                return true;
            }
        }

        return false;
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Generate alt text for fullscreen image
     * @param {Object} imageData - Image data object
     * @returns {string} Generated alt text
     */
    generateFullscreenAltText(imageData) {
        const prompt = imageData.prompt || imageData.original || '';

        return `Fullscreen view: ${prompt || 'Generated image'}`;
    }

    /**
     * Format date for display
     * @param {string|Date} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDate(date) {
        console.log('🔍 FORMAT DATE: Received date:', date, 'Type:', typeof date);

        if (!date) {
            console.log('🔍 FORMAT DATE: No date provided, returning Unknown');

            return 'Unknown';
        }

        try {
            const dateObj = new Date(date);

            console.log('🔍 FORMAT DATE: Parsed date object:', dateObj);

            if (isNaN(dateObj.getTime())) {
                console.log('🔍 FORMAT DATE: Invalid date object, returning Invalid date');

                return 'Invalid date';
            }

            const formatted = `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString()}`;

            console.log('🔍 FORMAT DATE: Formatted result:', formatted);

            return formatted;
        } catch (error) {
            console.log('🔍 FORMAT DATE: Error formatting date:', error);

            return 'Invalid date';
        }
    }

    /**
     * Format rating for display
     * @param {number} rating - Rating value
     * @returns {string} Formatted rating string
     */
    formatRating(rating) {
        if (!rating || rating === 0) {
            return 'Not rated';
        }

        const stars = '★'.repeat(rating);
        const emptyStars = '☆'.repeat(5 - rating);

        return `${stars}${emptyStars} (${rating}/5)`;
    }

    /**
     * Format tags for display
     * @param {Array} tags - Array of tags
     * @returns {string} Formatted tags string
     */
    formatTags(tags) {
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
            return 'No tags';
        }

        return tags.join(', ');
    }

    /**
     * Check if element is fullscreen container
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} True if element is fullscreen container
     */
    isFullscreenContainer(element) {
        return element &&
               element.classList.contains(this.uiConfig.getClasses().fullscreenContainer);
    }

    /**
     * Check if element is info box
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} True if element is info box
     */
    isInfoBox(element) {
        return element &&
               element.classList.contains(this.uiConfig.getClasses().infoBox);
    }
}

// ============================================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================================

// Make class available globally
window.FullscreenComponents = FullscreenComponents;
