// Feed View Manager - Refactored to focus only on feed-level view management
class FeedViewManager {
    constructor() {
        this.currentView = this.loadSavedView() || 'compact';
        this.isInitialized = false;
        console.log('🔍 VIEW: Constructor - currentView set to:', this.currentView);
    }

    /**
     * Load saved view preference from localStorage
     * @returns {string|null} Saved view preference or null
     */
    loadSavedView() {
        try {
            const savedView = localStorage.getItem('imageViewPreference');

            console.log('🔍 VIEW: Loading saved view preference:', savedView);

            return savedView && ['compact', 'list'].includes(savedView) ? savedView : null;
        } catch (error) {
            console.warn('⚠️ VIEW: Failed to load saved view preference:', error);

            return null;
        }
    }

    /**
     * Save view preference to localStorage
     * @param {string} viewType - View type to save ('compact' or 'list')
     */
    saveViewPreference(viewType) {
        try {
            localStorage.setItem('imageViewPreference', viewType);

            console.log(`💾 VIEW: Saved view preference: ${viewType}`);

            // Verify the save worked
            const saved = localStorage.getItem('imageViewPreference');

            console.log(`🔍 VIEW: Verification - saved value is: ${saved}`);
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

        console.log('🔄 VIEW MANAGER: Initialized');
    }

    /**
     * Enhance existing images with dual views
     */
    enhanceExistingImages() {
        const promptOutput = document.querySelector('.prompt-output');

        if (!promptOutput) {
            console.warn('⚠️ VIEW: No prompt output container found for enhancement');

            return;
        }

        const imageWrappers = promptOutput.querySelectorAll('.image-wrapper');

        console.log(`🔍 VIEW: Found ${imageWrappers.length} image wrappers to check`);

        let enhancedCount = 0;

        imageWrappers.forEach((wrapper, _index) => {
            try {
                const hasCompactView = wrapper.querySelector('.compact-view');
                const hasListView = wrapper.querySelector('.list-view');

                console.log(`🔍 VIEW: Wrapper ${_index}: hasCompactView=${!!hasCompactView}, ` +
            `hasListView=${!!hasListView}`);

                if (!hasCompactView && !hasListView) {
                    console.log(`🔍 VIEW: Enhancing wrapper ${_index}`);
                    this.enhanceImageWrapper(wrapper);
                    enhancedCount++;
                } else {
                    console.log(`🔍 VIEW: Wrapper ${_index} already enhanced, skipping`);
                }
            } catch (error) {
                console.error('❌ VIEW: Failed to enhance wrapper:', error, wrapper);
            }
        });

        console.log(`🔄 VIEW: Enhanced ${enhancedCount} existing image wrappers`);
    }

    /**
     * Re-run enhancement for any new images that might have been added
     */
    reEnhanceImages() {
        console.log('🔄 VIEW: Re-running image enhancement...');
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

        console.log(`🔄 VIEW: Applying ${this.currentView} view to ${imageWrappers.length} image wrappers`);

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

        console.log('🔍 VIEW: Setting up initial view - savedView:', savedView);

        const viewRadio = document.querySelector(`input[name="view"][value="${savedView}"]`);

        if (viewRadio) {
            viewRadio.checked = true;

            console.log(`🔄 VIEW: Set radio button to saved preference: ${savedView}`);
        } else {
            // Fallback: default to compact view if saved preference is invalid
            console.log('⚠️ VIEW: Saved view radio button not found, falling back to compact');

            this.currentView = 'compact';

            const compactRadio = document.querySelector('input[name="view"][value="compact"]');

            if (compactRadio) {
                compactRadio.checked = true;

                console.log('🔄 VIEW: Set fallback radio button to compact');
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

        // Apply the initial view classes
        if (this.currentView === 'list') {
            promptOutput.classList.remove('grid-view');
            promptOutput.classList.add('list-view');

            console.log('🔍 VIEW: Applied list-view class, removed grid-view');
        } else {
            promptOutput.classList.remove('list-view');
            promptOutput.classList.add('grid-view');

            console.log('🔍 VIEW: Applied grid-view class, removed list-view');
        }

        console.log(`🔄 VIEW: Applied initial view: ${this.currentView}`);
        console.log('🔍 VIEW: Current CSS classes:', promptOutput.className);
    }

    /**
     * Switch between view types
     * @param {string} viewType - View type to switch to ('compact' or 'list')
     */
    switchView(viewType) {
        if (viewType === this.currentView) {
            return;
        }

        console.log(`🔄 VIEW: Switching from ${this.currentView} to ${viewType}`);

        const promptOutput = document.querySelector('.prompt-output');

        if (!promptOutput) {
            console.error('❌ VIEW: Prompt output container not found');

            return;
        }

        // Update container classes for layout
        if (viewType === 'list') {
            promptOutput.classList.remove('grid-view');
            promptOutput.classList.add('list-view');
        } else {
            promptOutput.classList.remove('list-view');
            promptOutput.classList.add('grid-view');
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

        console.log(`✅ VIEW: Switched to ${viewType} view`);
    }

    /**
     * Enhance a single image wrapper with dual views
     * @param {HTMLElement} wrapper - Wrapper element to enhance
     */
    enhanceImageWrapper(wrapper) {
        try {
            // Use shared utility for enhancement
            const success = window.ImageViewUtils.enhanceImageWrapper(wrapper);

            if (success) {
                // Set initial visibility based on current view
                window.ImageViewUtils.updateWrapperView(wrapper, this.currentView);
            }
        } catch (error) {
            console.error('❌ VIEW: Failed to enhance image wrapper:', error);
        }
    }

    /**
     * Enhance new image wrapper as it's added
     * @param {HTMLElement} wrapper - Wrapper element to enhance
     */
    enhanceNewImageWrapper(wrapper) {
        console.log('🔍 VIEW: enhanceNewImageWrapper called for wrapper:', wrapper.dataset.imageId);

        // Add a small delay to ensure the image element is fully loaded
        setTimeout(() => {
            this.enhanceImageWrapper(wrapper);
        }, 50);
    }

    /**
     * Force re-application of current view to all images
     */
    forceReapplyView() {
        console.log('🔄 VIEW: Force re-applying current view:', this.currentView);

        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
            // First, ensure all images are enhanced
            this.enhanceExistingImages();

            // Then apply the current view to all images
            this.applyCurrentViewToAllImages();

            // Also ensure the container has the right classes
            this.applyInitialView();

            console.log('✅ VIEW: Force re-application completed');
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
        const hasCorrectClass = (this.currentView === 'list' && promptOutput.classList.contains('list-view')) ||
                               (this.currentView === 'compact' && promptOutput.classList.contains('grid-view'));

        if (!hasCorrectClass) {
            console.log(`🔄 VIEW: Re-applying view: ${this.currentView}`);

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
