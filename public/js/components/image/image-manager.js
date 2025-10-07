/* global ImageEvents */
// Image Manager - Business logic layer orchestrating UI, events, and data
class ImageManager {
    constructor() {
        this.ui = null;
        this.data = new ImageData();
        this.events = new ImageEvents(this);
        this.fullscreenContainer = null;
        this.currentFullscreenImage = null;
        this.isInitialized = false;
        this.domCache = new Map(); // Cache for DOM elements
        this.cleanupFunctions = []; // Track cleanup functions
        this.navigation = null; // UnifiedNavigation instance

        // Initialize UI when available
        this.initializeUI();
        this.initializeNavigation();
    }

    initializeNavigation() {
        // Use the global navigation instance from ImageComponent if available
        if (window.imageNavigation) {
            this.navigation = window.imageNavigation;
        } else if (typeof window.UnifiedNavigation !== 'undefined') {
            this.navigation = new window.UnifiedNavigation();
        } else {
            // Retry when UnifiedNavigation becomes available
            const checkNavigation = () => {
                if (window.imageNavigation) {
                    this.navigation = window.imageNavigation;
                } else if (typeof window.UnifiedNavigation !== 'undefined') {
                    this.navigation = new window.UnifiedNavigation();
                } else {
                    setTimeout(checkNavigation, 100);
                }
            };

            checkNavigation();
        }
    }

    initializeUI() {
        if (typeof window.ImageUI !== 'undefined') {
            this.ui = new window.ImageUI();
            this.isInitialized = true;
        } else {
            // Use event-driven approach instead of polling
            document.addEventListener('DOMContentLoaded', () => this.initializeUI());
            window.addEventListener('load', () => this.initializeUI());
        }
    }

