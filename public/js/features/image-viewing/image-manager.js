/**
 * Consolidated Image Manager
 * Orchestrates the entire image viewing system
 * Consolidates: image-manager.js + image-component.js + image-events.js
 */

import { ImageService } from './image-service.js';
import { ImageUIManager } from './image-ui-manager.js';
import { ImageNavigation } from './image-navigation.js';
import { ImagePlaceholder } from './image-placeholder.js';
import { ImageComponents } from './image-components.js';

export class ImageManager {
    constructor() {
        // Core services
        this.imageService = null;
        this.uiManager = null;
        this.navigation = null;
        this.placeholder = null;
        this.components = null;
        
        // State management
        this.isInitialized = false;
        this.currentImage = null;
        this.imageList = [];
        this.currentIndex = 0;
        this.isFullscreen = false;
        
        // Event system
        this.eventListeners = new Map();
        
        // Initialize when dependencies are available
        this.init();
    }

    /**
     * Initialize image manager
     */
    async init() {
        if (this.isInitialized) {
            console.warn('ImageManager already initialized');
            return;
        }

        try {
            console.log('🖼️ IMAGE-MANAGER: Initializing image manager...');

            // Initialize services
            this.imageService = new ImageService();
            this.uiManager = new ImageUIManager();
            this.navigation = new ImageNavigation();
            this.placeholder = new ImagePlaceholder();
            this.components = new ImageComponents();

            // Initialize sub-services
            await this.imageService.init();
            await this.uiManager.init();
            await this.navigation.init();
            await this.placeholder.init();
            await this.components.init();

            // Setup event listeners
            this.setupEventListeners();

            // Load initial images
            await this.loadImages();

            this.isInitialized = true;
            console.log('✅ IMAGE-MANAGER: Image manager initialized successfully');
        } catch (error) {
            console.error('❌ IMAGE-MANAGER: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Image navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-image-nav]')) {
                const direction = e.target.dataset.imageNav;
                this.navigateImage(direction);
            }
        });

        // Fullscreen toggle
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-image-fullscreen]')) {
                this.toggleFullscreen();
            }
        });

        // Image actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-image-action]')) {
                const action = e.target.dataset.imageAction;
                this.handleImageAction(action, e.target);
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });

        // Image loading events
        document.addEventListener('imageLoaded', (e) => {
            this.handleImageLoaded(e.detail);
        });

        // Image error events
        document.addEventListener('imageError', (e) => {
            this.handleImageError(e.detail);
        });
    }

    /**
     * Load images
     */
    async loadImages() {
        try {
            console.log('📸 IMAGE-MANAGER: Loading images...');
            
            const images = await this.imageService.getImages();
            this.imageList = images;
            
            if (images.length > 0) {
                this.currentImage = images[0];
                this.currentIndex = 0;
                
                // Render images
                this.uiManager.renderImages(images);
                
                // Update navigation
                this.navigation.updateNavigation(images.length, this.currentIndex);
            }
        } catch (error) {
            console.error('❌ IMAGE-MANAGER: Failed to load images:', error);
            this.uiManager.showError('Failed to load images');
        }
    }

    /**
     * Navigate to next/previous image
     * @param {string} direction - Navigation direction ('next' or 'prev')
     */
    navigateImage(direction) {
        if (this.imageList.length === 0) {
            return;
        }

        let newIndex = this.currentIndex;
        
        if (direction === 'next') {
            newIndex = (this.currentIndex + 1) % this.imageList.length;
        } else if (direction === 'prev') {
            newIndex = (this.currentIndex - 1 + this.imageList.length) % this.imageList.length;
        }

        if (newIndex !== this.currentIndex) {
            this.currentIndex = newIndex;
            this.currentImage = this.imageList[this.currentIndex];
            
            // Update UI
            this.uiManager.showImage(this.currentImage, this.currentIndex);
            this.navigation.updateNavigation(this.imageList.length, this.currentIndex);
            
            // Dispatch event
            this.dispatchEvent('imageChanged', {
                image: this.currentImage,
                index: this.currentIndex
            });
        }
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        this.isFullscreen = !this.isFullscreen;
        
        if (this.isFullscreen) {
            this.uiManager.enterFullscreen(this.currentImage);
        } else {
            this.uiManager.exitFullscreen();
        }
        
        // Dispatch event
        this.dispatchEvent('fullscreenToggled', {
            isFullscreen: this.isFullscreen
        });
    }

    /**
     * Handle image actions
     * @param {string} action - Action to perform
     * @param {HTMLElement} element - Element that triggered the action
     */
    async handleImageAction(action, element) {
        console.log(`⚡ IMAGE-MANAGER: Handling image action: ${action}`);

        try {
            switch (action) {
                case 'download':
                    await this.downloadImage();
                    break;
                case 'share':
                    await this.shareImage();
                    break;
                case 'like':
                    await this.likeImage();
                    break;
                case 'delete':
                    await this.deleteImage();
                    break;
                case 'edit':
                    await this.editImage();
                    break;
                default:
                    console.warn(`⚠️ IMAGE-MANAGER: Unknown action: ${action}`);
            }
        } catch (error) {
            console.error(`❌ IMAGE-MANAGER: Failed to handle action ${action}:`, error);
            this.uiManager.showError(`Failed to ${action}: ${error.message}`);
        }
    }

    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyboardNavigation(event) {
        if (this.isFullscreen) {
            switch (event.key) {
                case 'ArrowLeft':
                    event.preventDefault();
                    this.navigateImage('prev');
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    this.navigateImage('next');
                    break;
                case 'Escape':
                    event.preventDefault();
                    this.toggleFullscreen();
                    break;
            }
        }
    }

    /**
     * Handle image loaded event
     * @param {Object} detail - Event detail
     */
    handleImageLoaded(detail) {
        console.log('📸 IMAGE-MANAGER: Image loaded', detail);
        this.uiManager.hideLoading();
    }

    /**
     * Handle image error event
     * @param {Object} detail - Event detail
     */
    handleImageError(detail) {
        console.error('❌ IMAGE-MANAGER: Image error', detail);
        this.uiManager.showError('Failed to load image');
        this.placeholder.showErrorPlaceholder();
    }

    /**
     * Download current image
     */
    async downloadImage() {
        if (!this.currentImage) {
            return;
        }

        try {
            await this.imageService.downloadImage(this.currentImage.id);
            this.uiManager.showSuccess('Image downloaded successfully');
        } catch (error) {
            console.error('❌ IMAGE-MANAGER: Download failed:', error);
            this.uiManager.showError('Download failed');
        }
    }

    /**
     * Share current image
     */
    async shareImage() {
        if (!this.currentImage) {
            return;
        }

        try {
            await this.imageService.shareImage(this.currentImage.id);
            this.uiManager.showSuccess('Image shared successfully');
        } catch (error) {
            console.error('❌ IMAGE-MANAGER: Share failed:', error);
            this.uiManager.showError('Share failed');
        }
    }

    /**
     * Like current image
     */
    async likeImage() {
        if (!this.currentImage) {
            return;
        }

        try {
            await this.imageService.likeImage(this.currentImage.id);
            this.currentImage.liked = !this.currentImage.liked;
            this.uiManager.updateImageLikes(this.currentImage);
            this.uiManager.showSuccess(this.currentImage.liked ? 'Image liked' : 'Image unliked');
        } catch (error) {
            console.error('❌ IMAGE-MANAGER: Like failed:', error);
            this.uiManager.showError('Like failed');
        }
    }

    /**
     * Delete current image
     */
    async deleteImage() {
        if (!this.currentImage) {
            return;
        }

        if (!confirm('Are you sure you want to delete this image?')) {
            return;
        }

        try {
            await this.imageService.deleteImage(this.currentImage.id);
            this.imageList.splice(this.currentIndex, 1);
            
            if (this.imageList.length === 0) {
                this.currentImage = null;
                this.currentIndex = 0;
                this.uiManager.showNoImages();
            } else {
                if (this.currentIndex >= this.imageList.length) {
                    this.currentIndex = this.imageList.length - 1;
                }
                this.currentImage = this.imageList[this.currentIndex];
                this.uiManager.showImage(this.currentImage, this.currentIndex);
            }
            
            this.navigation.updateNavigation(this.imageList.length, this.currentIndex);
            this.uiManager.showSuccess('Image deleted successfully');
        } catch (error) {
            console.error('❌ IMAGE-MANAGER: Delete failed:', error);
            this.uiManager.showError('Delete failed');
        }
    }

    /**
     * Edit current image
     */
    async editImage() {
        if (!this.currentImage) {
            return;
        }

        try {
            this.uiManager.showEditModal(this.currentImage);
        } catch (error) {
            console.error('❌ IMAGE-MANAGER: Edit failed:', error);
            this.uiManager.showError('Edit failed');
        }
    }

    /**
     * Get current image
     * @returns {Object|null} Current image object
     */
    getCurrentImage() {
        return this.currentImage;
    }

    /**
     * Get current image index
     * @returns {number} Current image index
     */
    getCurrentIndex() {
        return this.currentIndex;
    }

    /**
     * Get image list
     * @returns {Array} Image list
     */
    getImageList() {
        return this.imageList;
    }

    /**
     * Check if fullscreen
     * @returns {boolean} Whether in fullscreen mode
     */
    isFullscreenMode() {
        return this.isFullscreen;
    }

    /**
     * Dispatch custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    /**
     * Check if image manager is ready
     * @returns {boolean} Whether image manager is ready
     */
    isReady() {
        return this.isInitialized && this.imageService && this.uiManager && this.navigation;
    }
}

// Export for ES6 modules
export { ImageManager };

// Global access for backward compatibility
if (typeof window !== 'undefined') {
    window.ImageManager = ImageManager;
}
