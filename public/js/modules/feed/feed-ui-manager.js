// Feed UI Manager - Handles UI state and interactions
class FeedUIManager {
    constructor(domManager) {
        this.domManager = domManager;
        this.isLoading = false;
        this.isSetupComplete = false;
        this.intersectionObserver = null;
        this.lastImageElement = null;
    }

    // Initialize UI manager
    init() {
        this.setupIntersectionObserver();
        this.isSetupComplete = true;
    }

    // Setup intersection observer for infinite scroll
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver(
                entries => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            this.handleLastImageVisible();
                        }
                    });
                },
                {
                    rootMargin: '100px'
                }
            );
        }
    }

    // Handle when last image becomes visible
    handleLastImageVisible() {
        if (this.isLoading) {

            return;
        }

        const lastImage = this.domManager.getLastImageElement();

        if (lastImage) {
            // Check if this is the first time we're seeing this image or if it's different
            const isFirstTime = !this.lastImageElement;
            const isDifferentImage = lastImage !== this.lastImageElement;

            if (isFirstTime || isDifferentImage) {
                this.lastImageElement = lastImage;

                // Dispatch event for infinite scroll
                const event = new CustomEvent('lastImageVisible', {
                    detail: { element: lastImage }
                });

                window.dispatchEvent(event);
            }
        }
    }

    // Set loading state
    setLoading(loading) {
        this.isLoading = loading;

        if (loading) {
            this.domManager.showLoading();
        } else {
            this.domManager.hideLoading();
        }
    }

    // Get loading state
    getLoading() {
        return this.isLoading;
    }

    // Show loading spinner
    showLoading() {
        this.setLoading(true);
    }

    // Hide loading spinner
    hideLoading() {
        this.setLoading(false);
    }

    // Show login prompt
    showLoginPrompt() {
        this.domManager.showLoginPrompt();
    }

    // Show no images message
    showNoImagesMessage() {
        this.domManager.showNoImagesMessage();
    }

    // Start smooth transition
    async startSmoothTransition() {
        const promptOutput = this.domManager.getElement('promptOutput');

        if (!promptOutput) {
            return;
        }

        // Add transitioning class to prevent content flashing
        promptOutput.classList.add(FEED_CONSTANTS.CLASSES.TRANSITIONING);

        // Start fade out
        promptOutput.classList.add(FEED_CONSTANTS.CLASSES.FADE_OUT);

        // Wait for fade out to complete
        await this.waitForTransition(FEED_CONSTANTS.TRANSITIONS.FADE_OUT_DURATION);

        return promptOutput;
    }

    // Complete smooth transition
    async completeSmoothTransition(promptOutput) {
        if (!promptOutput) {
            return;
        }

        // Remove fade out and add fade in
        promptOutput.classList.remove(FEED_CONSTANTS.CLASSES.FADE_OUT);
        promptOutput.classList.add(FEED_CONSTANTS.CLASSES.FADE_IN);

        // Wait for fade in to complete
        await this.waitForTransition(FEED_CONSTANTS.TRANSITIONS.FADE_IN_DURATION);

        // Clean up transition classes
        promptOutput.classList.remove(
            FEED_CONSTANTS.CLASSES.TRANSITIONING,
            FEED_CONSTANTS.CLASSES.FADE_IN
        );
    }

    // Wait for transition duration
    waitForTransition(duration) {
        return new Promise(resolve => setTimeout(resolve, duration));
    }

    // Show error message
    showErrorMessage(message) {
        this.domManager.showErrorMessage(message);
    }

    // Clear feed content
    clearFeedContent() {
        this.domManager.clearFeedContent();
    }

    // Remove specific image from feed
    removeImageFromFeed(imageId) {
        return this.domManager.removeImageFromFeed(imageId);
    }

    // Add image to feed
    addImageToFeed(imageData, filter) {
        const wasAdded = this.domManager.addImageToFeed(imageData, filter);

        // Only update intersection observer if a new image was actually added
        if (wasAdded) {
            this.updateIntersectionObserver();

            // Add to tab service for intelligent filtering
            if (window.feedManager && window.feedManager.tabService) {
                window.feedManager.tabService.addImage(imageData);
            }
        }
    }

    // Update intersection observer
    updateIntersectionObserver() {

        if (this.intersectionObserver) {
            const lastImage = this.domManager.getLastImageElement();

            // Only update observer if we have a new last image
            if (lastImage && lastImage !== this.lastImageElement) {
                // First, unobserve all current targets to prevent multiple observations
                this.intersectionObserver.disconnect();

                this.intersectionObserver.observe(lastImage);
                // Don't set this.lastImageElement here - let the intersection observer callback handle it
            }
        }
    }


    // Update filter button states
    updateFilterButtonStates(availableFilters) {
        this.domManager.updateFilterButtonStates(availableFilters);
    }

    // Set filter button as active
    setFilterButtonActive(filter) {
        this.domManager.setFilterButtonActive(filter);
    }

    // Get scroll position
    getScrollPosition() {
        return this.domManager.getScrollPosition();
    }

    // Set scroll position
    setScrollPosition(position) {
        this.domManager.setScrollPosition(position);
    }

    // Check if element is in viewport
    isElementInViewport(element) {
        return this.domManager.isElementInViewport(element);
    }

    // Get last image element
    getLastImageElement() {
        return this.domManager.getLastImageElement();
    }

    // Disconnect intersection observer
    disconnectIntersectionObserver() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
    }

    // Reconnect intersection observer
    reconnectIntersectionObserver() {
        this.disconnectIntersectionObserver();
        this.setupIntersectionObserver();
        this.updateIntersectionObserver();
    }

    // Force update intersection observer (useful after view changes)
    forceUpdateIntersectionObserver() {
        if (this.intersectionObserver) {
            // Disconnect and reconnect to ensure we're monitoring the correct last image
            this.disconnectIntersectionObserver();
            this.setupIntersectionObserver();
            this.updateIntersectionObserver();
        }
    }

    // Handle window resize
    handleWindowResize() {
        // Window resize handled by CSS media queries and responsive design

        // Check and fill to bottom after window resize
        setTimeout(() => {
            if (window.feedManager && window.feedManager.fillToBottomManager) {
                const currentFilter = window.feedManager.getCurrentFilter();
                window.feedManager.fillToBottomManager.checkAndFillWithDebounce(currentFilter, 200);
            }
        }, 100);
    }

    // Setup window event listeners
    setupWindowListeners() {
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });

        window.addEventListener('scroll', () => {
            // Handle scroll events if needed
        });
    }

    // Cleanup
    cleanup() {
        this.disconnectIntersectionObserver();
        this.isSetupComplete = false;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedUIManager = FeedUIManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedUIManager;
}
