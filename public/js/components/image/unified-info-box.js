// ============================================================================
// UNIFIED INFO BOX COMPONENT
// ============================================================================

/**
 * UnifiedInfoBox - Unified implementation for image info boxes
 * Replaces duplicate implementations in legacy navigation systems
 * Supports both simple and modern configurations
 */
class UnifiedInfoBox {
    constructor(uiConfig = null) {
        this.uiConfig = uiConfig;
    }

    /**
     * Create info box with configurable behavior
     * @param {Object} imageData - Image data object
     * @param {Object} config - Configuration options
     * @returns {HTMLElement} Info box element
     */
    createInfoBox(imageData, config = {}) {
        // Default configuration
        const defaultConfig = {
            // Title configuration
            titleSource: 'title', // 'title' or 'id'
            titleElement: 'div', // 'div' or 'h3'
            titleFallback: 'Image Info',

            // Content configuration
            contentClass: 'info-box-content expanded', // 'expanded' or 'collapsed'

            // Element creation method
            useUIConfig: !!this.uiConfig,

            // CSS classes
            infoBoxClass: this.uiConfig ? this.uiConfig.getClasses().infoBox : 'info-box',
            headerClass: 'info-box-header',
            titleClass: 'info-box-title',
            toggleClass: 'info-box-toggle',

            // Toggle button configuration
            toggleText: '+',
            toggleAriaLabel: 'Toggle info box',
            addDataAction: false
        };

        // Merge with provided config
        const finalConfig = { ...defaultConfig, ...config };

        // Validate imageData
        if (!imageData) {
            throw new Error('ImageData is required');
        }

        // Create info box container
        const infoBox = this.createElement('div', finalConfig);

        infoBox.className = finalConfig.infoBoxClass;
        infoBox.setAttribute('role', 'complementary');
        infoBox.setAttribute('aria-label', 'Image information');

        // Create header
        const header = this.createHeader(imageData, finalConfig);

        infoBox.appendChild(header);

        // Create content
        const content = this.createContent(imageData, finalConfig);

        infoBox.appendChild(content);

        return infoBox;
    }

    /**
     * Create header element
     * @param {Object} imageData - Image data
     * @param {Object} config - Configuration
     * @returns {HTMLElement} Header element
     */
    createHeader(imageData, config) {
        const header = this.createElement('div', config);

        header.className = config.headerClass;

        // Create title
        const title = this.createElement(config.titleElement, config);

        title.className = config.titleClass;

        // Set title text based on configuration
        const titleText = this.getTitleText(imageData, config);

        title.textContent = titleText;

        // Create toggle button
        const toggle = this.createElement('button', config);

        toggle.className = config.toggleClass;
        toggle.textContent = config.toggleText;
        toggle.setAttribute('aria-label', config.toggleAriaLabel);

        if (config.addDataAction) {
            toggle.setAttribute('data-action', 'toggle-info');
        }

        // Add click event to toggle button
        toggle.addEventListener('click', e => {
            e.stopPropagation(); // Prevent header click from firing

            // Find the info box content
            const infoBox = toggle.closest('.info-box');

            if (infoBox) {
                const content = infoBox.querySelector('.info-box-content');

                if (content) {
                    // Toggle collapsed class
                    content.classList.toggle('collapsed');
                    content.classList.toggle('expanded');

                    // Update toggle button text
                    const isCollapsed = content.classList.contains('collapsed');

                    toggle.textContent = isCollapsed ? '+' : '−';

                    // Dispatch custom event for state persistence
                    const toggleEvent = new CustomEvent('infoBoxToggle', {
                        detail: { isExpanded: !isCollapsed }
                    });

                    window.dispatchEvent(toggleEvent);
                }
            }
        });

        header.appendChild(title);
        header.appendChild(toggle);

        // Add click event to header for toggling
        header.addEventListener('click', e => {
            // Don't toggle if clicking on the toggle button itself
            if (e.target === toggle || toggle.contains(e.target)) {
                return;
            }

            // Find the info box content
            const infoBox = header.closest('.info-box');

            if (infoBox) {
                const content = infoBox.querySelector('.info-box-content');

                if (content) {
                    // Toggle collapsed class
                    content.classList.toggle('collapsed');
                    content.classList.toggle('expanded');

                    // Update toggle button text
                    const isCollapsed = content.classList.contains('collapsed');

                    toggle.textContent = isCollapsed ? '+' : '−';
                }
            }
        });

        return header;
    }

    /**
     * Create content element
     * @param {Object} imageData - Image data
     * @param {Object} config - Configuration
     * @returns {HTMLElement} Content element
     */
    createContent(imageData, config) {
        const content = this.createElement('div', config);

        const thumbnail = this.createThumbnail(imageData, config);

        content.className = config.contentClass;

        // Create metadata section
        const metadata = this.createMetadataSection(imageData, config);

        content.appendChild(thumbnail);
        content.appendChild(metadata);

        // Create prompts section
        const prompts = this.createPromptsSection(imageData, config);

        content.appendChild(prompts);

        return content;
    }

