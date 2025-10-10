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
        const container = this.createElement('div', config);

        container.className = 'info-box-container';

        const content = this.createElement('div', config);

        this.setupVerticalDragScroll(content);

        const thumbnail = this.createThumbnail(imageData, config);

        thumbnail.classList.add('info-box-thumbnail');

        content.className = config.contentClass;

        // Create metadata section
        const metadata = this.createMetadataSection(imageData, config);

        // Create prompts section
        const prompts = this.createPromptsSection(imageData, config);

        container.appendChild(metadata);
        container.appendChild(prompts);

        content.appendChild(thumbnail);
        content.appendChild(container);

        return content;
    }

    /**
     * Setup vertical drag scroll for both touch and mouse events
     * @param {HTMLElement} content - Content element to enable drag scrolling
     */
    setupVerticalDragScroll(content) {
        if (!content || !content.addEventListener) {
            console.warn('setupVerticalDragScroll: Invalid content element provided');

            return;
        }

        const dragConfig = this.createDragConfig(content);
        const handlers = this.createDragHandlers(content, dragConfig);

        this.attachDragListeners(content, handlers);
        this.setupDragCleanup(content, dragConfig, handlers);
    }

    /**
     * Create drag configuration object
     * @param {HTMLElement} content - Content element
     * @returns {Object} Drag configuration
     */
    createDragConfig(content) {
        return {
            dragging: false,
            startY: 0,
            startX: 0,
            lastY: 0,
            velocity: 0,
            lastTime: 0,
            momentumAnimationId: null,
            hasMoved: false,
            dragThreshold: 4,
            scrollMultiplier: 4,
            maxVelocity: 175,
            friction: 10,
            content
        };
    }

    /**
     * Create drag event handlers
     * @param {HTMLElement} content - Content element
     * @param {Object} config - Drag configuration
     * @returns {Object} Event handlers
     */
    createDragHandlers(content, config) {
        const isInteractiveElement = target => this.isInteractiveElement(target, content);
        const applyScroll = deltaY => this.applyScroll(deltaY, content, config.scrollMultiplier);
        const applyMomentum = () => {
            this.applyMomentum(config, applyScroll);
        };

        return {
            start: e => this.handleDragStart(e, content, config, isInteractiveElement),
            move: e => this.handleDragMove(e, content, config, applyScroll),
            stop: e => this.handleDragStop(e, content, config, applyMomentum)
        };
    }

    /**
     * Attach drag listeners to content
     * @param {HTMLElement} content - Content element
     * @param {Object} handlers - Event handlers
     */
    attachDragListeners(content, handlers) {
        content.addEventListener('touchstart', handlers.start, { passive: true });
        content.addEventListener('touchmove', handlers.move, { passive: false });
        content.addEventListener('touchend', handlers.stop, { passive: false });
        content.addEventListener('mousedown', handlers.start);
        content.addEventListener('mousemove', handlers.move);
        content.addEventListener('mouseup', handlers.stop);
        content.addEventListener('mouseleave', handlers.stop);
    }

    /**
     * Setup cleanup function for drag scroll
     * @param {HTMLElement} content - Content element
     * @param {Object} config - Drag configuration
     * @param {Object} handlers - Event handlers
     */
    setupDragCleanup(content, config, handlers) {
        content._dragScrollCleanup = () => {
            if (config.momentumAnimationId) {
                cancelAnimationFrame(config.momentumAnimationId);
            }
            content.removeEventListener('touchstart', handlers.start);
            content.removeEventListener('touchmove', handlers.move);
            content.removeEventListener('touchend', handlers.stop);
            content.removeEventListener('mousedown', handlers.start);
            content.removeEventListener('mousemove', handlers.move);
            content.removeEventListener('mouseup', handlers.stop);
            content.removeEventListener('mouseleave', handlers.stop);
            delete content._dragScrollCleanup;
        };
    }

    /**
     * Handle drag start event
     * @param {Event} e - Event object
     * @param {HTMLElement} content - Content element
     * @param {Object} config - Drag configuration
     * @param {Function} isInteractiveElement - Interactive element checker
     */
    handleDragStart(e, content, config, isInteractiveElement) {
        const { target } = e;

        if (isInteractiveElement(target)) {
            return;
        }

        if (config.momentumAnimationId) {
            cancelAnimationFrame(config.momentumAnimationId);
            config.momentumAnimationId = null;
        }

        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;

        config.startY = clientY;
        config.startX = clientX;
        config.lastY = clientY;
        config.lastTime = Date.now();
        config.velocity = 0;
        config.hasMoved = false;
        config.dragging = false;
    }

    /**
     * Handle drag move event
     * @param {Event} e - Event object
     * @param {HTMLElement} content - Content element
     * @param {Object} config - Drag configuration
     * @param {Function} applyScroll - Scroll function
     */
    handleDragMove(e, content, config, applyScroll) {
        if (!config.startY && !config.startX) {
            return;
        }

        const { clientY, deltaY, deltaX } = this.getDragCoordinates(e, config);

        this.checkDragStart(config, deltaY, deltaX, e);

        if (config.dragging) {
            this.processDragMovement(e, config, clientY, applyScroll);
        }
    }

    /**
     * Get drag coordinates from event
     * @param {Event} e - Event object
     * @param {Object} config - Drag configuration
     * @returns {Object} Coordinates and deltas
     */
    getDragCoordinates(e, config) {
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const deltaY = Math.abs(clientY - config.startY);
        const deltaX = Math.abs(clientX - config.startX);

        return { clientY, clientX, deltaY, deltaX };
    }

    /**
     * Check if drag should start
     * @param {Object} config - Drag configuration
     * @param {number} deltaY - Y delta
     * @param {number} deltaX - X delta
     * @param {Event} e - Event object
     */
    checkDragStart(config, deltaY, deltaX, e) {
        if (!config.dragging && deltaY > config.dragThreshold && deltaY > deltaX) {
            config.dragging = true;
            config.hasMoved = true;
            e.preventDefault();
        }
    }

    /**
     * Process drag movement
     * @param {Event} e - Event object
     * @param {Object} config - Drag configuration
     * @param {number} clientY - Y coordinate
     * @param {Function} applyScroll - Scroll function
     */
    processDragMovement(e, config, clientY, applyScroll) {
        const currentTime = Date.now();
        const timeDelta = currentTime - config.lastTime;

        if (timeDelta > 0) {
            const moveDelta = clientY - config.lastY;

            config.velocity = moveDelta / timeDelta;
            config.velocity = Math.max(-config.maxVelocity, Math.min(config.maxVelocity, config.velocity));
            applyScroll(moveDelta);
        }

        config.lastY = clientY;
        config.lastTime = currentTime;
        e.preventDefault();
    }

    /**
     * Handle drag stop event
     * @param {Event} e - Event object
     * @param {HTMLElement} content - Content element
     * @param {Object} config - Drag configuration
     * @param {Function} applyMomentum - Momentum function
     */
    handleDragStop(e, content, config, applyMomentum) {
        if (config.dragging && config.hasMoved) {
            e.preventDefault();
            if (Math.abs(config.velocity) > 0.5) {
                config.momentumAnimationId = requestAnimationFrame(applyMomentum);
            }
        }

        config.dragging = false;
        config.startY = 0;
        config.startX = 0;
        config.hasMoved = false;
    }

    /**
     * Handle touch start
     * @param {TouchEvent} e - Touch event
     */
    handleTouchStart(e) {
        e.preventDefault();
    }

    handleTouchMove(e) {
        e.preventDefault();
    }

    handleTouchEnd(e) {
        e.preventDefault();
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

        metadataItems.forEach(item => {
            if (item.value === '') {
                return;
            }

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

            return '';
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
        const charLimit = 60;

        if (config.titleSource === 'id') {
            return imageData.id || config.titleFallback;
        } else {
            // Use final prompt (first 30 characters) instead of title
            const finalPrompt = imageData.final ||
                               imageData.finalPrompt ||
                               imageData.enhancedPrompt ||
                               imageData.prompt;

            if (finalPrompt && finalPrompt.length > 0) {
                return finalPrompt.length > charLimit ? `${finalPrompt.substring(0, charLimit)}...` : finalPrompt;
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
        // Use centralized formatting if available
        if (window.ImageViewData?.formatUsername) {
            return window.ImageViewData.formatUsername(imageData);
        }

        // Fallback to local implementation
        let { username } = imageData;

        if (!username && imageData.userId) {
            username = 'User';
        } else if (!username) {
            username = 'Anonymous';
        }

        // Don't create links for Anonymous users
        if (username === 'Anonymous' || username === 'User') {
            return username;
        }

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
     * Check if currently in public view
     * @returns {boolean} Whether in public view
     */
    isCurrentlyInPublicView() {
        // Check if we're in public view by looking at the current filter
        if (window.feedManager && window.feedManager.tabService) {
            return window.feedManager.tabService.getCurrentFilter() === 'public';
        }

        // Fallback: check URL or other indicators
        return window.location.search.includes('filter=public') ||
               document.querySelector('.public-filter.active') !== null;
    }

    // Backward compatibility alias
    isCurrentlyInSiteView() {
        return this.isCurrentlyInPublicView();
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

    /**
     * Check if element is interactive for drag scroll
     * @param {HTMLElement} target - Target element
     * @param {HTMLElement} content - Content element
     * @returns {boolean} Is interactive
     */
    isInteractiveElement(target, content) {
        const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
        const interactiveRoles = ['button', 'link', 'tab', 'menuitem'];

        let element = target;

        while (element && element !== content) {
            if (interactiveTags.includes(element.tagName?.toLowerCase()) ||
                interactiveRoles.includes(element.getAttribute?.('role')) ||
                element.onclick ||
                element.getAttribute?.('onclick')) {
                return true;
            }

            element = element.parentElement;
        }

        return false;
    }

    /**
     * Apply scroll with multiplier
     * @param {number} deltaY - Y delta
     * @param {HTMLElement} content - Content element
     * @param {number} scrollMultiplier - Scroll speed multiplier
     */
    applyScroll(deltaY, content, scrollMultiplier) {
        const maxScroll = content.scrollHeight - content.clientHeight;
        const newScrollTop = content.scrollTop - (deltaY * scrollMultiplier);

        content.scrollTop = Math.max(0, Math.min(newScrollTop, maxScroll));
    }

    /**
     * Apply momentum scrolling
     * @param {Object} config - Drag configuration object
     * @param {Function} applyScroll - Scroll function
     */
    applyMomentum(config, applyScroll) {
        if (Math.abs(config.velocity) < 0.1) {
            config.momentumAnimationId = null;

            return;
        }

        applyScroll(config.velocity);
        config.velocity *= config.friction;
        config.momentumAnimationId = requestAnimationFrame(() => {
            this.applyMomentum(config, applyScroll);
        });
    }
}

// ============================================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================================

// Make class available globally
window.UnifiedInfoBox = UnifiedInfoBox;
