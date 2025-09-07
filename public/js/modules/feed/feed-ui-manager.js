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
                    console.log('🔍 INTERSECTION: Observer callback triggered', {
                        entriesCount: entries.length,
                        entries: entries.map(entry => ({
                            isIntersecting: entry.isIntersecting,
                            intersectionRatio: entry.intersectionRatio,
                            target: entry.target.dataset?.imageId || 'unknown'
                        }))
                    });

                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            console.log('🔍 INTERSECTION: Image is intersecting, calling handleLastImageVisible');
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
        console.log('🔍 INTERSECTION: handleLastImageVisible called', {
            isLoading: this.isLoading,
            lastImageElement: this.lastImageElement?.dataset?.imageId || 'none'
        });

        if (this.isLoading) {
            console.log('🔍 INTERSECTION: Skipping - already loading');

            return;
        }

        const lastImage = this.domManager.getLastImageElement();

        console.log('🔍 INTERSECTION: Last image check', {
            lastImageFound: !!lastImage,
            lastImageId: lastImage?.dataset?.imageId || 'none',
            previousLastImageId: this.lastImageElement?.dataset?.imageId || 'none',
            isDifferent: lastImage !== this.lastImageElement
        });

        if (lastImage) {
            // Check if this is the first time we're seeing this image or if it's different
            const isFirstTime = !this.lastImageElement;
            const isDifferentImage = lastImage !== this.lastImageElement;

            if (isFirstTime || isDifferentImage) {
                this.lastImageElement = lastImage;

                console.log('🔍 INTERSECTION: Last image changed or first time, dispatching event', {
                    isFirstTime,
                    isDifferentImage,
                    lastImageId: lastImage.dataset?.imageId || 'unknown'
                });

                // Dispatch event for infinite scroll
                const event = new CustomEvent('lastImageVisible', {
                    detail: { element: lastImage }
                });

                window.dispatchEvent(event);
            } else {
                console.log('🔍 INTERSECTION: Same image, skipping event');
            }
        } else {
            console.log('🔍 INTERSECTION: No last image found, skipping event');
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
        const wasAdded = this.domManager.addImageToFeed(imageData, filter);

        // Only update intersection observer if a new image was actually added
        if (wasAdded) {
            this.updateIntersectionObserver();
        }
    }

    // Update intersection observer
    updateIntersectionObserver() {
        console.log('👁️ OBSERVER: updateIntersectionObserver called', {
            hasObserver: !!this.intersectionObserver
        });

        if (this.intersectionObserver) {
            const lastImage = this.domManager.getLastImageElement();

            console.log('👁️ OBSERVER: Last image element check', {
                lastImageFound: !!lastImage,
                lastImageId: lastImage?.dataset?.imageId || 'unknown',
                currentlyObserving: this.lastImageElement?.dataset?.imageId || 'none',
                isSameImage: lastImage === this.lastImageElement
            });

            // Only update observer if we have a new last image
            if (lastImage && lastImage !== this.lastImageElement) {
                // First, unobserve all current targets to prevent multiple observations
                this.intersectionObserver.disconnect();

                console.log('👁️ OBSERVER: Observing new last image:', lastImage.dataset?.imageId || 'unknown');
                this.intersectionObserver.observe(lastImage);
                // Don't set this.lastImageElement here - let the intersection observer callback handle it
            } else if (lastImage) {
                console.log('👁️ OBSERVER: Same last image, skipping observer update');
            } else {
                console.log('👁️ OBSERVER: No last image found to observe');
            }
        } else {
            console.log('👁️ OBSERVER: No intersection observer available');
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
