/* global ImageUI, ImageEvents */
// Image Manager - Business logic layer orchestrating UI, events, and data
class ImageManager {
    constructor() {
        // Initialize UI with retry mechanism
        this.ui = null;
        this.initializeUI();

        this.data = new ImageData();
        this.events = new ImageEvents(this);
        this.fullscreenContainer = null;
        this.currentFullscreenImage = null;
        this.isInitialized = false;
    }

    initializeUI() {
        if (typeof window.ImageUI !== 'undefined') {
            this.ui = new window.ImageUI();
        } else {
            setTimeout(() => this.initializeUI(), 100);
        }
    }

    init() {
        if (!this.ui) {
            setTimeout(() => this.init(), 100);
            return;
        }

        // DISABLED: Old navigation system conflicts with optimized navigation
        // this.setupFullscreenContainer();
        // this.events.setupEventDelegation();
        this.isInitialized = true;
    }

    // Initialization Methods
    setupFullscreenContainer() {
        if (!this.ui || !this.ui.config) {
            return;
        }

        if (typeof Utils !== 'undefined' && Utils.dom) {
            this.fullscreenContainer = Utils.dom.get(this.ui.config.selectors.fullscreenContainer);
        } else {
            this.fullscreenContainer = document.querySelector(this.ui.config.selectors.fullscreenContainer);
        }

        if (!this.fullscreenContainer) {
            this.fullscreenContainer = this.ui.createFullscreenContainer();
            document.body.appendChild(this.fullscreenContainer);
        }
    }

    // Public API Methods
    initialize() {
        this.init();
    }

    refresh() {
        const images = this.data.getAllCachedImages();
        const _container = document.querySelector('.prompt-output');

        if (_container && images.length > 0) {
            _container.innerHTML = '';
            this.renderImages(images, _container);
        }
    }

    reSetupEventDelegation() {
        this.events.reSetupEventDelegation();
    }

    // Image Rendering Methods
    renderImage(imageData, _container) {
        if (!this.data.validateImageData(imageData)) {
            return null;
        }

        const wrapper = this.ui.createImageWrapper(imageData);

        _container.appendChild(wrapper);

        // Cache the image
        this.data.cacheImage({
            ...imageData,
            element: wrapper
        });

        return wrapper;
    }

    renderImages(images, _container) {
        if (!Array.isArray(images)) {
            return [];
        }

        const renderedImages = [];

        images.forEach(imageData => {
            const rendered = this.renderImage(imageData, _container);

            if (rendered) {
                renderedImages.push(rendered);
            }
        });

        return renderedImages;
    }

    // TEMPORARY: Force fresh data load to bypass cache issues
    async forceFreshDataLoad(imageId) {
        console.log('🔄 TEMPORARY: Forcing fresh data load for image:', imageId);
        console.log('🔍 DEBUG: imageId type:', typeof imageId);
        console.log('🔍 DEBUG: imageId value:', imageId);
        try {
            // Make a direct API call to get fresh data
            const response = await window.imageApi.getImage(imageId);

            if (response && response.data) {
                const freshData = this.data.normalizeImageData(response.data);

                this.data.cacheImage(freshData);
                console.log('✅ TEMPORARY: Fresh data loaded and cached:', {
                    id: freshData.id,
                    isPublic: freshData.isPublic,
                    userId: freshData.userId
                });

                return freshData;
            }
        } catch (error) {
            console.warn('⚠️ TEMPORARY: Failed to load fresh data:', error);
        }

        return null;
    }

