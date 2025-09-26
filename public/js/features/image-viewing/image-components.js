/**
 * Consolidated Image Components
 * Handles all image UI components and widgets
 * Consolidates: image-component.js + fullscreen-components.js + unified-info-box.js
 */

export class ImageComponents {
    constructor() {
        this.isInitialized = false;
        this.components = new Map();
        this.fullscreenComponents = new Map();
        this.infoComponents = new Map();
        
        // Component configurations
        this.config = {
            fullscreen: {
                enabled: true,
                keyboardNavigation: true,
                touchNavigation: true,
                showControls: true,
                showInfo: true
            },
            info: {
                showTitle: true,
                showDescription: true,
                showMetadata: true,
                showActions: true
            }
        };
    }

    /**
     * Initialize image components
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log('🧩 IMAGE-COMPONENTS: Initializing image components...');
            
            // Initialize fullscreen components
            this.initializeFullscreenComponents();
            
            // Initialize info components
            this.initializeInfoComponents();
            
            // Initialize action components
            this.initializeActionComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ IMAGE-COMPONENTS: Image components initialized');
        } catch (error) {
            console.error('❌ IMAGE-COMPONENTS: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize fullscreen components
     */
    initializeFullscreenComponents() {
        // Create fullscreen container if it doesn't exist
        if (!document.querySelector('.fullscreen-container')) {
            const container = document.createElement('div');
            container.className = 'fullscreen-container';
            container.style.display = 'none';
            document.body.appendChild(container);
        }
        
        // Initialize fullscreen overlay
        this.initializeFullscreenOverlay();
        
        // Initialize fullscreen controls
        this.initializeFullscreenControls();
        
        // Initialize fullscreen navigation
        this.initializeFullscreenNavigation();
    }

    /**
     * Initialize info components
     */
    initializeInfoComponents() {
        // Initialize info box
        this.initializeInfoBox();
        
        // Initialize metadata display
        this.initializeMetadataDisplay();
        
        // Initialize action buttons
        this.initializeActionButtons();
    }

