// Image Component - Main entry point using separated architecture
class ImageComponent {
    constructor() {
        this.manager = null;
        this.isInitialized = false;
    }

    init() {
        // Create manager if not already created
        if (!this.manager) {
            if (typeof window.ImageManager === 'undefined') {
                console.error('❌ ImageComponent: ImageManager not available yet');
                return false;
            }
            this.manager = new window.ImageManager();
        }

        this.manager.init();
        this.isInitialized = true;

        // Expose manager to global scope for other components
        window.imageManager = this.manager;
        return true;
    }

    // Ensure manager is available
    ensureManager() {
        if (!this.manager) {
            if (typeof window.ImageManager === 'undefined') {
                console.error('❌ ImageComponent: ImageManager not available');
                return false;
            }
            this.manager = new window.ImageManager();
            this.manager.init();
        }
        return true;
    }

    // Public method to re-setup event delegation (useful for debugging)
    reSetupEventDelegation() {
        if (!this.ensureManager()) {
            return;
        }
        this.manager.reSetupEventDelegation();
    }

    // Delegate all methods to the manager for backward compatibility
    setupEventDelegation() {
        if (!this.ensureManager()) {
            return;
        }
        this.manager.events.setupEventDelegation();
    }

    createImageElement(imageData) {
        if (!this.ensureManager()) {
            return null;
        }

        try {
            return this.manager.ui.createImageElement(imageData);
        } catch (error) {
            console.error('Error in createImageElement:', error);
            return null;
        }
    }

    createImageWrapper(imageData) {
        if (!this.ensureManager()) {
            return null;
        }
        return this.manager.ui.createImageWrapper(imageData);
    }

    renderImage(imageData, _container) {
        return this.manager.renderImage(imageData, _container);
    }

    renderImages(images, _container) {
        return this.manager.renderImages(images, _container);
    }

    openFullscreen(imageData) {
        if (!this.ensureManager()) {
            return false;
        }
        return this.manager.openFullscreen(imageData);
    }

    closeFullscreen() {
        return this.manager.closeFullscreen();
    }

    navigateImage(direction) {
        return this.manager.navigateImage(direction);
    }

    removeImage(imageId) {
        return this.manager.removeImage(imageId);
    }

    updateImageRating(imageId, rating) {
        return this.manager.updateImageRating(imageId, rating);
    }

    updateImagePublicStatus(imageId, isPublic) {
        return this.manager.updateImagePublicStatus(imageId, isPublic);
    }

    rateImageInFullscreen(rating) {
        return this.manager.rateImageInFullscreen(rating);
    }

    downloadImage(imageData) {
        return this.manager.downloadImage(imageData);
    }

    getImageById(imageId) {
        return this.manager.getImageById(imageId);
    }

    getAllImages() {
        return this.manager.getAllImages();
    }

    clearAllImages() {
        return this.manager.clearAllImages();
    }

    clearImageOrderCache() {
        return this.manager.clearImageOrderCache();
    }

    // Public API Methods
    initialize() {
        this.init();
    }

    refresh() {
        return this.manager.refresh();
    }

    // Export functions for global access (maintaining backward compatibility)
    renderImageGlobal(imageData, _container) {
        return this.manager.renderImageGlobal(imageData, _container);
    }

    openFullscreenGlobal(imageData) {
        return this.manager.openFullscreenGlobal(imageData);
    }

    closeFullscreenGlobal() {
        return this.manager.closeFullscreenGlobal();
    }

    // Statistics and utility methods
    getImageStats() {
        return this.manager.getImageStats();
    }

    exportImageData() {
        return this.manager.exportImageData();
    }

    importImageData(data) {
        return this.manager.importImageData(data);
    }


    generateId() {
        return this.manager.data.generateId();
    }

    validateImageData(imageData) {
        return this.manager.data.validateImageData(imageData);
    }

    handleImageError(img) {
        img.src = this.manager.ui.config.defaults?.errorImage || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg==';
    }

    makeFileNameSafe(name) {
        return this.manager.data.makeFileNameSafe(name);
    }

    toggleLike(imageId) {
        const cached = this.manager.data.getCachedImage(imageId);

        if (cached) {
            const isLiked = cached.element.classList.contains(this.manager.ui.config.classes.liked);

            if (isLiked) {
                cached.element.classList.remove(this.manager.ui.config.classes.liked);
            } else {
                cached.element.classList.add(this.manager.ui.config.classes.liked);
            }

            return !isLiked;
        }

        return false;
    }

    getAllVisibleImages() {
        return this.manager.data.getAllVisibleImages();
    }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageComponent;
}

// Initialize global instance
if (typeof window !== 'undefined') {
    window.ImageComponent = ImageComponent;
    window.imageComponent = new ImageComponent();
}
