/**
 * Shared Image View Utilities
 * Common functionality for image view management across different managers
 *
 * @typedef {Object} ImageData
 * @property {string} id - Image identifier
 * @property {string} [url] - Image URL (primary)
 * @property {string} [imageUrl] - Image URL (alternate)
 * @property {string} [image] - Image URL (alternate)
 * @property {string} [imageName] - Image filename
 * @property {string} [title] - Image title
 * @property {string} [prompt] - Generation prompt
 * @property {string} [original] - Original prompt
 * @property {string} [final] - Final prompt
 * @property {string} [provider] - AI provider
 * @property {string} [model] - AI model
 * @property {string} [guidance] - Guidance value
 * @property {string|number} [steps] - Generation steps
 * @property {string|number} [seed] - Generation seed
 * @property {number} [rating] - Image rating (0-5)
 * @property {boolean} [isPublic] - Public visibility
 * @property {string} [userId] - Owner user ID
 * @property {string} [username] - Owner username
 * @property {string} [createdAt] - Creation timestamp
 * @property {Array<Object>|string} [tags] - Image tags
 */

class ImageViewUtils {
    /**
     * Get dependencies with fallbacks for testing
     * @private
     */
    static _deps() {
        return {
            ImageViewAuth: window.ImageViewAuth,
            ImageViewData: window.ImageViewData,
            ImageViewTags: window.ImageViewTags,
            ImageViewPrompts: window.ImageViewPrompts,
            ImageViewPublicToggle: window.ImageViewPublicToggle,
            ImageViewDomUpdates: window.ImageViewDomUpdates,
            ImageViewIntegration: window.ImageViewIntegration,
            ViewRegistry: window.ViewRegistry,
            ViewRenderer: window.ViewRenderer,
            TagUtils: window.TagUtils,
            imageManager: window.imageManager,
            imageComponent: window.imageComponent
        };
    }

    // ============================================================================
    // DEPENDENCY DELEGATES
    // ============================================================================

    static getAuthHeaders() {
        return this._deps().ImageViewAuth?.getAuthHeaders() || { 'Content-Type': 'application/json' };
    }

    static isCurrentlyInSiteView() {
        return this._deps().ImageViewAuth?.isCurrentlyInSiteView() || false;
    }

    static getCurrentUserId() {
        return this._deps().ImageViewAuth?.getCurrentUserId() || null;
    }

    static extractImageData(img, wrapper = null) {
        return this._deps().ImageViewData?.extractImageData(img, wrapper) || {};
    }

    /**
     * Format username for display
     * @param {ImageData} imageData - Image data
     * @returns {string|HTMLElement} Formatted username (may be text or DOM element with link)
     */
    static formatUsername(imageData) {
        const deps = this._deps();
        const formatted = deps.ImageViewData?.formatUsername(imageData);

        if (!formatted && imageData.username) {
            console.warn('⚠️ ImageViewData.formatUsername unavailable, falling back');

            return imageData.username; // Return plain string (textContent will escape)
        }

        return formatted || 'Anonymous';
    }

    static shouldShowPublicToggle(imageData) {
        const deps = this._deps();
        const result = deps.ImageViewData?.shouldShowPublicToggle(imageData);

        if (result === undefined) {
            console.warn('⚠️ ImageViewData.shouldShowPublicToggle unavailable');

            return false;
        }

        return result;
    }

    static createTagsContainer(tags) {
        return this._deps().ImageViewTags?.createTagsContainer(tags) || document.createElement('div');
    }

    static addPromptToSection(section, label, text, borderColor) {
        const deps = this._deps();

        if (deps.ImageViewPrompts?.addPromptToSection) {
            // Pass raw text - the module should handle escaping via textContent
            const safeText = typeof text === 'string' ? text : String(text);

            deps.ImageViewPrompts.addPromptToSection(section, label, safeText, borderColor);
        } else {
            console.warn('⚠️ ImageViewPrompts.addPromptToSection unavailable');
        }
    }

