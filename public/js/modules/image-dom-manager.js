/**
 * Image DOM Manager - Refactored to focus only on individual image DOM creation
 * Uses shared utilities for common functionality
 */

class ImageDOMManager {
    constructor() {
        this.config = IMAGE_CONFIG;
    }

    /**
     * Create image element with loading states and error handling
     * @param {Object} imageData - Image data object
     * @returns {HTMLImageElement} Created image element
     */
    createImageElement(imageData) {
        const img = window.ImageDOMUtils.createImageElement(imageData);

        // Add load/error handlers for graceful fallback
        img.onload = () => {
            img.classList.remove('image-loading');
            img.classList.add('image-loaded');
            window.ImageDOMUtils.removeLoadingSpinner(img);
            console.log('✅ Image loaded successfully:', img.src);
        };

        img.onerror = () => {
            console.log('❌ Image failed to load:', img.src);
            window.ImageDOMUtils.removeLoadingSpinner(img);
            window.ImageDOMUtils.createImagePlaceholder(img, imageData);
        };

        // Also handle the case where src is invalid from the start
        setTimeout(() => {
            if (img.complete && img.naturalWidth === 0) {
                console.log('❌ Image invalid from start:', img.src);
                window.ImageDOMUtils.removeLoadingSpinner(img);
                window.ImageDOMUtils.createImagePlaceholder(img, imageData);
            }
        }, 100);

        // Add initial loading state with spinner
        img.classList.add('image-loading');
        window.ImageDOMUtils.addLoadingSpinner(img);

        return img;
    }

    /**
     * Download an image
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data object
     */
    downloadImage(img, _imageData) {
        const a = document.createElement('a');
        const fileName = decodeURIComponent(img.src.split('/').pop());

        a.href = img.src;
        a.download = fileName;
        a.click();
    }

    /**
     * Add image to output (main entry point for new images)
     * @param {Object} imageData - Image data object
     * @param {boolean} download - Whether to auto-download
     * @returns {Object|null} Added image data or null
     */
    addImageToOutput(imageData, download = false) {
        console.log('🖼️ DOM INSERT: addImageToOutput called', { imageData, download });

        try {
            return this.processImageOutput(imageData, download);
        } catch (error) {
            console.error('❌ addImageToOutput failed:', error);

            return null;
        }
    }

    processImageOutput(imageData, download) {
        // Handle auto download first
        this.handleAutoDownload(null, imageData, download);

        // Use feed manager's rendering system for consistent card structure
        if (window.feedManager && window.feedManager.uiManager) {
            return this.addViaFeedManager(imageData);
        }

        // Fallback to simple method
        return this.addViaSimpleMethod(imageData);
    }

    addViaFeedManager(imageData) {
        console.log('🖼️ DOM INSERT: Using feed manager rendering system');

        // Normalize the image data to match feed format
        const normalizedImageData = window.ImageDOMUtils.normalizeImageData(imageData);

        // Get current filter
        const currentFilter = window.feedManager.filterManager?.getCurrentFilter() || 'site';

        // Use feed manager's addImageToFeed method
        const wasAdded = window.feedManager.uiManager.addImageToFeed(normalizedImageData, currentFilter);

        if (wasAdded) {
            console.log('✅ DOM INSERT: Image added via feed manager');

            return normalizedImageData;
        }

        console.log('⚠️ DOM INSERT: Feed manager failed to add image, falling back to simple method');

        return this.addViaSimpleMethod(imageData);
    }

    addViaSimpleMethod(imageData) {
        console.log('🖼️ DOM INSERT: Using fallback simple rendering');

        // Create the image element
        const img = this.createImageElement(imageData);

        console.log('🖼️ DOM INSERT: Image element created', !!img);

        // Find the container and loading placeholder
        const container = document.querySelector('.prompt-output');
        const loadingPlaceholder = document.querySelector('.loading-placeholder');

        if (container) {
            this.insertImageIntoContainer(img, imageData, container, loadingPlaceholder);
        } else {
            console.error('❌ Container .prompt-output not found');

            // Fallback: add to body
            document.body.appendChild(img);
        }

        return imageData;
    }

    insertImageIntoContainer(img, imageData, container, loadingPlaceholder) {
        // Create simple wrapper using shared utilities
        const listItem = window.ImageDOMUtils.createImageListItem(imageData);
        const wrapper = window.ImageDOMUtils.createWrapperElement();

        // Add intersection observer for lazy loading
        window.ImageDOMUtils.createIntersectionObserver(img, target => {
            target.classList.add('loaded');
        });

        wrapper.appendChild(img);
        listItem.appendChild(wrapper);

        // Replace loading placeholder if it exists, otherwise append to end
        if (loadingPlaceholder) {
            console.log('🔄 Replacing loading placeholder with generated image');

            this.replaceLoadingPlaceholder(loadingPlaceholder, listItem);
        } else {
            console.log('📝 No loading placeholder found, appending to end');

            container.appendChild(listItem);
        }

        console.log('✅ Image successfully inserted using replacement approach');
    }

