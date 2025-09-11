// Image Placeholder and Error Handling
import { UIConfig } from './ui-config.js';

export class ImagePlaceholderHandler {
    constructor(uiConfig = null) {
        this.uiConfig = uiConfig || new UIConfig();
    }

    addImageErrorHandling(img, imageData) {
        // Add loading state
        img.classList.add('image-loading');

        // Handle successful load
        img.onload = () => {
            img.classList.remove('image-loading');
            img.classList.add('image-loaded');
        };

        // Handle load errors
        img.onerror = () => {
            this.createImagePlaceholder(img, imageData);
        };

        // Check for images that are broken from start
        setTimeout(() => {
            if (img.complete && img.naturalWidth === 0) {
                this.createImagePlaceholder(img, imageData);
            }
        }, 100);
    }

    createImagePlaceholder(img, imageData) {
        // Remove src and add placeholder class
        img.removeAttribute('src');
        img.classList.remove('image-loading', 'image-loaded');
        img.classList.add('image-placeholder');

        // Apply placeholder styles
        Object.assign(img.style, {
            backgroundColor: '#f8f9fa',
            border: '2px dashed #dee2e6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '150px',
            boxSizing: 'border-box',
            width: '100%',
            height: '150px',
            objectFit: 'cover',
            borderRadius: '3px',
            cursor: 'pointer'
        });

        // Set placeholder data
        img.setAttribute('data-placeholder', '🖼️');
        const promptText = imageData.prompt || imageData.original || '';
        const displayText = promptText.length > 30 ?
            `${promptText.substring(0, 30)}...` :
            (promptText || 'Image unavailable');

        img.setAttribute('data-text', displayText);

        // Add placeholder CSS if not already present
        this.addPlaceholderStyles();
    }

    addPlaceholderStyles() {
        const styleId = 'pipeline-placeholder-styles';

        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');

        style.id = styleId;
        style.textContent = `
            .image-placeholder::before {
                content: attr(data-placeholder) !important;
                font-size: 2rem !important;
                color: #6c757d !important;
                margin-bottom: 0.5rem !important;
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                z-index: 1 !important;
            }

            .image-placeholder::after {
                content: attr(data-text) !important;
                font-size: 0.875rem !important;
                color: #6c757d !important;
                text-align: center !important;
                position: absolute !important;
                top: 60% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                z-index: 1 !important;
                max-width: 90% !important;
                word-wrap: break-word !important;
                line-height: 1.2 !important;
            }

            .image-loading {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%) !important;
                background-size: 200% 100% !important;
                animation: loading 1.5s infinite !important;
            }

            @keyframes loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        `;

        document.head.appendChild(style);
    }
}
