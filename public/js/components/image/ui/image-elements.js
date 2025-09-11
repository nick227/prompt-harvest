// Basic Image Elements Creation
import { UIConfig } from './ui-config.js';
import { ImagePlaceholderHandler } from './image-placeholder.js';

export class ImageElements {
    constructor(uiConfig = null) {
        this.uiConfig = uiConfig || new UIConfig();
        this.placeholderHandler = new ImagePlaceholderHandler(this.uiConfig);
    }

    createImageElement(imageData) {
        if (!imageData || !imageData.id) {
            throw new Error('ImageData with id is required');
        }

        const img = this.uiConfig.createElement('img', this.uiConfig.getClasses().image);

        // Handle base64 data URLs properly
        if (imageData.url && (imageData.url.startsWith('iVBORw0KGgo') || imageData.url.startsWith('/9j/'))) {
            // It's base64 image data, format as data URL
            img.src = `data:image/jpeg;base64,${imageData.url}`;
        } else if (imageData.url) {
            img.src = imageData.url;
        } else if (imageData.imageUrl) {
            // Fallback to imageUrl property
            img.src = imageData.imageUrl;
        } else {
            console.warn('No image URL provided for image:', imageData.id);
        }
        img.alt = imageData.title || 'Generated Image';
        img.dataset.id = imageData.id;
        img.dataset.rating = imageData.rating || '0';
        img.dataset.provider = imageData.provider || 'unknown';
        img.dataset.prompt = imageData.prompt || '';
        img.dataset.original = imageData.original || '';
        img.dataset.guidance = imageData.guidance || '';

        // UI styling
        img.style.width = '100%';
        img.style.height = '150px';
        img.style.objectFit = 'cover';
        img.style.display = 'block';
        img.style.borderRadius = '3px';
        img.style.cursor = 'pointer';

        // Add placeholder detection pipeline
        this.placeholderHandler.addImageErrorHandling(img, imageData);

        return img;
    }

    createImageWrapper(imageData) {
        if (!imageData || !imageData.id) {
            throw new Error('ImageData with id is required');
        }

        const wrapper = this.uiConfig.createElement('div', this.uiConfig.getClasses().imageWrapper);

        // Create image element
        const img = this.createImageElement(imageData);

        // Create rating display
        const rating = this.createRatingDisplay(imageData.rating || 0);

        // Assemble wrapper
        wrapper.appendChild(img);
        wrapper.appendChild(rating);

        // Store image data in wrapper for easy access
        wrapper.dataset.imageId = imageData.id;
        wrapper.dataset.imageData = JSON.stringify(imageData);

        return wrapper;
    }

    createRatingDisplay(rating) {
        const ratingDisplay = this.uiConfig.createElement('div', this.uiConfig.getClasses().rating);

        ratingDisplay.innerHTML = rating === 0 ? '★' : `★ ${rating}`;
        ratingDisplay.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(0, 0, 0, 0.7);
            color: #ffd700;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            z-index: 10;
            pointer-events: none;
        `;

        return ratingDisplay;
    }
}