    /**
     * Replace loading placeholder with actual image
     * @param {HTMLElement} loadingPlaceholder - Loading placeholder element
     * @param {HTMLElement} listItem - New list item with image
     */
    replaceLoadingPlaceholder(loadingPlaceholder, listItem) {
        // If the loading placeholder has dual views, we need to preserve the structure
        const loadingWrapper = loadingPlaceholder.querySelector('.image-wrapper');

        if (loadingWrapper && loadingWrapper.querySelector('.compact-view') && loadingWrapper.querySelector('.list-view')) {
            this.replaceDualViewPlaceholder(loadingWrapper, listItem);
        } else {
            this.replaceSimplePlaceholder(loadingPlaceholder, listItem);
        }
    }

    replaceDualViewPlaceholder(loadingWrapper, listItem) {
        console.log('🔄 Loading placeholder has dual views, preserving structure');

        // Replace the loading placeholder content with the new image
        // but keep the wrapper structure
        const newWrapper = listItem.querySelector('.image-wrapper');

        if (newWrapper) {
            // Copy the new image element to the existing wrapper
            const newImg = newWrapper.querySelector('img');

            if (newImg) {
                // Clear the existing content
                loadingWrapper.innerHTML = '';

                // Add the new image element
                loadingWrapper.appendChild(newImg);

                // Re-enhance the wrapper to get proper dual views
                if (window.feedManager && window.feedManager.viewManager) {
                    window.feedManager.viewManager.enhanceNewImageWrapper(loadingWrapper);
                }

                console.log('✅ Loading placeholder replaced with enhanced structure');
            }
        }
    }

    replaceSimplePlaceholder(loadingPlaceholder, listItem) {
        // Simple replacement for non-dual-view placeholders
        const container = loadingPlaceholder.parentElement;

        if (container) {
            container.replaceChild(listItem, loadingPlaceholder);
        }
    }

    /**
     * Handle auto download functionality
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data object
     * @param {boolean} download - Whether to download
     */
    handleAutoDownload(img, imageData, download) {
        const autoDownload = document.querySelector('input[name="autoDownload"]:checked');

        if (download && autoDownload) {
            this.downloadImage(img, imageData);
        }
    }

    /**
     * Create loading placeholder with dual views
     * @param {Object} promptObj - Prompt object
     * @returns {HTMLElement} Created loading placeholder
     */
    createLoadingPlaceholder(promptObj) {
        const li = Utils.dom.createElement('li', 'image-item loading-placeholder');
        const wrapper = Utils.dom.createElement('div', 'image-wrapper loading');

        this.setupWrapperAttributes(wrapper);
        this.createDualViews(wrapper, promptObj);
        this.setInitialView(wrapper);

        li.appendChild(wrapper);

        return li;
    }

    setupWrapperAttributes(wrapper) {
        // Set up wrapper with proper data attributes for filtering
        const currentUser = window.ImageDOMUtils.getCurrentUser();
        const userId = currentUser ? currentUser.id : 'unknown';
        const filterType = currentUser ? 'user' : 'site';

        wrapper.dataset.filter = filterType;
        wrapper.dataset.userId = userId;
        wrapper.dataset.isPublic = 'false';
        wrapper.dataset.imageId = `loading_${Date.now()}`;
    }

    createDualViews(wrapper, promptObj) {
        // Create dual view structure (compact and list)
        const compactView = Utils.dom.createElement('div', 'compact-view');
        const listView = Utils.dom.createElement('div', 'list-view');

        this.setupCompactView(compactView, promptObj);
        this.setupListView(listView, promptObj);

        // Add both views to wrapper
        wrapper.appendChild(compactView);
        wrapper.appendChild(listView);
    }

    setupCompactView(compactView, promptObj) {
        // Set up compact view (original loading placeholder)
        compactView.style.cssText = `
            width: 100%;
            height: 100%;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            background-color: #f5f5f5;
            border-radius: 3px;
            border: 2px dashed #ccc;
        `;

        const loadingContent = this.createCompactLoadingContent(promptObj);

        compactView.appendChild(loadingContent);
    }

    createCompactLoadingContent(promptObj) {
        const loadingContent = Utils.dom.createElement('div', 'loading-content');

        loadingContent.style.textAlign = 'center';
        loadingContent.style.color = '#666';

        this.addLoadingElements(loadingContent, promptObj);

        return loadingContent;
    }

    addLoadingElements(container, promptObj) {
        const spinner = Utils.dom.createElement('div', 'spinner');

        spinner.innerHTML = '⏳';
        spinner.style.fontSize = '24px';
        spinner.style.marginBottom = '8px';
        spinner.style.animation = 'spin 1s linear infinite';

        const text = Utils.dom.createElement('div', 'loading-text');

        text.textContent = 'Generating...';
        text.style.fontSize = '12px';
        text.style.fontWeight = 'bold';

        const promptPreview = Utils.dom.createElement('div', 'prompt-preview');

        promptPreview.textContent = promptObj.prompt.length > 30 ?
            `${promptObj.prompt.substring(0, 30)}...` :
            promptObj.prompt;
        promptPreview.style.fontSize = '10px';
        promptPreview.style.marginTop = '4px';
        promptPreview.style.color = '#999';

        container.appendChild(spinner);
        container.appendChild(text);
        container.appendChild(promptPreview);
    }

