// Feed DOM Manager - Handles DOM manipulation for feed
class FeedDOMManager {
    constructor() {
        this.elements = {};
        this.overlayManager = window.OverlayManager ? new window.OverlayManager() : null;
    }

    // Initialize DOM elements
    init() {
        this.cacheElements();
    }

    // Cache frequently used DOM elements
    cacheElements() {
        this.elements = {
            promptOutput: document.querySelector(FEED_CONSTANTS.SELECTORS.PROMPT_OUTPUT),
            feedContainer: document.querySelector(FEED_CONSTANTS.SELECTORS.FEED_CONTAINER),
            ownerDropdown: document.querySelector(FEED_CONSTANTS.SELECTORS.OWNER_DROPDOWN),
            ownerButtons: document.querySelectorAll(FEED_CONSTANTS.SELECTORS.OWNER_BUTTONS), // Keep for backward compatibility
            siteButton: document.querySelector(FEED_CONSTANTS.SELECTORS.SITE_BUTTON), // Keep for backward compatibility
            userButton: document.querySelector(FEED_CONSTANTS.SELECTORS.USER_BUTTON), // Keep for backward compatibility
            loadingSpinner: document.querySelector(FEED_CONSTANTS.SELECTORS.LOADING_SPINNER),
            filterStats: document.querySelector(FEED_CONSTANTS.SELECTORS.FILTER_STATS)
        };
    }

    // Get cached element
    getElement(key) {
        return this.elements[key];
    }

    // Get all image wrappers
    getImageWrappers() {
        return document.querySelectorAll(FEED_CONSTANTS.SELECTORS.IMAGE_WRAPPERS);
    }

    // Get image wrappers by filter
    getImageWrappersByFilter(filter) {
        const wrappers = this.getImageWrappers();

        return Array.from(wrappers).filter(wrapper => wrapper.dataset.filter === filter
        );
    }

    // Add image to feed
    addImageToFeed(imageData, filter) {
        const promptOutput = this.getElement('promptOutput');

        if (!promptOutput) {
            console.error('❌ DOM MANAGER: promptOutput element not found');

            return false;
        }


        // Check if image already exists to prevent duplicates
        const existingWrapper = promptOutput.querySelector(`[data-image-id="${imageData.id}"]`);

        if (existingWrapper) {

            return false;
        }

        // Check if there's a loading placeholder to replace
        const loadingPlaceholder = promptOutput.querySelector('.loading-placeholder');

        if (loadingPlaceholder) {

            return this.replaceLoadingPlaceholder(loadingPlaceholder, imageData, filter);
        }

        // No loading placeholder, create new image wrapper and add to DOM
        const wrapper = this.createImageWrapper(imageData, filter);

        if (wrapper) {
            promptOutput.appendChild(wrapper);
        } else {
            console.error('❌ DOM MANAGER: createImageWrapper returned null/undefined');
        }

        // Ensure view is applied after adding image
        if (window.feedManager && window.feedManager.viewManager) {
            window.feedManager.viewManager.ensureViewApplied();
        }

        // Note: Caching is now handled by the unified navigation system
        // No need for separate cache management

        // Note: Auto download is NOT called here for existing images loaded from database
        // Auto download is only called from specific new generation paths

        return true;
    }

    // Create image wrapper
    createImageWrapper(imageData, filter) {
        const wrapper = document.createElement('div');

        wrapper.className = FEED_CONSTANTS.CLASSES.IMAGE_WRAPPER;
        wrapper.dataset.filter = filter;
        wrapper.dataset.imageId = imageData.id;
        wrapper.dataset.userId = imageData.userId || '';
        wrapper.dataset.isPublic = (imageData.isPublic || false).toString();
        wrapper.dataset.tags = imageData.tags ? JSON.stringify(imageData.tags) : '';
        wrapper.dataset.taggedAt = imageData.taggedAt || '';


        if (window.imageComponent) {
            const imageElement = window.imageComponent.createImageElement(imageData);

            if (imageElement) {
                wrapper.appendChild(imageElement);
            } else {
                console.error('❌ DOM MANAGER: createImageElement returned null');
            }

            // Note: Caching is now handled by the unified navigation system
            // No need for separate cache management
        } else {
            console.error('❌ DOM MANAGER: window.imageComponent does not exist!');
        }

        // Enhance wrapper with dual views if view manager is available
        if (window.feedManager && window.feedManager.viewManager) {
            window.feedManager.viewManager.enhanceNewImageWrapper(wrapper);
        } else {
            // Try to enhance later when FeedManager is available
            this.enhanceWrapperWhenReady(wrapper);
        }

        return wrapper;
    }