    init() {
        if (!this.ui) {
            this.initializeUI();

            return;
        }

        this.isInitialized = true;

        // Setup event delegation for image clicks
        this.events.setupEventDelegation();
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

    // Load fresh image data with tags
    async forceFreshDataLoad(imageId) {
        try {
            const [imageResponse, tagsResponse] = await Promise.allSettled([
                window.imageApi.getImage(imageId),
                window.imageApi.getImageTags(imageId)
            ]);

            if (imageResponse.status === 'fulfilled' && imageResponse.value?.data) {
                const freshData = this.data.normalizeImageData(imageResponse.value.data);

                // Add tags if available
                if (tagsResponse.status === 'fulfilled' && tagsResponse.value?.data) {
                    freshData.tags = tagsResponse.value.data;
                } else {
                    freshData.tags = [];
                }

                this.data.cacheImage(freshData);

                return freshData;
            }
        } catch (error) {
            console.warn('Failed to load fresh data:', error);
        }

        return null;
    }

    // Fullscreen Methods
    async openFullscreen(imageData) {
        if (!this.navigation) {
            console.warn('UnifiedNavigation not available, falling back to legacy method');

            return this.openFullscreenLegacy(imageData);
        }

        // Find the image element in DOM and delegate to UnifiedNavigation
        const img = document.querySelector(`img[data-id="${imageData.id}"], img[data-image-id="${imageData.id}"]`);

        if (img) {
            this.navigation.openFullscreen(img);
        } else {
            console.warn('Image element not found in DOM, falling back to legacy method');

            return this.openFullscreenLegacy(imageData);
        }
    }

    // Legacy fullscreen method (kept for fallback)
    async openFullscreenLegacy(imageData) {
        if (!this.validateAndPrepareFullscreen(imageData)) {
            return;
        }
        this.prepareFullscreenContainer();
        this.setupFullscreenComponents();
        this.displayFullscreen();
        this.setupFullscreenBehavior();
    }

    /**
     * Validate and prepare image data for fullscreen display
     * @param {Object} imageData - Image data to validate
     * @returns {boolean} True if valid and prepared
     */
    validateAndPrepareFullscreen(imageData) {
        if (!this.fullscreenContainer) {
            this.setupFullscreenContainer();
        }

        // Check if we have a valid image ID
        if (!imageData.id || imageData.id === 'unknown') {
            return false;
        }

        // Get the most up-to-date data from cache or normalize provided data
        this.prepareImageData(imageData);

        return true;
    }

    /**
     * Prepare image data for fullscreen display (consolidated)
     * @param {Object} imageData - Image data to prepare
     */
    prepareImageData(imageData) {
        const cachedImage = this.data.getCachedImage(imageData.id);

        if (cachedImage) {
            // Use cached data but prioritize fresh data from API response
            this.currentFullscreenImage = { ...cachedImage, ...imageData };
        } else {
            this.currentFullscreenImage = this.data.normalizeImageData(imageData);
        }
    }

    /**
     * Prepare the fullscreen container for display
     */
    prepareFullscreenContainer() {
        this.fullscreenContainer.innerHTML = '';
    }

    /**
     * Setup all fullscreen components and their events
     */
    setupFullscreenComponents() {
        const imageContainer = this.ui.createFullscreenImageContainer(this.currentFullscreenImage);
        const infoBox = this.ui.createInfoBox(this.currentFullscreenImage);
        const navControls = this.ui.createNavigationControls();

        // Setup all component events
        this.setupComponentEvents(navControls, infoBox);

        // Store components for display
        this.fullscreenComponents = { imageContainer, infoBox, navControls };

        // Ensure UI reflects current data state
        this.refreshFullscreenUI();
    }

    /**
     * Setup events for all fullscreen components
     * @param {HTMLElement} navControls - Navigation controls element
     * @param {HTMLElement} infoBox - Info box element
     */
    setupComponentEvents(navControls, infoBox) {
        // Setup navigation events
        this.events.setupNavigationButtonEvents(navControls, this.currentFullscreenImage);

        // Setup rating display events
        const { spacer } = this.events.setupRatingDisplayEvents(null, infoBox);

        // Info box toggle functionality is now handled in unified-info-box.js

        // Setup public status toggle events
        const publicToggle = infoBox.querySelector('.info-box-public-toggle');

        if (publicToggle) {
            this.events.setupPublicStatusToggleEvents(publicToggle);
        }

        // Add spacer to navigation controls
        navControls.appendChild(spacer);
    }

    /**
     * Display the fullscreen components
     */
    displayFullscreen() {
        const { imageContainer, infoBox, navControls } = this.fullscreenComponents;

        // Add all components to fullscreen container
        this.fullscreenContainer.appendChild(imageContainer);
        this.fullscreenContainer.appendChild(navControls);
        this.fullscreenContainer.appendChild(infoBox);
        this.fullscreenContainer.style.display = 'flex';
    }

    /**
     * Setup fullscreen behavior (scroll, events)
     */
    setupFullscreenBehavior() {
        // Disable infinite scroll when in fullscreen
        this.disableInfiniteScroll();

        // Setup fullscreen events
        this.events.setupFullscreenEvents();
    }

    closeFullscreen() {
        if (this.navigation) {
            this.navigation.closeFullscreen();
            // Re-enable infinite scroll when exiting fullscreen
            this.enableInfiniteScroll();
        } else if (this.fullscreenContainer) {
            // Legacy fallback
            this.fullscreenContainer.style.display = 'none';
            this.currentFullscreenImage = null;
            this.enableInfiniteScroll();
            this.cleanupFullscreenComponents();
        }
    }

    /**
     * Clean up fullscreen components and event listeners
     */
    cleanupFullscreenComponents() {
        // Clean up stored components
        if (this.fullscreenComponents) {
            this.fullscreenComponents = null;
        }

        // Run cleanup functions
        this.cleanupFunctions.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.warn('Error during cleanup:', error);
            }
        });
        this.cleanupFunctions = [];

        // Clean up events
        this.events.cleanupEvents();
    }

    // Navigation Methods
    navigateImage(direction) {
        if (this.navigation) {
            // Delegate to UnifiedNavigation
            if (direction === 'next') {
                this.navigation.navigateNext();
            } else if (direction === 'prev') {
                this.navigation.navigatePrevious();
            }
        } else {
            // Legacy fallback
            const allImages = this.data.getAllVisibleImages();

            if (allImages.length === 0) {
                return;
            }

            let targetImage = null;

            if (direction === 'next') {
                targetImage = this.data.getNextImage(this.currentFullscreenImage?.id);
            } else if (direction === 'prev') {
                targetImage = this.data.getPreviousImage(this.currentFullscreenImage?.id);
            }

            if (targetImage) {
                this.openFullscreenLegacy(targetImage);
            }
        }
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

    // DEPRECATED: Use PublicStatusService.updatePublicStatus() instead
    // This method is kept for backward compatibility only
    async updateImagePublicStatus(imageId, isPublic) {
        console.warn('⚠️ DEPRECATED: ImageManager.updateImagePublicStatus() is deprecated. Use PublicStatusService.updatePublicStatus() instead.');
        if (!this.validatePublicStatusParams(imageId, isPublic)) {
            return false;
        }

        try {
            await this.updatePublicStatusViaAPI(imageId, isPublic);
            this.updateCachedImageData(imageId, isPublic);
            this.updateFullscreenImageIfCurrent(imageId, isPublic);
            this.updateFeedManagers(imageId, isPublic);

            return true;
        } catch (error) {
            console.error('Failed to update public status:', error);

            return false;
        }
    }

    /**
     * Validate parameters for public status update
     * @param {string} imageId - Image ID to validate
     * @param {boolean} isPublic - Public status to validate
     * @returns {boolean} True if parameters are valid
     */
    validatePublicStatusParams(imageId, isPublic) {
        if (!imageId || typeof isPublic !== 'boolean') {
            console.error('Invalid parameters for updating public status');

            return false;
        }

        return true;
    }

    /**
     * Update public status via API
     * @param {string} imageId - Image ID to update
     * @param {boolean} isPublic - New public status
     */
    async updatePublicStatusViaAPI(imageId, isPublic) {
        if (typeof window.imageApi !== 'undefined' && window.imageApi.updatePublicStatus) {
            await window.imageApi.updatePublicStatus(imageId, isPublic);
        } else {
            console.warn('imageApi not available, skipping public status update');
            throw new Error('API not available');
        }
    }

    /**
     * @deprecated Use PublicStatusService.updatePublicStatus() instead
     * Update cached image data with new public status
     * @param {string} imageId - Image ID to update
     * @param {boolean} isPublic - New public status
     */
    updateCachedImageData(imageId, isPublic) {
        console.warn('⚠️ DEPRECATED: updateCachedImageData() is deprecated. Use PublicStatusService instead.');
        const cached = this.data.getCachedImage(imageId);

        if (cached) {
            this.data.updateCachedImage(imageId, { isPublic });
            this.updateDOMElementDataset(imageId, { isPublic });
        }
    }

    /**
     * @deprecated Use PublicStatusService.updatePublicStatus() instead
     * Update fullscreen image if it's the current one
     * @param {string} imageId - Image ID to check
     * @param {boolean} isPublic - New public status
     */
    updateFullscreenImageIfCurrent(imageId, isPublic) {
        console.warn('⚠️ DEPRECATED: updateFullscreenImageIfCurrent() is deprecated. Use PublicStatusService instead.');
        if (this.currentFullscreenImage && this.currentFullscreenImage.id === imageId) {
            this.currentFullscreenImage.isPublic = isPublic;
            this.refreshFullscreenUI();
        }
    }

    /**
     * Update feed managers with new public status
     * @param {string} imageId - Image ID to update
     * @param {boolean} isPublic - New public status
     */
    updateFeedManagers(imageId, isPublic) {
        this.updateTabService(imageId, isPublic);
        this.updateViewManager(imageId, isPublic);
    }

    /**
     * Update tab service if available
     * @param {string} imageId - Image ID to update
     * @param {boolean} isPublic - New public status
     */
    updateTabService(imageId, isPublic) {
        if (window.feedManager && window.feedManager.tabService) {
            const cached = this.data.getCachedImage(imageId);

            if (cached) {
                window.feedManager.tabService.updateImage(imageId, {
                    isPublic,
                    userId: cached.userId
                });
            }
        }
    }

    /**
     * Update view manager if available
     * @param {string} imageId - Image ID to update
     * @param {boolean} isPublic - New public status
     */
    updateViewManager(imageId, isPublic) {
        if (window.feedManager && window.feedManager.viewManager) {
            window.feedManager.viewManager.updateImageInView(imageId, { isPublic });
        }
    }

    /**
     * Refresh the fullscreen UI to reflect current data state
     */
    refreshFullscreenUI() {
        if (!this.currentFullscreenImage || !this.fullscreenContainer) {
            return;
        }

        // Batch DOM updates
        requestAnimationFrame(() => {
            // Update the public status checkbox
            const publicToggle = this.fullscreenContainer.querySelector('.info-box-public-toggle');

            if (publicToggle) {
                const checkbox = publicToggle.querySelector('.public-status-checkbox');

                if (checkbox) {
                    checkbox.checked = this.currentFullscreenImage.isPublic || false;
                }
            }

            // Update the info box status display
            const infoBox = this.fullscreenContainer.querySelector('.info-box');

            if (infoBox) {
                const statusElement = infoBox.querySelector('p');

                if (statusElement && statusElement.innerHTML.includes('Status:')) {
                    const currentStatus = this.currentFullscreenImage.isPublic ? 'Public' : 'Private';

                    statusElement.innerHTML = `<strong>Status:</strong> ${currentStatus}`;
                }
            }
        });
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
        if (this.navigation) {
            // Delegate to UnifiedNavigation
            this.navigation.downloadImage();
        } else {
            // Legacy fallback
            this.downloadImageAsBlob(imageData.url, imageData.title);
        }
    }

    // Download image as blob to force Save As dialog
    async downloadImageAsBlob(imageUrl, title = 'image') {
        try {
            console.log('📥 DOWNLOAD: Fetching image as blob for download...');

            // Fetch the image as a blob
            const response = await fetch(imageUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const fileName = `${this.data.makeFileNameSafe(title || 'image')}.png`;

            // Create object URL and download
            const objectUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');

            a.href = objectUrl;
            a.download = fileName;
            a.style.display = 'none';

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Clean up object URL
            URL.revokeObjectURL(objectUrl);

            console.log('📥 DOWNLOAD: Blob download triggered for:', fileName);
        } catch (error) {
            console.error('❌ DOWNLOAD: Blob download failed, trying fallback:', error);

            // Fallback to old method
            try {
                const link = document.createElement('a');

                link.href = imageUrl;
                link.download = `${this.data.makeFileNameSafe(title || 'image')}.png`;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                console.log('📥 DOWNLOAD: Fallback download triggered');
            } catch (fallbackError) {
                console.error('❌ DOWNLOAD: All download methods failed:', fallbackError);
            }
        }
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
        if (window.feedManager && window.feedManager.uiManager) {
            // Disconnect the intersection observer for infinite scroll
            if (window.feedManager.uiManager.disconnectIntersectionObserver) {
                window.feedManager.uiManager.disconnectIntersectionObserver();
            }
        }
    }

    enableInfiniteScroll() {
        if (window.feedManager && window.feedManager.uiManager) {
            // Use requestAnimationFrame instead of setTimeout
            requestAnimationFrame(() => {
                // Reconnect the intersection observer for infinite scroll
                if (window.feedManager.uiManager.reconnectIntersectionObserver) {
                    window.feedManager.uiManager.reconnectIntersectionObserver();
                }
            });
        }
    }

    // Error Handling
    showError(message) {
        console.error('Error:', message);
        // Could integrate with a notification system here
    }

    /**
     * Clean up all resources and event listeners
     */
    destroy() {
        // Don't clean up shared navigation instance - just remove reference
        this.navigation = null;

        // Clean up fullscreen components
        this.cleanupFullscreenComponents();

        // Clear DOM cache
        this.domCache.clear();

        // Clear data cache
        this.data.clearImageCache();

        // Reset state
        this.currentFullscreenImage = null;
        this.fullscreenContainer = null;
        this.isInitialized = false;
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
        // Check cache first
        let imgElement = this.domCache.get(imageId);

        if (!imgElement) {
            imgElement = document.querySelector(`img[data-id="${imageId}"], img[data-image-id="${imageId}"]`);
            if (imgElement) {
                this.domCache.set(imageId, imgElement);
            }
        }

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
            });
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