    setupListView(listView, promptObj) {
        // Set up list view (shows metadata while loading)
        listView.style.cssText = `
            display: flex;
            align-items: flex-start;
            gap: 16px;
            padding: 16px;
            background: rgba(31, 41, 55, 0.8);
            border: 1px solid rgba(75, 85, 99, 0.3);
            border-radius: 8px;
            transition: all 0.2s ease;
            min-height: 100px;
        `;

        // Create loading thumbnail placeholder
        const imageThumb = Utils.dom.createElement('div', 'list-image-thumb');

        imageThumb.style.cssText = `
            width: 100px;
            height: 100px;
            background: rgba(75, 85, 99, 0.5);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #9ca3af;
            font-size: 24px;
        `;
        imageThumb.innerHTML = '⏳';

        // Create content area with metadata
        const content = Utils.dom.createElement('div', 'list-content');

        content.style.flex = '1';

        this.createListViewContent(content, promptObj);

        // Assemble list view
        listView.appendChild(imageThumb);
        listView.appendChild(content);
    }

    createListViewContent(content, promptObj) {
        const header = this.createListViewHeader();
        const promptSection = this.createListViewPromptSection(promptObj);
        const metadata = this.createListViewMetadata(promptObj);

        // Assemble content
        content.appendChild(header);
        content.appendChild(promptSection);
        content.appendChild(metadata);
    }

    createListViewHeader() {
        // Header with title and loading indicator
        const header = Utils.dom.createElement('div', 'list-header');

        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        `;

        const title = Utils.dom.createElement('h3', 'list-title');

        title.textContent = 'Generating Image...';
        title.style.cssText = `
            margin: 0;
            color: #f9fafb;
            font-size: 16px;
        `;

        const loadingIndicator = Utils.dom.createElement('div', 'list-loading');

        loadingIndicator.innerHTML = '⏳';
        loadingIndicator.style.cssText = `
            color: #10b981;
            font-size: 16px;
            animation: spin 1s linear infinite;
        `;

        header.appendChild(title);
        header.appendChild(loadingIndicator);

        return header;
    }

    createListViewPromptSection(promptObj) {
        // Prompt section
        const promptSection = Utils.dom.createElement('div', 'list-prompt-section');

        promptSection.style.marginBottom = '8px';

        const promptLabel = Utils.dom.createElement('span', 'list-prompt-label');

        promptLabel.textContent = 'Prompt:';
        promptLabel.style.cssText = `
            color: #9ca3af;
            font-size: 12px;
            font-weight: bold;
            margin-right: 8px;
        `;

        const promptText = Utils.dom.createElement('div', 'list-prompt-text');

        promptText.textContent = promptObj.prompt || 'No prompt available';
        promptText.style.cssText = `
            color: #d1d5db;
            font-size: 14px;
            margin-top: 4px;
        `;

        promptSection.appendChild(promptLabel);
        promptSection.appendChild(promptText);

        return promptSection;
    }

    createListViewMetadata(promptObj) {
        // Metadata row
        const metadata = Utils.dom.createElement('div', 'list-metadata');

        metadata.style.cssText = `
            display: flex;
            gap: 16px;
            color: #9ca3af;
            font-size: 12px;
        `;

        const provider = Utils.dom.createElement('span');

        provider.textContent = `Provider: ${promptObj.providers?.[0] || 'Unknown'}`;

        const status = Utils.dom.createElement('span');

        status.textContent = 'Generating...';
        status.style.color = '#10b981';

        const date = Utils.dom.createElement('span');

        date.textContent = `Created: ${new Date().toLocaleDateString()}`;

        metadata.appendChild(provider);
        metadata.appendChild(status);
        metadata.appendChild(date);

        return metadata;
    }

    setInitialView(wrapper) {
        // Set initial visibility based on current view
        if (window.feedManager && window.feedManager.viewManager) {
            const currentView = window.feedManager.viewManager.currentView || 'compact';

            window.ImageViewUtils.updateWrapperView(wrapper, currentView);
        } else {
            // Default to compact view
            window.ImageViewUtils.updateWrapperView(wrapper, 'compact');
        }
    }

    /**
     * Show loading placeholder
     * @param {Object} promptObj - Prompt object
     * @returns {HTMLElement|null} Created loading placeholder or null
     */
    showLoadingPlaceholder(promptObj) {
        const container = document.querySelector('.prompt-output');

        if (container) {
            const loadingPlaceholder = this.createLoadingPlaceholder(promptObj);

            container.insertBefore(loadingPlaceholder, container.firstChild);

            return loadingPlaceholder;
        }

        return null;
    }

    /**
     * Remove loading placeholder
     */
    removeLoadingPlaceholder() {
        const loadingPlaceholder = document.querySelector('.loading-placeholder');

        if (loadingPlaceholder) {
            loadingPlaceholder.remove();
        }
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
}

// Export for global access
window.ImageDOMManager = ImageDOMManager;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageDOMManager;
}
