/**
 * Shared Image View Utilities
 * Common functionality for image view management across different managers
 *
 * NOTE: This file delegates to modular dependencies loaded from window scope.
 * Modular files must be loaded before this file (see index.html).
 */

class ImageViewUtils {
    // Delegate to modular auth functions (from global scope)
    static getAuthHeaders() {
        return window.ImageViewAuth?.getAuthHeaders() || { 'Content-Type': 'application/json' };
    }

    static isCurrentlyInSiteView() {
        return window.ImageViewAuth?.isCurrentlyInSiteView() || false;
    }

    static getCurrentUserId() {
        return window.ImageViewAuth?.getCurrentUserId() || null;
    }

    // Delegate to modular data functions
    static extractImageData(img, wrapper = null) {
        return window.ImageViewData?.extractImageData(img, wrapper) || {};
    }

    static formatUsername(imageData) {
        return window.ImageViewData?.formatUsername(imageData) || 'Anonymous';
    }

    static shouldShowPublicToggle(imageData) {
        return window.ImageViewData?.shouldShowPublicToggle(imageData) || false;
    }

    static _parseTagsFromDataset(tagsString) {
        return window.ImageViewData?.parseTagsFromDataset(tagsString) || [];
    }

    // Delegate to modular tags functions
    static createTagsContainer(tags) {
        return window.ImageViewTags?.createTagsContainer(tags) || document.createElement('div');
    }

    // Delegate to modular prompts functions
    static addPromptToSection(section, label, text, borderColor) {
        window.ImageViewPrompts?.addPromptToSection(section, label, text, borderColor);
    }

    static addFallbackPrompt(section) {
        window.ImageViewPrompts?.addFallbackPrompt(section);
    }

    // Delegate to modular public toggle functions
    static createPublicCheckbox(imageData, viewType = 'list') {
        return window.ImageViewPublicToggle?.createPublicCheckbox(imageData, viewType) || document.createElement('div');
    }

    static createListViewPublicCheckbox(imageData) {
        return window.ImageViewPublicToggle?.createListViewPublicCheckbox(imageData) || document.createElement('div');
    }

    static createCompactViewPublicCheckbox(imageData) {
        return window.ImageViewPublicToggle?.createCompactViewPublicCheckbox(imageData) || document.createElement('div');
    }

    static updateListViewCheckboxIfExists(imageId, isPublic) {
        window.ImageViewPublicToggle?.updateListViewCheckboxIfExists(imageId, isPublic);
    }

    static updateCompactViewCheckboxIfExists(imageId, isPublic) {
        window.ImageViewPublicToggle?.updateCompactViewCheckboxIfExists(imageId, isPublic);
    }

    static updateFullscreenCheckboxIfCurrent(imageId, isPublic) {
        window.ImageViewPublicToggle?.updateFullscreenCheckboxIfCurrent(imageId, isPublic);
    }

    // Delegate to modular DOM updates functions
    static updateImageInDOM(imageId, updates) {
        window.ImageViewDomUpdates?.updateImageInDOM(imageId, updates);
    }

    static applyViewToAllWrappers(container, viewType) {
        window.ImageViewDomUpdates?.applyViewToAllWrappers(container, viewType);
    }

    static updateWrapperView(wrapper, viewType) {
        window.ImageViewDomUpdates?.updateWrapperView(wrapper, viewType);
    }

    static updateImageInViews(wrapper, updates) {
        window.ImageViewDomUpdates?.updateImageInViews(wrapper, updates);
    }

    // Delegate to modular integration functions
    static removeImageFromFeedIfAvailable(imageId) {
        window.ImageViewIntegration?.removeImageFromFeedIfAvailable(imageId);
    }

    /**
     * Create list view content for an image
     * @param {HTMLElement} listView - List view container
     * @param {Object} imageData - Image data object
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
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Thumbnail element
     */
    static createListViewThumbnail(imageData) {
        const imageThumb = document.createElement('div');

        imageThumb.className = 'list-image-thumb';

        const img = document.createElement('img');

        // Handle multiple URL property variations from different API endpoints
        img.src = imageData.url || imageData.imageUrl || imageData.image || `uploads/${imageData.imageName || 'placeholder.png'}`;
        img.alt = imageData.title || 'Generated Image';
        img.loading = 'lazy';

        imageThumb.appendChild(img);

        return imageThumb;
    }

    /**
     * Create content area for list view
     * @param {Object} imageData - Image data object
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
     * @param {Object} imageData - Image data object
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
     * @param {Object} imageData - Image data object
     * @param {HTMLElement} [existingPromptSection] - Existing prompt section element to update (optional)
     * @returns {HTMLElement} Prompt section element
     */
    static createListViewPromptSection(imageData, existingPromptSection = null) {
        const promptSection = existingPromptSection || document.createElement('div');

        if (!existingPromptSection) {
            promptSection.className = 'list-prompt-section';
        } else {
            // Clear existing content when updating
            promptSection.innerHTML = '';
        }

        // Add original prompt if available
        if (imageData.original && imageData.original.trim()) {
            this.addPromptToSection(promptSection, 'Original Prompt:', imageData.original, '#6b7280');
        }

        // Add final prompt if available
        if (imageData.final && imageData.final.trim()) {
            this.addPromptToSection(promptSection, 'Final Prompt:', imageData.final, '#10b981');
        }

        // Fallback to main prompt if no original/final
        if ((!imageData.original || !imageData.original.trim()) &&
            (!imageData.final || !imageData.final.trim())) {
            this.addPromptToSection(promptSection, 'Prompt:', imageData.prompt || 'No prompt available', '#d1d5db');
        }

        return promptSection;
    }