    // Fullscreen Methods
    async openFullscreen(imageData) {

        if (!this.fullscreenContainer) {
            this.setupFullscreenContainer();
        }

        console.log('🔍 FULLSCREEN: Opening fullscreen with data:', {
            id: imageData.id,
            isPublic: imageData.isPublic,
            userId: imageData.userId,
            allFields: Object.keys(imageData)
        });

        // Check if we have a valid image ID
        if (!imageData.id || imageData.id === 'unknown') {
            console.error('❌ FULLSCREEN: Invalid image ID:', imageData.id);

            return;
        }

        // First, try to get the most up-to-date data from cache
        const cachedImage = this.data.getCachedImage(imageData.id);

        if (cachedImage) {
            console.log(`🔄 Using cached data for fullscreen: ${imageData.id}`, {
                isPublic: cachedImage.isPublic,
                userId: cachedImage.userId
            });
            this.currentFullscreenImage = cachedImage;
        } else {
            console.log(`⚠️ No cached data found, using provided data for fullscreen: ${imageData.id}`);
            // Normalize the provided data to ensure it has all required fields
            this.currentFullscreenImage = this.data.normalizeImageData(imageData);
        }

        this.fullscreenContainer.innerHTML = '';

        // Ensure we have the latest data from cache (fallback)
        this.reloadCurrentImageData();

        const imageContainer = this.ui.createFullscreenImageContainer(this.currentFullscreenImage);
        const infoBox = this.ui.createInfoBox(this.currentFullscreenImage);
        const navControls = this.ui.createNavigationControls();

        // Setup navigation events
        this.events.setupNavigationButtonEvents(navControls, this.currentFullscreenImage);

        // Setup rating display events (rating is now in metadata, not separate element)
        const { spacer } = this.events.setupRatingDisplayEvents(null, infoBox);

        // Setup info box toggle functionality
        this.events.setupToggleButtonEvents(infoBox.querySelector('.info-box-toggle'), infoBox);

        // Setup public status toggle events
        const publicToggle = infoBox.querySelector('.info-box-public-toggle');
        if (publicToggle) {
            this.events.setupPublicStatusToggleEvents(publicToggle);
        }

        // Add spacer to navigation controls
        navControls.appendChild(spacer);

        // Add image container to fullscreen container
        this.fullscreenContainer.appendChild(imageContainer);

        // Add navigation controls directly to fullscreen container (positioned independently)
        this.fullscreenContainer.appendChild(navControls);

        // Add info box directly to fullscreen container (positioned independently)
        this.fullscreenContainer.appendChild(infoBox);
        this.fullscreenContainer.style.display = 'flex';

        // Disable infinite scroll when in fullscreen
        this.disableInfiniteScroll();

        // Setup fullscreen events
        this.events.setupFullscreenEvents();
    }

    closeFullscreen() {
        if (this.fullscreenContainer) {
            this.fullscreenContainer.style.display = 'none';
            this.currentFullscreenImage = null;

            // Re-enable infinite scroll when exiting fullscreen
            this.enableInfiniteScroll();

            // Clean up event listeners
            this.events.cleanupEvents();
        }
    }

    // Navigation Methods
    navigateImage(direction) {

        const allImages = this.data.getAllVisibleImages();

        if (allImages.length === 0) {

            return;
        }

        let targetImage = null;

        if (direction === 'next') {
            // TODO: Refactor nested ternary
            targetImage = this.data.getNextImage(this.currentFullscreenImage?.id);
        } else if (direction === 'prev') {
            targetImage = this.data.getPreviousImage(this.currentFullscreenImage?.id);
        }

        if (targetImage) {
            this.openFullscreen(targetImage);
        } else { /* Empty block */ }
    }

    // Image Management Methods
    removeImage(imageId) {
        const cached = this.data.getCachedImage(imageId);

        if (cached && cached.element) {
            cached.element.remove();
            this.data.removeCachedImage(imageId);

            return true;
        }

        return false;
    }

    updateImageRating(imageId, rating) {
        if (!this.data.validateRating(rating)) {
            return false;
        }

        const cached = this.data.getCachedImage(imageId);

        if (cached) {
            this.data.updateCachedImage(imageId, { rating });

            // Update DOM element
            if (cached.element) {
                cached.element.dataset.rating = rating.toString();
                const ratingElement = cached.element.querySelector(`.${this.ui.config.classes.rating}`);

                if (ratingElement) {
                    ratingElement.textContent = `★ ${rating}`;
                }
            }

            return true;
        }

        return false;
    }

