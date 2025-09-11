// Image UI Layer - Main orchestrator for modular UI components
import { ImageUI as ModularImageUI } from './ui/image-ui-main.js';

class ImageUI {
    constructor() {
        // Use the modular ImageUI implementation
        this.modularUI = new ModularImageUI();
    }

    // Delegate all methods to the modular implementation
    getConfig() {
        return this.modularUI.getConfig();
    }

    createElement(tag, className = '') {
        return this.modularUI.createElement(tag, className);
    }

    createImageElement(imageData) {
        return this.modularUI.createImageElement(imageData);
    }

    createImageWrapper(imageData) {
        return this.modularUI.createImageWrapper(imageData);
    }

    createFullscreenContainer() {
        return this.modularUI.createFullscreenContainer();
    }

    createFullscreenImage(imageData) {
        return this.modularUI.createFullscreenImage(imageData);
    }

    createInfoBox(imageData) {
        return this.modularUI.createInfoBox(imageData);
    }

    createNavigationControls() {
        return this.modularUI.createNavigationControls();
    }

    createButton(text) {
        return this.modularUI.createButton(text);
    }

    createToggleButton() {
        return this.modularUI.createToggleButton();
    }

    createPublicStatusToggle(isPublic) {
        return this.modularUI.createPublicStatusToggle(isPublic);
    }

    createRatingDisplay(rating) {
        return this.modularUI.createRatingDisplay(rating);
    }

    createNavigationSpacer() {
        return this.modularUI.createNavigationSpacer();
    }
}

// Export for use in other modules
window.ImageUI = ImageUI;
