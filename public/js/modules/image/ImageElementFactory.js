/**
 * ImageElementFactory - Handles creation and configuration of image elements
 * Follows Single Responsibility Principle for image element creation
 */
class ImageElementFactory {
    constructor() {
        this.config = window.IMAGE_CONFIG || {};
        this.utils = window.ImageDOMUtils;
    }

    /**
     * Create image element with loading states and error handling
     * @param {Object} imageData - Image data object
     * @returns {HTMLImageElement} Created image element
     */
    createImageElement(imageData) {
        if (!this.utils) {
            console.error('❌ ImageDOMUtils not available');
            return this.createFallbackImageElement(imageData);
        }

        const img = this.utils.createImageElement(imageData);

        this.setupImageEventHandlers(img, imageData);
        this.setupImageLoadingState(img);

        return img;
    }

    /**
     * Setup event handlers for image loading and error states
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data object
     */
    setupImageEventHandlers(img, imageData) {
        img.onload = () => this.handleImageLoad(img);
        img.onerror = () => this.handleImageError(img, imageData);

        // Handle invalid images from start
        setTimeout(() => {
            if (img.complete && img.naturalWidth === 0) {
                this.handleImageError(img, imageData);
            }
        }, 100);
    }

    /**
     * Handle successful image load
     * @param {HTMLImageElement} img - Image element
     */
    handleImageLoad(img) {
        img.classList.remove('image-loading');
        img.classList.add('image-loaded');

        if (this.utils && this.utils.removeLoadingSpinner) {
            this.utils.removeLoadingSpinner(img);
        }

        console.log('✅ Image loaded successfully:', img.src);
    }

    /**
     * Handle image load error
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data object
     */
    handleImageError(img, imageData) {
        console.log('❌ Image failed to load:', img.src);

        if (this.utils && this.utils.removeLoadingSpinner) {
            this.utils.removeLoadingSpinner(img);
        }

        if (this.utils && this.utils.createImagePlaceholder) {
            this.utils.createImagePlaceholder(img, imageData);
        } else {
            this.createFallbackPlaceholder(img, imageData);
        }
    }

    /**
     * Setup initial loading state for image
     * @param {HTMLImageElement} img - Image element
     */
    setupImageLoadingState(img) {
        img.classList.add('image-loading');

        if (this.utils && this.utils.addLoadingSpinner) {
            this.utils.addLoadingSpinner(img);
        }
    }

    /**
     * Download an image
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data object
     */
    downloadImage(img, _imageData) {
        const a = document.createElement('a');
        const fileName = decodeURIComponent(img.src.split('/').pop());

        a.href = img.src;
        a.download = fileName;
        a.click();
    }

    /**
     * Create fallback image element when utilities are not available
     * @param {Object} imageData - Image data object
     * @returns {HTMLImageElement} Fallback image element
     * @private
     */
    createFallbackImageElement(imageData) {
        const img = document.createElement('img');
        img.src = imageData.url || imageData.imageUrl || '';
        img.alt = imageData.title || 'Generated Image';
        img.style.width = '100%';
        img.style.height = '150px';
        img.style.objectFit = 'cover';
        img.classList.add('generated-image');

        // Add basic dataset attributes
        if (imageData.id) {
            img.dataset.id = imageData.id;
        }
        if (imageData.prompt) {
            img.dataset.prompt = imageData.prompt;
        }
        if (imageData.provider) {
            img.dataset.provider = imageData.provider;
        }

        return img;
    }

    /**
     * Create fallback placeholder when utilities are not available
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data object
     * @private
     */
    createFallbackPlaceholder(img, imageData) {
        img.style.backgroundColor = '#f0f0f0';
        img.style.display = 'flex';
        img.style.alignItems = 'center';
        img.style.justifyContent = 'center';
        img.style.color = '#999';
        img.style.fontSize = '14px';
        img.alt = 'Image failed to load';
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg==';
    }
}

// Export for global access
window.ImageElementFactory = ImageElementFactory;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageElementFactory;
}
