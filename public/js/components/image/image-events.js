
// Image Event Layer - Event handling and user interactions
// Dependencies: TouchEventHandler, NotificationManager, AuthUtils, ImageDetection
class ImageEvents {
    constructor(imageManager) {
        console.log('🔍 IMAGE EVENTS: Constructor called with imageManager:', imageManager);
        this.imageManager = imageManager;
        this.currentKeyHandler = null;
        this.currentClickHandler = null;

        // Reset info box to new default behavior (one-time)
        this.resetInfoBoxToNewDefault();

        // Debug module availability
        console.log('🔍 Available modules:', {
            TouchEventHandler: typeof window.TouchEventHandler,
            NotificationManager: typeof window.NotificationManager,
            ImageDetection: typeof window.ImageDetection,
            AuthUtils: typeof window.AuthUtils
        });

        // Initialize with fallbacks
        this.touchHandler = this.createTouchHandler(imageManager);
        this.notificationManager = this.createNotificationManager();
        console.log('🔍 IMAGE EVENTS: ImageEvents instance created');
    }

    createTouchHandler(imageManager) {
        if (window.TouchEventHandler) {
            return new window.TouchEventHandler(imageManager);
        }

        // Fallback: create minimal touch handler
        return {
            setup: () => {},
            cleanup: () => {}
        };
    }

    createNotificationManager() {
        if (window.NotificationManager) {
            return new window.NotificationManager();
        }

        // Fallback: create minimal notification manager
        return {
            show: (message, type) => console.log(`[${type.toUpperCase()}] ${message}`),
            success: message => console.log(`[SUCCESS] ${message}`),
            error: message => console.log(`[ERROR] ${message}`)
        };
    }

    // ========================================
    // CORE EVENT SETUP & DELEGATION
    // ========================================

    setupEventDelegation() {
        console.log('🔍 IMAGE EVENTS: Setting up event delegation...');
        const imageContainer = this.findImageContainer();

        console.log('🔍 IMAGE EVENTS: Image container found:', imageContainer);

        if (imageContainer) {
            console.log('🔍 IMAGE EVENTS: Adding click event listener to container');

            imageContainer.addEventListener('click', e => {
                console.log('🔍 IMAGE EVENTS: Container click detected, target:', e.target);
                this.handleImageClick(e);
            });

        } else {
            console.warn('⚠️ No image container found for event delegation');
        }
    }

