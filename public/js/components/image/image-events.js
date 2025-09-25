
// Image Event Layer - Event handling and user interactions
// Dependencies: TouchEventHandler, NotificationManager, AuthUtils, ImageDetection
class ImageEvents {
    constructor(imageManager) {
        // console.log('🔍 IMAGE EVENTS: Constructor called with imageManager:', imageManager);
        this.imageManager = imageManager;
        this.currentKeyHandler = null;
        this.currentClickHandler = null;


        // Debug module availability
        // console.log('🔍 Available modules:', {
        //     TouchEventHandler: typeof window.TouchEventHandler,
        //     NotificationManager: typeof window.NotificationManager,
        //     ImageDetection: typeof window.ImageDetection,
        //     AuthUtils: typeof window.AuthUtils
        // });

        // Initialize with fallbacks
        this.touchHandler = this.createTouchHandler(imageManager);
        this.notificationManager = this.createNotificationManager();
        // console.log('🔍 IMAGE EVENTS: ImageEvents instance created');
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
        const imageContainer = this.findImageContainer();

        if (imageContainer) {

            imageContainer.addEventListener('click', e => {
                this.handleImageClick(e);
            });

        } else {
            console.warn('⚠️ No image container found for event delegation');
        }
    }

    handleImageClick(e) {
        const img = this.getImageFromEvent(e);

        if (!img) {
            return;
        }

        // Check if we're already in fullscreen mode to avoid conflicts
        if (this.isFullscreenActive()) {
            return;
        }

        const isGeneratedImage = this.isGeneratedImage(img);

        if (!isGeneratedImage) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const imageData = this.imageManager.data.extractImageDataFromElement(img);

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

        if (!fullscreenContainer) {
            console.warn('⚠️ No fullscreen container found for touch events');
            // Try again after a short delay in case container is created later
            setTimeout(() => {
                fullscreenContainer = this.imageManager?.fullscreenContainer || document.querySelector('.full-screen');
                if (fullscreenContainer) {
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

    setupNavigationButtonEvents(_navControls, _imageData) {
        // Navigation is now handled by UnifiedNavigation
        // This method is kept for backward compatibility but does nothing
        // The UnifiedNavigation system handles all navigation controls
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
        // Use centralized auth utils for consistency
        if (window.UnifiedAuthUtils) {
            return window.UnifiedAuthUtils.shouldShowPublicToggle(imageData);
        }

        // Fallback to local implementation
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

        // Use unified public status service
        if (window.PublicStatusService) {
            const success = await window.PublicStatusService.updatePublicStatus(currentImage.id, newPublicStatus, {
                updateDOM: true,
                showNotifications: true,
                updateCache: true
            });

            if (success) {
                this.handlePublicStatusSuccess(currentImage.id, newPublicStatus);
            } else {
                this.handlePublicStatusFailure(checkbox, newPublicStatus);
            }
        } else {
            // Fallback to original implementation
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
        this.setupTouchEvents();
    }

    // Debug method to test touch events manually
    debugTouchEvents() {
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
        // Use centralized auth utils for consistency
        if (window.UnifiedAuthUtils) {
            return window.UnifiedAuthUtils.canUserModifyImage(imageData);
        }

        // Fallback to existing AuthUtils if available
        if (window.AuthUtils) {
            return window.AuthUtils.canUserModifyImage(imageData);
        }

        // Final fallback logic
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
        // Use centralized auth utils for consistency
        if (window.UnifiedAuthUtils) {
            return window.UnifiedAuthUtils.getCurrentUserId();
        }

        // Fallback to existing AuthUtils if available
        if (window.AuthUtils) {
            return window.AuthUtils.getCurrentUserId();
        }

        // Final fallback logic
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

}

// Export for global access
if (typeof window !== 'undefined') {
    window.ImageEvents = ImageEvents;
}