    static createPublicCheckbox(imageData, viewType = 'list') {
        return this._deps().ImageViewPublicToggle?.createPublicCheckbox(imageData, viewType) ||
               document.createElement('div');
    }

    static createListViewPublicCheckbox(imageData) {
        return this._deps().ImageViewPublicToggle?.createListViewPublicCheckbox(imageData) ||
               document.createElement('div');
    }

    static createCompactViewPublicCheckbox(imageData) {
        return this._deps().ImageViewPublicToggle?.createCompactViewPublicCheckbox(imageData) ||
               document.createElement('div');
    }

    /**
     * Single source of truth for syncing public state across all views
     * @param {string} imageId - Image ID
     * @param {boolean} isPublic - Public state
     */
    static syncPublicState(imageId, isPublic) {
        const deps = this._deps();

        // Update checkboxes in all views
        if (deps.ImageViewPublicToggle) {
            deps.ImageViewPublicToggle.updateListViewCheckboxIfExists?.(imageId, isPublic);
            deps.ImageViewPublicToggle.updateCompactViewCheckboxIfExists?.(imageId, isPublic);
            deps.ImageViewPublicToggle.updateFullscreenCheckboxIfCurrent?.(imageId, isPublic);
        } else {
            console.warn('⚠️ ImageViewPublicToggle unavailable for syncPublicState');
        }

        // Update DOM data attributes
        this.updateImageInDOM(imageId, { isPublic });
    }

    static updateImageInDOM(imageId, updates) {
        this._deps().ImageViewDomUpdates?.updateImageInDOM(imageId, updates);
    }

    static applyViewToAllWrappers(container, viewType) {
        this._deps().ImageViewDomUpdates?.applyViewToAllWrappers(container, viewType);
    }

    static updateWrapperView(wrapper, viewType) {
        this._deps().ImageViewDomUpdates?.updateWrapperView(wrapper, viewType);
    }

    static updateImageInViews(wrapper, updates) {
        this._deps().ImageViewDomUpdates?.updateImageInViews(wrapper, updates);
    }

    static removeImageFromFeedIfAvailable(imageId) {
        this._deps().ImageViewIntegration?.removeImageFromFeedIfAvailable(imageId);
    }

    // ============================================================================
    // CORE UTILITIES
    // ============================================================================

    /**
     * Resolve image URL from various property names
     * @param {ImageData} imageData - Image data object
     * @returns {string} Resolved image URL
     * @private
     */
    static _resolveImgSrc(imageData) {
        // Use custom placeholder or default
        const placeholderPath = window.IMAGE_PLACEHOLDER_PATH || 'uploads/placeholder.png';

        return imageData.url ||
               imageData.imageUrl ||
               imageData.image ||
               (imageData.imageName ? `uploads/${imageData.imageName}` : placeholderPath);
    }

    /**
     * Set dataset value with proper serialization
     * @param {HTMLElement} element - Target element
     * @param {string} key - Dataset key
     * @param {*} value - Value to set
     * @private
     */
    static _setData(element, key, value) {
        if (value === null || value === undefined) {
            return;
        }

        // Serialize booleans and numbers properly
        if (typeof value === 'boolean') {
            element.dataset[key] = value ? 'true' : 'false';
        } else if (typeof value === 'number') {
            element.dataset[key] = String(value);
        } else if (typeof value === 'object') {
            try {
                element.dataset[key] = JSON.stringify(value);
            } catch (err) {
                console.warn(`⚠️ Failed to serialize ${key} to dataset:`, err);
                element.dataset[key] = '[]'; // Fallback for large objects
            }
        } else {
            element.dataset[key] = String(value);
        }
    }

