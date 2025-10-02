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
    downloadImage(img, imageData) {
        this.downloadImageAsBlob(img.src, imageData);
    }

    // Download image as blob to force Save As dialog
    async downloadImageAsBlob(imageUrl, imageData = null) {
        try {
            console.log('📥 DOWNLOAD: Fetching image as blob for download...');

            // Fetch the image as a blob
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const fileName = this.generateFileName(imageUrl, imageData);

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
                const a = document.createElement('a');
                const fileName = this.generateFileName(imageUrl, imageData);
                a.href = imageUrl;
                a.download = fileName;
                a.click();
                console.log('📥 DOWNLOAD: Fallback download triggered');
            } catch (fallbackError) {
                console.error('❌ DOWNLOAD: All download methods failed:', fallbackError);
            }
        }
    }

    // Generate a proper filename for the download
    generateFileName(imageUrl, imageData = null) {
        // Try to use final prompt from imageData first
        if (imageData) {
            const finalPrompt = imageData.final ||
                               imageData.finalPrompt ||
                               imageData.enhancedPrompt ||
                               imageData.prompt;
            if (finalPrompt && finalPrompt.length > 0) {
                // Take first 30 characters
                const truncatedPrompt = finalPrompt.length > 30 ?
                    finalPrompt.substring(0, 30) : finalPrompt;

                // Sanitize filename - remove invalid characters but keep spaces
                const sanitized = truncatedPrompt
                    .replace(/[<>:"/\\|?*.,;(){}[\]!@#$%^&+=`~]/g, '') // Remove invalid filename characters
                    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
                    .trim(); // Remove leading/trailing spaces

                // Ensure we have a valid filename
                if (sanitized && sanitized.length > 0) {
                    // Add .jpg extension if not present
                    return sanitized.endsWith('.jpg') ? sanitized : `${sanitized}.jpg`;
                }
            }
        }

        // Fallback to URL-based filename
        try {
            const { pathname } = new URL(imageUrl);
            const fileName = pathname.split('/').pop();

            // If no filename or extension, generate one
            if (!fileName || !fileName.includes('.')) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                return `generated-image-${timestamp}.jpg`;
            }

            return decodeURIComponent(fileName);
        } catch (error) {
            // Final fallback filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            return `generated-image-${timestamp}.jpg`;
        }
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