    /**
     * Create thumbnail element
     * @param {Object} imageData - Image data
     * @param {Object} config - Configuration
     * @returns {HTMLElement} Thumbnail element
     */
    createThumbnail(imageData, config) {
        const thumbnail = this.createElement('div', config);

        thumbnail.className = 'info-box-thumbnail mb-2';

        const img = this.createElement('img', config);

        img.src = imageData.url;
        img.alt = imageData.title;

        thumbnail.appendChild(img);

        return thumbnail;
    }

    /**
     * Create metadata section
     * @param {Object} imageData - Image data
     * @param {Object} config - Configuration
     * @returns {HTMLElement} Metadata section
     */
    createMetadataSection(imageData, config) {
        const metadata = this.createElement('div', config);

        metadata.className = 'info-box-meta';

        // Create metadata items
        const metadataItems = [
            { label: 'Model', value: imageData.model || imageData.provider || 'Unknown' },
            { label: '', value: this.createPublicToggle(imageData, config) },
            { label: 'Rating', value: this.formatRating(imageData.rating) },
            { label: 'Created', value: this.formatCreatedBy(imageData) }
        ];

        // Add tags if available (FullscreenComponents only) - will be handled in prompts section for full width

        metadataItems.forEach(item => {
            const itemConfig = { ...config, imageData };
            const itemElement = this.createMetadataItem(item.label, item.value, itemConfig);

            metadata.appendChild(itemElement);
        });

        return metadata;
    }

    /**
     * Create metadata item
     * @param {string} label - Item label
     * @param {string|HTMLElement} value - Item value
     * @param {Object} config - Configuration
     * @returns {HTMLElement} Metadata item
     */
    createMetadataItem(label, value, config) {
        const item = this.createElement('div', config);

        item.className = 'info-box-meta-item';

        // Add special class for rating items
        if (label === 'Rating') {
            item.classList.add('rating-item');
        }

        const labelElement = this.createElement('div', config);

        labelElement.className = 'info-box-meta-label';
        labelElement.textContent = label;

        const valueElement = this.createElement('div', config);

        valueElement.className = 'info-box-meta-value';

        // Handle both string values and HTML elements
        if (typeof value === 'string') {
            valueElement.innerHTML = value;
        } else if (value instanceof HTMLElement) {
            valueElement.appendChild(value);
        } else {
            valueElement.innerHTML = String(value);
        }

        // Add rating buttons for rating items
        if (label === 'Rating' && config.imageData) {
            const ratingButtons = this.createRatingButtons(config.imageData);

            valueElement.appendChild(ratingButtons);
        }

        item.appendChild(labelElement);
        item.appendChild(valueElement);

        return item;
    }

    /**
     * Create prompts section
     * @param {Object} imageData - Image data
     * @param {Object} config - Configuration
     * @returns {HTMLElement} Prompts section
     */
    createPromptsSection(imageData, config) {
        const prompts = this.createElement('div', config);

        prompts.className = 'info-box-prompts';

        // Original prompt
        if (imageData.original) {
            const originalPrompt = this.createPromptItem('PROMPT', imageData.original, config);

            prompts.appendChild(originalPrompt);
        }

        // Final prompt (check both 'final' and 'prompt' properties)
        const finalPromptText = imageData.final || imageData.prompt;

        if (finalPromptText) {
            const finalPrompt = this.createPromptItem('FINAL', finalPromptText, config);

            prompts.appendChild(finalPrompt);
        }

        // Add tags as full-width item if available
        if (imageData.tags && Array.isArray(imageData.tags) && imageData.tags.length > 0) {
            const tagsItem = this.createPromptItem('TAGS', this.formatTags(imageData.tags), config);

            prompts.appendChild(tagsItem);
        }

        return prompts;
    }

    /**
     * Create prompt item
     * @param {string} label - Prompt label
     * @param {string} value - Prompt value
     * @param {Object} config - Configuration
     * @returns {HTMLElement} Prompt item
     */
    createPromptItem(label, value, config) {
        const item = this.createElement('div', config);

        item.className = 'info-box-prompt-item';

        const labelElement = this.createElement('div', config);

        labelElement.className = 'info-box-prompt-label';
        labelElement.textContent = label;

        const valueElement = this.createElement('div', config);

        valueElement.className = 'info-box-prompt-value';

        // Handle both string and DOM element values
        if (typeof value === 'string') {
            valueElement.textContent = value;
            valueElement.title = value; // Full text on hover
            valueElement.setAttribute('data-copy-text', value);
        } else if (value instanceof HTMLElement) {
            valueElement.appendChild(value);
        } else {
            valueElement.textContent = String(value);
        }

        item.appendChild(labelElement);
        item.appendChild(valueElement);

        return item;
    }

