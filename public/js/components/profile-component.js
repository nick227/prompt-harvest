/**
 * Profile Component - Enhanced profile display functionality
 * Handles profile-specific UI interactions and image management
 */
class ProfileComponent {
    constructor() {
        this.currentUser = null;
        this.currentImages = [];
        this.isLoading = false;

        this.init();
    }

    init() {
        // Wait for profile router to be available
        this.waitForProfileRouter();

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Wait for profile router to be available
     */
    waitForProfileRouter() {
        const checkRouter = () => {
            if (window.profileRouter) {
                this.setupProfileIntegration();
            } else {
                setTimeout(checkRouter, 100);
            }
        };

        checkRouter();
    }

    /**
     * Setup integration with profile router
     */
    setupProfileIntegration() {
        // Profile router integration is handled by ProfileFeedManager
        // This component is now mainly for additional profile-specific functionality
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Handle image clicks for fullscreen
        document.addEventListener('click', e => {
            if (e.target.closest('.profile-image-item')) {
                e.preventDefault();
                const imageData = this.getImageDataFromElement(e.target.closest('.profile-image-item'));

                if (imageData) {
                    this.openImageFullscreen(imageData);
                }
            }
        });

        // Handle keyboard navigation
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                this.closeFullscreen();
            }
        });
    }

    /**
     * Enhanced image display with better styling
     */
    displayEnhancedImages(images) {
        const container = document.getElementById('profile-image-container');
        const noImagesMessage = document.getElementById('no-images-message');

        if (!container) { return; }

        if (!images || images.length === 0) {
            container.innerHTML = '';
            if (noImagesMessage) {
                noImagesMessage.classList.remove('hidden');
            }

            return;
        }

        if (noImagesMessage) {
            noImagesMessage.classList.add('hidden');
        }

        // Clear existing images
        container.innerHTML = '';

        // Create enhanced image grid
        images.forEach((image, index) => {
            const imageElement = this.createEnhancedImageElement(image, index);

            container.appendChild(imageElement);
        });
    }

    /**
     * Create enhanced image element
     */
    createEnhancedImageElement(image, index) {
        const div = document.createElement('div');

        div.className = 'profile-image-item relative group cursor-pointer bg-gray-700 rounded-lg overflow-hidden';
        div.style.width = '200px';
        div.style.height = '200px';
        div.dataset.imageId = image.id;
        div.dataset.imageIndex = index;

        // Create image with loading placeholder
        const img = document.createElement('img');

        img.src = image.imageUrl;
        img.alt = image.prompt || 'Generated image';
        img.className = 'w-full h-full object-cover transition-transform duration-300 group-hover:scale-105';
        img.loading = 'lazy';

        // Create overlay with prompt
        const overlay = document.createElement('div');

        overlay.className = 'absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-end';

        const promptDiv = document.createElement('div');

        promptDiv.className = 'p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300';

        const promptText = document.createElement('p');

        promptText.className = 'text-sm truncate';
        promptText.textContent = image.prompt || 'No prompt available';

        const providerText = document.createElement('p');

        providerText.className = 'text-xs text-gray-300 mt-1';
        providerText.textContent = `Generated with ${image.provider || 'Unknown'}`;

        promptDiv.appendChild(promptText);
        promptDiv.appendChild(providerText);
        overlay.appendChild(promptDiv);

        // Create loading indicator
        const loadingDiv = document.createElement('div');

        loadingDiv.className = 'absolute inset-0 bg-gray-700 flex items-center justify-center';
        loadingDiv.innerHTML = '<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>';

        // Handle image load
        img.addEventListener('load', () => {
            loadingDiv.remove();
        });

        img.addEventListener('error', () => {
            loadingDiv.innerHTML = '<i class="fas fa-exclamation-triangle text-gray-500 text-2xl"></i>';
        });

        div.appendChild(loadingDiv);
        div.appendChild(img);
        div.appendChild(overlay);

        return div;
    }

    /**
     * Get image data from DOM element
     */
    getImageDataFromElement(element) {
        if (!element || !element.dataset.imageId) { return null; }

        const { imageId } = element.dataset;

        return this.currentImages.find(img => img.id === imageId);
    }

    /**
     * Open image in fullscreen view
     */
    openImageFullscreen(image) {
        // Create fullscreen overlay
        const overlay = document.createElement('div');

        overlay.id = 'profile-fullscreen-overlay';
        overlay.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4';

        const container = document.createElement('div');

        container.className = 'relative max-w-4xl max-h-full';

        const img = document.createElement('img');

        img.src = image.imageUrl;
        img.alt = image.prompt || 'Generated image';
        img.className = 'max-w-full max-h-full object-contain rounded-lg';

        const closeButton = document.createElement('button');

        closeButton.className = 'absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors';
        closeButton.innerHTML = '<i class="fas fa-times text-xl"></i>';
        closeButton.addEventListener('click', () => this.closeFullscreen());

        const infoPanel = document.createElement('div');

        infoPanel.className = 'absolute bottom-4 left-4 right-4 bg-black bg-opacity-70 text-white p-4 rounded-lg';

        const promptText = document.createElement('p');

        promptText.className = 'text-sm mb-2';
        promptText.textContent = image.prompt || 'No prompt available';

        const metaText = document.createElement('p');

        metaText.className = 'text-xs text-gray-300';
        metaText.textContent = `Generated with ${image.provider || 'Unknown'} • ${new Date(image.createdAt).toLocaleDateString()}`;

        infoPanel.appendChild(promptText);
        infoPanel.appendChild(metaText);

        container.appendChild(img);
        container.appendChild(closeButton);
        container.appendChild(infoPanel);
        overlay.appendChild(container);

        // Add to DOM
        document.body.appendChild(overlay);

        // Handle escape key
        const handleEscape = e => {
            if (e.key === 'Escape') {
                this.closeFullscreen();
            }
        };

        document.addEventListener('keydown', handleEscape);

        // Store reference for cleanup
        overlay._escapeHandler = handleEscape;
    }

    /**
     * Close fullscreen view
     */
    closeFullscreen() {
        const overlay = document.getElementById('profile-fullscreen-overlay');

        if (overlay) {
            // Remove event listener
            if (overlay._escapeHandler) {
                document.removeEventListener('keydown', overlay._escapeHandler);
            }
            overlay.remove();
        }
    }

    /**
     * Get current user data
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get current images
     */
    getCurrentImages() {
        return this.currentImages;
    }

    /**
     * Check if currently loading
     */
    isLoading() {
        return this.isLoading;
    }
}

// Initialize profile component when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.profileComponent = new ProfileComponent();
});

// Export for global access
window.ProfileComponent = ProfileComponent;
