
// Image UI Layer - Pure rendering and styling
class ImageUI {
    constructor() {
        this.config = this.getConfig();
    }

    getConfig() {
        return {
            classes: {
                image: 'generated-image',
                imageWrapper: 'image-wrapper',
                rating: 'image-rating',
                fullscreenContainer: 'fullscreen-container'
            },
            selectors: {
                fullscreenContainer: '.fullscreen-container'
            }
        };
    }

    // Helper method for element creation with fallback
    createElement(tag, className = '') {
        if (typeof Utils !== 'undefined' && Utils.dom && Utils.dom.createElement) {
            return Utils.dom.createElement(tag, className);
        }

        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        return element;
    }

    // Pure UI Creation Methods
    createImageElement(imageData) {
        const img = this.createElement('img', this.config.classes.image);

        // Handle base64 data URLs properly
        if (imageData.url && (imageData.url.startsWith('iVBORw0KGgo') || imageData.url.startsWith('/9j/'))) {
            // It's base64 image data, format as data URL
            img.src = `data:image/jpeg;base64,${imageData.url}`;
        } else {
            img.src = imageData.url;
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
        this.addImageErrorHandling(img, imageData);

        return img;
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
                z-index: 2 !important;
            }
            .image-placeholder::after {
                content: attr(data-text) !important;
                position: absolute !important;
                bottom: 8px !important;
                left: 8px !important;
                right: 8px !important;
                font-size: 0.75rem !important;
                color: #6c757d !important;
                text-align: center !important;
                background: rgba(255,255,255,0.9) !important;
                padding: 4px !important;
                border-radius: 4px !important;
                font-family: system-ui, -apple-system, sans-serif !important;
                z-index: 2 !important;
            }
            .image-loading {
                opacity: 0.8 !important;
                transition: opacity 0.3s ease !important;
            }
            .image-loaded {
                opacity: 1 !important;
                transition: opacity 0.3s ease !important;
            }
        `;
        document.head.appendChild(style);
    }

    createImageWrapper(imageData) {
        const wrapper = this.createElement('div', this.config.classes.imageWrapper);
        const img = this.createImageElement(imageData);

        wrapper.appendChild(img);

        // Add rating display if available
        if (imageData.rating && imageData.rating > 0) {
            const ratingElement = this.createElement('div', this.config.classes.rating);

            ratingElement.textContent = `★ ${imageData.rating}`;
            wrapper.appendChild(ratingElement);
        }

        return wrapper;
    }

    createFullscreenContainer() {
        const _container = this.createElement('div', this.config.classes.fullscreenContainer);

        _container.style.cssText = `
            display: none;
            position: fixed;
        top: 0;
            left: 0;
        width: 100%;
            height: 100%;
        background-color: rgba(0, 0, 0, 0.9);
            z-index: 9999;
        justify-content: center;
            align-items: center;
        `;

        return _container;
    }

    createFullscreenImage(imageData) {
        const imageContainer = this.createElement('div');

        imageContainer.style.cssText = `
            position: relative;
            display: flex;
        justify-content: center;
            align-items: center;
        width: 100%;
            height: 100%;
        overflow: visible;
            padding-top: 80px;
        `;
        const fullscreenImg = this.createElement('img');

        fullscreenImg.src = imageData.url;
        fullscreenImg.alt = imageData.title || 'Fullscreen Image';
        fullscreenImg.style.cssText = `
            max-width: 90%;
        max-height: 90%;
            object-fit: contain;
        cursor: pointer;
        `;

        // Add dataset attributes
        fullscreenImg.dataset.id = imageData.id;
        fullscreenImg.dataset.rating = imageData.rating || '0';
        fullscreenImg.dataset.provider = imageData.provider || '';
        fullscreenImg.dataset.prompt = imageData.prompt || '';
        fullscreenImg.dataset.original = imageData.original || '';
        imageContainer.appendChild(fullscreenImg);

        return imageContainer;
    }

    createInfoBox(imageData) {
        const infoContainer = this.createElement('div');

        infoContainer.className = 'info-container';
        infoContainer.style.cssText = `
            position: absolute;
        display: none;
            z-index: 10001;
        `;
        const infoBox = this.createElement('div');

        infoBox.className = 'info-box';
        infoBox.style.cssText = `
            position: fixed;
            bottom: 100px;
        right: 33%;
            transform: translateX(50%);
        width: 350px;
            color: white;
        background-color: rgba(0, 0, 0, 0.85);
            padding: 25px;
        border-radius: 12px;
            max-height: 80vh;
        overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
            display: none;
        transition: all 0.3s ease;
            opacity: 0;
        transform: translateY(-10px);
        `;
        this.addInfoContent(infoBox, imageData);
        infoContainer.appendChild(infoBox);

        return infoContainer;
    }

    addInfoContent(infoBox, imageData) {
        this.addInfoText(infoBox, imageData.original, 'original');
        this.addInfoText(infoBox, imageData.prompt, 'prompt');

        const provider = imageData.provider || imageData.providerName || '';

        if (provider) {
            this.addInfoText(infoBox, `Model: ${provider}`, 'provider');
        }

        this.addRatingText(infoBox, imageData.rating);
    }

    addInfoText(_container, text, type) {
        if (!text) {
            return;
        }

        const textElement = this.createElement('div');
        const isPrompt = type === 'original' || type === 'prompt';

        if (isPrompt) {
            textElement.innerHTML = `<strong>${type === 'original' ? 'Original:' : 'Prompt:'}</strong><br>${text}`;
        } else {
            textElement.innerHTML = `<strong>${text.split(':')[0]}:</strong> ${text.split(':')[1] || text}`;
        }

        textElement.style.cssText = `
            margin-bottom: 15px;
        line-height: 1.4;
            word-wrap: break-word;
        font-size: 13px;
            color: #e0e0e0;
        padding-bottom: 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        `;
        _container.appendChild(textElement);
    }

    addRatingText(_container, rating) {
        if (!rating || rating === '-') {
            return;
        }

        const ratingText = this.createElement('div');

        ratingText.innerHTML = `<strong>Rating:</strong> ★ ${rating}`;
        ratingText.style.cssText = `
            margin-bottom: 15px;
        line-height: 1.4;
            color: #ffd700;
        font-size: 13px;
            font-weight: 600;
        padding-bottom: 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        `;
        _container.appendChild(ratingText);
    }

    createNavigationControls() {
        const navControls = this.createElement('div');

        navControls.style.cssText = `
            position: absolute;
            bottom: 20px;
        left: 50%;
            transform: translateX(-50%);
        z-index: 10000;
            display: flex;
        gap: 10px;
            align-items: center;
        `;

        return navControls;
    }

    createButton(text) {
        const button = this.createElement('button');

        button.innerHTML = text;
        button.style.cssText = `
            background: rgba(0, 0, 0, 0.7);
        color: white;
            border: none;
        padding: 10px 20px;
            border-radius: 5px;
        cursor: pointer;
        `;

        return button;
    }

    createRatingDisplay(rating) {
        const ratingDisplay = this.createElement('div');

        ratingDisplay.className = 'rating-display-nav';
        ratingDisplay.style.cssText = `
            background: rgba(0, 0, 0, 0.8);
        color: ${rating === '-' ? '#888' : '#ffd700'};
            padding: 8px 12px;
        border-radius: 20px;
            font-size: 12px;
        font-weight: 600;
            border: ${rating === '-' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 215, 0, 0.3)'};
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
        min-width: 36px;
            height: 36px;
        display: flex;
            align-items: center;
        justify-content: center;
        `;
        ratingDisplay.innerHTML = rating === '-' ? '-' : `★ ${rating}`;

        return ratingDisplay;
    }

    createToggleButton() {
        const button = this.createElement('button');

        button.className = 'info-toggle-btn-nav';
        button.innerHTML = 'ℹ️';
        button.style.cssText = `
            background: rgba(0, 0, 0, 0.9);
            color: white;
        border: 2px solid rgba(255, 255, 255, 0.3);
            padding: 8px 12px;
        border-radius: 20px;
            cursor: pointer;
        font-size: 14px;
            font-weight: 600;
        transition: all 0.3s ease;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        min-width: 36px;
            height: 36px;
        display: flex;
            align-items: center;
        justify-content: center;
            backdrop-filter: blur(10px);
        `;

        return button;
    }

    createNavigationSpacer() {
        const spacer = this.createElement('div');

        spacer.style.cssText = `
            width: 40px;
            flex-shrink: 0;
        `;

        return spacer;
    }

    showRatingFeedback(rating) {
        const feedback = document.createElement('div');

        feedback.textContent = `Rated: ${'★'.repeat(rating)}`;
        feedback.style.cssText = `
            position: fixed;
        top: 50%;
            left: 50%;
        transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
        color: #ffd700;
            padding: 10px 20px;
        border-radius: 5px;
            z-index: 10002;
        font-size: 16px;
            font-weight: bold;
        `;
        document.body.appendChild(feedback);
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 2000);
    }

    // Utility UI methods
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
        // eslint-disable-next-line no-control-regex
        return name.replace(/[\x00-\x1F<>:"/\\|?*.,;(){ /* Empty block */ }[\]!@#$%^&+=`~]/g, '')
            .substring(0, 100)
            .trim();
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.ImageUI = ImageUI;
}
