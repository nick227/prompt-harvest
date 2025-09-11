// Fullscreen View Components
import { UIConfig } from './ui-config.js';

export class FullscreenComponents {
    constructor(uiConfig = null) {
        this.uiConfig = uiConfig || new UIConfig();
    }

    createFullscreenContainer() {
        const container = this.uiConfig.createElement('div');
        container.className = this.uiConfig.getClasses().fullscreenContainer;
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            backdrop-filter: blur(5px);
        `;

        return container;
    }

    createFullscreenImage(imageData) {
        const imageContainer = this.uiConfig.createElement('div');
        imageContainer.className = 'fullscreen-image-container';
        imageContainer.style.cssText = `
            position: relative;
            max-width: 90vw;
            max-height: 90vh;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        const img = this.uiConfig.createElement('img');
        img.className = 'fullscreen-image';

        // Handle base64 data URLs properly
        if (imageData.url && (imageData.url.startsWith('iVBORw0KGgo') || imageData.url.startsWith('/9j/'))) {
            img.src = `data:image/jpeg;base64,${imageData.url}`;
        } else if (imageData.url) {
            img.src = imageData.url;
        } else if (imageData.imageUrl) {
            // Fallback to imageUrl property
            img.src = imageData.imageUrl;
        } else {
            console.warn('No image URL provided for fullscreen image:', imageData.id);
        }

        img.alt = imageData.title || 'Generated Image';
        img.style.cssText = `
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        `;

        imageContainer.appendChild(img);
        return imageContainer;
    }

    createInfoBox(imageData) {
        const infoBox = this.uiConfig.createElement('div');
        infoBox.className = 'info-box';
        infoBox.style.cssText = `
            position: absolute;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 12px;
            max-width: 80vw;
            width: 500px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            display: none;
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
            transition: all 0.3s ease;
        `;

        const infoContent = this.uiConfig.createElement('div');
        infoContent.className = 'info-box-content';
        infoContent.innerHTML = `
            <div style="margin-bottom: 15px;">
                <h3 style="margin: 0 0 10px 0; color: #4ade80; font-size: 18px;">Image Details</h3>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Prompt:</strong> ${imageData.prompt || 'N/A'}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Provider:</strong> ${imageData.provider || 'N/A'}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Model:</strong> ${imageData.model || 'N/A'}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Guidance:</strong> ${imageData.guidance || 'N/A'}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Rating:</strong> ${imageData.rating || 'Not rated'}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Status:</strong> ${imageData.isPublic ? 'Public' : 'Private'}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Created:</strong> ${imageData.createdAt ? new Date(imageData.createdAt).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div style="font-size: 12px; color: #9ca3af; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 10px;">
                <p style="margin: 0;">ID: ${imageData.id}</p>
            </div>
        `;

        infoBox.appendChild(infoContent);
        return infoBox;
    }
}