    async updateImagePublicStatus(imageId, isPublic) {
        if (!imageId || typeof isPublic !== 'boolean') {

            console.error('Invalid parameters for updating public status');

            return false;
        }

        try {
            // Call the API using centralized service
            if (typeof window.imageApi !== 'undefined' && window.imageApi.updatePublicStatus) {
                await window.imageApi.updatePublicStatus(imageId, isPublic);
            } else {

                console.warn('imageApi not available, skipping public status update');

                return false;
            }

            // Update the cached image data
            const cached = this.data.getCachedImage(imageId);

            console.log('🔍 CACHE UPDATE: getCachedImage result:', {
                imageId,
                found: !!cached,
                isPublic: cached?.isPublic,
                userId: cached?.userId
            });

            if (cached) {
                const oldStatus = cached.isPublic;

                this.data.updateCachedImage(imageId, { isPublic });
                console.log(`📝 Updated cached image ${imageId} isPublic from ${oldStatus} to ${isPublic}`);

                // Also update the DOM element's dataset to keep it in sync
                this.updateDOMElementDataset(imageId, { isPublic });
            } else {
                console.log('⚠️ CACHE UPDATE: No cached image found, cannot update cache');
            }

            // Update current fullscreen image if it's the same
            if (this.currentFullscreenImage && this.currentFullscreenImage.id === imageId) {
                this.currentFullscreenImage.isPublic = isPublic;
                console.log(`📝 Updated current fullscreen image isPublic to ${isPublic}`);

                // Trigger UI refresh to update the checkbox state
                this.refreshFullscreenUI();
            }

            // Update tab service if available
            if (window.feedManager && window.feedManager.tabService) {
                const cached = this.data.getCachedImage(imageId);

                if (cached) {
                    window.feedManager.tabService.updateImage(imageId, {
                        isPublic,
                        userId: cached.userId
                    });
                }
            }

            // Update view manager if available
            if (window.feedManager && window.feedManager.viewManager) {
                window.feedManager.viewManager.updateImageInView(imageId, { isPublic });
            }

            return true;
        } catch (error) {

            console.error('Failed to update public status:', error);

            return false;
        }
    }

    /**
     * Refresh the fullscreen UI to reflect current data state
     */
    refreshFullscreenUI() {
        if (!this.currentFullscreenImage || !this.fullscreenContainer) {
            return;
        }

        // Update the public status checkbox
        const publicToggle = this.fullscreenContainer.querySelector('.public-status-toggle-container');

        if (publicToggle) {
            const checkbox = publicToggle.querySelector('.public-status-checkbox');

            if (checkbox) {
                const currentStatus = this.currentFullscreenImage.isPublic || false;

                checkbox.checked = currentStatus;
                console.log(`🔄 Refreshed checkbox state to ${currentStatus}`);
            }
        }

        // Update the info box status display
        const infoBox = this.fullscreenContainer.querySelector('.info-box');

        if (infoBox) {
            const statusElement = infoBox.querySelector('p');

            if (statusElement && statusElement.innerHTML.includes('Status:')) {
                const currentStatus = this.currentFullscreenImage.isPublic ? 'Public' : 'Private';

                statusElement.innerHTML = `<strong>Status:</strong> ${currentStatus}`;
                console.log(`🔄 Refreshed info box status to ${currentStatus}`);
            }
        }
    }

    /**
     * Reload current image data from cache to ensure consistency
     */
    reloadCurrentImageData() {
        if (!this.currentFullscreenImage || !this.currentFullscreenImage.id) {
            return;
        }

        const cachedImage = this.data.getCachedImage(this.currentFullscreenImage.id);

        if (cachedImage) {
            console.log(`🔄 Before reload - current image isPublic: ${this.currentFullscreenImage.isPublic}`);
            console.log(`🔄 Before reload - cached image isPublic: ${cachedImage.isPublic}`);

            // Update the current fullscreen image with cached data
            Object.assign(this.currentFullscreenImage, cachedImage);
            console.log(`🔄 After reload - current image isPublic: ${this.currentFullscreenImage.isPublic}`);
            console.log(`🔄 Reloaded image data for ${this.currentFullscreenImage.id}`);

            // Refresh the UI to reflect the updated data
            this.refreshFullscreenUI();
        } else {
            console.log(`⚠️ No cached data found for image ${this.currentFullscreenImage.id}`);
        }
    }