    /**
     * Create public toggle
     * @param {Object} imageData - Image data
     * @param {Object} config - Configuration
     * @returns {HTMLElement} Public toggle
     */
    createPublicToggle(imageData, config) {
        // Check if user should be able to see this toggle
        if (!this.shouldShowPublicToggle(imageData)) {
            // Return a read-only display instead of a toggle
            const display = this.createElement('div', config);

            display.className = 'info-box-public-display';
            display.textContent = imageData.isPublic ? 'Public' : 'Private';

            return display;
        }

        const toggle = this.createElement('div', config);

        toggle.className = 'info-box-public-toggle';

        const checkbox = this.createElement('input', config);

        checkbox.type = 'checkbox';
        checkbox.className = 'public-status-checkbox';
        checkbox.id = `public-toggle-${imageData.id}`;
        checkbox.checked = imageData.isPublic || false;
        // Setting fullscreen checkbox state
        checkbox.setAttribute('data-image-id', imageData.id);

        const label = this.createElement('label', config);

        label.className = 'public-status-label';
        label.htmlFor = `public-toggle-${imageData.id}`;
        label.textContent = 'Public';

        // Add event listener for checkbox changes
        checkbox.addEventListener('change', async () => {
            const imageId = checkbox.getAttribute('data-image-id');
            const newStatus = checkbox.checked;

            // Use unified public status service
            if (window.PublicStatusService) {
                const success = await window.PublicStatusService.updatePublicStatus(imageId, newStatus, {
                    updateDOM: true,
                    showNotifications: true,
                    updateCache: true
                });

                if (success && !newStatus && this.isCurrentlyInSiteView()) {
                    this.removeImageFromFeedIfAvailable(imageId);
                }
            } else {
                console.error('❌ PublicStatusService not available');
                // Show error notification
                if (window.notificationManager) {
                    window.notificationManager.error('Public status service not available');
                }
                // Revert checkbox state
                checkbox.checked = !newStatus;
            }
        });

        toggle.appendChild(checkbox);
        toggle.appendChild(label);

        return toggle;
    }

    /**
     * Check if user should be able to see the public toggle
     * @param {Object} imageData - Image data
     * @returns {boolean} Whether to show the toggle
     */
    shouldShowPublicToggle(imageData) {
        // Use centralized auth utils for consistency
        if (window.UnifiedAuthUtils) {
            return window.UnifiedAuthUtils.shouldShowPublicToggle(imageData);
        }

        // Fallback to existing AuthUtils if available
        if (window.AdminAuthUtils && window.AdminAuthUtils.hasValidToken) {
            // Use centralized auth system for ownership check
            const currentUserId = window.userSystem?.getCurrentUser()?.id;

            return currentUserId && imageData.userId === currentUserId;
        }

        // Final fallback to local implementation
        if (!imageData || !imageData.id) {
            return false;
        }

        // Check if user is authenticated
        if (!window.AdminAuthUtils?.hasValidToken()) {
            return false;
        }

        // Check if user owns the image
        const currentUserId = window.userSystem?.getCurrentUser()?.id;

        return currentUserId && imageData.userId === currentUserId;
    }

