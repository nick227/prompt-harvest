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
            console.log('🔄 DOM MANAGER: Image already exists, skipping duplicate:', imageData.id);

            return false;
        }

        // Check if there's a loading placeholder to replace
        const loadingPlaceholder = promptOutput.querySelector('.loading-placeholder');

        if (loadingPlaceholder) {
            console.log('🔄 Replacing loading placeholder with generated image');

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

        if (window.imageManager && window.imageManager.data) {
            const dataToCache = {
                ...imageData,
                element: wrapper
            };
        }

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

        // Create image element using image component
        if (window.imageComponent) {
            const imageElement = window.imageComponent.createImageElement(imageData);

            wrapper.appendChild(imageElement);

            // Cache the image data in the image manager
            if (window.imageManager && window.imageManager.data) {
                console.log('🔍 FEED CACHE DEBUG: Caching newly added image:', {
                    imageData,
                    isPublic: imageData.isPublic,
                    isPublicType: typeof imageData.isPublic
                });
                window.imageManager.data.cacheImage({
                    ...imageData,
                    element: wrapper
                });
            }
        } else {
            console.error('❌ DOM MANAGER: window.imageComponent does not exist!');
        }

        // Enhance wrapper with dual views if view manager is available
        if (window.feedManager && window.feedManager.viewManager) {
            console.log('🔄 DOM MANAGER: Enhancing new image wrapper with dual views');
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
                console.log('🔄 DOM MANAGER: Enhancing wrapper with dual views (delayed)');
                window.feedManager.viewManager.enhanceNewImageWrapper(wrapper);
                return;
            }

            retries++;
            if (retries < maxRetries) {
                console.log(`⏳ DOM MANAGER: Waiting for FeedManager/ViewManager (attempt ${retries}/${maxRetries})...`);
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
        console.log('🔄 MANUAL FIX: Replacing dual view loading placeholder with manual structure');

        // MANUAL APPROACH: Create the exact same structure as the working second image
        // Update wrapper data attributes first
            loadingWrapper.dataset.imageId = imageData.id;
            loadingWrapper.dataset.isPublic = (imageData.isPublic || false).toString();
            loadingWrapper.dataset.userId = imageData.userId || '';
            loadingWrapper.dataset.filter = filter;
        loadingWrapper.dataset.tags = imageData.tags ? JSON.stringify(imageData.tags) : '';
        loadingWrapper.dataset.taggedAt = imageData.taggedAt || '';

        // Clear existing content
        loadingWrapper.innerHTML = '';

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

        // Add all data attributes to compact image
        console.log('🔍 MANUAL FIX DEBUG: Setting dataset on compact image:', {
            imageData,
            isPublic: imageData.isPublic,
            isPublicType: typeof imageData.isPublic
        });

        // Set specific dataset attributes that the system expects
        compactImg.dataset.id = imageData.id;
        compactImg.dataset.url = imageData.url || imageData.imageUrl;
        compactImg.dataset.rating = imageData.rating || '0';
        compactImg.dataset.provider = imageData.provider || 'unknown';
        compactImg.dataset.prompt = imageData.prompt || '';
        compactImg.dataset.original = imageData.original || '';
        compactImg.dataset.guidance = imageData.guidance || '';
        compactImg.dataset.isPublic = (imageData.isPublic || false).toString();
        compactImg.dataset.userId = imageData.userId || '';

        console.log('🔍 MANUAL FIX DEBUG: Compact image dataset set:', {
            datasetId: compactImg.dataset.id,
            datasetIsPublic: compactImg.dataset.isPublic,
            datasetProvider: compactImg.dataset.provider,
            allDataset: compactImg.dataset
        });

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

        console.log('🔍 MANUAL FIX DEBUG: List view image dataset set:', {
            datasetId: listThumbImg.dataset.id,
            datasetIsPublic: listThumbImg.dataset.isPublic,
            datasetProvider: listThumbImg.dataset.provider,
            allDataset: listThumbImg.dataset
        });

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

        // Create public checkbox container
        const listPublicCheckboxContainer = document.createElement('div');
        listPublicCheckboxContainer.className = 'list-public-checkbox-container';
        listPublicCheckboxContainer.style.cssText = 'background: rgba(0, 0, 0, 0.7); padding: 4px 8px; border-radius: 12px; z-index: 10; pointer-events: auto;';

        const publicCheckbox = document.createElement('input');
        publicCheckbox.type = 'checkbox';
        publicCheckbox.className = 'public-status-checkbox';
        publicCheckbox.id = `public-toggle-list-${imageData.id}`;
        publicCheckbox.checked = imageData.isPublic || false;
        publicCheckbox.setAttribute('data-image-id', imageData.id);
        publicCheckbox.setAttribute('aria-label', 'Toggle public visibility');

        console.log('🔍 MANUAL CHECKBOX DEBUG: Setting manual checkbox state:', {
            imageData,
            isPublic: imageData.isPublic,
            isPublicType: typeof imageData.isPublic,
            checkboxChecked: publicCheckbox.checked
        });

        const publicLabel = document.createElement('label');
        publicLabel.className = 'public-status-label';
        publicLabel.setAttribute('for', `public-toggle-list-${imageData.id}`);
        publicLabel.style.cssText = 'color: white; font-size: 11px; font-weight: bold; margin-left: 4px; cursor: pointer;';
        publicLabel.textContent = 'Public';

        listPublicCheckboxContainer.appendChild(publicCheckbox);
        listPublicCheckboxContainer.appendChild(publicLabel);

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

        // Remove loading classes and add loaded class
        loadingWrapper.classList.remove('loading', 'loading-placeholder');
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

        console.log('✅ MANUAL FIX: Dual view loading placeholder replaced with manual structure');

        return true;
    }

    // Fallback method for dual view placeholder replacement
    replaceDualViewPlaceholderFallback(loadingWrapper, imageData, filter) {
        console.log('🔄 Using fallback dual view replacement method');

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

        console.log('✅ Dual view loading placeholder replaced using fallback method');

        return true;
    }

    // Replace simple placeholder
    replaceSimplePlaceholder(loadingPlaceholder, imageData, filter) {
        console.log('🔄 Replacing simple loading placeholder');

        // Create new image wrapper
        const wrapper = this.createImageWrapper(imageData, filter);

        // Replace the loading placeholder
        const container = loadingPlaceholder.parentElement;

        if (container) {
            container.replaceChild(wrapper, loadingPlaceholder);
        }

        console.log('✅ Simple loading placeholder replaced successfully');

        return true;
    }

    // Update complete list view content
    updateCompleteListViewContent(listView, imageData) {
        console.log('🔄 DOM MANAGER: Updating complete list view content for image:', imageData.id);

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
            console.log('✅ DOM MANAGER: Updated thumbnail');
        } else {
            console.warn('⚠️ DOM MANAGER: No thumbnail container found');
        }

        // Update header title and remove loading indicator
        const titleElement = listView.querySelector('.list-title');

        if (titleElement) {
            titleElement.textContent = imageData.title || 'Generated Image';
            console.log('✅ DOM MANAGER: Updated title');
        } else {
            console.warn('⚠️ DOM MANAGER: No title element found');
        }

        const loadingIndicator = listView.querySelector('.list-loading');

        if (loadingIndicator) {
            loadingIndicator.remove();
            console.log('✅ DOM MANAGER: Removed loading indicator');
        }

        // Update prompt section with actual prompt data
        const promptSection = listView.querySelector('.list-prompt-section');

        if (promptSection) {
            window.ImageViewUtils.createListViewPromptSection(imageData, promptSection);
            console.log('✅ DOM MANAGER: Updated prompt section');
        } else {
            console.warn('⚠️ DOM MANAGER: No prompt section found');
        }

        // Update metadata with actual data
        const metadata = listView.querySelector('.list-metadata');

        if (metadata) {
            console.log('✅ DOM MANAGER: Found existing metadata element, updating...');
            window.ImageViewUtils.createListViewMetadata(imageData, metadata);
            console.log('✅ DOM MANAGER: Updated metadata successfully');
        } else {
            console.warn('⚠️ DOM MANAGER: No metadata element found, creating new one...');
            // Create metadata element if it doesn't exist
            const contentArea = listView.querySelector('.list-content');
            if (contentArea) {
                const newMetadata = window.ImageViewUtils.createListViewMetadata(imageData);
                contentArea.appendChild(newMetadata);
                console.log('✅ DOM MANAGER: Created and added new metadata element');
            } else {
                console.error('❌ DOM MANAGER: No content area found to add metadata');
            }
        }

        // Ensure list view has proper height styling
        if (listView.style.minHeight === '') {
            listView.style.minHeight = '120px'; // Ensure minimum height
            console.log('✅ DOM MANAGER: Set minimum height for list view');
        }

        console.log('✅ DOM MANAGER: Complete list view content update finished');
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
                <div class="text-gray-400 text-lg mb-4">
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
            this.overlayManager.showOverlay();
        }
    }

    // Remove specific image from feed
    removeImageFromFeed(imageId) {
        const promptOutput = this.getElement('promptOutput');

        if (promptOutput) {
            const imageWrapper = promptOutput.querySelector(`[data-image-id="${imageId}"]`);

            if (imageWrapper) {
                imageWrapper.remove();
                console.log(`🗑️ Removed image ${imageId} from feed`);

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
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedDOMManager = FeedDOMManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedDOMManager;
}

