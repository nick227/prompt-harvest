// Feed View Manager - Refactored to use centralized view system
class FeedViewManager {
    constructor() {
        // Use centralized view management if available
        if (window.ViewManager && window.ViewRenderer) {
            this.viewManager = new window.ViewManager();
            this.viewRenderer = new window.ViewRenderer();

            // Listen for view changes
            this.viewManager.addListener((newView, previousView) => {
                this.onViewChange(newView, previousView);
            });

            this.currentView = this.viewManager.getCurrentView();
        } else {
            // Fallback to old system
            this.supportedViews = ['list', 'compact'];
            this.currentView = this.loadSavedView() || 'compact';
        }

        this.isInitialized = false;
    }

    /**
     * Get current view type
     * @returns {string} Current view type
     */
    getCurrentView() {
        return this.viewManager ? this.viewManager.getCurrentView() : this.currentView;
    }

    /**
     * Get supported views
     * @returns {Array<string>} Array of view types
     */
    getSupportedViews() {
        return this.viewManager ? this.viewManager.getSupportedViews() : this.supportedViews;
    }

    /**
     * Load saved view preference from localStorage
     * @returns {string|null} Saved view preference or null
     */
    loadSavedView() {
        try {
            const savedView = localStorage.getItem('imageViewPreference');

            return savedView && this.supportedViews.includes(savedView) ? savedView : null;
        } catch (error) {
            console.warn('⚠️ VIEW: Failed to load saved view preference:', error);

            return null;
        }
    }

    /**
     * Save view preference to localStorage
     * @param {string} viewType - View type to save ('list', 'compact', or 'full')
     */
    saveViewPreference(viewType) {
        try {
            localStorage.setItem('imageViewPreference', viewType);
        } catch (error) {
            console.warn('⚠️ VIEW: Failed to save view preference:', error);
        }
    }

    /**
     * Initialize the view manager
     */
    init() {
        if (this.isInitialized) {
            return;
        }

        this.setupViewSwitchListeners();
        this.enhanceExistingImages();
        this.isInitialized = true;

    }

    /**
     * Enhance existing images with all views (compact, list, full)
     */
    enhanceExistingImages() {
        const promptOutput = document.querySelector('.prompt-output');

        if (!promptOutput) {
            console.warn('⚠️ VIEW: No prompt output container found for enhancement');

            return;
        }

        const imageWrappers = promptOutput.querySelectorAll('.image-wrapper');

        let enhancedCount = 0;
        let skippedCount = 0;

        imageWrappers.forEach((wrapper, _index) => {
            try {
                const hasViews = this.hasAllViews(wrapper);

                if (!hasViews) {
                    this.enhanceImageWrapper(wrapper);
                    enhancedCount++;
                } else {
                    skippedCount++;
                }
            } catch (error) {
                console.error('❌ VIEW: Failed to enhance wrapper:', error, wrapper);
            }
        });

        if (enhancedCount > 0 || skippedCount > 0) {
            // Enhanced wrappers, skipped already enhanced
        }

    }

    /**
     * Re-run enhancement for any new images that might have been added
     */
    reEnhanceImages() {
        this.enhanceExistingImages();

        // Also ensure the current view is applied to any new images
        if (this.currentView) {
            this.applyCurrentViewToAllImages();
        }
    }

    /**
     * Apply the current view to all existing image wrappers
     */
    applyCurrentViewToAllImages() {
        const promptOutput = document.querySelector('.prompt-output');

        if (!promptOutput) {
            console.warn('⚠️ VIEW: No prompt output container found for applying current view');

            return;
        }

        const imageWrappers = promptOutput.querySelectorAll('.image-wrapper');

        imageWrappers.forEach((wrapper, _index) => {
            try {
                window.ImageViewUtils.updateWrapperView(wrapper, this.currentView);
            } catch (error) {
                console.error('❌ VIEW: Failed to apply current view to wrapper:', error, wrapper);
            }
        });
    }