    /**
     * Get dataset value with proper deserialization
     * @param {HTMLElement} element - Source element
     * @param {string} key - Dataset key
     * @param {*} defaultValue - Default value
     * @returns {*} Parsed value
     * @private
     */
    static _getData(element, key, defaultValue = null) {
        const value = element.dataset[key];

        if (value === undefined) {
            return defaultValue;
        }

        // Parse booleans
        if (value === 'true') {
            return true;
        }
        if (value === 'false') {
            return false;
        }

        // Parse numbers (comprehensive: handles +/-/decimals/scientific notation)
        // Matches: 123, -123, +123, .5, 5., 5.5, 1.5e10, 2e-5, etc.
        if ((/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/).test(value)) {
            return parseFloat(value);
        }

        // Try parsing JSON
        if ((value.startsWith('{') && value.endsWith('}')) ||
            (value.startsWith('[') && value.endsWith(']'))) {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }

        return value;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     * @private
     */
    static _escapeHtml(str) {
        const div = document.createElement('div');

        div.textContent = str;

        return div.innerHTML;
    }

    /**
     * Normalize tags to consistent format
     * @param {Array|string} tags - Tags in various formats
     * @returns {Array} Normalized tags array
     * @private
     */
    static _normalizeTags(tags) {
        if (!tags) {
            return [];
        }
        if (Array.isArray(tags)) {
            return tags;
        }

        const deps = this._deps();

        if (typeof tags === 'string') {
            if (deps.TagUtils?.parseTags) {
                return deps.TagUtils.parseTags(tags);
            }

            try {
                return JSON.parse(tags);
            } catch {
                return [];
            }
        }

        return [];
    }

    /**
     * Stringify tags to consistent format
     * @param {Array} tags - Tags array
     * @returns {string} Stringified tags
     * @private
     */
    static _stringifyTags(tags) {
        if (!tags || !Array.isArray(tags)) {
            return '[]';
        }

        const deps = this._deps();

        return deps.TagUtils?.stringifyTags(tags) || JSON.stringify(tags);
    }

    /**
     * Format rating display
     * @param {number} rating - Rating value
     * @returns {string} Formatted rating
     * @private
     */
    static _formatRating(rating) {
        // Parse and clamp rating to 0-5 range
        let numRating = typeof rating === 'number' ? rating : parseFloat(rating) || 0;

        // Round to nearest integer and clamp to valid range
        numRating = Math.round(numRating);
        numRating = Math.max(0, Math.min(5, numRating));

        return `★ ${numRating}`;
    }

    // ============================================================================
    // LIST VIEW CREATION
    // ============================================================================

    /**
     * Create list view content for an image
     * @param {HTMLElement} listView - List view container
     * @param {ImageData} imageData - Image data object
     */
    static createListViewContent(listView, imageData) {
        const imageThumb = this.createListViewThumbnail(imageData);
        const content = this.createListViewContentArea(imageData);
        const publicCheckbox = this.createListViewPublicCheckbox(imageData);

        listView.appendChild(imageThumb);
        listView.appendChild(content);
        content.appendChild(publicCheckbox);

        this.addListViewClickHandler(listView, imageData);
    }

    /**
     * Create image thumbnail for list view
     * @param {ImageData} imageData - Image data object
     * @returns {HTMLElement} Thumbnail element
     */
    static createListViewThumbnail(imageData) {
        const imageThumb = document.createElement('div');

        imageThumb.className = 'list-image-thumb';

        // Make keyboard accessible
        imageThumb.setAttribute('role', 'button');
        imageThumb.setAttribute('tabindex', '0');
        imageThumb.setAttribute('aria-label', `View image: ${imageData.title || 'Generated Image'}`);

        const img = document.createElement('img');

        img.src = this._resolveImgSrc(imageData);
        img.alt = imageData.title || 'Generated Image';
        img.loading = 'lazy';

        // Set data attributes with proper serialization
        this._setData(img, 'id', imageData.id);
        this._setData(img, 'prompt', imageData.prompt);
        this._setData(img, 'original', imageData.original);
        this._setData(img, 'final', imageData.final);
        this._setData(img, 'provider', imageData.provider);
        this._setData(img, 'model', imageData.model);
        this._setData(img, 'guidance', imageData.guidance);
        this._setData(img, 'steps', imageData.steps);
        this._setData(img, 'seed', imageData.seed);
        this._setData(img, 'rating', imageData.rating ?? 0);
        this._setData(img, 'isPublic', imageData.isPublic ?? false);
        this._setData(img, 'userId', imageData.userId);
        this._setData(img, 'username', imageData.username);
        this._setData(img, 'createdAt', imageData.createdAt);

        if (imageData.tags) {
            this._setData(img, 'tags', this._stringifyTags(this._normalizeTags(imageData.tags)));
        }

        imageThumb.appendChild(img);

        return imageThumb;
    }

    /**
     * Create content area for list view
     * @param {ImageData} imageData - Image data object
     * @returns {HTMLElement} Content element
     */
    static createListViewContentArea(imageData) {
        const content = document.createElement('div');

        content.className = 'list-content';

        const header = this.createListViewHeader(imageData);
        const promptSection = this.createListViewPromptSection(imageData);
        const metadata = this.createListViewMetadata(imageData);

        content.appendChild(header);
        content.appendChild(promptSection);
        content.appendChild(metadata);

        return content;
    }

    /**
     * Create header for list view
     * @param {ImageData} imageData - Image data object
     * @returns {HTMLElement} Header element
     */
    static createListViewHeader(imageData) {
        const header = document.createElement('div');

        header.className = 'list-header';

        const title = document.createElement('h3');

        title.className = 'list-title';
        title.textContent = imageData.title || 'Generated Image';

        header.appendChild(title);

        return header;
    }

    /**
     * Create or update list view prompt section
     * @param {ImageData} imageData - Image data object
     * @param {HTMLElement} [existingPromptSection] - Existing prompt section element to update (optional)
     * @returns {HTMLElement} Prompt section element
     */
    static createListViewPromptSection(imageData, existingPromptSection = null) {
        const promptSection = existingPromptSection || document.createElement('div');

        if (!existingPromptSection) {
            promptSection.className = 'list-prompt-section';
        } else {
            promptSection.innerHTML = '';
        }

        // Ensure strings and guard against non-string types
        const original = imageData.original && typeof imageData.original === 'string'
            ? imageData.original.trim()
            : '';
        const final = imageData.final && typeof imageData.final === 'string'
            ? imageData.final.trim()
            : '';
        const prompt = imageData.prompt && typeof imageData.prompt === 'string'
            ? imageData.prompt
            : 'No prompt available';

        if (original) {
            this.addPromptToSection(promptSection, 'Original Prompt:', original, '#6b7280');
        }

        if (final) {
            this.addPromptToSection(promptSection, 'Final Prompt:', final, '#10b981');
        }

        // Fallback to main prompt if no original/final
        if (!original && !final) {
            this.addPromptToSection(promptSection, 'Prompt:', prompt, '#d1d5db');
        }

        return promptSection;
    }

    /**
     * Create or update list view metadata
     * @param {ImageData} imageData - Image data object
     * @param {HTMLElement} [existingMetadata] - Existing metadata element to update (optional)
     * @returns {HTMLElement} Metadata element
     */
    static createListViewMetadata(imageData, existingMetadata = null) {
        const metadata = existingMetadata || document.createElement('div');

        if (!existingMetadata) {
            metadata.className = 'list-metadata';
        } else {
            metadata.innerHTML = '';
        }

        // Create metadata rows for grid layout
        const createMetadataRow = (label, value, className = '') => {
            const row = document.createElement('div');

            row.className = `metadata-row ${className}`.trim();

            const labelElement = document.createElement('span');

            labelElement.className = 'metadata-label';
            labelElement.textContent = label;

            const valueElement = document.createElement('span');

            valueElement.className = 'metadata-value';

            // Always use safe node creation (no innerHTML)
            if (value instanceof HTMLElement) {
                valueElement.appendChild(value);
            } else {
                valueElement.textContent = String(value);
            }

            row.appendChild(labelElement);
            row.appendChild(valueElement);

            return row;
        };

        // Add model/provider row (use model if available, otherwise provider)
        const modelLabel = imageData.model ? 'Model' : 'Provider';
        const modelValue = imageData.model || imageData.provider || 'Unknown';

        metadata.appendChild(createMetadataRow(modelLabel, modelValue));

        // Add rating row with consistent formatting
        metadata.appendChild(createMetadataRow('Rating', this._formatRating(imageData.rating)));

        // Add creator row (username) - formatUsername returns safe HTML element or text
        const usernameValue = this.formatUsername(imageData);
        const usernameNode = typeof usernameValue === 'string'
            ? document.createTextNode(usernameValue)
            : usernameValue;

        metadata.appendChild(createMetadataRow('Creator', usernameNode));

        // Add visibility row - only for owner
        if (this.shouldShowPublicToggle(imageData)) {
            const publicRow = createMetadataRow('Visibility', imageData.isPublic ? 'Public' : 'Private');
            const publicValue = publicRow.querySelector('.metadata-value');

            publicValue.style.color = imageData.isPublic ? '#10b981' : '#f59e0b';
            metadata.appendChild(publicRow);
        }

        // Add tags if available
        const normalizedTags = this._normalizeTags(imageData.tags);

        if (normalizedTags.length > 0) {
            const tagsContainer = this.createTagsContainer(normalizedTags);

            metadata.appendChild(tagsContainer);
        }

        return metadata;
    }

    /**
     * Add click handler for list view
     * @param {HTMLElement} listView - List view element
     * @param {ImageData} _imageData - Image data object (unused - extracted dynamically)
     */
    static addListViewClickHandler(listView, _imageData) {
        if (!listView?.classList.contains('list-view')) {
            return;
        }

        const imageThumb = listView.querySelector('.list-image-thumb');

        if (!imageThumb) {
            if (listView.querySelector('.list-content')) {
                console.warn('⚠️ LIST VIEW: Fully created but missing thumbnail for click handler');
            }

            return;
        }

        // Robust duplicate prevention using WeakMap or unique property
        if (imageThumb._listClickBound) {
            return;
        }

        imageThumb._listClickBound = true;

        // Track mouse/touch position for drag detection
        let startX = 0;
        let startY = 0;
        let isDragging = false;

        // Mouse/touch start - record position
        const handleStart = event => {
            const clientX = event.touches ? event.touches[0].clientX : event.clientX;
            const clientY = event.touches ? event.touches[0].clientY : event.clientY;

            startX = clientX;
            startY = clientY;
            isDragging = false;
        };

        // Mouse/touch move - detect drag
        const handleMove = event => {
            const clientX = event.touches ? event.touches[0].clientX : event.clientX;
            const clientY = event.touches ? event.touches[0].clientY : event.clientY;
            const deltaX = Math.abs(clientX - startX);
            const deltaY = Math.abs(clientY - startY);

            // Consider it a drag if moved more than 5px in any direction
            if (deltaX > 5 || deltaY > 5) {
                isDragging = true;
            }
        };

        // Click handler - only open if not dragging
        const clickHandler = event => {
            if (isDragging) {
                // User was dragging, don't open fullscreen
                return;
            }

            this._handleListViewClick(event, imageThumb);
        };

        // Add drag detection listeners
        imageThumb.addEventListener('mousedown', handleStart, { passive: true });
        imageThumb.addEventListener('touchstart', handleStart, { passive: true });
        imageThumb.addEventListener('mousemove', handleMove, { passive: true });
        imageThumb.addEventListener('touchmove', handleMove, { passive: true });

        // Add click listener
        imageThumb.addEventListener('click', clickHandler, { passive: true });

        // Keyboard handler (needs preventDefault, so passive: false)
        const keydownHandler = event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                // Keyboard activation never counts as dragging
                this._handleListViewClick(event, imageThumb);
            }
        };

