// ============================================================================
// IMAGE ELEMENTS - Basic Image Creation and Styling
// ============================================================================

/**
 * ImageElements - Handles basic image element creation and styling
 * Creates image elements, wrappers, and applies basic styling
 */
class ImageElements {
    constructor(uiConfig = null) {
        this.uiConfig = uiConfig || new window.UIConfig();
        this.placeholderHandler = new window.ImagePlaceholderHandler(this.uiConfig);
    }

    // ============================================================================
    // IMAGE ELEMENT CREATION
    // ============================================================================

    /**
     * Create a complete image element with all necessary attributes and handlers
     * @param {Object} imageData - Image data object containing id, url, and metadata
     * @returns {HTMLImageElement} Configured image element
     * @throws {Error} If imageData is invalid or missing required properties
     */
    createImageElement(imageData) {
        if (!imageData || !imageData.id) {
            throw new Error('ImageData with id is required');
        }

        // Create base image element
        const img = this.createBaseImageElement(imageData);

        // Set image attributes
        this.setImageAttributes(img, imageData);

        // Add error handling and placeholder support
        this.placeholderHandler.addImageErrorHandling(img, imageData);

        return img;
    }

    /**
     * Create base image element with initial configuration
     * @param {Object} imageData - Image data object
     * @returns {HTMLImageElement} Base image element
     */
    createBaseImageElement(imageData) {
        const img = this.uiConfig.createElement('img');

        img.className = this.uiConfig.getClasses().image;

        return img;
    }

    /**
     * Set all necessary attributes on image element
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data object
     */
    setImageAttributes(img, imageData) {
        // Set essential attributes
        img.src = imageData.url || imageData.imageUrl || '';
        img.alt = this.generateAltText(imageData);
        img.id = `image-${imageData.id}`;

        // Set data attributes for metadata
        this.setDataAttributes(img, imageData);

        // Set accessibility attributes
        this.setAccessibilityAttributes(img, imageData);
    }

    /**
     * Set data attributes for storing metadata
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data object
     */
    setDataAttributes(img, imageData) {
        const dataAttributes = [
            'id', 'url', 'imageUrl', 'prompt', 'original', 'final', 'provider', 'model',
            'guidance', 'seed', 'steps', 'rating', 'isPublic', 'userId', 'username', 'createdAt',
            'tags', 'taggedAt', 'taggingMetadata'
        ];

        dataAttributes.forEach(attr => {
            if (imageData[attr] !== undefined) {
                // Special handling for array/object fields
                if (attr === 'tags' && Array.isArray(imageData[attr])) {
                    img.setAttribute(`data-${attr}`, JSON.stringify(imageData[attr]));
                } else if (attr === 'taggingMetadata' && typeof imageData[attr] === 'object') {
                    img.setAttribute(`data-${attr}`, JSON.stringify(imageData[attr]));
                } else {
                    img.setAttribute(`data-${attr}`, imageData[attr]);
                }
            }
        });
    }

    /**
     * Set accessibility attributes
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data object
     */
    setAccessibilityAttributes(img, imageData) {
        img.setAttribute('role', 'img');
        img.setAttribute('tabindex', '0');

        // Set aria-label from prompt or alt text
        const ariaLabel = imageData.prompt || imageData.original || 'Generated image';

        img.setAttribute('aria-label', ariaLabel);
    }

    // ============================================================================
    // IMAGE WRAPPER CREATION
    // ============================================================================

    /**
     * Create image wrapper element that contains the image and additional UI elements
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Image wrapper element
     * @throws {Error} If imageData is invalid
     */
    createImageWrapper(imageData) {
        if (!imageData || !imageData.id) {
            throw new Error('ImageData with id is required');
        }

        // Create wrapper element
        const wrapper = this.createBaseWrapper(imageData);

        // Create and append image element
        const img = this.createImageElement(imageData);

        wrapper.appendChild(img);

        // Add compact view tags if available
        if (imageData.tags && Array.isArray(imageData.tags) && imageData.tags.length > 0) {
            const tagsOverlay = this.createCompactTagsOverlay(imageData.tags);
            wrapper.appendChild(tagsOverlay);
        }

        // Add wrapper-specific attributes
        this.setWrapperAttributes(wrapper, imageData);

        return wrapper;
    }

    /**
     * Create base wrapper element
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Base wrapper element
     */
    createBaseWrapper(imageData) {
        const wrapper = this.uiConfig.createElement('div');

        wrapper.className = this.uiConfig.getClasses().imageWrapper;
        wrapper.id = `wrapper-${imageData.id}`;

        return wrapper;
    }

    /**
     * Set wrapper-specific attributes
     * @param {HTMLElement} wrapper - Wrapper element
     * @param {Object} imageData - Image data object
     */
    setWrapperAttributes(wrapper, imageData) {
        // Set data attributes for wrapper
        wrapper.setAttribute('data-image-id', imageData.id);
        wrapper.setAttribute('data-provider', imageData.provider || '');
        wrapper.setAttribute('data-model', imageData.model || '');
        wrapper.setAttribute('data-rating', imageData.rating || '0');
        wrapper.setAttribute('data-is-public', imageData.isPublic || 'false');

        // Set accessibility attributes
        wrapper.setAttribute('role', 'group');
        wrapper.setAttribute('aria-label', `Image ${imageData.id} with metadata`);
    }