    /**
     * Setup view switch event listeners
     */
    setupViewSwitchListeners() {
        // Listen for view changes
        document.addEventListener('change', e => {
            if (e.target.name === 'view') {
                this.switchView(e.target.value);
            }
        });

        // Set initial view from saved preference
        const savedView = this.currentView;


        const viewRadio = document.querySelector(`input[name="view"][value="${savedView}"]`);

        if (viewRadio) {
            viewRadio.checked = true;

        } else {
            // Fallback: default to compact view if saved preference is invalid

            this.currentView = 'compact';

            const compactRadio = document.querySelector('input[name="view"][value="compact"]');

            if (compactRadio) {
                compactRadio.checked = true;

            }
        }

        // Apply the initial view immediately
        this.applyInitialView();
    }

    /**
     * Apply the initial view to the container
     */
    applyInitialView() {
        const promptOutput = document.querySelector('.prompt-output');

        if (!promptOutput) {
            console.warn('⚠️ VIEW: No prompt output container found for initial view');

            return;
        }

        if (this.viewRenderer) {
            // Use centralized renderer
            this.viewRenderer.updateContainerClasses(promptOutput, this.currentView);
            this.viewRenderer.applyToAllWrappers(promptOutput, this.currentView);
        } else {
            // Fallback to manual classes
            promptOutput.classList.remove('list-wrapper', 'compact-view');

            if (this.currentView === 'list') {
                promptOutput.classList.add('list-wrapper');
            } else if (this.currentView === 'compact') {
                promptOutput.classList.add('compact-view');
            }
        }
    }

    /**
     * Switch between view types
     * @param {string} viewType - View type to switch to ('list', 'compact', 'full')
     */
    switchView(viewType) {
        // Use centralized system if available
        if (this.viewManager) {
            try {
                this.viewManager.switchTo(viewType);

                return;
            } catch (error) {
                console.error('❌ VIEW: Centralized switch failed, falling back:', error);
            }
        }

        // Fallback to old system
        this.switchViewOld(viewType);
    }

    /**
     * Handle view change from centralized system
     * @param {string} newView - New view type
     * @param {string} _previousView - Previous view type
     */
    onViewChange(newView, _previousView) {
        const promptOutput = document.querySelector('.prompt-output');

        if (!promptOutput) {
            console.error('❌ VIEW: Prompt output container not found');

            return;
        }

        // Use renderer to apply view to all wrappers
        // (This also updates container classes internally)
        this.viewRenderer.applyToAllWrappers(promptOutput, newView);

        // Update current view
        this.currentView = newView;

        // Force update intersection observer to monitor new last image
        if (window.feedManager && window.feedManager.uiManager) {
            window.feedManager.uiManager.forceUpdateIntersectionObserver();
        }

        // Check and fill to bottom after view change
        setTimeout(() => {
            if (window.feedManager && window.feedManager.fillToBottomManager) {
                const currentFilter = window.feedManager.getCurrentFilter();

                window.feedManager.fillToBottomManager.checkAndFillToBottom(currentFilter);
            }
        }, 100);
    }

    /**
     * @deprecated Legacy view switching for fallback
     * @param {string} viewType - View type to switch to
     */
    switchViewOld(viewType) {
        if (viewType === this.currentView) {
            return;
        }

        // Validate view type
        if (!this.supportedViews.includes(viewType)) {
            console.error('❌ VIEW: Unsupported view type:', viewType);

            return;
        }

        const promptOutput = document.querySelector('.prompt-output');

        if (!promptOutput) {
            console.error('❌ VIEW: Prompt output container not found');

            return;
        }

        // Update container classes for layout
        promptOutput.classList.remove('list-wrapper', 'compact-view');

        if (viewType === 'list') {
            promptOutput.classList.add('list-wrapper');
        } else if (viewType === 'compact') {
            promptOutput.classList.add('compact-view');
        }

        // Update all image wrappers to show/hide appropriate views
        const imageWrappers = promptOutput.querySelectorAll('.image-wrapper');

        imageWrappers.forEach(wrapper => {
            try {
                window.ImageViewUtils.updateWrapperView(wrapper, viewType);
            } catch (error) {
                console.error('❌ VIEW: Failed to update wrapper view:', error, wrapper);
            }
        });

        this.currentView = viewType;

        // Save the new view preference
        this.saveViewPreference(viewType);

        // Force update intersection observer to monitor new last image
        if (window.feedManager && window.feedManager.uiManager) {
            window.feedManager.uiManager.forceUpdateIntersectionObserver();
        }

        // Check and fill to bottom after view change
        setTimeout(() => {
            if (window.feedManager && window.feedManager.fillToBottomManager) {
                const currentFilter = window.feedManager.getCurrentFilter();

                window.feedManager.fillToBottomManager.checkAndFillToBottom(currentFilter);
            }
        }, 100);
    }