    /**
     * Create or update list view metadata
     * @param {Object} imageData - Image data object
     * @param {HTMLElement} [existingMetadata] - Existing metadata element to update (optional)
     * @returns {HTMLElement} Metadata element
     */
    static createListViewMetadata(imageData, existingMetadata = null) {
        const metadata = existingMetadata || document.createElement('div');

        if (!existingMetadata) {
            metadata.className = 'list-metadata';
        } else {
            // Clear existing content when updating
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

            // Check if value contains HTML (like our username links)
            if (value.includes('<a ')) {
                valueElement.innerHTML = value;
            } else {
                valueElement.textContent = value;
            }

            row.appendChild(labelElement);
            row.appendChild(valueElement);

            return row;
        };

        // Add model row (provider)
        const modelRow = createMetadataRow('Model', imageData.provider || 'Unknown');

        metadata.appendChild(modelRow);

        // Add rating row
        const ratingRow = createMetadataRow('Rating', `★ ${imageData.rating || 0}`);

        metadata.appendChild(ratingRow);

        // Add creator row (username)
        const creatorRow = createMetadataRow('Creator', this.formatUsername(imageData));

        metadata.appendChild(creatorRow);

        // Add isPublic row - only for owner
        if (this.shouldShowPublicToggle(imageData)) {
            const publicRow = createMetadataRow('Visibility', imageData.isPublic ? 'Public' : 'Private');
            const publicValue = publicRow.querySelector('.metadata-value');

            publicValue.style.color = imageData.isPublic ? '#10b981' : '#f59e0b';
            metadata.appendChild(publicRow);
        }

        // Add tags if available
        if (imageData.tags && Array.isArray(imageData.tags) && imageData.tags.length > 0) {
            const tagsContainer = this.createTagsContainer(imageData.tags);

            metadata.appendChild(tagsContainer);
        }

        return metadata;
    }

    /**
     * Add click handler for list view
     * @param {HTMLElement} listView - List view element
     * @param {Object} _imageData - Image data object (unused - extracted dynamically)
     */
    static addListViewClickHandler(listView, _imageData) {
        const imageThumb = listView.querySelector('.list-image-thumb');

        if (!imageThumb) {
            console.warn('⚠️ LIST VIEW: No image thumbnail found for click handler');

            return;
        }

        imageThumb.addEventListener('click', event => this._handleListViewClick(event, imageThumb));
    }

    static _handleListViewClick(event, imageThumb) {
        if (this._isClickingOnCheckbox(event)) {
            return;
        }

        const imgElement = imageThumb.querySelector('img');

        if (!imgElement) {
            console.error('❌ LIST VIEW: No image element found in imageThumb');

            return;
        }

        const extractedData = this._extractDataFromClickedImage(imgElement);

        this._openFullscreenWithData(extractedData);
    }

    static _isClickingOnCheckbox(event) {
        return event.target.closest('.list-public-checkbox-container') ||
            event.target.closest('.public-status-checkbox') ||
            event.target.closest('.public-status-label');
    }

    static _extractDataFromClickedImage(imgElement) {
        const allImages = document.querySelectorAll('img[data-id]');
        const matchingImage = Array.from(allImages).find(img => img.src === imgElement.src);
        const sourceElement = imgElement.dataset.id ? imgElement : matchingImage || imgElement;

        if (window.imageManager?.data) {
            return window.imageManager.data.extractImageDataFromElement(sourceElement);
        }

        return this.extractImageData(sourceElement);
    }

    static _openFullscreenWithData(extractedData) {
        if (!extractedData) {
            console.error('❌ LIST VIEW: No data extracted');

                    return;
                }

        if (window.imageComponent?.openFullscreen) {
                        window.imageComponent.openFullscreen(extractedData);
        } else if (window.imageManager?.openFullscreen) {
                        window.imageManager.openFullscreen(extractedData);
        } else {
            console.error('❌ LIST VIEW: Cannot open fullscreen - no fullscreen methods available');
        }
    }

