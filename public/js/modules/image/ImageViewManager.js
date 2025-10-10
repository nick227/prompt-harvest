/**
 * ImageViewManager - Handles view management and placeholder replacement logic
 * Follows Single Responsibility Principle for view operations
 */
class ImageViewManager {
    constructor() {
        this.dualViewLoadingManager = window.dualViewLoadingManager;
        this.utils = window.ImageDOMUtils;
        this.viewUtils = window.ImageViewUtils;
    }

    /**
     * Replace loading placeholder with actual image
     * @param {HTMLElement} loadingPlaceholder - Loading placeholder element
     * @param {HTMLElement} listItem - New list item with image
     */
    replaceLoadingPlaceholder(loadingPlaceholder, newWrapper) {

        if (this.hasDualViews(loadingPlaceholder)) {
            this.replaceDualViewPlaceholder(loadingPlaceholder, newWrapper);
        } else {
            this.replaceSimplePlaceholder(loadingPlaceholder, newWrapper);
        }
    }

    /**
     * Check if loading wrapper has all required views
     * @param {HTMLElement} loadingWrapper - Loading wrapper element
     * @returns {boolean} True if has all views
     */
    hasAllViews(loadingWrapper) {
        if (!loadingWrapper) {
            return false;
        }

        if (window.ViewRenderer) {
            const renderer = new window.ViewRenderer();

            return renderer.hasAllViews(loadingWrapper);
        }

        // Fallback to dual views check
        return this.hasDualViews(loadingWrapper);
    }

    /**
     * @deprecated Use hasAllViews() instead
     * Check if loading wrapper has dual views
     * @param {HTMLElement} loadingWrapper - Loading wrapper element
     * @returns {boolean} True if has dual views
     */
    hasDualViews(loadingWrapper) {
        return loadingWrapper &&
               loadingWrapper.querySelector('.compact-view') &&
               loadingWrapper.querySelector('.list-view');
    }

    /**
     * Replace dual view placeholder
     * @param {HTMLElement} loadingWrapper - Loading wrapper element
     * @param {HTMLElement} listItem - New list item with image
     */
    replaceDualViewPlaceholder(loadingWrapper, newWrapper) {

        const container = loadingWrapper.parentElement;

        if (!container) {
            console.error('❌ No container found for replacement');

            return;
        }

        // Replace the entire placeholder with the new wrapper
        container.replaceChild(newWrapper, loadingWrapper);
    }


    /**
     * Update compact view with new image
     * @param {HTMLElement} compactView - Compact view element
     * @param {HTMLImageElement} newImg - New image element
     * @param {Object} imageData - Image data
     */
    updateCompactView(compactView, newImg, imageData) {
        compactView.innerHTML = '';
        compactView.appendChild(newImg.cloneNode(true));
        this.updateWrapperDataAttributes(compactView.parentElement, imageData);
    }

    /**
     * Update list view with new image and data
     * @param {HTMLElement} listView - List view element
     * @param {HTMLImageElement} newImg - New image element
     * @param {Object} imageData - Image data
     */
    updateListView(listView, newImg, imageData) {
        this.updateListViewThumbnail(listView, newImg);
        this.updateListViewHeader(listView, imageData);
        this.updateListViewPromptSection(listView, imageData);
        this.updateListViewMetadata(listView, imageData);
    }

