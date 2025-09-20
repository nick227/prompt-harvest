// Feed DOM Manager - Handles DOM manipulation for feed
class FeedDOMManager {
    constructor() {
        this.elements = {};
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
            console.log('🔄 Image already exists, skipping duplicate');

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
        } else {
            console.error('❌ DOM MANAGER: window.imageComponent does not exist!');
        }

        // Enhance wrapper with dual views if view manager is available
        if (window.feedManager && window.feedManager.viewManager) {
            window.feedManager.viewManager.enhanceNewImageWrapper(wrapper);
        }

        return wrapper;
    }

    // Replace loading placeholder with actual image
    replaceLoadingPlaceholder(loadingPlaceholder, imageData, filter) {
        try {
            // Get the loading wrapper
            const loadingWrapper = loadingPlaceholder.querySelector('.image-wrapper');

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
        console.log('🔄 Replacing dual view loading placeholder');

        // Use centralized loading manager if available
        if (window.dualViewLoadingManager) {
            // Initialize loading state if not already done
            let loadingState = window.dualViewLoadingManager.getLoadingState(imageData.id);

            if (!loadingState) {
                loadingState = window.dualViewLoadingManager.initializeLoadingState(
                    imageData.id,
                    loadingWrapper,
                    { showSpinner: true, autoHide: true }
                );
            }

            // Replace the placeholder using the centralized manager
            window.dualViewLoadingManager.replaceLoadingPlaceholder(imageData.id, imageData);

            // Update wrapper data attributes
            loadingWrapper.dataset.imageId = imageData.id;
            loadingWrapper.dataset.isPublic = (imageData.isPublic || false).toString();
            loadingWrapper.dataset.userId = imageData.userId || '';
            loadingWrapper.dataset.filter = filter;

            console.log('✅ Dual view loading placeholder replaced using centralized manager');

            return true;
        }

        // Fallback to original method if centralized manager not available
        return this.replaceDualViewPlaceholderFallback(loadingWrapper, imageData, filter);
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
        }

        // Update header title and remove loading indicator
        const titleElement = listView.querySelector('.list-title');

        if (titleElement) {
            titleElement.textContent = imageData.title || 'Generated Image';
        }

        const loadingIndicator = listView.querySelector('.list-loading');

        if (loadingIndicator) {
            loadingIndicator.remove();
        }

        // Update prompt section with actual prompt data
        const promptSection = listView.querySelector('.list-prompt-section');

        if (promptSection) {
            window.ImageViewUtils.createListViewPromptSection(imageData, promptSection);
        }

        // Update metadata with actual data
        const metadata = listView.querySelector('.list-metadata');

        if (metadata) {
            window.ImageViewUtils.createListViewMetadata(imageData, metadata);
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