    /**
     * Check if wrapper has all views
     * @param {HTMLElement} wrapper - Wrapper element
     * @returns {boolean} True if has all views
     */
    hasAllViews(wrapper) {
        if (!wrapper) {
            return false;
        }

        if (this.viewRenderer) {
            return this.viewRenderer.hasAllViews(wrapper);
        }

        // Fallback to manual check
        return wrapper.querySelector('.compact-view') && wrapper.querySelector('.list-view');
    }

    /**
     * Enhance a single image wrapper with all views (compact, list, full)
     * @param {HTMLElement} wrapper - Wrapper element to enhance
     */
    enhanceImageWrapper(wrapper) {
        try {
            // Use shared utility for enhancement
            const success = window.ImageViewUtils.enhanceImageWrapper(wrapper);

            if (success) {
                // Set initial visibility based on current view
                window.ImageViewUtils.updateWrapperView(wrapper, this.currentView);
            } else {
                console.warn('⚠️ VIEW MANAGER: Enhancement failed');
            }
        } catch (error) {
            console.error('❌ VIEW MANAGER: Failed to enhance image wrapper:', error);
        }
    }

    /**
     * Enhance new image wrapper as it's added
     * @param {HTMLElement} wrapper - Wrapper element to enhance
     */
    enhanceNewImageWrapper(wrapper) {
        // Check if already enhanced to prevent duplicate enhancement
        if (this.hasAllViews(wrapper)) {
            return; // Skip silently - no need to log every skip
        }

        // Check if enhancement is already scheduled for this wrapper
        if (wrapper.dataset.enhancementScheduled === 'true') {
            return; // Skip silently - no need to log every skip
        }

        // Mark as scheduled to prevent duplicate scheduling
        wrapper.dataset.enhancementScheduled = 'true';

        // Add a small delay to ensure the image element is fully loaded
        setTimeout(() => {
            this.enhanceImageWrapper(wrapper);
            // Clear the scheduled flag after completion
            wrapper.dataset.enhancementScheduled = 'false';
        }, 50);
    }

    /**
     * Force re-application of current view to all images
     */
    forceReapplyView() {
        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
            // Only enhance images that aren't already enhanced
            this.enhanceExistingImages();

            // Apply the current view to all images (this is the main purpose of forceReapplyView)
            this.applyCurrentViewToAllImages();

            // Also ensure the container has the right classes
            this.applyInitialView();

        }, 100);
    }

    /**
     * Ensure view is applied (useful for when images are added)
     */
    ensureViewApplied() {
        const promptOutput = document.querySelector('.prompt-output');

        if (!promptOutput) {
            return;
        }

        // Check if the correct view class is applied
        const hasCorrectClass = (this.currentView === 'list' && promptOutput.classList.contains('list-wrapper')) ||
                               (this.currentView === 'compact' && promptOutput.classList.contains('compact-view'));

        if (!hasCorrectClass) {

            this.applyInitialView();
        }
    }

    /**
     * Update an existing image in both views
     * @param {string} imageId - Image ID to update
     * @param {Object} updates - Updates to apply
     */
    updateImageInView(imageId, updates) {
        const wrapper = document.querySelector(`.image-wrapper[data-image-id="${imageId}"]`);

        if (!wrapper) {

            return;
        }

        // Use shared utility for updating
        window.ImageViewUtils.updateImageInViews(wrapper, updates);
    }

    /**
     * Cleanup method
     */
    cleanup() {
        this.isInitialized = false;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedViewManager = FeedViewManager;

    // Create a global instance for easy access
    window.feedViewManager = new FeedViewManager();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedViewManager;
}