    /**
     * Get current user ID
     * @returns {string|null} Current user ID
     */
    getCurrentUserId() {
        // Try to get user ID from various sources
        if (window.userApi && window.userApi.getCurrentUser) {
            const user = window.userApi.getCurrentUser();

            return user?.id || user?._id;
        }

        // Fallback: try to get from localStorage or other sources
        try {
            const token = localStorage.getItem('authToken');

            if (token) {
                // Decode JWT token to get user ID (basic implementation)
                const payload = JSON.parse(atob(token.split('.')[1]));

                return payload.userId || payload.id;
            }
        } catch (error) {
            console.warn('Could not decode auth token:', error);
        }

        return null;
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Create element using appropriate method
     * @param {string} tagName - Element tag name
     * @param {Object} config - Configuration
     * @returns {HTMLElement} Created element
     */
    createElement(tagName, config) {
        if (config.useUIConfig && this.uiConfig) {
            return this.uiConfig.createElement(tagName);
        } else {
            return document.createElement(tagName);
        }
    }

    /**
     * Get title text based on configuration
     * @param {Object} imageData - Image data
     * @param {Object} config - Configuration
     * @returns {string} Title text
     */
    getTitleText(imageData, config) {
        if (config.titleSource === 'id') {
            return imageData.id || config.titleFallback;
        } else {
            // Use final prompt (first 30 characters) instead of title
            const finalPrompt = imageData.final ||
                               imageData.finalPrompt ||
                               imageData.enhancedPrompt ||
                               imageData.prompt;

            if (finalPrompt && finalPrompt.length > 0) {
                return finalPrompt.length > 30 ? `${finalPrompt.substring(0, 30)}...` : finalPrompt;
            }

            return imageData.title || config.titleFallback;
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

            if (isNaN(dateObj.getTime())) {
                return 'Invalid date';
            }

            return `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString()}`;
        } catch (error) {
            return 'Invalid date';
        }
    }

    /**
     * Format created by information (username and date) with profile link
     * @param {Object} imageData - Image data object
     * @returns {string} Formatted created by string with hyperlink
     */
    formatCreatedBy(imageData) {
        // Use username from server, fallback to appropriate message if not available
        const { username } = imageData;

        console.log('! imageData', imageData);

        const date = imageData.createdAt;

        // Create hyperlink for username
        const usernameLink = `<a href="/u/${encodeURIComponent(username)}" ` +
              `class="text-blue-400 hover:text-blue-300 underline transition-colors">${username}</a>`;

        return usernameLink;
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

        // Create clickable tag elements
        const tagsContainer = document.createElement('div');

        tagsContainer.className = 'info-box-tags-container';
        tagsContainer.style.display = 'flex';
        tagsContainer.style.flexWrap = 'wrap';
        tagsContainer.style.gap = '6px';

        tags.forEach(tag => {
            const tagElement = document.createElement('span');

            tagElement.className = 'info-box-tag-chip';
            tagElement.textContent = tag;
            tagElement.style.cssText = `
                display: inline-flex;
                align-items: center;
                background: rgba(59, 130, 246, 0.2);
                color: rgb(96, 165, 250);
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                border: 1px solid rgba(59, 130, 246, 0.3);
                white-space: nowrap;
                cursor: pointer;
                transition: all 0.2s ease;
                user-select: none;
            `;

            // Add active class if tag is currently active
            if (window.tagRouter && window.tagRouter.isTagActive(tag)) {
                tagElement.classList.add('tag-chip-active');
                tagElement.style.background = 'rgba(34, 197, 94, 0.3)';
                tagElement.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                tagElement.style.color = '#22c55e';
            }

            // Add hover effect
            tagElement.addEventListener('mouseenter', () => {
                if (!tagElement.classList.contains('tag-chip-active')) {
                    tagElement.style.background = 'rgba(59, 130, 246, 0.3)';
                    tagElement.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                }
            });

            tagElement.addEventListener('mouseleave', () => {
                if (!tagElement.classList.contains('tag-chip-active')) {
                    tagElement.style.background = 'rgba(59, 130, 246, 0.2)';
                    tagElement.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                }
            });

            // Add click handler to add tag
            tagElement.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();

                console.log(`🏷️ INFO BOX TAG CLICK: Adding tag: ${tag}`);

                // Add tag to active tags
                if (window.tagRouter && window.tagRouter.addTag) {
                    window.tagRouter.addTag(tag);
                } else {
                    // Fallback: update URL directly
                    const url = new URL(window.location);

                    url.searchParams.set('tag', tag);
                    window.location.href = url.toString();
                }
            });

            tagsContainer.appendChild(tagElement);
        });

        return tagsContainer;
    }

    /**
     * Create rating buttons for the rating display
     * @param {Object} imageData - Image data
     * @returns {HTMLElement} Rating buttons container
     */
    createRatingButtons(imageData) {
        if (!window.RatingButtons) {
            console.warn('RatingButtons component not available');

            return document.createElement('span');
        }

        const ratingButtons = new window.RatingButtons(imageData.id, imageData.rating);

        return ratingButtons.createRatingButtons();
    }

    /**
     * Check if currently in site view
     * @returns {boolean} Whether in site view
     */
    isCurrentlyInSiteView() {
        // Check if we're in site view by looking at the current filter
        if (window.feedManager && window.feedManager.tabService) {
            return window.feedManager.tabService.getCurrentFilter() === 'site';
        }

        // Fallback: check URL or other indicators
        return window.location.search.includes('filter=site') ||
               document.querySelector('.site-filter.active') !== null;
    }

    /**
     * Remove image from feed if available
     * @param {string} imageId - Image ID
     */
    removeImageFromFeedIfAvailable(imageId) {
        // Use ImageViewUtils method if available
        if (window.ImageViewUtils && window.ImageViewUtils.removeImageFromFeedIfAvailable) {
            window.ImageViewUtils.removeImageFromFeedIfAvailable(imageId);
        } else {
            // Fallback: remove from DOM directly
            const imageWrapper = document.querySelector(`[data-image-id="${imageId}"]`);

            if (imageWrapper) {
                imageWrapper.remove();
            }
        }
    }
}

// ============================================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================================

// Make class available globally
window.UnifiedInfoBox = UnifiedInfoBox;
