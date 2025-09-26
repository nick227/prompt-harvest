/**
 * Image Detection Module
 * Provides utilities for detecting and identifying different types of images
 */
class ImageDetection {
    static isGeneratedImage(img) {
        return img.classList.contains('generated-image')
            || img.style.cursor === 'pointer'
            || img.dataset.id
            || img.src.includes('uploads/')
            || img.alt.includes('Generated')
            || img.title.includes('Generated');
    }

    static isFullscreenActive() {
        const fullscreenContainer = document.querySelector('.fullscreen-container, .full-screen');
        const isFullscreenVisible = fullscreenContainer &&
            fullscreenContainer.style.display !== 'none' &&
            fullscreenContainer.offsetParent !== null;

        return isFullscreenVisible || document.body.classList.contains('fullscreen-active');
    }

    static findImageContainer() {
        return document.querySelector('.prompt-output') || document.querySelector('.images-section');
    }

    static getImageFromEvent(event) {
        return event.target.closest('img');
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.ImageDetection = ImageDetection;
}