    handleImageClick(e) {
        console.log('🔍 IMAGE EVENTS: Image click detected');
        const img = this.getImageFromEvent(e);

        if (!img) {
            console.log('🔍 IMAGE EVENTS: No img element found');

            return;
        }

        console.log('🔍 IMAGE EVENTS: Found img element:', img);

        // Check if we're already in fullscreen mode to avoid conflicts
        if (this.isFullscreenActive()) {
            console.log('🔍 IMAGE EVENTS: Already in fullscreen, ignoring click');

            return;
        }

        const isGeneratedImage = this.isGeneratedImage(img);

        console.log('🔍 IMAGE EVENTS: Is generated image:', isGeneratedImage);

        if (!isGeneratedImage) {
            console.log('🔍 IMAGE EVENTS: Not a generated image, ignoring');

            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const imageData = this.imageManager.data.extractImageDataFromElement(img);

        console.log('🔍 IMAGE EVENTS: Extracted image data:', imageData);

        console.log('🔍 IMAGE EVENTS: Opening fullscreen...');
        this.imageManager.openFullscreen(imageData);
    }

    // ========================================
    // FULLSCREEN EVENT MANAGEMENT
    // ========================================

    setupFullscreenEvents() {
        this.setupKeyboardEvents();
        this.setupTouchEvents();
        this.setupBackgroundClick();
    }

    setupKeyboardEvents() {
        const handleKeyDown = event => {
            switch (event.key) {
                case 'Escape': {
                    this.imageManager.closeFullscreen();
                    document.removeEventListener('keydown', handleKeyDown);
                    break;
                }
                case 'ArrowLeft':
                    this.imageManager.navigateImage('prev');
                    break;
                case 'ArrowRight':
                    this.imageManager.navigateImage('next');
                    break;
                case '0':
                case '1':
                case '2':
                case '3':
                case '4':
                case '5': {
                    const rating = parseInt(event.key);

                    this.imageManager.rateImageInFullscreen(rating);
                    break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        this.currentKeyHandler = handleKeyDown;
    }

    setupTouchEvents() {
        // Use the correct selector from UI config - should be '.full-screen'
        // Also try to get from imageManager if available
        let fullscreenContainer = this.imageManager?.fullscreenContainer || document.querySelector('.full-screen');

        console.log('🔍 IMAGE EVENTS: Setting up touch events, container found:', fullscreenContainer);

        if (!fullscreenContainer) {
            console.warn('⚠️ IMAGE EVENTS: No fullscreen container found for touch events');
            // Try again after a short delay in case container is created later
            setTimeout(() => {
                fullscreenContainer = this.imageManager?.fullscreenContainer || document.querySelector('.full-screen');
                if (fullscreenContainer) {
                    console.log('🔍 IMAGE EVENTS: Retrying touch setup, container found:', fullscreenContainer);
                    this.touchHandler.setup(fullscreenContainer);
                }
            }, 100);

            return;
        }

        this.touchHandler.setup(fullscreenContainer);
    }

    setupBackgroundClick() {
        const handleBackgroundClick = event => {
            if (event.target === this.imageManager.fullscreenContainer) {
                this.imageManager.closeFullscreen();
                this.imageManager.fullscreenContainer.removeEventListener('click', handleBackgroundClick);
            }
        };

        if (this.imageManager.fullscreenContainer && typeof this.imageManager.fullscreenContainer.addEventListener === 'function') {
            this.imageManager.fullscreenContainer.addEventListener('click', handleBackgroundClick);
        }

        this.currentClickHandler = handleBackgroundClick;
    }

    // ========================================
    // UI COMPONENT EVENT HANDLERS
    // ========================================

    setupToggleButtonEvents(toggleBtn, infoBox) {
        console.log('🔍 SETUP: setupToggleButtonEvents called with:', { toggleBtn, infoBox });

        // Safety check - ensure toggle button exists
        if (!toggleBtn) {
            console.warn('⚠️ Toggle button not found in info box');
            console.log('🔍 Available elements in info box:', infoBox.querySelectorAll('*'));

            return;
        }

        const infoBoxContent = infoBox.querySelector('.info-box-content');

        if (!infoBoxContent) {
            console.warn('⚠️ Info box content not found');

            return;
        }

        // Get saved state from localStorage or default to collapsed
        const savedState = this.getInfoBoxState();
        const keepOpen = this.getInfoBoxKeepOpen();
        let isExpanded = keepOpen || savedState;

        // Apply saved state
        if (isExpanded) {
            infoBoxContent.classList.remove('collapsed');
            infoBoxContent.classList.add('expanded');
            if (keepOpen) {
                infoBoxContent.classList.add('keep-open');
            }
        } else {
            infoBoxContent.classList.remove('expanded');
            infoBoxContent.classList.add('collapsed');
        }

        // Set initial toggle button text based on current state
        toggleBtn.textContent = isExpanded ? '−' : '+';
        console.log('🔍 Initial toggle button text:', toggleBtn.textContent, 'saved state:', savedState);

        const toggleInfoBox = () => {
            const keepOpen = this.getInfoBoxKeepOpen();

            // If keep-open is enabled, don't allow collapsing
            if (keepOpen && !isExpanded) {
                console.log('🔍 Keep-open enabled, preventing collapse');

                return;
            }

            console.log('🔍 Toggling info box, current state:', isExpanded);
            isExpanded = !isExpanded;

            if (isExpanded) {
                console.log('🔍 Expanding info box');
                infoBoxContent.classList.remove('collapsed');
                infoBoxContent.classList.add('expanded');
                if (keepOpen) {
                    infoBoxContent.classList.add('keep-open');
                }
                toggleBtn.textContent = '−';
            } else {
                console.log('🔍 Collapsing info box');
                infoBoxContent.classList.remove('expanded', 'keep-open');
                infoBoxContent.classList.add('collapsed');
                toggleBtn.textContent = '+';
            }

            // Save the new state (only if not keep-open)
            if (!keepOpen) {
                this.saveInfoBoxState(isExpanded);
            }
            console.log('🔍 Info box classes after toggle:', infoBoxContent.className);
        };

        // Toggle on button click
        toggleBtn.addEventListener('click', e => {
            e.stopPropagation();
            toggleInfoBox();
        });

        // Toggle on header click
        const header = infoBox.querySelector('.info-box-header');

        if (header) {
            console.log('🔍 Header found, setting up click event');
            header.addEventListener('click', e => {
                console.log('🔍 Header clicked, target:', e.target, 'toggleBtn:', toggleBtn);
                // Check if the click was on the toggle button or its children
                if (e.target !== toggleBtn && !toggleBtn.contains(e.target)) {
                    console.log('🔍 Toggling info box from header click');
                    toggleInfoBox();
                } else {
                    console.log('🔍 Click was on toggle button, ignoring header click');
                }
            });
        } else {
            console.warn('⚠️ Header not found in info box');
            console.log('🔍 Available elements in info box:', infoBox.querySelectorAll('*'));
        }
    }

    setupButtonHoverEffects(_btn) {
        _btn.onmouseenter = () => {
            _btn.style.background = 'rgba(0, 0, 0, 0.9)';
            _btn.style.transform = 'translateY(-1px)';
            _btn.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
        };
        _btn.onmouseleave = () => {
            _btn.style.background = 'rgba(0, 0, 0, 0.8)';
            _btn.style.transform = 'translateY(0)';
            _btn.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)';
        };
    }

    setupNavigationButtonEvents(navControls, imageData) {
        const prevBtn = this.imageManager.ui.createButton('← Previous');
        const downloadBtn = this.imageManager.ui.createButton('Download');
        const nextBtn = this.imageManager.ui.createButton('Next →');
        const closeBtn = this.imageManager.ui.createButton('× Close');

        prevBtn.addEventListener('click', () => this.imageManager.navigateImage('prev'));
        downloadBtn.addEventListener('click', () => this.imageManager.downloadImage(imageData));
        nextBtn.addEventListener('click', () => this.imageManager.navigateImage('next'));
        closeBtn.addEventListener('click', () => this.imageManager.closeFullscreen());

        navControls.appendChild(prevBtn);
        navControls.appendChild(downloadBtn);
        navControls.appendChild(nextBtn);
        navControls.appendChild(closeBtn);
    }

    setupRatingDisplayEvents(_ratingDisplay, _infoBox) {
        const spacer = this.imageManager.ui.createNavigationSpacer();

        // Rating is now part of the metadata grid in the info box
        // No need to create separate rating element

        return { spacer };
    }

    // ========================================
    // USER AUTHENTICATION & PERMISSIONS
    // ========================================

    shouldShowPublicToggle(imageData) {
        return this.canUserModifyImage(imageData);
    }

    // ========================================
    // NOTIFICATION SYSTEM
    // ========================================

    showNotification(message, type = 'info') {
        this.notificationManager.show(message, type);
    }

    // ========================================
    // PUBLIC STATUS MANAGEMENT
    // ========================================

    setupPublicStatusToggleEvents(publicStatusToggle) {
        const checkbox = publicStatusToggle.querySelector('.public-status-checkbox');
        const label = publicStatusToggle.querySelector('.public-status-label');

        if (!checkbox) {
            console.error('Checkbox not found in public status toggle');

            return;
        }

        checkbox.addEventListener('change', () => {
            this.handlePublicStatusChange(checkbox, label, publicStatusToggle);
        });
    }

    async handlePublicStatusChange(checkbox, label, publicStatusToggle) {
        if (!this.imageManager.currentFullscreenImage) {
            console.error('No current fullscreen image available');

            return;
        }

        const currentImage = this.imageManager.currentFullscreenImage;
        const newPublicStatus = checkbox.checked;

        try {
            this.setLoadingState(checkbox, label, publicStatusToggle, true);

            const success = await this.imageManager.updateImagePublicStatus(currentImage.id, newPublicStatus);

            if (success) {
                this.handlePublicStatusSuccess(currentImage.id, newPublicStatus);
            } else {
                this.handlePublicStatusFailure(checkbox, newPublicStatus);
            }
        } catch (error) {
            this.handlePublicStatusError(checkbox, newPublicStatus, error);
        } finally {
            this.setLoadingState(checkbox, label, publicStatusToggle, false);
        }
    }

    setLoadingState(checkbox, label, publicStatusToggle, isLoading) {
        checkbox.disabled = isLoading;
        label.textContent = isLoading ? 'Updating...' : 'Public';
        publicStatusToggle.style.opacity = isLoading ? '0.6' : '1';
    }

    handlePublicStatusSuccess(imageId, newPublicStatus) {
        this.notificationManager.success(`Image ${newPublicStatus ? 'made public' : 'made private'} successfully`);
        this.updateListViewCheckboxIfExists(imageId, newPublicStatus);
    }

    handlePublicStatusFailure(checkbox, newPublicStatus) {
        checkbox.checked = !newPublicStatus;
        console.error('Failed to update public status');
        this.notificationManager.error('Failed to update public status');
    }

    handlePublicStatusError(checkbox, newPublicStatus, error) {
        console.error('Error updating public status:', error);
        checkbox.checked = !newPublicStatus;

        const errorMessage = this.getUserFriendlyErrorMessage(error);

        this.notificationManager.error(errorMessage);
    }

    getUserFriendlyErrorMessage(error) {
        if (!error.message) {
            return 'Failed to update public status';
        }

        if (error.message.includes('own images') || error.message.includes('not authorized')) {
            return 'You can only update your own images';
        }

        if (error.message.includes('Authentication required') || error.message.includes('Unauthorized')) {
            return 'Authentication error - please refresh the page';
        }

        return error.message;
    }

    // ========================================
    // EVENT CLEANUP & UTILITIES
    // ========================================

    cleanupEvents() {
        if (this.currentKeyHandler) {
            document.removeEventListener('keydown', this.currentKeyHandler);
            this.currentKeyHandler = null;
        }

        if (this.currentClickHandler && this.imageManager.fullscreenContainer) {
            this.imageManager.fullscreenContainer.removeEventListener('click', this.currentClickHandler);
            this.currentClickHandler = null;
        }

        if (this.touchHandler) {
            this.touchHandler.cleanup();
        }
    }

    reSetupEventDelegation() {
        this.setupEventDelegation();
    }

    // Method to re-setup touch events when fullscreen container is created
    reSetupTouchEvents() {
        console.log('🔍 IMAGE EVENTS: Re-setting up touch events');
        this.setupTouchEvents();
    }

    // Debug method to test touch events manually
    debugTouchEvents() {
        console.log('🔍 IMAGE EVENTS: Debug touch events');
        console.log('ImageManager fullscreen container:', this.imageManager?.fullscreenContainer);
        console.log('DOM fullscreen container:', document.querySelector('.full-screen'));
        console.log('Touch handler:', this.touchHandler);
        this.setupTouchEvents();
    }

    updateListViewCheckboxIfExists(imageId, isPublic) {
        // Find the list view checkbox for this image
        const listCheckbox = document.querySelector(`#public-toggle-list-${imageId}`);

        if (listCheckbox) {
            listCheckbox.checked = isPublic;
            console.log(`🔄 Updated list view checkbox for image ${imageId} to ${isPublic}`);
        }

        // Also update the compact view checkbox if it exists
        const compactCheckbox = document.querySelector(`#public-toggle-compact-${imageId}`);

        if (compactCheckbox) {
            compactCheckbox.checked = isPublic;
            console.log(`🔄 Updated compact view checkbox for image ${imageId} to ${isPublic}`);
        }
    }

    // ========================================
    // FALLBACK METHODS (when modules not available)
    // ========================================

    findImageContainer() {
        if (window.ImageDetection) {
            return window.ImageDetection.findImageContainer();
        }

        return document.querySelector('.prompt-output') || document.querySelector('.images-section');
    }

    getImageFromEvent(event) {
        if (window.ImageDetection) {
            return window.ImageDetection.getImageFromEvent(event);
        }

        return event.target.closest('img');
    }

    isFullscreenActive() {
        if (window.ImageDetection) {
            return window.ImageDetection.isFullscreenActive();
        }
        const fullscreenContainer = document.querySelector('.fullscreen-container, .full-screen');
        const isFullscreenVisible = fullscreenContainer &&
            fullscreenContainer.style.display !== 'none' &&
            fullscreenContainer.offsetParent !== null;

        return isFullscreenVisible || document.body.classList.contains('fullscreen-active');
    }

    isGeneratedImage(img) {
        if (window.ImageDetection) {
            return window.ImageDetection.isGeneratedImage(img);
        }

        return img.classList.contains('generated-image')
            || img.style.cursor === 'pointer'
            || img.dataset.id
            || img.src.includes('uploads/')
            || img.alt.includes('Generated')
            || img.title.includes('Generated');
    }

    canUserModifyImage(imageData) {
        if (window.AuthUtils) {
            return window.AuthUtils.canUserModifyImage(imageData);
        }
        // Fallback logic
        if (!imageData || !imageData.id) {
            return false;
        }
        const isAuthenticated = window.userApi && window.userApi.isAuthenticated();

        if (!isAuthenticated) {
            return false;
        }
        const currentUserId = this.getCurrentUserId();

        if (!imageData.userId) {
            return true;
        }

        return currentUserId && imageData.userId === currentUserId;
    }

    getCurrentUserId() {
        if (window.AuthUtils) {
            return window.AuthUtils.getCurrentUserId();
        }
        // Fallback logic
        if (window.userApi && window.userApi.getCurrentUser) {
            const user = window.userApi.getCurrentUser();

            return user?.id || user?._id;
        }
        try {
            const token = localStorage.getItem('authToken');

            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));

                return payload.userId || payload.id;
            }
        } catch (error) {
            console.warn('Could not decode auth token:', error);
        }

        return null;
    }

