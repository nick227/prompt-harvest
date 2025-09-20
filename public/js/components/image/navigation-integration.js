// Navigation Integration - Replaces complex navigation with simplified DOM-based approach

/* global SimplifiedNavigation */
class NavigationIntegration {
    constructor() {
        this.simplifiedNav = new SimplifiedNavigation();
        this.isInitialized = false;
    }

    /**
     * Initialize the simplified navigation system
     */
    init() {
        if (this.isInitialized) {
            return;
        }

        // Replace existing image click handlers
        this.setupImageClickHandlers();

        // Remove old navigation event listeners
        this.cleanupOldNavigation();

        this.isInitialized = true;
        console.log('🎯 Simplified navigation initialized');
    }

    /**
     * Setup new image click handlers
     */
    setupImageClickHandlers() {
        // Use event delegation for all image clicks
        document.addEventListener('click', e => {
            const imageElement = e.target.closest('img[data-id], img[data-image-id]');

            if (imageElement) {
                // Check if we're already in fullscreen mode to avoid conflicts
                // Only consider it fullscreen if the container is actually visible
                const fullscreenContainer = document.querySelector('.fullscreen-container, .full-screen');
                const isFullscreenVisible = fullscreenContainer &&
                    fullscreenContainer.style.display !== 'none' &&
                    fullscreenContainer.offsetParent !== null;

                if (isFullscreenVisible || document.body.classList.contains('fullscreen-active')) {
                    console.log('🔍 NAVIGATION: Already in fullscreen, ignoring click');
                    return;
                }

                e.preventDefault();
                e.stopPropagation();
                this.simplifiedNav.openFullscreen(imageElement);
            }
        });
    }

    /**
     * Cleanup old navigation system
     */
    cleanupOldNavigation() {
        // Remove old event listeners and references
        if (window.imageManager) {
            // Clear old fullscreen container
            if (window.imageManager.fullscreenContainer) {
                window.imageManager.fullscreenContainer.remove();
                window.imageManager.fullscreenContainer = null;
            }

            // Clear current image reference
            window.imageManager.currentFullscreenImage = null;
        }

        // Clear old image cache
        if (window.imageManager && window.imageManager.data) {
            window.imageManager.data.clearCache();
        }
    }

    /**
     * Get the simplified navigation instance
     * @returns {SimplifiedNavigation} Navigation instance
     */
    getNavigation() {
        return this.simplifiedNav;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.navigationIntegration = new NavigationIntegration();
    window.navigationIntegration.init();
    console.log('🚀 Optimized navigation system initialized');
});

// Export for global access
window.NavigationIntegration = NavigationIntegration;
