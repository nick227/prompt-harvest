// Main ImageUI Class - Orchestrates all UI components
import { UIConfig } from './ui-config.js';
import { ImageElements } from './image-elements.js';
import { NavigationControls } from './navigation-controls.js';

export class ImageUI {
    constructor() {
        this.config = new UIConfig();
        this.imageElements = new ImageElements(this.config);
        this.navigationControls = new NavigationControls(this.config);
    }

    // Delegate to appropriate components with validation
    createImageElement(imageData) {
        if (!imageData) {
            throw new Error('ImageData is required');
        }

        return this.imageElements.createImageElement(imageData);
    }

    createImageWrapper(imageData) {
        if (!imageData) {
            throw new Error('ImageData is required');
        }

        return this.imageElements.createImageWrapper(imageData);
    }


    createNavigationControls() {
        return this.navigationControls.createNavigationControls();
    }

    createButton(text) {
        return this.navigationControls.createButton(text);
    }

    createToggleButton() {
        return this.navigationControls.createToggleButton();
    }

    createPublicStatusToggle(isPublic) {
        return this.navigationControls.createPublicStatusToggle(isPublic);
    }

    createRatingDisplay(rating) {
        return this.navigationControls.createRatingDisplay(rating);
    }

    createNavigationSpacer() {
        return this.navigationControls.createNavigationSpacer();
    }

    // Utility methods
    getConfig() {
        return this.config.getConfig();
    }

    createElement(tag, className = '') {
        return this.config.createElement(tag, className);
    }
}