    /**
     * Update list view thumbnail
     * @param {HTMLElement} listView - List view element
     * @param {HTMLImageElement} newImg - New image element
     */
    updateListViewThumbnail(listView, newImg) {
        const thumbnailContainer = listView.querySelector('.list-image-thumb');

        if (thumbnailContainer) {
            thumbnailContainer.innerHTML = '';

            const thumbnailImg = newImg.cloneNode(true);

            thumbnailImg.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 8px;
            `;
            thumbnailContainer.appendChild(thumbnailImg);
        }
    }

    /**
     * Update list view header
     * @param {HTMLElement} listView - List view element
     * @param {Object} imageData - Image data
     */
    updateListViewHeader(listView, imageData) {
        const titleElement = listView.querySelector('.list-title');

        if (titleElement) {
            titleElement.textContent = imageData.title || 'Generated Image';
        }

        const loadingIndicator = listView.querySelector('.list-loading');

        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }

    /**
     * Update list view prompt section
     * @param {HTMLElement} listView - List view element
     * @param {Object} imageData - Image data
     */
    updateListViewPromptSection(listView, imageData) {
        const promptSection = listView.querySelector('.list-prompt-section');

        if (promptSection && this.viewUtils?.createListViewPromptSection) {
            this.viewUtils.createListViewPromptSection(imageData, promptSection);
        }
    }

    /**
     * Update list view metadata
     * @param {HTMLElement} listView - List view element
     * @param {Object} imageData - Image data
     */
    updateListViewMetadata(listView, imageData) {
        const metadata = listView.querySelector('.list-metadata');

        if (metadata && this.viewUtils?.createListViewMetadata) {
            this.viewUtils.createListViewMetadata(imageData, metadata);
        }
    }

    /**
     * Replace simple placeholder
     * @param {HTMLElement} loadingPlaceholder - Loading placeholder element
     * @param {HTMLElement} listItem - New list item
     */
    replaceSimplePlaceholder(loadingPlaceholder, newWrapper) {
        const container = loadingPlaceholder.parentElement;


        if (container) {
            container.replaceChild(newWrapper, loadingPlaceholder);
        } else {
            console.error('❌ SIMPLE: No container found for replacement');
        }
    }

    /**
     * Insert image into container with proper structure
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data
     * @param {HTMLElement} container - Container element
     * @param {HTMLElement} loadingPlaceholder - Loading placeholder element
     */
    insertImageIntoContainer(img, imageData, container, loadingPlaceholder) {
        if (!this.utils) {
            console.error('❌ ImageDOMUtils not available, using fallback');
            this.insertImageFallback(img, imageData, container, loadingPlaceholder);

            return;
        }

        const wrapper = this.utils.createWrapperElement?.() || this.createFallbackWrapper();

        this.setupImageLazyLoading(img);
        this.assembleImageStructure(wrapper, img, null);

        if (loadingPlaceholder) {
            this.replaceLoadingPlaceholder(loadingPlaceholder, wrapper);
        } else {
            this.insertAtBeginning(wrapper, container);
        }

    }

    /**
     * Setup lazy loading for image
     * @param {HTMLImageElement} img - Image element
     */
    setupImageLazyLoading(img) {
        if (this.utils?.createIntersectionObserver) {
            this.utils.createIntersectionObserver(img, target => {
                target.classList.add('loaded');
            });
        }
    }

    /**
     * Assemble image structure
     * @param {HTMLElement} wrapper - Wrapper element
     * @param {HTMLImageElement} img - Image element
     * @param {HTMLElement} listItem - List item element (unused now)
     */
    assembleImageStructure(wrapper, img, _listItem) {
        wrapper.appendChild(img);
    }

    /**
     * Extract image data from element
     * @param {HTMLImageElement} img - Image element
     * @returns {Object} Extracted image data
     */
    extractImageDataFromElement(img) {
        // Generate title from first 8 characters of prompt
        const generateTitle = prompt => {
            if (!prompt) {
                return 'Generated Image';
            }

            return prompt.substring(0, 8);
        };

        const prompt = img.dataset.prompt || img.dataset.final || '';

        return {
            id: img.dataset.id || img.dataset.imageId || 'unknown',
            url: img.src,
            title: generateTitle(prompt),
            prompt,
            original: img.dataset.original || '',
            final: img.dataset.final || img.dataset.prompt || '',
            provider: img.dataset.provider || '',
            model: img.dataset.model || img.dataset.provider || 'unknown', // Use model field, fallback to provider
            guidance: img.dataset.guidance || '',
            rating: parseInt(img.dataset.rating) || 0,
            isPublic: img.dataset.isPublic === 'true' || false,
            userId: img.dataset.userId || null,
            username: img.dataset.username || null,
            createdAt: img.dataset.createdAt || null,
            tags: window.TagUtils ? window.TagUtils.parseTags(img.dataset.tags) : (img.dataset.tags ? JSON.parse(img.dataset.tags) : []) // ✅ Include tags with fallback
        };
    }

    /**
     * Update wrapper data attributes
     * @param {HTMLElement} wrapper - Wrapper element
     * @param {Object} imageData - Image data
     */
    updateWrapperDataAttributes(wrapper, imageData) {
        wrapper.dataset.imageId = imageData.id;
        wrapper.dataset.isPublic = imageData.isPublic.toString();
        wrapper.dataset.userId = imageData.userId || '';
        wrapper.dataset.provider = imageData.provider || '';
        wrapper.dataset.guidance = imageData.guidance || '';
        wrapper.dataset.rating = imageData.rating.toString();
    }

    /**
     * Toggle processing style on elements
     * @param {HTMLElement} element - Element to toggle (optional)
     */
    toggleProcessingStyle(element = null) {
        const currentPrompt = element || document.querySelector('.prompt-output li:first-child');

        if (currentPrompt) {
            currentPrompt.classList.toggle('processing');
        }
    }

    /**
     * Insert image fallback when utilities are not available
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data
     * @param {HTMLElement} container - Container element
     * @param {HTMLElement} loadingPlaceholder - Loading placeholder element
     * @private
     */
    insertImageFallback(img, imageData, container, loadingPlaceholder) {
        const wrapper = this.createFallbackListItem(imageData);

        wrapper.appendChild(img);

        if (loadingPlaceholder) {
            container.replaceChild(wrapper, loadingPlaceholder);
        } else {
            this.insertAtBeginning(wrapper, container);
        }
    }

    /**
     * Create fallback list item
     * @param {Object} imageData - Image data
     * @returns {HTMLElement} Fallback list item
     * @private
     */
    createFallbackListItem(imageData) {
        const wrapper = this.createFallbackWrapper();

        wrapper.dataset.imageId = imageData.id || 'unknown';
        wrapper.dataset.filter = 'user';
        wrapper.dataset.userId = imageData.userId || '';
        wrapper.dataset.isPublic = imageData.isPublic || 'false';

        return wrapper;
    }

    /**
     * Create fallback wrapper
     * @returns {HTMLElement} Fallback wrapper
     * @private
     */
    createFallbackWrapper() {
        const wrapper = document.createElement('div');

        wrapper.className = 'image-wrapper';

        return wrapper;
    }

    /**
     * Insert element at the beginning of container
     * @param {HTMLElement} element - Element to insert
     * @param {HTMLElement} container - Container element
     * @private
     */
    insertAtBeginning(element, container) {
        if (container.firstChild) {
            container.insertBefore(element, container.firstChild);
        } else {
            container.appendChild(element);
        }
    }
}

// Export for global access
window.ImageViewManager = ImageViewManager;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageViewManager;
}