    /**
     * Initialize action components
     */
    initializeActionComponents() {
        // Initialize download component
        this.initializeDownloadComponent();
        
        // Initialize share component
        this.initializeShareComponent();
        
        // Initialize like component
        this.initializeLikeComponent();
        
        // Initialize edit component
        this.initializeEditComponent();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Fullscreen events
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-fullscreen-toggle]')) {
                this.toggleFullscreen(e.target.dataset.fullscreenToggle);
            }
        });

        // Close fullscreen
        document.addEventListener('click', (e) => {
            if (e.target.matches('.fullscreen-close') || e.target.matches('.fullscreen-overlay')) {
                this.closeFullscreen();
            }
        });

        // Action button events
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-image-action]')) {
                const action = e.target.dataset.imageAction;
                const imageId = e.target.dataset.imageId;
                this.handleAction(action, imageId);
            }
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (this.isFullscreenOpen()) {
                this.handleFullscreenKeyboard(e);
            }
        });
    }

    /**
     * Initialize fullscreen overlay
     */
    initializeFullscreenOverlay() {
        const container = document.querySelector('.fullscreen-container');
        if (!container) return;

        container.innerHTML = `
            <div class="fullscreen-overlay">
                <div class="fullscreen-content">
                    <button class="fullscreen-close">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="fullscreen-image-container">
                        <img class="fullscreen-image" src="" alt="">
                    </div>
                    <div class="fullscreen-controls">
                        <button class="btn-prev" data-image-nav="prev">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <button class="btn-next" data-image-nav="next">
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                    <div class="fullscreen-info">
                        <h3 class="image-title"></h3>
                        <p class="image-description"></p>
                        <div class="image-meta">
                            <span class="image-date"></span>
                            <span class="image-likes"></span>
                        </div>
                    </div>
                    <div class="fullscreen-actions">
                        <button class="btn-download" data-image-action="download">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn-share" data-image-action="share">
                            <i class="fas fa-share"></i>
                        </button>
                        <button class="btn-like" data-image-action="like">
                            <i class="fas fa-heart"></i>
                        </button>
                        <button class="btn-edit" data-image-action="edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize fullscreen controls
     */
    initializeFullscreenControls() {
        // Implementation for fullscreen controls
    }

    /**
     * Initialize fullscreen navigation
     */
    initializeFullscreenNavigation() {
        // Implementation for fullscreen navigation
    }

    /**
     * Initialize info box
     */
    initializeInfoBox() {
        // Implementation for info box
    }

    /**
     * Initialize metadata display
     */
    initializeMetadataDisplay() {
        // Implementation for metadata display
    }

    /**
     * Initialize action buttons
     */
    initializeActionButtons() {
        // Implementation for action buttons
    }

    /**
     * Initialize download component
     */
    initializeDownloadComponent() {
        // Implementation for download component
    }

    /**
     * Initialize share component
     */
    initializeShareComponent() {
        // Implementation for share component
    }

    /**
     * Initialize like component
     */
    initializeLikeComponent() {
        // Implementation for like component
    }

    /**
     * Initialize edit component
     */
    initializeEditComponent() {
        // Implementation for edit component
    }

    /**
     * Toggle fullscreen mode
     * @param {string} imageId - Image ID
     */
    toggleFullscreen(imageId) {
        if (this.isFullscreenOpen()) {
            this.closeFullscreen();
        } else {
            this.openFullscreen(imageId);
        }
    }

    /**
     * Open fullscreen mode
     * @param {string} imageId - Image ID
     */
    openFullscreen(imageId) {
        const container = document.querySelector('.fullscreen-container');
        if (!container) return;

        // Get image data
        const imageData = this.getImageData(imageId);
        if (!imageData) return;

        // Update fullscreen content
        this.updateFullscreenContent(imageData);
        
        // Show fullscreen
        container.style.display = 'block';
        document.body.classList.add('fullscreen-mode');
        
        // Dispatch event
        this.dispatchEvent('fullscreenOpened', { imageId, imageData });
    }

    /**
     * Close fullscreen mode
     */
    closeFullscreen() {
        const container = document.querySelector('.fullscreen-container');
        if (container) {
            container.style.display = 'none';
        }
        
        document.body.classList.remove('fullscreen-mode');
        
        // Dispatch event
        this.dispatchEvent('fullscreenClosed', {});
    }

    /**
     * Check if fullscreen is open
     * @returns {boolean} Whether fullscreen is open
     */
    isFullscreenOpen() {
        const container = document.querySelector('.fullscreen-container');
        return container && container.style.display !== 'none';
    }

    /**
     * Update fullscreen content
     * @param {Object} imageData - Image data
     */
    updateFullscreenContent(imageData) {
        const container = document.querySelector('.fullscreen-container');
        if (!container) return;

        // Update image
        const img = container.querySelector('.fullscreen-image');
        if (img) {
            img.src = imageData.url;
            img.alt = imageData.alt || '';
        }

        // Update title
        const title = container.querySelector('.image-title');
        if (title) {
            title.textContent = imageData.title || 'Untitled';
        }

        // Update description
        const description = container.querySelector('.image-description');
        if (description) {
            description.textContent = imageData.description || '';
        }

        // Update date
        const date = container.querySelector('.image-date');
        if (date) {
            date.textContent = this.formatDate(imageData.createdAt);
        }

        // Update likes
        const likes = container.querySelector('.image-likes');
        if (likes) {
            likes.textContent = `${imageData.likes || 0} likes`;
        }

        // Update like button
        const likeButton = container.querySelector('.btn-like');
        if (likeButton) {
            likeButton.classList.toggle('liked', imageData.liked);
        }

        // Update action buttons
        this.updateActionButtons(imageData);
    }

    /**
     * Update action buttons
     * @param {Object} imageData - Image data
     */
    updateActionButtons(imageData) {
        const container = document.querySelector('.fullscreen-container');
        if (!container) return;

        // Update like button
        const likeButton = container.querySelector('.btn-like');
        if (likeButton) {
            likeButton.classList.toggle('liked', imageData.liked);
        }

        // Update other action buttons as needed
        // Implementation for other action buttons
    }

    /**
     * Handle action
     * @param {string} action - Action to perform
     * @param {string} imageId - Image ID
     */
    handleAction(action, imageId) {
        console.log(`⚡ IMAGE-COMPONENTS: Handling action ${action} for image ${imageId}`);
        
        // Dispatch action event
        this.dispatchEvent('imageAction', { action, imageId });
    }

    /**
     * Handle fullscreen keyboard events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleFullscreenKeyboard(event) {
        switch (event.key) {
            case 'Escape':
                event.preventDefault();
                this.closeFullscreen();
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
        this.dispatchEvent('imageNavigation', { direction });
    }

    /**
     * Get image data
     * @param {string} imageId - Image ID
     * @returns {Object|null} Image data
     */
    getImageData(imageId) {
        // Implementation to get image data
        // This would typically fetch from a service or cache
        return null;
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
     * Get component by name
     * @param {string} name - Component name
     * @returns {Object|null} Component instance
     */
    getComponent(name) {
        return this.components.get(name) || null;
    }

    /**
     * Create component
     * @param {string} name - Component name
     * @param {Object} config - Component configuration
     * @returns {Object} Component instance
     */
    createComponent(name, config) {
        const component = {
            name,
            config,
            element: null,
            isActive: false
        };
        
        this.components.set(name, component);
        return component;
    }

    /**
     * Update component configuration
     * @param {Object} config - New configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }

    /**
     * Check if components are ready
     * @returns {boolean} Whether components are ready
     */
    isReady() {
        return this.isInitialized;
    }
}

// Export for ES6 modules
export { ImageComponents };

// Global access for backward compatibility
if (typeof window !== 'undefined') {
    window.ImageComponents = ImageComponents;
}
