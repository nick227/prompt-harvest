/**
 * Consolidated Image UI Manager
 * Handles all image UI coordination and rendering
 * Consolidates: image-ui-manager.js + image-elements.js + image-component.js
 */

export class ImageUIManager {
    constructor() {
        this.isInitialized = false;
        this.currentImage = null;
        this.imageContainer = null;
        this.fullscreenContainer = null;
        this.isFullscreen = false;
        
        // UI state
        this.loading = false;
        this.error = null;
        
        // Selectors
        this.selectors = {
            imageContainer: '.image-container',
            fullscreenContainer: '.fullscreen-container',
            imageList: '.image-list',
            imageItem: '.image-item',
            navigation: '.image-navigation',
            controls: '.image-controls',
            info: '.image-info'
        };
    }

    /**
     * Initialize image UI manager
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log('🎨 IMAGE-UI: Initializing UI manager...');
            
            // Setup DOM elements
            this.setupDOMElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize UI components
            this.initializeComponents();
            
            this.isInitialized = true;
            console.log('✅ IMAGE-UI: UI manager initialized');
        } catch (error) {
            console.error('❌ IMAGE-UI: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup DOM elements
     */
    setupDOMElements() {
        this.imageContainer = document.querySelector(this.selectors.imageContainer);
        this.fullscreenContainer = document.querySelector(this.selectors.fullscreenContainer);
        
        if (!this.imageContainer) {
            console.warn('⚠️ IMAGE-UI: Image container not found');
        }
        
        if (!this.fullscreenContainer) {
            console.warn('⚠️ IMAGE-UI: Fullscreen container not found');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Image click events
        document.addEventListener('click', (e) => {
            if (e.target.matches('.image-item')) {
                const imageId = e.target.dataset.imageId;
                this.handleImageClick(imageId);
            }
        });

        // Fullscreen events
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-fullscreen-toggle]')) {
                this.toggleFullscreen();
            }
        });

        // Close fullscreen
        document.addEventListener('click', (e) => {
            if (e.target.matches('.fullscreen-close') || e.target.matches('.fullscreen-overlay')) {
                this.exitFullscreen();
            }
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (this.isFullscreen) {
                this.handleFullscreenKeyboard(e);
            }
        });
    }

    /**
     * Initialize UI components
     */
    initializeComponents() {
        // Initialize image gallery
        this.initializeImageGallery();
        
        // Initialize navigation
        this.initializeNavigation();
        
        // Initialize controls
        this.initializeControls();
        
        // Initialize info display
        this.initializeInfoDisplay();
    }

    /**
     * Render images
     * @param {Array} images - Images array
     */
    renderImages(images) {
        if (!this.imageContainer) {
            console.error('❌ IMAGE-UI: Image container not found');
            return;
        }

        console.log(`🎨 IMAGE-UI: Rendering ${images.length} images`);

        const imageList = this.imageContainer.querySelector('.image-list');
        if (!imageList) {
            console.error('❌ IMAGE-UI: Image list not found');
            return;
        }

        imageList.innerHTML = images.map(image => this.generateImageHTML(image)).join('');
        
        // Setup image event listeners
        this.setupImageEventListeners();
    }

    /**
     * Generate image HTML
     * @param {Object} image - Image object
     * @returns {string} HTML string
     */
    generateImageHTML(image) {
        return `
            <div class="image-item" data-image-id="${image.id}">
                <div class="image-wrapper">
                    <img src="${image.url}" alt="${image.alt || ''}" loading="lazy">
                    <div class="image-overlay">
                        <div class="image-actions">
                            <button class="btn-fullscreen" data-fullscreen-toggle="${image.id}">
                                <i class="fas fa-expand"></i>
                            </button>
                            <button class="btn-download" data-image-action="download" data-image-id="${image.id}">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="btn-share" data-image-action="share" data-image-id="${image.id}">
                                <i class="fas fa-share"></i>
                            </button>
                            <button class="btn-like ${image.liked ? 'liked' : ''}" data-image-action="like" data-image-id="${image.id}">
                                <i class="fas fa-heart"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="image-info">
                    <h3 class="image-title">${image.title || 'Untitled'}</h3>
                    <p class="image-description">${image.description || ''}</p>
                    <div class="image-meta">
                        <span class="image-date">${this.formatDate(image.createdAt)}</span>
                        <span class="image-likes">${image.likes || 0} likes</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Show specific image
     * @param {Object} image - Image object
     * @param {number} index - Image index
     */
    showImage(image, index) {
        this.currentImage = image;
        
        // Update active image
        document.querySelectorAll('.image-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-image-id="${image.id}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
        
        // Update navigation
        this.updateNavigation(index);
        
        // Update info display
        this.updateInfoDisplay(image);
    }

    /**
     * Enter fullscreen mode
     * @param {Object} image - Image object
     */
    enterFullscreen(image) {
        if (!this.fullscreenContainer) {
            console.error('❌ IMAGE-UI: Fullscreen container not found');
            return;
        }

        this.isFullscreen = true;
        this.currentImage = image;
        
        this.fullscreenContainer.innerHTML = this.generateFullscreenHTML(image);
        this.fullscreenContainer.classList.add('active');
        document.body.classList.add('fullscreen-mode');
        
        // Setup fullscreen event listeners
        this.setupFullscreenEventListeners();
    }

    /**
     * Exit fullscreen mode
     */
    exitFullscreen() {
        if (!this.isFullscreen) {
            return;
        }

        this.isFullscreen = false;
        this.fullscreenContainer.classList.remove('active');
        document.body.classList.remove('fullscreen-mode');
        
        // Cleanup fullscreen event listeners
        this.cleanupFullscreenEventListeners();
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        if (this.isFullscreen) {
            this.exitFullscreen();
        } else if (this.currentImage) {
            this.enterFullscreen(this.currentImage);
        }
    }

    /**
     * Generate fullscreen HTML
     * @param {Object} image - Image object
     * @returns {string} HTML string
     */
    generateFullscreenHTML(image) {
        return `
            <div class="fullscreen-overlay">
                <div class="fullscreen-content">
                    <button class="fullscreen-close">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="fullscreen-image">
                        <img src="${image.url}" alt="${image.alt || ''}">
                    </div>
                    <div class="fullscreen-controls">
                        <button class="btn-prev" data-image-nav="prev">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <button class="btn-next" data-image-nav="next">
                            <i class="fas fa-arrow-right"></i>
                        </button>
                        <button class="btn-download" data-image-action="download">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn-share" data-image-action="share">
                            <i class="fas fa-share"></i>
                        </button>
                        <button class="btn-like ${image.liked ? 'liked' : ''}" data-image-action="like">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                    <div class="fullscreen-info">
                        <h3 class="image-title">${image.title || 'Untitled'}</h3>
                        <p class="image-description">${image.description || ''}</p>
                        <div class="image-meta">
                            <span class="image-date">${this.formatDate(image.createdAt)}</span>
                            <span class="image-likes">${image.likes || 0} likes</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Show loading state
     * @param {string} message - Loading message
     */
    showLoading(message = 'Loading...') {
        this.loading = true;
        this.error = null;
        
        if (this.imageContainer) {
            this.imageContainer.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p class="loading-message">${message}</p>
                </div>
            `;
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.loading = false;
        
        const loadingContainer = document.querySelector('.loading-container');
        if (loadingContainer) {
            loadingContainer.remove();
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        this.error = message;
        this.loading = false;
        
        if (this.imageContainer) {
            this.imageContainer.innerHTML = `
                <div class="error-container">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3 class="error-title">Error</h3>
                    <p class="error-message">${message}</p>
                    <button class="btn-retry" data-action="retry">Retry</button>
                </div>
            `;
        }
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    /**
     * Show no images message
     */
    showNoImages() {
        if (this.imageContainer) {
            this.imageContainer.innerHTML = `
                <div class="no-images-container">
                    <div class="no-images-icon">
                        <i class="fas fa-image"></i>
                    </div>
                    <h3 class="no-images-title">No Images Found</h3>
                    <p class="no-images-message">There are no images to display.</p>
                </div>
            `;
        }
    }

    /**
     * Update image likes
     * @param {Object} image - Image object
     */
    updateImageLikes(image) {
        const likeButtons = document.querySelectorAll(`[data-image-id="${image.id}"] .btn-like`);
        likeButtons.forEach(btn => {
            if (image.liked) {
                btn.classList.add('liked');
            } else {
                btn.classList.remove('liked');
            }
        });
    }

    /**
     * Show edit modal
     * @param {Object} image - Image object
     */
    showEditModal(image) {
        console.log('📝 IMAGE-UI: Showing edit modal for image', image);
        // Implementation for edit modal
    }

    /**
     * Handle image click
     * @param {string} imageId - Image ID
     */
    handleImageClick(imageId) {
        console.log('🖼️ IMAGE-UI: Image clicked', imageId);
        
        // Dispatch custom event
        const event = new CustomEvent('imageClicked', {
            detail: { imageId }
        });
        document.dispatchEvent(event);
    }

    /**
     * Handle fullscreen keyboard events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleFullscreenKeyboard(event) {
        switch (event.key) {
            case 'Escape':
                event.preventDefault();
                this.exitFullscreen();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.dispatchNavigationEvent('prev');
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.dispatchNavigationEvent('next');
                break;
        }
    }

    /**
     * Dispatch navigation event
     * @param {string} direction - Navigation direction
     */
    dispatchNavigationEvent(direction) {
        const event = new CustomEvent('imageNavigation', {
            detail: { direction }
        });
        document.dispatchEvent(event);
    }

    /**
     * Setup image event listeners
     */
    setupImageEventListeners() {
        // Image load events
        document.querySelectorAll('.image-item img').forEach(img => {
            img.addEventListener('load', () => {
                img.classList.add('loaded');
            });
            
            img.addEventListener('error', () => {
                img.classList.add('error');
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg==';
            });
        });
    }

    /**
     * Setup fullscreen event listeners
     */
    setupFullscreenEventListeners() {
        // Navigation buttons
        this.fullscreenContainer.querySelectorAll('[data-image-nav]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const direction = e.target.dataset.imageNav;
                this.dispatchNavigationEvent(direction);
            });
        });

        // Action buttons
        this.fullscreenContainer.querySelectorAll('[data-image-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.imageAction;
                const event = new CustomEvent('imageAction', {
                    detail: { action, imageId: this.currentImage.id }
                });
                document.dispatchEvent(event);
            });
        });
    }

    /**
     * Cleanup fullscreen event listeners
     */
    cleanupFullscreenEventListeners() {
        // Event listeners are automatically cleaned up when elements are removed
    }

    /**
     * Initialize image gallery
     */
    initializeImageGallery() {
        // Implementation for image gallery initialization
    }

    /**
     * Initialize navigation
     */
    initializeNavigation() {
        // Implementation for navigation initialization
    }

    /**
     * Initialize controls
     */
    initializeControls() {
        // Implementation for controls initialization
    }

    /**
     * Initialize info display
     */
    initializeInfoDisplay() {
        // Implementation for info display initialization
    }

    /**
     * Update navigation
     * @param {number} index - Current index
     */
    updateNavigation(index) {
        // Implementation for navigation update
    }

    /**
     * Update info display
     * @param {Object} image - Image object
     */
    updateInfoDisplay(image) {
        // Implementation for info display update
    }

    /**
     * Format date
     * @param {string|Date} date - Date to format
     * @returns {string} Formatted date
     */
    formatDate(date) {
        if (!date) return '';
        
        const d = new Date(date);
        return d.toLocaleDateString();
    }
}

// Export for ES6 modules
export { ImageUIManager };

// Global access for backward compatibility
if (typeof window !== 'undefined') {
    window.ImageUIManager = ImageUIManager;
}
