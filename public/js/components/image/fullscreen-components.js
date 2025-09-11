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

        // Apply fullscreen image styles
        this.applyFullscreenImageStyles(img);

        return img;
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

        const infoBox = this.uiConfig.createElement('div');

        infoBox.className = this.uiConfig.getClasses().infoBox;
        infoBox.setAttribute('role', 'complementary');
        infoBox.setAttribute('aria-label', 'Image information');

        // Create modern info box structure
        this.createModernInfoBoxContent(infoBox, imageData);

        return infoBox;
    }

    /**
     * Create modern info box content structure
     * @param {HTMLElement} infoBox - Info box container
     * @param {Object} imageData - Image data object
     */
    createModernInfoBoxContent(infoBox, imageData) {
        // Create header with filename and toggle
        const header = this.createModernInfoBoxHeader(imageData);

        infoBox.appendChild(header);

        // Create collapsible content container
        const contentContainer = this.uiConfig.createElement('div');

        contentContainer.className = 'info-box-content expanded';

        // Create metadata grid
        const metadata = this.createModernMetadataSection(imageData);

        contentContainer.appendChild(metadata);

        // Create prompts section
        const prompts = this.createModernPromptsSection(imageData);

        contentContainer.appendChild(prompts);

        infoBox.appendChild(contentContainer);
    }

    /**
     * Create modern info box header
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Header element
     */
    createModernInfoBoxHeader(imageData) {
        const header = this.uiConfig.createElement('div');

        header.className = 'info-box-header';

        const title = this.uiConfig.createElement('h3');

        title.className = 'info-box-title';
        title.textContent = imageData.id || 'Image Info';

        const toggleButton = this.uiConfig.createElement('button');

        toggleButton.className = 'info-box-toggle';
        toggleButton.textContent = '−';
        toggleButton.setAttribute('aria-label', 'Toggle info box');
        toggleButton.setAttribute('data-action', 'toggle-info');

        header.appendChild(title);
        header.appendChild(toggleButton);

        return header;
    }

    /**
     * Create modern metadata section
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Metadata section element
     */
    createModernMetadataSection(imageData) {
        const metadata = this.uiConfig.createElement('div');

        metadata.className = 'info-box-meta';

        // Create metadata items in grid format
        const metadataItems = [
            { label: 'Provider', value: imageData.provider || 'Unknown' },
            { label: 'Public', value: this.createModernPublicToggle(imageData) },
            { label: 'Model', value: imageData.model || 'Unknown' },
            { label: 'Guidance', value: imageData.guidance || 'N/A' },
            { label: 'Steps', value: imageData.steps || 'N/A' },
            { label: 'Seed', value: imageData.seed || 'N/A' },
            { label: 'Rating', value: this.formatRating(imageData.rating) },
            { label: 'Created', value: this.formatDate(imageData.createdAt) }
        ];

        metadataItems.forEach(item => {
            const itemElement = this.createModernMetadataItem(item.label, item.value);

            metadata.appendChild(itemElement);
        });

        return metadata;
    }

    /**
     * Create modern metadata item element
     * @param {string} label - Item label
     * @param {string} value - Item value
     * @returns {HTMLElement} Metadata item element
     */
    createModernMetadataItem(label, value) {
        const item = this.uiConfig.createElement('div');

        item.className = 'info-box-meta-item';

        // Add special class for rating items
        if (label === 'Rating') {
            item.classList.add('rating-item');
        }

        const labelElement = this.uiConfig.createElement('div');

        labelElement.className = 'info-box-meta-label';
        labelElement.textContent = label;

        const valueElement = this.uiConfig.createElement('div');

        valueElement.className = 'info-box-meta-value';

        // Handle both string values and HTML elements
        if (typeof value === 'string') {
            valueElement.innerHTML = value;
        } else if (value instanceof HTMLElement) {
            valueElement.appendChild(value);
        } else {
            valueElement.innerHTML = String(value);
        }

        item.appendChild(labelElement);
        item.appendChild(valueElement);

        return item;
    }

    /**
     * Create modern prompts section
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Prompts section element
     */
    createModernPromptsSection(imageData) {
        const prompts = this.uiConfig.createElement('div');

        prompts.className = 'info-box-prompts';

        // Original prompt
        if (imageData.original) {
            const originalPrompt = this.createModernPromptItem('Original', imageData.original);

            prompts.appendChild(originalPrompt);
        }

        // Final prompt
        if (imageData.final) {
            const finalPrompt = this.createModernPromptItem('Final', imageData.final);

            prompts.appendChild(finalPrompt);
        }

        return prompts;
    }


    /**
     * Create modern prompt item
     * @param {string} label - Prompt label
     * @param {string} value - Prompt value
     * @returns {HTMLElement} Prompt item element
     */
    createModernPromptItem(label, value) {
        const item = this.uiConfig.createElement('div');

        item.className = 'info-box-prompt-item';

        const labelElement = this.uiConfig.createElement('div');

        labelElement.className = 'info-box-prompt-label';
        labelElement.textContent = label;

        const valueElement = this.uiConfig.createElement('div');

        valueElement.className = 'info-box-prompt-value';
        valueElement.textContent = value;
        valueElement.title = value; // Full text on hover
        valueElement.setAttribute('data-copy-text', value);

        item.appendChild(labelElement);
        item.appendChild(valueElement);

        return item;
    }

    /**
     * Create prompt item element
     * @param {string} label - Prompt label
     * @param {string} prompt - Prompt text
     * @returns {HTMLElement} Prompt item element
     */
    createPromptItem(label, prompt) {
        const item = this.uiConfig.createElement('div');

        item.className = 'prompt-item';

        const labelElement = this.uiConfig.createElement('label');

        labelElement.textContent = `${label} Prompt:`;
        labelElement.className = 'prompt-label';

        const valueElement = this.uiConfig.createElement('div');

        valueElement.className = 'prompt-value';
        valueElement.textContent = prompt;
        valueElement.setAttribute('data-prompt', prompt);
        valueElement.style.cursor = 'pointer';
        valueElement.style.color = '#007bff';
        valueElement.style.textDecoration = 'underline';

        item.appendChild(labelElement);
        item.appendChild(valueElement);

        return item;
    }

    /**
     * Create public status toggle for info box
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Public status toggle element
     */
    createPublicStatusToggle(imageData) {
        const toggle = this.uiConfig.createElement('div');

        toggle.className = 'public-status-section';

        const checkbox = this.uiConfig.createElement('input');

        checkbox.type = 'checkbox';
        checkbox.checked = imageData.isPublic || false;
        checkbox.setAttribute('data-action', 'toggle-public');
        checkbox.setAttribute('aria-label', 'Toggle public visibility');

        const label = this.uiConfig.createElement('label');

        label.textContent = 'Public';
        label.setAttribute('for', 'public-status-checkbox');

        toggle.appendChild(checkbox);
        toggle.appendChild(label);

        return toggle;
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
        if (!date) {
            return 'Unknown';
        }

        try {
            const dateObj = new Date(date);

            return `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString()}`;
        } catch (error) {
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


    /**
     * Create modern public status toggle
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Public status toggle element
     */
    createModernPublicToggle(imageData) {
        const toggle = this.uiConfig.createElement('div');

        toggle.className = 'info-box-public-toggle';

        const checkbox = this.uiConfig.createElement('input');

        checkbox.type = 'checkbox';
        checkbox.className = 'public-status-checkbox';
        checkbox.id = `public-toggle-${imageData.id}`;
        checkbox.checked = imageData.isPublic || false;
        checkbox.setAttribute('data-image-id', imageData.id);

        const label = this.uiConfig.createElement('label');

        label.className = 'public-status-label';
        label.htmlFor = `public-toggle-${imageData.id}`;
        label.textContent = 'Public';

        toggle.appendChild(checkbox);
        toggle.appendChild(label);

        return toggle;
    }
}

// ============================================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================================

// Make class available globally
window.FullscreenComponents = FullscreenComponents;