    /**
     * Enhance an image wrapper with dual views (compact and list)
     * @param {HTMLElement} wrapper - Wrapper element to enhance
     * @param {Object} imageData - Image data (optional, will be extracted if not provided)
     * @returns {boolean} Success status
     */
    static enhanceImageWrapper(wrapper, imageData = null) {
        try {
            // Check if already enhanced
            if (window.ViewRenderer) {
                const renderer = new window.ViewRenderer();

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

            // Use dynamic view creation if registry available
            if (window.ViewRegistry) {
                const views = window.ViewRegistry.getViewsByPriority();

                views.forEach(([viewType, _config]) => {
                    const viewElement = this.createViewElement(viewType, wrapper, extractedImageData);

                    if (viewElement) {
                        wrapper.appendChild(viewElement);
                    }
                });
            } else {
                // Fallback to dual views
                const compactView = this._createCompactView(wrapper);
                const listView = this._createListView(extractedImageData);

                wrapper.appendChild(compactView);
                wrapper.appendChild(listView);
            }

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
     * @param {Object} imageData - Image data
     * @returns {HTMLElement|null} View element or null
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

    static _createCompactView(wrapper) {
        const compactView = document.createElement('div');

        compactView.className = 'compact-view';
        compactView.style.cssText = 'width: 100%; height: 100%; position: relative;';

        while (wrapper.firstChild) {
            compactView.appendChild(wrapper.firstChild);
        }

        return compactView;
    }

    static _createListView(imageData) {
        const listView = document.createElement('div');

        listView.className = 'list-view';
        listView.style.display = 'none';

        listView.addEventListener('mouseenter', () => {
            listView.style.background = 'var(--color-surface-secondary)';
            listView.style.borderColor = 'var(--color-border-secondary)';
        });

        listView.addEventListener('mouseleave', () => {
            listView.style.background = 'var(--color-surface-primary)';
            listView.style.borderColor = 'var(--color-border-primary)';
        });

        try {
            this.createListViewContent(listView, imageData);
        } catch (error) {
            console.error('❌ VIEW UTILS: Failed to create list view content:', error);
            listView.innerHTML = this._getFallbackListContent(imageData);
        }

        return listView;
    }

    static _createFullView(imageData) {
        const fullView = document.createElement('div');

        fullView.className = 'full-view';
        fullView.style.display = 'none';

        // Full-width image display
        const imgSrc = imageData.url || imageData.imageUrl || imageData.image || `uploads/${imageData.imageName || 'placeholder.png'}`;

        fullView.innerHTML = `
            <div class="full-view-container" style="
                width: 100%;
                display: flex;
                flex-direction: column;
                gap: 16px;
                background: var(--color-surface-primary, #1a1a1a);
                border: 1px solid var(--color-border-primary, #333);
                border-radius: 8px;
                overflow: hidden;
            ">
                <div class="full-view-image-wrapper" style="
                    width: 100%;
                    aspect-ratio: 16/9;
                    position: relative;
                    background: #000;
                ">
                    <img src="${imgSrc}" 
                         alt="${imageData.title || 'Generated Image'}" 
                         loading="lazy"
                         style="
                            width: 100%;
                            height: 100%;
                            object-fit: contain;
                         ">
                </div>
                <div class="full-view-content" style="
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                ">
                    <h3 style="
                        margin: 0;
                        color: var(--color-text-primary, #fff);
                        font-size: 18px;
                        font-weight: 600;
                    ">${imageData.title || 'Generated Image'}</h3>
                    <div style="
                        color: var(--color-text-secondary, #ccc);
                        font-size: 14px;
                        line-height: 1.6;
                    ">${imageData.prompt || ''}</div>
                    <div class="full-view-metadata" style="
                        display: flex;
                        gap: 16px;
                        color: var(--color-text-tertiary, #999);
                        font-size: 13px;
                    ">
                        <span>Provider: ${imageData.provider || 'Unknown'}</span>
                        <span>Rating: ★ ${imageData.rating || 0}</span>
                        ${imageData.username ? `<span>By: ${imageData.username}</span>` : ''}
                    </div>
                </div>
            </div>
        `;

        // Add click handler for list view
        this.addListViewClickHandler(fullView, imageData);

        return fullView;
    }

    static _getFallbackListContent(imageData) {
        const containerStyle = 'display: flex; align-items: flex-start; gap: 16px; padding: 16px; ' +
            'background: var(--color-surface-primary); border: 1px solid var(--color-border-primary); ' +
            'border-radius: 8px;';
        const imgStyle = 'width: 100px; height: 100px; object-fit: cover; border-radius: 8px;';
        const titleStyle = 'margin: 0 0 8px 0; color: var(--color-text-primary); font-size: 16px;';
        const textStyle = 'margin: 0; color: var(--color-text-tertiary); font-size: 14px;';
        const ratingStyle = 'margin: 4px 0 0 0; color: var(--color-text-tertiary); font-size: 14px;';

        // Handle multiple URL property variations
        const imgSrc = imageData.url || imageData.imageUrl || imageData.image || `uploads/${imageData.imageName || 'placeholder.png'}`;

        return `
            <div style="${containerStyle}">
                <img src="${imgSrc}" alt="${imageData.title || 'Generated Image'}" style="${imgStyle}" loading="lazy">
                <div style="flex: 1;">
                    <h3 style="${titleStyle}">${imageData.title || 'Generated Image'}</h3>
                    <p style="${textStyle}">${imageData.provider || 'Unknown'}</p>
                    <p style="${ratingStyle}">Rating: ★ ${imageData.rating || 0}</p>
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