    // ========================================
    // INFO BOX STATE PERSISTENCE
    // ========================================
    //
    // Usage Examples:
    //
    // 1. Normal behavior (remembers last state):
    //    - User toggles info box → state saved automatically
    //    - Page refresh → info box opens in last saved state (defaults to collapsed)
    //    - Image change → info box opens in last saved state
    //
    // 2. Force keep info boxes open:
    //    imageEvents.setInfoBoxKeepOpen(true);  // Always keep open
    //    imageEvents.setInfoBoxKeepOpen(false); // Normal toggle behavior
    //
    // 3. Reset to default (collapsed):
    //    imageEvents.saveInfoBoxState(false);
    //

    getInfoBoxState() {
        try {
            const saved = localStorage.getItem('infoBoxExpanded');

            return saved !== null ? JSON.parse(saved) : false; // Default to collapsed
        } catch (error) {
            console.warn('Could not retrieve info box state:', error);

            return false; // Default to collapsed on error
        }
    }

    // Method to clear info box state (useful for resetting to default)
    clearInfoBoxState() {
        try {
            localStorage.removeItem('infoBoxExpanded');
            console.log('🔍 Cleared info box state from localStorage');
        } catch (error) {
            console.warn('Could not clear info box state:', error);
        }
    }

    // Method to reset info box to new default behavior (one-time)
    resetInfoBoxToNewDefault() {
        try {
            // Check if we've already reset to the new default
            const hasReset = localStorage.getItem('infoBoxDefaultReset');

            if (!hasReset) {
                // Clear the old state and mark as reset
                localStorage.removeItem('infoBoxExpanded');
                localStorage.setItem('infoBoxDefaultReset', 'true');
                console.log('🔍 Reset info box to new default behavior (collapsed)');
            }
        } catch (error) {
            console.warn('Could not reset info box to new default:', error);
        }
    }

    saveInfoBoxState(isExpanded) {
        try {
            localStorage.setItem('infoBoxExpanded', JSON.stringify(isExpanded));
            console.log('🔍 Saved info box state:', isExpanded);
        } catch (error) {
            console.warn('Could not save info box state:', error);
        }
    }

    // Utility method to force keep info boxes open
    setInfoBoxKeepOpen(keepOpen = true) {
        try {
            localStorage.setItem('infoBoxKeepOpen', JSON.stringify(keepOpen));
            console.log('🔍 Set info box keep open:', keepOpen);
        } catch (error) {
            console.warn('Could not set info box keep open:', error);
        }
    }

    getInfoBoxKeepOpen() {
        try {
            const saved = localStorage.getItem('infoBoxKeepOpen');

            return saved !== null ? JSON.parse(saved) : false;
        } catch (error) {
            console.warn('Could not retrieve info box keep open state:', error);

            return false;
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.ImageEvents = ImageEvents;
}