        imageThumb.addEventListener('keydown', keydownHandler, { passive: false });

        // Store handlers for potential cleanup
        imageThumb._handleStart = handleStart;
        imageThumb._handleMove = handleMove;
        imageThumb._clickHandler = clickHandler;
        imageThumb._keydownHandler = keydownHandler;
    }

    /**
     * Remove event listeners from list view thumbnail (cleanup/teardown)
     * @param {HTMLElement} imageThumb - Image thumbnail element
     */
    static removeListViewClickHandler(imageThumb) {
        if (!imageThumb || !imageThumb._listClickBound) {
            return;
        }

        // Remove drag detection handlers
        if (imageThumb._handleStart) {
            imageThumb.removeEventListener('mousedown', imageThumb._handleStart);
            imageThumb.removeEventListener('touchstart', imageThumb._handleStart);
            delete imageThumb._handleStart;
        }

        if (imageThumb._handleMove) {
            imageThumb.removeEventListener('mousemove', imageThumb._handleMove);
            imageThumb.removeEventListener('touchmove', imageThumb._handleMove);
            delete imageThumb._handleMove;
        }

        // Remove click handler
        if (imageThumb._clickHandler) {
            imageThumb.removeEventListener('click', imageThumb._clickHandler);
            delete imageThumb._clickHandler;
        }

        // Remove keyboard handler
        if (imageThumb._keydownHandler) {
            imageThumb.removeEventListener('keydown', imageThumb._keydownHandler);
            delete imageThumb._keydownHandler;
        }

        delete imageThumb._listClickBound;
    }

    /**
     * Handle list view click
     * @param {Event} event - Click event
     * @param {HTMLElement} imageThumb - Image thumbnail element
     * @private
     */
    static _handleListViewClick(event, imageThumb) {
        if (this._isClickingOnCheckbox(event)) {
            return;
        }

        const imgElement = imageThumb.querySelector('img');

        if (!imgElement) {
            console.error('❌ LIST VIEW: No image element found in imageThumb');

            return;
        }

        // Use stable identity (data-id) instead of src matching
        const imageId = this._getData(imgElement, 'id');

        if (!imageId) {
            console.warn('⚠️ LIST VIEW: No image ID found, falling back to data extraction');
        }

        const extractedData = this._extractDataFromClickedImage(imgElement, imageId);

        this._openFullscreenWithData(extractedData);
    }

    /**
     * Check if clicking on checkbox
     * @param {Event} event - Event object
     * @returns {boolean} True if clicking checkbox
     * @private
     */
    static _isClickingOnCheckbox(event) {
        return event.target.closest('.list-public-checkbox-container') ||
            event.target.closest('.public-status-checkbox') ||
            event.target.closest('.public-status-label');
    }

    /**
     * Extract data from clicked image with stable identity
     * @param {HTMLElement} imgElement - Image element
     * @param {string} imageId - Image ID
     * @returns {Object} Image data
     * @private
     */
    static _extractDataFromClickedImage(imgElement, imageId) {
        const deps = this._deps();

        // Prefer imageManager's data extraction
        if (deps.imageManager?.data) {
            return deps.imageManager.data.extractImageDataFromElement(imgElement);
        }

        // Fallback: if we have an ID, try to find the canonical element
        if (imageId) {
            try {
                // Use native CSS.escape for safe querySelector usage
                const escapedId = typeof CSS !== 'undefined' && CSS.escape
                    ? CSS.escape(imageId)
                    : imageId.replace(/[!"#$%&'()*+,.:/<=>?@[\\\]^`{|}~]/g, '\\$&');
                const canonicalImg = document.querySelector(`img[data-id="${escapedId}"]`);

                if (canonicalImg && canonicalImg !== imgElement) {
                    return this.extractImageData(canonicalImg);
                }
            } catch (err) {
                console.warn('⚠️ Invalid selector for imageId:', imageId, err);
            }
        }

        return this.extractImageData(imgElement);
    }

    /**
     * Open fullscreen with extracted data
     * @param {Object} extractedData - Extracted image data
     * @private
     */
    static _openFullscreenWithData(extractedData) {
        if (!extractedData) {
            console.error('❌ LIST VIEW: No data extracted');

            return;
        }

        const deps = this._deps();

        if (deps.imageComponent?.openFullscreen) {
            deps.imageComponent.openFullscreen(extractedData);
        } else if (deps.imageManager?.openFullscreen) {
            deps.imageManager.openFullscreen(extractedData);
        } else {
            console.error('❌ LIST VIEW: Cannot open fullscreen - no fullscreen methods available');
        }
    }

    // ============================================================================
    // VIEW MANAGEMENT
    // ============================================================================

    /**
     * Enhance an image wrapper with all views (compact, list, and full)
     * @param {HTMLElement} wrapper - Wrapper element to enhance
     * @param {ImageData} imageData - Image data (optional, will be extracted if not provided)
     * @returns {boolean} Success status
     */
    static enhanceImageWrapper(wrapper, imageData = null) {
        try {
            const deps = this._deps();

            // Check if already enhanced
            if (deps.ViewRenderer) {
                const renderer = new deps.ViewRenderer();

                if (renderer.hasAllViews(wrapper)) {
                    return true;
                }
            } else if (wrapper.querySelector('.compact-view') && wrapper.querySelector('.list-view')) {
                return true;
            }

            const img = wrapper.querySelector('img');

            if (!img) {
                console.warn('⚠️ VIEW UTILS: No img element found in wrapper:', wrapper);

                return false;
            }

            const extractedImageData = imageData || this.extractImageData(img, wrapper);

            // Use dynamic view creation with registry
            if (!deps.ViewRegistry) {
                console.error('❌ VIEW UTILS: ViewRegistry not available - cannot enhance wrapper');

                return false;
            }

            // Guard against missing or invalid getViewsByPriority
            if (typeof deps.ViewRegistry.getViewsByPriority !== 'function') {
                console.error('❌ VIEW UTILS: ViewRegistry.getViewsByPriority is not a function');

                return false;
            }

            const views = deps.ViewRegistry.getViewsByPriority();

            // Guard against non-iterable return value
            if (!views || typeof views[Symbol.iterator] !== 'function') {
                console.error('❌ VIEW UTILS: ViewRegistry.getViewsByPriority did not return iterable. Got:',
                    typeof views, views);

                return false;
            }

            views.forEach(([viewType, _config]) => {
                const viewElement = this.createViewElement(viewType, wrapper, extractedImageData);

                if (viewElement) {
                    wrapper.appendChild(viewElement);
                }
            });

            return true;
        } catch (error) {
            console.error('❌ VIEW UTILS: Failed to enhance image wrapper:', error);

            return false;
        }
    }

    /**
     * Create a specific view element
     * @param {string} viewType - View type (compact, list, full)
     * @param {HTMLElement} wrapper - Wrapper element
     * @param {ImageData} imageData - Image data
     * @returns {HTMLElement|null} View element or null (null if unknown type)
     */
    static createViewElement(viewType, wrapper, imageData) {
        switch (viewType) {
            case 'compact':
                return this._createCompactView(wrapper);
            case 'list':
                return this._createListView(imageData);
            case 'full':
                return this._createFullView(imageData);
            default:
                console.warn(`⚠️ Unknown view type: ${viewType}`);

                return null;
        }
    }

    /**
     * Create compact view
     * @param {HTMLElement} wrapper - Wrapper element
     * @returns {HTMLElement} Compact view element
     * @private
     */
    static _createCompactView(wrapper) {
        const compactView = document.createElement('div');

        compactView.className = 'compact-view';
        compactView.style.cssText = 'width: 100%; height: 100%; position: relative;';

        while (wrapper.firstChild) {
            compactView.appendChild(wrapper.firstChild);
        }

        return compactView;
    }

    /**
     * Create list view
     * @param {ImageData} imageData - Image data
     * @returns {HTMLElement} List view element
     * @private
     */
    static _createListView(imageData) {
        const listView = document.createElement('div');

        listView.className = 'list-view';
        listView.style.display = 'none';

        // Use CSS classes for hover instead of inline JS
        listView.classList.add('list-view-hoverable');

        try {
            this.createListViewContent(listView, imageData);
        } catch (error) {
            console.error('❌ VIEW UTILS: Failed to create list view content:', error);
            listView.innerHTML = this._getFallbackListContent(imageData);
        }

        return listView;
    }

    /**
     * Create full view
     * @param {ImageData} imageData - Image data
     * @returns {HTMLElement} Full view element
     * @private
     */
    static _createFullView(imageData) {
        const fullView = document.createElement('div');

        fullView.className = 'full-view';
        fullView.style.display = 'none';

        const imgSrc = this._resolveImgSrc(imageData);

        // Create container
        const container = document.createElement('div');

        container.className = 'full-view-container';

        // Create image wrapper
        const imageWrapper = document.createElement('div');

        imageWrapper.className = 'full-view-image-wrapper';

        const img = document.createElement('img');

        img.src = imgSrc;
        img.alt = imageData.title || 'Generated Image';
        img.loading = 'lazy';

        // Set data attributes with proper serialization
        this._setData(img, 'id', imageData.id);
        this._setData(img, 'imageId', imageData.id);
        this._setData(img, 'userId', imageData.userId);
        this._setData(img, 'prompt', imageData.prompt);
        this._setData(img, 'original', imageData.original);
        this._setData(img, 'final', imageData.final);
        this._setData(img, 'provider', imageData.provider);
        this._setData(img, 'model', imageData.model);
        this._setData(img, 'rating', imageData.rating ?? 0);
        this._setData(img, 'isPublic', imageData.isPublic ?? false);
        this._setData(img, 'title', imageData.title || 'Generated Image');

        if (imageData.tags) {
            this._setData(img, 'tags', this._stringifyTags(this._normalizeTags(imageData.tags)));
        }

        imageWrapper.appendChild(img);

        // Create content area
        const content = document.createElement('div');

        content.className = 'full-view-content';

        const title = document.createElement('h3');

        title.textContent = imageData.title || 'Generated Image';

        const promptDiv = document.createElement('div');

        promptDiv.className = 'full-view-prompt';
        promptDiv.textContent = imageData.prompt || '';

        const metadataDiv = document.createElement('div');

        metadataDiv.className = 'full-view-metadata';

        const providerSpan = document.createElement('span');

        providerSpan.textContent = `Provider: ${imageData.provider || 'Unknown'}`;

        const ratingSpan = document.createElement('span');

        ratingSpan.textContent = `Rating: ${this._formatRating(imageData.rating)}`;

        metadataDiv.appendChild(providerSpan);
        metadataDiv.appendChild(ratingSpan);

        if (imageData.username) {
            const usernameSpan = document.createElement('span');

            // textContent already escapes - no need for _escapeHtml
            usernameSpan.textContent = `By: ${imageData.username}`;
            metadataDiv.appendChild(usernameSpan);
        }

        content.appendChild(title);
        content.appendChild(promptDiv);
        content.appendChild(metadataDiv);

        // Add tags display if available
        const normalizedTags = this._normalizeTags(imageData.tags);

        if (normalizedTags.length > 0) {
            const tagsContainer = this.createTagsContainer(normalizedTags);

            tagsContainer.style.cssText = 'margin-top: 0.5rem;';
            content.appendChild(tagsContainer);
        }

        // Add public/private toggle if user owns the image
        const publicCheckbox = this.createPublicCheckbox(imageData, 'full');

        if (publicCheckbox) {
            content.appendChild(publicCheckbox);
        }

        container.appendChild(imageWrapper);
        container.appendChild(content);
        fullView.appendChild(container);

        return fullView;
    }

    /**
     * Get fallback list content when normal rendering fails
     * @param {ImageData} imageData - Image data
     * @returns {string} HTML string (safe - all user content escaped)
     * @private
     */
    static _getFallbackListContent(imageData) {
        const imgSrc = this._escapeHtml(this._resolveImgSrc(imageData));
        const title = this._escapeHtml(imageData.title || 'Generated Image');
        const provider = this._escapeHtml(imageData.provider || 'Unknown');
        const rating = this._formatRating(imageData.rating);

        // Use classes instead of inline styles for better theming
        return `
            <div class="list-view-fallback">
                <img src="${imgSrc}" alt="${title}" loading="lazy">
                <div class="list-view-fallback-content">
                    <h3>${title}</h3>
                    <p class="provider">${provider}</p>
                    <p class="rating">Rating: ${rating}</p>
                </div>
            </div>
        `;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.ImageViewUtils = ImageViewUtils;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageViewUtils;
}