    enhanceWrapperWhenReady(wrapper, maxRetries = 10, retryDelay = 100) {
        let retries = 0;

        const tryEnhance = () => {
            if (window.feedManager && window.feedManager.viewManager) {
                window.feedManager.viewManager.enhanceNewImageWrapper(wrapper);

                return;
            }

            retries++;
            if (retries < maxRetries) {
                // Waiting for FeedManager/ViewManager
                setTimeout(tryEnhance, retryDelay);
            } else {
                console.warn('⚠️ DOM MANAGER: FeedManager/ViewManager not available after waiting, skipping enhancement');
            }
        };

        tryEnhance();
    }

    // Replace loading placeholder with actual image
    replaceLoadingPlaceholder(loadingPlaceholder, imageData, filter) {
        try {
            // The loadingPlaceholder itself is the wrapper (created by LoadingPlaceholderFactory)
            const loadingWrapper = loadingPlaceholder.classList.contains('image-wrapper') ?
                loadingPlaceholder :
                loadingPlaceholder.querySelector('.image-wrapper');

            if (!loadingWrapper) {
                console.error('❌ No loading wrapper found in placeholder');

                return false;
            }

            // Check if it has dual views
            const hasCompactView = loadingWrapper.querySelector('.compact-view');
            const hasListView = loadingWrapper.querySelector('.list-view');

            if (hasCompactView && hasListView) {
                // Replace dual view placeholder
                return this.replaceDualViewPlaceholder(loadingWrapper, imageData, filter);
            } else {
                // Replace simple placeholder
                return this.replaceSimplePlaceholder(loadingPlaceholder, imageData, filter);
            }
        } catch (error) {
            console.error('❌ Failed to replace loading placeholder:', error);

            return false;
        }
    }

