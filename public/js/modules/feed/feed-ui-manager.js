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
            console.log('🔍 INTERSECTION: Skipping - already loading');

            return;
        }

        const lastImage = this.domManager.getLastImageElement();

        if (lastImage && lastImage !== this.lastImageElement) {
            this.lastImageElement = lastImage;

            console.log('🔍 INTERSECTION: Last image changed, dispatching event');

            // Dispatch event for infinite scroll
            const event = new CustomEvent('lastImageVisible', {
                detail: { element: lastImage }
            });

            window.dispatchEvent(event);
        } else {
            console.log('🔍 INTERSECTION: Same image or no image, skipping event');
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

    // Show error message
    showErrorMessage(message) {
        this.domManager.showErrorMessage(message);
    }

    // Clear feed content
    clearFeedContent() {
        this.domManager.clearFeedContent();
    }

    // Add image to feed
    addImageToFeed(imageData, filter) {
        this.domManager.addImageToFeed(imageData, filter);

        // Update intersection observer
        this.updateIntersectionObserver();
    }

    // Update intersection observer
    updateIntersectionObserver() {
        if (this.intersectionObserver) {
            // First, unobserve all current targets to prevent multiple observations
            this.intersectionObserver.disconnect();

            const lastImage = this.domManager.getLastImageElement();

            if (lastImage) {
                console.log('👁️ OBSERVER: Observing new last image:', lastImage.dataset?.imageId || 'unknown');
                this.intersectionObserver.observe(lastImage);
            }
        }
    }

    // Force grid layout
    forceGridLayout() {
        this.domManager.forceGridLayout();
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

    // Handle window resize
    handleWindowResize() {
        // Force grid layout on resize
        this.forceGridLayout();
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
