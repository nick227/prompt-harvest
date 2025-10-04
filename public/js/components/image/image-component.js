// Image Component - Main entry point using unified navigation
class ImageComponent {
    constructor() {
        this.navigation = null;
        this.isInitialized = false;
    }

    init() {
        // Create unified navigation if not already created
        if (!this.navigation) {
            if (typeof window.UnifiedNavigation === 'undefined') {
                // Retry after a short delay
                setTimeout(() => this.retryInit(), 100);
                return false;
            } else {
                this.navigation = new window.UnifiedNavigation();
            }
        }

        this.setupEventDelegation();
        this.isInitialized = true;

        // Expose navigation to global scope for other components
        if (this.navigation) {
            window.imageNavigation = this.navigation;
        }

        // Expose component for backward compatibility with feed system
        window.imageComponent = this;
        return true;
    }

    retryInit() {
        if (!this.navigation && typeof window.UnifiedNavigation !== 'undefined') {
            this.navigation = new window.UnifiedNavigation();
            this.setupEventDelegation();
            this.isInitialized = true;

            // Expose navigation to global scope
            window.imageNavigation = this.navigation;
            window.imageComponent = this;

        } else if (typeof window.UnifiedNavigation === 'undefined') {
            // Retry again if still not available
            setTimeout(() => this.retryInit(), 100);
        }
    }

    // Ensure navigation is available
    ensureNavigation() {
        if (!this.navigation) {
            if (typeof window.UnifiedNavigation === 'undefined') {
                return false;
            }
            this.navigation = new window.UnifiedNavigation();
        }
        return true;
    }

    // Setup event delegation for image clicks
    setupEventDelegation() {
        const imageContainer = document.querySelector('.prompt-output');
        if (!imageContainer) {
            return;
        }

        // Use event delegation for image clicks
        imageContainer.addEventListener('click', (e) => {
            const img = e.target.closest('img[data-id], img[data-image-id]');
            if (!img) {
                return;
            }

            // Check if it's a generated image
            const isGeneratedImage = img.classList.contains('generated-image') ||
                                   img.style.cursor === 'pointer' ||
                                   img.dataset.id ||
                                   img.src.includes('uploads/');

            if (!isGeneratedImage) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            // Open fullscreen using unified navigation
            if (this.ensureNavigation()) {
                this.navigation.openFullscreen(img);
            }
        });
    }

    // Create image element (simplified)
    createImageElement(imageData) {
        // Check for both 'url' and 'imageUrl' properties
        const imageUrl = imageData?.url || imageData?.imageUrl;

        if (!imageData || !imageUrl) {
            return null;
        }

        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = imageData.title || 'Generated Image';
        img.className = 'generated-image';
        img.style.cursor = 'pointer';

        // Set data attributes - include all fields needed by info-box
        if (imageData.id) {
            img.dataset.id = imageData.id;
        }
        if (imageData.prompt) {
            img.dataset.prompt = imageData.prompt;
        }
        if (imageData.original) {
            img.dataset.original = imageData.original;
        }
        if (imageData.final) {
            img.dataset.final = imageData.final;
        }
        if (imageData.provider) {
            img.dataset.provider = imageData.provider;
        }
        if (imageData.model) {
            img.dataset.model = imageData.model;
        }
        if (imageData.guidance) {
            img.dataset.guidance = imageData.guidance;
        }
        if (imageData.rating) {
            img.dataset.rating = imageData.rating;
        }
        if (imageData.isPublic !== undefined) {
            img.dataset.isPublic = imageData.isPublic;
        }
        if (imageData.userId) {
            img.dataset.userId = imageData.userId;
        }
        if (imageData.username) {
            img.dataset.username = imageData.username;
        }
        if (imageData.createdAt) {
            img.dataset.createdAt = imageData.createdAt;
        }
        if (imageData.tags) {
            img.dataset.tags = JSON.stringify(imageData.tags);
        }

        return img;
    }

    // Create image wrapper
    createImageWrapper(imageData) {
        if (!imageData) {
            return null;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';

        const img = this.createImageElement(imageData);
        if (img) {
            wrapper.appendChild(img);
        }

        return wrapper;
    }

    // Render image to container
    renderImage(imageData, container) {
        if (!imageData || !container) {
            return null;
        }

        const wrapper = this.createImageWrapper(imageData);
        if (wrapper) {
            container.appendChild(wrapper);
        }

        return wrapper;
    }

    // Render multiple images
    renderImages(images, container) {
        if (!Array.isArray(images) || !container) {
            return [];
        }

        const renderedImages = [];
        images.forEach(imageData => {
            const rendered = this.renderImage(imageData, container);
            if (rendered) {
                renderedImages.push(rendered);
            }
        });

        return renderedImages;
    }

    // Open fullscreen (delegate to navigation)
    openFullscreen(imageData) {
        if (!this.ensureNavigation()) {
            return;
        }

        // Find the image element in DOM
        const img = document.querySelector(`img[data-id="${imageData.id}"], img[data-image-id="${imageData.id}"]`);
        if (img) {
            this.navigation.openFullscreen(img);
        }
    }

    // Close fullscreen (delegate to navigation)
    closeFullscreen() {
        if (this.ensureNavigation()) {
            this.navigation.closeFullscreen();
        }
    }

    // Navigate to next image
    navigateNext() {
        if (this.ensureNavigation()) {
            this.navigation.navigateNext();
        }
    }

    // Navigate to previous image
    navigatePrevious() {
        if (this.ensureNavigation()) {
            this.navigation.navigatePrevious();
        }
    }

    // Clean up
    destroy() {
        if (this.navigation) {
            this.navigation.cleanup();
            this.navigation = null;
        }
        this.isInitialized = false;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.ImageComponent = ImageComponent;

    // Auto-initialize immediately to make it available for feed system
    if (!window.imageComponent) {
        window.imageComponent = new ImageComponent();

        // Try to initialize, but don't fail if dependencies aren't ready
        try {
            const success = window.imageComponent.init();
            if (!success) {
            }
        } catch (error) {
            // Initialization failed
        }
    }
}