    // Replace dual view placeholder
    replaceDualViewPlaceholder(loadingWrapper, imageData, filter) {

        // Get current view mode to determine what to create
        const currentView = window.feedManager?.viewManager?.currentView || 'compact';

        // Update wrapper data attributes first
        loadingWrapper.dataset.imageId = imageData.id;
        loadingWrapper.dataset.isPublic = (imageData.isPublic || false).toString();
        loadingWrapper.dataset.userId = imageData.userId || '';
        loadingWrapper.dataset.filter = filter;
        loadingWrapper.dataset.tags = imageData.tags ? JSON.stringify(imageData.tags) : '';
        loadingWrapper.dataset.taggedAt = imageData.taggedAt || '';

        // Clear existing content
        loadingWrapper.innerHTML = '';

        if (currentView === 'compact') {
            // COMPACT VIEW: Only create compact view with image, no metadata table

            const compactView = document.createElement('div');

            compactView.className = 'compact-view';
            compactView.style.cssText = 'width: 100%; height: 100%; position: relative; display: block;';

            const compactImg = document.createElement('img');

            compactImg.src = imageData.url;
            compactImg.alt = `Generated image: ${imageData.prompt} (${imageData.provider})`;
            compactImg.className = 'generated-image image-loaded';
            compactImg.id = `image-${imageData.id}`;
            compactImg.setAttribute('role', 'img');
            compactImg.setAttribute('tabindex', '0');
            compactImg.setAttribute('aria-label', imageData.prompt);

            // Set dataset attributes
            compactImg.dataset.id = imageData.id;
            compactImg.dataset.url = imageData.url || imageData.imageUrl;
            compactImg.dataset.rating = imageData.rating || '0';
            compactImg.dataset.provider = imageData.provider || 'unknown';
            compactImg.dataset.prompt = imageData.prompt || '';
            compactImg.dataset.original = imageData.original || '';
            compactImg.dataset.guidance = imageData.guidance || '';
            compactImg.dataset.isPublic = (imageData.isPublic || false).toString();
            compactImg.dataset.userId = imageData.userId || '';
            compactImg.dataset.username = imageData.username || '';
            compactImg.dataset.createdAt = imageData.createdAt || '';
            compactImg.dataset.tags = imageData.tags ? JSON.stringify(imageData.tags) : '';

            compactView.appendChild(compactImg);
            loadingWrapper.appendChild(compactView);

            // Set wrapper class for compact view
            loadingWrapper.classList.add('compact');
            loadingWrapper.classList.remove('list');

        } else {

            // Create compact view (hidden in list mode)
            const compactView = document.createElement('div');

            compactView.className = 'compact-view';
            compactView.style.cssText = 'width: 100%; height: 100%; position: relative; display: none;';

            const compactImg = document.createElement('img');

            compactImg.src = imageData.url;
            compactImg.alt = `Generated image: ${imageData.prompt} (${imageData.provider})`;
            compactImg.className = 'generated-image image-loaded';
            compactImg.id = `image-${imageData.id}`;
            compactImg.setAttribute('role', 'img');
            compactImg.setAttribute('tabindex', '0');
            compactImg.setAttribute('aria-label', imageData.prompt);

            // Set dataset attributes
            compactImg.dataset.id = imageData.id;
            compactImg.dataset.url = imageData.url || imageData.imageUrl;
            compactImg.dataset.rating = imageData.rating || '0';
            compactImg.dataset.provider = imageData.provider || 'unknown';
            compactImg.dataset.prompt = imageData.prompt || '';
            compactImg.dataset.original = imageData.original || '';
            compactImg.dataset.guidance = imageData.guidance || '';
            compactImg.dataset.isPublic = (imageData.isPublic || false).toString();
            compactImg.dataset.userId = imageData.userId || '';
            compactImg.dataset.username = imageData.username || '';
            compactImg.dataset.createdAt = imageData.createdAt || '';
            compactImg.dataset.tags = imageData.tags ? JSON.stringify(imageData.tags) : '';

            compactView.appendChild(compactImg);

            // Create list view (visible in list mode)
            const listView = document.createElement('div');

            listView.className = 'list-view';
            listView.style.cssText = 'display: flex; background: var(--color-surface-primary); border-color: var(--color-border-primary);';

            // Create list view thumbnail
            const listImageThumb = document.createElement('div');

            listImageThumb.className = 'list-image-thumb';
            const listThumbImg = document.createElement('img');

            listThumbImg.src = imageData.url;
            listThumbImg.alt = `Generated image: ${imageData.prompt} (${imageData.provider})`;

            // Set dataset attributes on list view image
            listThumbImg.dataset.id = imageData.id;
            listThumbImg.dataset.url = imageData.url || imageData.imageUrl;
            listThumbImg.dataset.rating = imageData.rating || '0';
            listThumbImg.dataset.provider = imageData.provider || 'unknown';
            listThumbImg.dataset.prompt = imageData.prompt || '';
            listThumbImg.dataset.original = imageData.original || '';
            listThumbImg.dataset.guidance = imageData.guidance || '';
            listThumbImg.dataset.isPublic = (imageData.isPublic || false).toString();
            listThumbImg.dataset.userId = imageData.userId || '';
            listThumbImg.dataset.username = imageData.username || '';
            listThumbImg.dataset.createdAt = imageData.createdAt || '';
            listThumbImg.dataset.tags = imageData.tags ? JSON.stringify(imageData.tags) : '';

            listImageThumb.appendChild(listThumbImg);

            // Create list view content
            const listContent = document.createElement('div');

            listContent.className = 'list-content';

            // Create header
            const listHeader = document.createElement('div');

            listHeader.className = 'list-header';
            const listTitle = document.createElement('h3');

            listTitle.className = 'list-title';
            listTitle.textContent = `Generated image: ${imageData.prompt} (${imageData.provider})`;
            listHeader.appendChild(listTitle);

            // Create prompt section
            const listPromptSection = document.createElement('div');

            listPromptSection.className = 'list-prompt-section';

            const originalLabel = document.createElement('span');

            originalLabel.className = 'list-prompt-label';
            originalLabel.style.cssText = 'color: rgb(156, 163, 175); font-size: 12px; font-weight: bold; margin-right: 8px; display: block; margin-bottom: 4px;';
            originalLabel.textContent = 'Original Prompt:';

            const originalText = document.createElement('div');

            originalText.className = 'list-prompt-text';
            originalText.style.cssText = 'color: rgb(209, 213, 219); font-size: 14px; margin-bottom: 8px; padding: 8px; background: rgba(55, 65, 81, 0.3); border-radius: 4px; border-left: 3px solid rgb(107, 114, 128);';
            originalText.textContent = imageData.original || imageData.prompt;

            const finalLabel = document.createElement('span');

            finalLabel.className = 'list-prompt-label';
            finalLabel.style.cssText = 'color: rgb(156, 163, 175); font-size: 12px; font-weight: bold; margin-right: 8px; display: block; margin-bottom: 4px;';
            finalLabel.textContent = 'Final Prompt:';

            const finalText = document.createElement('div');

            finalText.className = 'list-prompt-text';
            finalText.style.cssText = 'color: rgb(209, 213, 219); font-size: 14px; margin-bottom: 8px; padding: 8px; background: rgba(55, 65, 81, 0.3); border-radius: 4px; border-left: 3px solid rgb(16, 185, 129);';
            finalText.textContent = imageData.prompt;

            listPromptSection.appendChild(originalLabel);
            listPromptSection.appendChild(originalText);
            listPromptSection.appendChild(finalLabel);
            listPromptSection.appendChild(finalText);

            // Create metadata using the working method
            const listMetadata = document.createElement('div');

            listMetadata.className = 'list-metadata';

            // Use the working createListViewMetadata method
            if (window.ImageViewUtils && window.ImageViewUtils.createListViewMetadata) {
                window.ImageViewUtils.createListViewMetadata(imageData, listMetadata);
            } else {
                // Fallback if method not available
                console.warn('⚠️ ImageViewUtils.createListViewMetadata not available, using fallback');
            }

            // Create public checkbox container - ONLY if user owns the image
            const listPublicCheckboxContainer = document.createElement('div');

            listPublicCheckboxContainer.className = 'list-public-checkbox-container';
            listPublicCheckboxContainer.style.cssText = 'background: rgba(0, 0, 0, 0.7); padding: 4px 8px; border-radius: 12px; z-index: 10; pointer-events: auto;';

            // SECURITY: Check if user owns the image before showing interactive checkbox
            if (window.UnifiedAuthUtils && window.UnifiedAuthUtils.shouldShowPublicToggle(imageData)) {
                // User owns the image - show interactive checkbox
                const publicCheckbox = document.createElement('input');

                publicCheckbox.type = 'checkbox';
                publicCheckbox.className = 'public-status-checkbox';
                publicCheckbox.id = `public-toggle-list-${imageData.id}`;
                publicCheckbox.checked = imageData.isPublic || false;
                publicCheckbox.setAttribute('data-image-id', imageData.id);
                publicCheckbox.setAttribute('aria-label', 'Toggle public visibility');

                const publicLabel = document.createElement('label');

                publicLabel.className = 'public-status-label';
                publicLabel.setAttribute('for', `public-toggle-list-${imageData.id}`);
                publicLabel.style.cssText = 'color: white; font-size: 11px; font-weight: bold; margin-left: 4px; cursor: pointer;';
                publicLabel.textContent = 'Public';

                listPublicCheckboxContainer.appendChild(publicCheckbox);
                listPublicCheckboxContainer.appendChild(publicLabel);
            } else {
                // User doesn't own the image - show read-only status
                const publicDisplay = document.createElement('div');

                publicDisplay.className = 'list-public-display';
                publicDisplay.textContent = imageData.isPublic ? 'Public' : 'Private';
                publicDisplay.style.cssText = 'color: white; font-size: 11px; font-weight: bold;';

                listPublicCheckboxContainer.appendChild(publicDisplay);
            }

            // Assemble list content
            listContent.appendChild(listHeader);
            listContent.appendChild(listPromptSection);
            listContent.appendChild(listMetadata);
            listContent.appendChild(listPublicCheckboxContainer);

            // Assemble list view
            listView.appendChild(listImageThumb);
            listView.appendChild(listContent);

            // Assemble wrapper
            loadingWrapper.appendChild(compactView);
            loadingWrapper.appendChild(listView);

            // Set wrapper class for list view
            loadingWrapper.classList.add('list');
            loadingWrapper.classList.remove('compact');
        }

        // Remove loading classes and add loaded class
        loadingWrapper.classList.remove('loading', 'loading-placeholder');
        loadingWrapper.classList.add('loaded');

        // Ensure view is applied after replacing placeholder
        if (window.feedManager && window.feedManager.viewManager) {
            window.feedManager.viewManager.ensureViewApplied();
        }

        // Handle auto download for dual view placeholder replacement (this is always a new generation)
        this.handleAutoDownloadForFeed(imageData, true);

        return true;
    }

