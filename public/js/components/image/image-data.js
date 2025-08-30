// Image Data Layer - Data validation, transformation, and management
class ImageData {
    constructor() {
        this.imageCache = new Map();
        this.cachedImageOrder = null;
    }

    // Data Validation Methods
    validateImageData(imageData) {
        return !!(imageData && imageData.url);
    }

    validateImageId(imageId) {
        return !!(imageId && typeof imageId === 'string' && imageId.length > 0);
    }

    validateRating(rating) {
        return typeof rating === 'number' && rating >= 0 && rating <= 5;
    }

    // Data Transformation Methods
    normalizeImageData(imageData) {
        if (!imageData) {
            return null;
        }

        return {
            id: imageData.id || this.generateId(),
            url: imageData.url || imageData.imageUrl || imageData.image || '',
            title: imageData.title || imageData.alt || 'Generated Image',
            prompt: imageData.prompt || '',
            original: imageData.original || imageData.prompt || '',
            provider: imageData.provider || imageData.providerName || 'unknown',
            guidance: imageData.guidance || '',
            rating: parseInt(imageData.rating) || 0,
            element: imageData.element || null
        };
    }

    extractImageDataFromElement(img) {
        if (!img) {
            return null;
        }

        return {
            id: img.dataset.id || img.dataset.imageId || 'unknown',
            url: img.src,
            title: img.alt || img.title || 'Generated Image',
            prompt: img.dataset.prompt || img.alt || '',
            original: img.dataset.original || '',
            provider: img.dataset.provider || '',
            guidance: img.dataset.guidance || '',
            rating: parseInt(img.dataset.rating) || 0
        };
    }

    // Cache Management Methods
    cacheImage(imageData) {
        if (!this.validateImageData(imageData)) {
            return false;
        }

        const normalizedData = this.normalizeImageData(imageData);

        this.imageCache.set(normalizedData.id, normalizedData);

        return true;
    }

    getCachedImage(imageId) {
        if (!this.validateImageId(imageId)) {
            return null;
        }

        return this.imageCache.get(imageId);
    }

    updateCachedImage(imageId, updates) {
        const cached = this.getCachedImage(imageId);

        if (!cached) {
            return false;
        }

        Object.assign(cached, updates);
        this.imageCache.set(imageId, cached);

        return true;
    }

    removeCachedImage(imageId) {
        if (!this.validateImageId(imageId)) {
            return false;
        }

        return this.imageCache.delete(imageId);
    }

    getAllCachedImages() {
        return Array.from(this.imageCache.values());
    }

    clearImageCache() {
        this.imageCache.clear();
        this.cachedImageOrder = null;
    }

    // Image Collection Methods
    getAllVisibleImages() {
        const _container = document.querySelector('.prompt-output') || document.querySelector('.images-section');

        if (!_container) {
            return [];
        }

        const imageElements = _container.querySelectorAll('li img[data-id]');
        const images = [];

        imageElements.forEach(imgElement => {
            const imageData = this.extractImageDataFromElement(imgElement);

            if (imageData) {
                // Merge with cached data if available
                const cached = this.getCachedImage(imageData.id);

                if (cached) {
                    Object.assign(imageData, cached);
                }
                images.push(imageData);
            }
        });

        return images;
    }

    getImageById(imageId) {
        return this.getCachedImage(imageId);
    }

    findImageIndex(imageId, images = null) {
        const imageList = images || this.getAllVisibleImages();

        return imageList.findIndex(img => img.id === imageId);
    }

    getNextImage(currentImageId, images = null) {
        const imageList = images || this.getAllVisibleImages();
        const currentIndex = this.findImageIndex(currentImageId, imageList);

        if (currentIndex === -1 || imageList.length === 0) {
            return null;
        }

        const nextIndex = (currentIndex + 1) % imageList.length;

        return imageList[nextIndex];
    }

    getPreviousImage(currentImageId, images = null) {
        const imageList = images || this.getAllVisibleImages();
        const currentIndex = this.findImageIndex(currentImageId, imageList);

        if (currentIndex === -1 || imageList.length === 0) {
            return null;
        }

        const prevIndex = currentIndex === 0 ? imageList.length - 1 : currentIndex - 1;

        return imageList[prevIndex];
    }

    // Utility Methods
    generateId() {
        return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    formatTitle(title, maxLength = 124) {
        if (!title) {
            return '';
        }
        if (title.length <= maxLength) {
            return title;
        }

        return `${title.substring(0, maxLength - 3)}...`;
    }

    makeFileNameSafe(name) {
        if (!name) {
            return 'image';
        }

        return name.replace(/[<>:"/\\|?*.,;(){}[\]!@#$%^&+=`~]/g, '')
            .substring(0, 100)
            .trim();
    }

    // Order Cache Management
    clearImageOrderCache() {
        this.cachedImageOrder = null;

    }

    getCachedImageOrder() {
        return this.cachedImageOrder;
    }

    setCachedImageOrder(order) {
        this.cachedImageOrder = order;
    }

    // Data Export/Import Methods
    exportImageData() {
        return {
            cache: Array.from(this.imageCache.entries()),
            order: this.cachedImageOrder,
            timestamp: Date.now()
        };
    }

    importImageData(data) {
        if (!data || !data.cache) {
            return false;
        }

        this.clearImageCache();
        this.imageCache = new Map(data.cache);
        this.cachedImageOrder = data.order || null;

        return true;
    }

    // Statistics Methods
    getImageStats() {
        const images = this.getAllCachedImages();
        const stats = {
            total: images.length,
            rated: images.filter(img => img.rating > 0).length,
            averageRating: 0,
            providers: { /* Empty block */ },
            ratings: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };

        if (images.length > 0) {
            const totalRating = images.reduce((sum, img) => sum + (img.rating || 0), 0);

            stats.averageRating = totalRating / images.length;

            images.forEach(img => {
                const provider = img.provider || 'unknown';

                stats.providers[provider] = (stats.providers[provider] || 0) + 1;
                stats.ratings[img.rating || 0]++;
            });
        }

        return stats;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.ImageData = ImageData;
}