    async rateImageInFullscreen(rating) {
        if (!this.currentFullscreenImage || !this.currentFullscreenImage.id) {
            console.error('No image data available for rating');

            return;
        }

        // Update the image data first (regardless of API success)
        this.currentFullscreenImage.rating = rating;

        // Update the rating in the metadata grid
        const infoBox = this.fullscreenContainer.querySelector('.info-box');

        if (infoBox) {
            // Find the rating metadata item
            const ratingItem = infoBox.querySelector('.rating-item .info-box-meta-value');

            if (ratingItem) {
                // Format the rating using the same method as the initial display
                const stars = '★'.repeat(rating);
                const emptyStars = '☆'.repeat(5 - rating);
                ratingItem.textContent = rating > 0 ? `${stars}${emptyStars} (${rating}/5)` : 'Not rated';
            }
        }

        // Update the grid view
        this.updateImageRating(this.currentFullscreenImage.id, rating);

        // Show simple feedback
        console.log(`✅ Rating updated to ${rating}/5`);

        // Try to call the rating API (but don't let it block the UI update)
        try {
            if (typeof window.imageApi !== 'undefined' && window.imageApi.rateImage) {
                await window.imageApi.rateImage(this.currentFullscreenImage.id, rating);
                console.log('✅ Rating saved to server');
            } else {
                console.warn('imageApi not available, skipping rating update');
            }
        } catch (error) {
            console.error('Error saving rating to server:', error);
            // Don't show error to user since UI was updated successfully
        }
    }

    // Download Methods
    downloadImage(imageData) {
        const link = document.createElement('a');

        link.href = imageData.url;
        link.download = `${this.data.makeFileNameSafe(imageData.title || 'image')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Utility Methods
    getImageById(imageId) {
        return this.data.getImageById(imageId);
    }

    getAllImages() {
        return this.data.getAllCachedImages();
    }

    clearAllImages() {
        this.data.clearImageCache();
        const _container = document.querySelector('.prompt-output');

        if (_container) {
            _container.innerHTML = '';
        }
    }

    clearImageOrderCache() {
        this.data.clearImageOrderCache();
    }

    // Scroll Management Methods
    disableInfiniteScroll() {
        if (window.feedManager && window.feedManager.intersectionObserver) {

            window.feedManager.intersectionObserver.disconnect();
        }
    }

    enableInfiniteScroll() {
        if (window.feedManager) {

            setTimeout(() => {
                if (window.feedManager.setupLazyLoading) {
                    window.feedManager.setupLazyLoading();
                }
                if (window.feedManager.updateLazyLoadingTarget) {
                    window.feedManager.updateLazyLoadingTarget();
                }

            }, 100);
        }
    }

    // Error Handling
    showError(message) {
        console.error('❌ Error:', message);
        // Could integrate with a notification system here
    }

    // Statistics Methods
    getImageStats() {
        return this.data.getImageStats();
    }

    // Export/Import Methods
    exportImageData() {
        return this.data.exportImageData();
    }

    /**
     * Update DOM element's dataset attributes to keep them in sync with cache
     * @param {string} imageId - The image ID
     * @param {Object} updates - Object containing the fields to update
     */
    updateDOMElementDataset(imageId, updates) {
        // Find the image element in the DOM
        const imgElement = document.querySelector(`img[data-id="${imageId}"], img[data-image-id="${imageId}"]`);

        if (imgElement) {
            // Update the dataset attributes
            Object.keys(updates).forEach(key => {
                if (key === 'isPublic') {
                    imgElement.dataset.isPublic = updates[key];
                } else if (key === 'userId') {
                    imgElement.dataset.userId = updates[key];
                } else if (key === 'rating') {
                    imgElement.dataset.rating = updates[key];
                }
                // Add more fields as needed
            });

            console.log(`📝 Updated DOM dataset for ${imageId}:`, updates);
        } else {
            console.log(`⚠️ Could not find DOM element for image ${imageId}`);
        }
    }

    importImageData(data) {
        return this.data.importImageData(data);
    }

    // Backward Compatibility Methods
    renderImageGlobal(imageData, _container) {
        return this.renderImage(imageData, _container);
    }

    openFullscreenGlobal(imageData) {
        return this.openFullscreen(imageData);
    }

    closeFullscreenGlobal() {
        return this.closeFullscreen();
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.ImageManager = ImageManager;
}