    /**
     * Create compact view tags overlay
     * @param {Array} tags - Array of tag strings
     * @returns {HTMLElement} Tags overlay element
     */
    createCompactTagsOverlay(tags) {
        const overlay = this.uiConfig.createElement('div');
        overlay.className = 'compact-tags-overlay';
        overlay.style.cssText = `
            position: absolute;
            bottom: 8px;
            left: 8px;
            right: 8px;
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            pointer-events: none;
            z-index: 5;
        `;

        // Limit to first 3 tags to keep it compact
        const displayTags = tags.slice(0, 3);

        displayTags.forEach(tag => {
            const tagElement = this.uiConfig.createElement('span');
            tagElement.textContent = tag;
            tagElement.style.cssText = `
                display: inline-block;
                background: rgba(0, 0, 0, 0.8);
                color: #60a5fa;
                padding: 2px 6px;
                border-radius: 6px;
                font-size: 10px;
                border: 1px solid rgba(59, 130, 246, 0.3);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 80px;
                cursor: pointer;
                transition: all 0.2s ease;
                pointer-events: auto;
            `;

            // Add hover effects
            tagElement.addEventListener('mouseenter', () => {
                tagElement.style.background = 'rgba(0, 0, 0, 0.9)';
                tagElement.style.transform = 'scale(1.05)';
            });

            tagElement.addEventListener('mouseleave', () => {
                tagElement.style.background = 'rgba(0, 0, 0, 0.8)';
                tagElement.style.transform = 'scale(1)';
            });

            // Add click handler to filter by tag
            tagElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log(`🏷️ COMPACT TAG CLICK: Filtering by tag: ${tag}`);

                // Use tag router if available
                if (window.TagRouter && window.tagRouter) {
                    window.tagRouter.setActiveTags([tag]);
                } else {
                    // Fallback: update URL directly
                    const url = new URL(window.location);
                    url.searchParams.set('tag', tag);
                    window.location.href = url.toString();
                }
            });

            overlay.appendChild(tagElement);
        });

        // Add "..." if there are more tags
        if (tags.length > 3) {
            const moreElement = this.uiConfig.createElement('span');
            moreElement.textContent = `+${tags.length - 3}`;
            moreElement.style.cssText = `
                display: inline-block;
                background: rgba(0, 0, 0, 0.8);
                color: #9ca3af;
                padding: 2px 6px;
                border-radius: 6px;
                font-size: 10px;
                border: 1px solid rgba(75, 85, 99, 0.3);
            `;
            overlay.appendChild(moreElement);
        }

        return overlay;
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Generate alt text for image element
     * @param {Object} imageData - Image data object
     * @returns {string} Generated alt text
     */
    generateAltText(imageData) {
        const prompt = imageData.prompt || imageData.original || '';
        const provider = imageData.provider || '';
        const model = imageData.model || '';

        if (prompt) {
            return `Generated image: ${prompt}${provider ? ` (${provider})` : ''}`;
        }

        return `Generated image${provider ? ` from ${provider}` : ''}${model ? ` using ${model}` : ''}`;
    }

    /**
     * Check if image element is valid
     * @param {HTMLImageElement} img - Image element to validate
     * @returns {boolean} True if image element is valid
     */
    isValidImageElement(img) {
        return img &&
               img.tagName === 'IMG' &&
               img.classList.contains(this.uiConfig.getClasses().image);
    }

    /**
     * Check if wrapper element is valid
     * @param {HTMLElement} wrapper - Wrapper element to validate
     * @returns {boolean} True if wrapper element is valid
     */
    isValidWrapperElement(wrapper) {
        return wrapper &&
               wrapper.tagName === 'DIV' &&
               wrapper.classList.contains(this.uiConfig.getClasses().imageWrapper);
    }

    /**
     * Get image data from image element
     * @param {HTMLImageElement} img - Image element
     * @returns {Object} Extracted image data
     */
    extractImageData(img) {
        if (!this.isValidImageElement(img)) {
            return null;
        }

        const data = {};
        const dataAttributes = [
            'id', 'url', 'imageUrl', 'prompt', 'original', 'final', 'provider', 'model',
            'guidance', 'seed', 'steps', 'rating', 'isPublic', 'createdAt', 'tags'
        ];

        dataAttributes.forEach(attr => {
            const value = img.getAttribute(`data-${attr}`);

            if (value !== null) {
                data[attr] = value;
            }
        });

        return data;
    }

    /**
     * Get image data from wrapper element
     * @param {HTMLElement} wrapper - Wrapper element
     * @returns {Object} Extracted image data
     */
    extractWrapperData(wrapper) {
        if (!this.isValidWrapperElement(wrapper)) {
            return null;
        }

        return {
            id: wrapper.getAttribute('data-image-id'),
            provider: wrapper.getAttribute('data-provider'),
            model: wrapper.getAttribute('data-model'),
            rating: wrapper.getAttribute('data-rating'),
            isPublic: wrapper.getAttribute('data-is-public') === 'true'
        };
    }
}

// ============================================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================================

// Make class available globally
window.ImageElements = ImageElements;