    // Fallback method for dual view placeholder replacement
    replaceDualViewPlaceholderFallback(loadingWrapper, imageData, filter) {

        // Get current view mode to determine what to update
        const currentView = window.feedManager?.viewManager?.currentView || 'compact';

        // Create the actual image element
        const img = document.createElement('img');

        img.src = imageData.url;
        img.alt = imageData.title || 'Generated Image';
        img.className = 'generated-image';

        // Set data attributes
        Object.keys(imageData).forEach(key => {
            if (imageData[key] !== null && imageData[key] !== undefined) {
                img.dataset[key] = imageData[key].toString();
            }
        });

        // Update wrapper data attributes
        loadingWrapper.dataset.imageId = imageData.id;
        loadingWrapper.dataset.isPublic = (imageData.isPublic || false).toString();
        loadingWrapper.dataset.userId = imageData.userId || '';
        loadingWrapper.dataset.filter = filter;

        if (currentView === 'compact') {

            const compactView = loadingWrapper.querySelector('.compact-view');

            if (compactView) {
                compactView.innerHTML = '';
                compactView.appendChild(img);
            }
        } else {

            // Find the compact view and replace its content
            const compactView = loadingWrapper.querySelector('.compact-view');

            if (compactView) {
                compactView.innerHTML = '';
                compactView.appendChild(img);
            }

            // Find the list view and update its complete content
            const listView = loadingWrapper.querySelector('.list-view');

            if (listView) {
                this.updateCompleteListViewContent(listView, imageData);
            }
        }

        // Remove loading class and add loaded class
        loadingWrapper.classList.remove('loading');
        loadingWrapper.classList.add('loaded');

        // Ensure the wrapper has the correct view class
        const promptOutput = loadingWrapper.closest('.prompt-output');

        if (promptOutput && window.feedManager && window.feedManager.viewManager) {
            const { viewManager } = window.feedManager;
            const { currentView } = viewManager;

            if (currentView === 'list') {
                loadingWrapper.classList.add('list');
                loadingWrapper.classList.remove('compact');
            } else if (currentView === 'compact') {
                loadingWrapper.classList.add('compact');
                loadingWrapper.classList.remove('list');
            }

            // Ensure view is applied after replacing placeholder
            window.feedManager.viewManager.ensureViewApplied();
        }

        return true;
    }

