/* global ImageUI, ImageEvents */
// Image Manager - Business logic layer orchestrating UI, events, and data
class ImageManager {
    constructor() {
        this.ui = new ImageUI();
        this.data = new ImageData();
        this.events = new ImageEvents(this);
        this.fullscreenContainer = null;
        this.currentFullscreenImage = null;
        this.isInitialized = false;
    }

    init() {

        this.setupFullscreenContainer();
        this.events.setupEventDelegation();
        this.isInitialized = true;

    }

    // Initialization Methods
    setupFullscreenContainer() {
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

    // Fullscreen Methods
    openFullscreen(imageData) {

        if (!this.fullscreenContainer) {
            this.setupFullscreenContainer();
        }

        this.currentFullscreenImage = imageData;
        this.fullscreenContainer.innerHTML = '';

        const imageContainer = this.ui.createFullscreenImage(imageData);
        const infoBox = this.ui.createInfoBox(imageData);
        const navControls = this.ui.createNavigationControls();

        // Setup navigation events
        this.events.setupNavigationButtonEvents(navControls, imageData);

        // Setup rating display events
        const { spacer, ratingElement, toggleBtn } = this.events.setupRatingDisplayEvents(navControls, infoBox);

        // Add controls to navigation
        navControls.appendChild(spacer);
        navControls.appendChild(ratingElement);
        navControls.appendChild(toggleBtn);

        // Add navigation controls to the image container
        imageContainer.appendChild(navControls);

        // Add info box to the container
        navControls.parentNode.appendChild(infoBox);
        infoBox.style.display = 'block';

        this.fullscreenContainer.appendChild(imageContainer);
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

    async rateImageInFullscreen(rating) {
        if (!this.currentFullscreenImage || !this.currentFullscreenImage.id) {
            console.error('No image data available for rating');

            return;
        }

        try {

            // Call the rating API using centralized service
            if (typeof window.imageApi !== 'undefined' && window.imageApi.rateImage) {
                await window.imageApi.rateImage(this.currentFullscreenImage.id, rating);
            } else {
                console.warn('imageApi not available, skipping rating update');
            }

            // Update the image data
            this.currentFullscreenImage.rating = rating;

            // Update the rating display in navigation
            const ratingDisplay = this.fullscreenContainer.querySelector('.rating-display-nav');

            if (ratingDisplay) {
                ratingDisplay.textContent = rating > 0 ? `★ ${rating}` : '—';
            }

            // Update the info panel rating
            const infoBox = this.fullscreenContainer.querySelector('.info-box');

            if (infoBox) {
                const ratingText = infoBox.querySelector('div:first-child');

                if (ratingText && ratingText.innerHTML.includes('Rating:')) {
                    ratingText.innerHTML = `<strong>Rating:</strong> ${rating > 0 ? `★ ${rating}` : '—'}`;
                }
            }

            // Update the grid view
            this.updateImageRating(this.currentFullscreenImage.id, rating);

            // Show feedback
            this.ui.showRatingFeedback(rating);

        } catch (error) {
            console.error('Error updating rating:', error);
            this.showError(`Rating failed: ${error.message}`);
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
