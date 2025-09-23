// Image Data Layer - Data validation, transformation, and management
class ImageData {
    constructor() {
        this.imageCache = new Map();
        this.cachedImageOrder = null;
    }

    // Data Validation Methods
    validateImageData(imageData) {
        // console.log('🔍 VALIDATE: Image data validation:', {
        //     hasImageData: !!imageData,
        //     hasId: !!imageData?.id,
        //     hasUrl: !!imageData?.url,
        //     hasImageUrl: !!imageData?.imageUrl,
        //     isValid: hasRequiredFields
        // });
        return !!(imageData && (imageData.id || imageData.url || imageData.imageUrl));
    }

    validateImageId(imageId) {
        return !!(imageId && typeof imageId === 'string' && imageId.length > 0);
    }

    validateRating(rating) {
        return typeof rating === 'number' && rating >= 0 && rating <= 5;
    }

    /**
     * Validate public status value
     * @param {*} isPublic - The public status value to validate
     * @returns {boolean} True if valid boolean, false otherwise
     */
    validatePublicStatus(isPublic) {
        return typeof isPublic === 'boolean';
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
            final: imageData.final || imageData.prompt || '', // ✅ Include final field
            provider: imageData.provider || imageData.providerName || 'unknown',
            guidance: imageData.guidance || '',
            rating: parseInt(imageData.rating) || 0,
            isPublic: this.validatePublicStatus(imageData.isPublic) ? imageData.isPublic : false, // ✅ Include isPublic field with validation
            userId: imageData.userId || null, // ✅ Include userId field
            username: imageData.username || null, // ✅ Include username field as-is from server
            createdAt: imageData.createdAt || null, // ✅ Include createdAt field
            tags: imageData.tags || [], // ✅ Include tags field
            element: imageData.element || null
        };
    }

    extractImageDataFromElement(img) {
        if (!img) {
            return null;
        }

        const extractedData = {
            id: img.dataset.id || img.dataset.imageId || 'unknown',
            url: img.src,
            title: img.alt || img.title || 'Generated Image',
            prompt: img.dataset.prompt || img.alt || '',
            original: img.dataset.original || '',
            provider: img.dataset.provider || '',
            guidance: img.dataset.guidance || '',
            rating: parseInt(img.dataset.rating) || 0,
            isPublic: img.dataset.isPublic === 'true' || false, // ✅ Include isPublic from dataset
            userId: img.dataset.userId || null, // ✅ Include userId from dataset
            username: img.dataset.username || null, // ✅ Include username from dataset
            createdAt: img.dataset.createdAt || null, // ✅ Include createdAt from dataset
            tags: img.dataset.tags ? JSON.parse(img.dataset.tags) : [] // ✅ Include tags from dataset
        };

        // console.log('🔍 EXTRACT: Extracted data from DOM element:', {
        //     id: extractedData.id,
        //     username: extractedData.username,
        //     tags: extractedData.tags,
        //     dataset: {
        //         username: img.dataset.username,
        //         tags: img.dataset.tags
        //     }
        // });

        return {
            id: img.dataset.id || img.dataset.imageId || 'unknown',
            url: img.src,
            title: img.alt || img.title || 'Generated Image',
            prompt: img.dataset.prompt || img.alt || '',
            original: img.dataset.original || '',
            final: img.dataset.final || img.dataset.prompt || '', // ✅ Include final field
            provider: img.dataset.provider || '',
            guidance: img.dataset.guidance || '',
            rating: parseInt(img.dataset.rating) || 0,
            isPublic: img.dataset.isPublic === 'true' || false, // ✅ Include isPublic from dataset
            userId: img.dataset.userId || null, // ✅ Include userId from dataset
            username: img.dataset.username || null, // ✅ Include username from dataset
            createdAt: img.dataset.createdAt || null, // ✅ Include createdAt from dataset
            tags: img.dataset.tags ? JSON.parse(img.dataset.tags) : [] // ✅ Include tags from dataset
        };
    }

    // Cache Management Methods
    cacheImage(imageData) {
        console.log('🔍 CACHE: Attempting to cache image:', {
            id: imageData.id,
            isPublic: imageData.isPublic,
            userId: imageData.userId,
            isValid: this.validateImageData(imageData)
        });

        if (!this.validateImageData(imageData)) {
            console.log('❌ CACHE: Image data validation failed');

            return false;
        }

        const normalizedData = this.normalizeImageData(imageData);

        console.log('🔍 CACHE: Normalized data:', {
            id: normalizedData.id,
            isPublic: normalizedData.isPublic,
            userId: normalizedData.userId
        });

        this.imageCache.set(normalizedData.id, normalizedData);
        console.log('✅ CACHE: Successfully cached image:', normalizedData.id);

        return true;
    }

    getCachedImage(imageId) {
        if (!this.validateImageId(imageId)) {
            console.log('❌ CACHE: Invalid imageId for getCachedImage:', imageId);

            return null;
        }

        const cached = this.imageCache.get(imageId);

        console.log('🔍 CACHE: getCachedImage result:', {
            imageId,
            found: !!cached,
            isPublic: cached?.isPublic,
            userId: cached?.userId
        });

        return cached;
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

        // Look for both feed images (data-image-id) and generated images (data-id)
        const imageElements = _container.querySelectorAll('img[data-id], img[data-image-id]');
        const images = [];

        imageElements.forEach(imgElement => {
            const imageData = this.extractImageDataFromElement(imgElement);

            if (imageData) {
                // Prioritize cached data over DOM-extracted data
                const cached = this.getCachedImage(imageData.id);

                if (cached) {
                    // Use cached data as the primary source, only fall back to DOM data for missing fields
                    const finalData = { ...imageData, ...cached };

                    images.push(finalData);
                    // console.log('🔄 Using cached data for navigation:', imageData.id, {
                    //     cachedIsPublic: cached.isPublic,
                    //     domIsPublic: imageData.isPublic,
                    //     finalIsPublic: finalData.isPublic
                    // });
                } else {
                    images.push(imageData);
                    // console.log('⚠️ No cached data found for navigation:', imageData.id);
                }
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