    // Replace simple placeholder
    replaceSimplePlaceholder(loadingPlaceholder, imageData, filter) {

        // Create new image wrapper
        const wrapper = this.createImageWrapper(imageData, filter);

        // Replace the loading placeholder
        const container = loadingPlaceholder.parentElement;

        if (container) {
            container.replaceChild(wrapper, loadingPlaceholder);
        }

        // Handle auto download for simple placeholder replacement (this is always a new generation)
        this.handleAutoDownloadForFeed(imageData, true);

        return true;
    }

    // Update complete list view content
    updateCompleteListViewContent(listView, imageData) {

        // Update thumbnail
        const thumbnailContainer = listView.querySelector('.list-image-thumb');

        if (thumbnailContainer) {
            thumbnailContainer.innerHTML = '';

            const thumbnailImg = document.createElement('img');

            thumbnailImg.src = imageData.url;
            thumbnailImg.alt = imageData.title || 'Generated Image';
            thumbnailImg.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 8px;
            `;

            thumbnailContainer.appendChild(thumbnailImg);
        } else {
            console.warn('⚠️ DOM MANAGER: No thumbnail container found');
        }

        // Update header title and remove loading indicator
        const titleElement = listView.querySelector('.list-title');

        if (titleElement) {
            titleElement.textContent = imageData.title || 'Generated Image';
        } else {
            console.warn('⚠️ DOM MANAGER: No title element found');
        }

        const loadingIndicator = listView.querySelector('.list-loading');

        if (loadingIndicator) {
            loadingIndicator.remove();
        }

        // Update prompt section with actual prompt data
        const promptSection = listView.querySelector('.list-prompt-section');

        if (promptSection) {
            window.ImageViewUtils.createListViewPromptSection(imageData, promptSection);
        } else {
            console.warn('⚠️ DOM MANAGER: No prompt section found');
        }

        // Update metadata with actual data
        const metadata = listView.querySelector('.list-metadata');

        if (metadata) {
            window.ImageViewUtils.createListViewMetadata(imageData, metadata);
        } else {
            console.warn('⚠️ DOM MANAGER: No metadata element found, creating new one...');
            // Create metadata element if it doesn't exist
            const contentArea = listView.querySelector('.list-content');

            if (contentArea) {
                const newMetadata = window.ImageViewUtils.createListViewMetadata(imageData);

                contentArea.appendChild(newMetadata);
            } else {
                console.error('❌ DOM MANAGER: No content area found to add metadata');
            }
        }

        // Ensure list view has proper height styling
        if (listView.style.minHeight === '') {
            listView.style.minHeight = '120px'; // Ensure minimum height
        }
    }


    // Show login prompt
    showLoginPrompt() {
        const promptOutput = this.getElement('promptOutput');

        if (!promptOutput) {
            return;
        }

        promptOutput.innerHTML = this.createLoginPromptHTML();
    }

    // Create login prompt HTML
    createLoginPromptHTML() {
        return `
            <div class="flex flex-col items-center justify-center p-8 text-center">
                <div class="text-gray-400 text-lg mb-4 mx-auto">
                    <i class="fas fa-lock text-2xl mb-2"></i>
                    <p>${FEED_CONSTANTS.MESSAGES.LOGIN_PROMPT}</p>
                </div>
                <div class="flex gap-4">
                    <a href="/login.html" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                        Login
                    </a>
                    <a href="/register.html" class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors">
                        Register
                    </a>
                </div>
            </div>
        `;
    }

    // Show loading state
    showLoading() {
        const loadingSpinner = this.getElement('loadingSpinner');

        if (loadingSpinner) {
            loadingSpinner.classList.remove(FEED_CONSTANTS.CLASSES.HIDDEN);
        }
    }

    // Hide loading state
    hideLoading() {
        const loadingSpinner = this.getElement('loadingSpinner');

        if (loadingSpinner) {
            loadingSpinner.classList.add(FEED_CONSTANTS.CLASSES.HIDDEN);
        }
    }

    // Show no images message
    showNoImagesMessage() {
        const promptOutput = this.getElement('promptOutput');

        if (!promptOutput) {
            return;
        }

        promptOutput.innerHTML = `
            <div class="flex flex-col items-center justify-center p-8 text-center">
                <div class="text-gray-400 text-lg">
                    <i class="fas fa-images text-2xl mb-2"></i>
                    <p>${FEED_CONSTANTS.MESSAGES.NO_IMAGES}</p>
                </div>
            </div>
        `;
    }

    // Show error message
    showErrorMessage(message = FEED_CONSTANTS.MESSAGES.ERROR_LOADING) {
        const promptOutput = this.getElement('promptOutput');

        if (!promptOutput) {
            return;
        }

        promptOutput.innerHTML = `
            <div class="flex flex-col items-center justify-center p-8 text-center">
                <div class="text-red-400 text-lg">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                    <p>${message}</p>
                </div>
            </div>
        `;
    }

    // Clear feed content
    clearFeedContent() {
        const promptOutput = this.getElement('promptOutput');

        if (promptOutput) {
            // Only clear if we're in a transition to prevent flash
            if (promptOutput.classList.contains(FEED_CONSTANTS.CLASSES.TRANSITIONING)) {
                promptOutput.innerHTML = '';
            } else {
                // If not transitioning, clear immediately (for initial load)
                promptOutput.innerHTML = '';
            }
            if (this.overlayManager) {
                this.overlayManager.showOverlay();
            }
        }
    }

    // Remove specific image from feed
    removeImageFromFeed(imageId) {
        const promptOutput = this.getElement('promptOutput');

        if (promptOutput) {
            const imageWrapper = promptOutput.querySelector(`[data-image-id="${imageId}"]`);

            if (imageWrapper) {
                imageWrapper.remove();

                return true;
            }
        }

        return false;
    }

    // Update filter button states
    updateFilterButtonStates(availableFilters) {
        const siteButton = this.getElement('siteButton');
        const userButton = this.getElement('userButton');

        if (siteButton) {
            siteButton.disabled = !availableFilters.includes(FEED_CONSTANTS.FILTERS.SITE);
        }

        if (userButton) {
            userButton.disabled = !availableFilters.includes(FEED_CONSTANTS.FILTERS.USER);
        }
    }

    // Set filter button as active
    setFilterButtonActive(filter) {
        const buttons = this.getElement('ownerButtons');

        buttons.forEach(button => {
            if (button.value === filter) {
                button.checked = true;
                button.classList.add(FEED_CONSTANTS.CLASSES.FILTER_ACTIVE);
            } else {
                button.classList.remove(FEED_CONSTANTS.CLASSES.FILTER_ACTIVE);
            }
        });
    }


    // Get scroll position
    getScrollPosition() {
        return window.scrollY;
    }

    // Set scroll position
    setScrollPosition(position) {
        window.scrollTo(0, position);
    }

    // Check if element is in viewport
    isElementInViewport(element) {
        const rect = element.getBoundingClientRect();

        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    // Get last image element
    getLastImageElement() {
        const wrappers = this.getImageWrappers();

        return wrappers.length > 0 ? wrappers[wrappers.length - 1] : null;
    }

    // Handle auto download for feed manager
    handleAutoDownloadForFeed(imageData, isNewGeneration = false) {
        // Only trigger auto download for new generations, not existing images loaded on page load
        if (!isNewGeneration) {
            return;
        }

        const autoDownload = document.querySelector('input[name="autoDownload"]:checked');

        if (autoDownload) {

            // Use a more reliable download method that should show Save As dialog
            this.downloadImageFile(imageData.url || imageData.imageUrl);
        }
    }

    // Improved download method that should show Save As dialog
    downloadImageFile(imageUrl) {
        try {
            // Method 1: Try fetch + blob download (most reliable for Save As dialog)
            this.downloadImageAsBlob(imageUrl);
        } catch (error) {
            console.error('❌ AUTO DOWNLOAD: Blob download failed, trying fallback:', error);

            // Method 2: Fallback to anchor download
            try {
                const a = document.createElement('a');
                const fileName = this.generateFileName(imageUrl);

                a.href = imageUrl;
                a.download = fileName;
                a.style.display = 'none';

                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

            } catch (fallbackError) {
                console.error('❌ AUTO DOWNLOAD: All download methods failed:', fallbackError);
            }
        }
    }

    // Download image as blob to force Save As dialog
    async downloadImageAsBlob(imageUrl) {
        try {

            // Fetch the image as a blob
            const response = await fetch(imageUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const fileName = this.generateFileName(imageUrl);

            // Create object URL and download
            const objectUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');

            a.href = objectUrl;
            a.download = fileName;
            a.style.display = 'none';

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Clean up object URL
            URL.revokeObjectURL(objectUrl);

        } catch (error) {
            console.error('❌ AUTO DOWNLOAD: Blob download failed:', error);
            throw error; // Re-throw to trigger fallback
        }
    }

    // Generate a proper filename for the download
    generateFileName(imageUrl) {
        try {
            const { pathname } = new URL(imageUrl);
            const fileName = pathname.split('/').pop();

            // If no filename or extension, generate one
            if (!fileName || !fileName.includes('.')) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

                return `generated-image-${timestamp}.jpg`;
            }

            return decodeURIComponent(fileName);
        } catch (error) {
            // Fallback filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            return `generated-image-${timestamp}.jpg`;
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedDOMManager = FeedDOMManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedDOMManager;
}

