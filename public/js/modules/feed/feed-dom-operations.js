// Feed DOM Operations - Handles DOM element caching and basic operations
class FeedDOMOperations {
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
            ownerButtons: document.querySelectorAll(FEED_CONSTANTS.SELECTORS.OWNER_BUTTONS),
            siteButton: document.querySelector(FEED_CONSTANTS.SELECTORS.SITE_BUTTON),
            userButton: document.querySelector(FEED_CONSTANTS.SELECTORS.USER_BUTTON),
            loadingSpinner: document.querySelector(FEED_CONSTANTS.SELECTORS.LOADING_SPINNER),
            filterStats: document.querySelector(FEED_CONSTANTS.SELECTORS.FILTER_STATS)
        };

        // Validate critical elements
        if (!this.elements.promptOutput) {
            console.warn('⚠️ DOM OPERATIONS: Critical element promptOutput not found');
        }
    }

    // Get cached element
    getElement(key) {
        return this.elements[key];
    }

    // Refresh cached elements (useful if DOM changes)
    refreshCache() {
        this.cacheElements();
    }

    // Get all image wrappers
    getImageWrappers() {
        return document.querySelectorAll(FEED_CONSTANTS.SELECTORS.IMAGE_WRAPPERS);
    }

    // Get image wrappers by filter
    getImageWrappersByFilter(filter) {
        const wrappers = this.getImageWrappers();

        return Array.from(wrappers).filter(wrapper => wrapper.dataset.filter === filter);
    }

    // Clear feed content
    clearFeedContent() {
        const promptOutput = this.getElement('promptOutput');

        if (promptOutput) {
            promptOutput.innerHTML = '';

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

    // Get last image element (returns the actual image, not wrapper)
    getLastImageElement() {
        const wrappers = this.getImageWrappers();

        if (wrappers.length === 0) {
            return null;
        }

        // Get the last wrapper
        const lastWrapper = wrappers[wrappers.length - 1];

        // Return the actual image element inside the wrapper for IntersectionObserver
        const actualImage = lastWrapper.querySelector('.generated-image');

        return actualImage || lastWrapper; // Fallback to wrapper if no image found
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
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedDOMOperations = FeedDOMOperations;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedDOMOperations;
}
