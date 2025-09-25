// Unified Navigation System
// Single source of truth for fullscreen navigation with circular navigation support
class UnifiedNavigation {
    constructor() {
        this.currentImageElement = null;
        this.fullscreenContainer = null;
        this.eventListenersSetup = false;
        this.isNavigating = false; // Prevent navigation conflicts

        // Touch event properties
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isSwipeInProgress = false;

        // Initialize unified info box component
        this.unifiedInfoBox = new window.UnifiedInfoBox();

        // Bind methods to preserve context
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleBackgroundClick = this.handleBackgroundClick.bind(this);
    }

    /**
     * Open fullscreen for an image element
     * @param {HTMLElement} imageElement - The clicked image element
     */
    openFullscreen(imageElement) {
        if (!imageElement) {
            console.error('No image element provided');

            return;
        }

        this.currentImageElement = imageElement;

        // Extract data directly from DOM element
        const imageData = this.extractImageDataFromElement(imageElement);

        if (!imageData) {
            console.error('Could not extract image data from element');

            return;
        }

        // Setup fullscreen container if needed
        this.setupFullscreenContainer();

        // Clear and populate fullscreen
        this.fullscreenContainer.innerHTML = '';
        this.populateFullscreen(imageData);

        // Show fullscreen
        this.fullscreenContainer.style.display = 'flex';

        // Setup event listeners only once
        if (!this.eventListenersSetup) {
            this.setupEventListeners();
            this.eventListenersSetup = true;
        }
    }

    /**
     * Navigate to next image with circular navigation
     */
    navigateNext() {
        if (this.isNavigating) {
            return;
        }
        this.isNavigating = true;

        const nextElement = this.getNextImageElement();

        if (nextElement) {
            this.openFullscreen(nextElement);
        }

        this.isNavigating = false;
    }

    /**
     * Navigate to previous image with circular navigation
     */
    navigatePrevious() {
        if (this.isNavigating) {
            return;
        }
        this.isNavigating = true;

        const prevElement = this.getPreviousImageElement();

        if (prevElement) {
            this.openFullscreen(prevElement);
        }

        this.isNavigating = false;
    }

    /**
     * Close fullscreen
     */
    closeFullscreen() {
        if (this.fullscreenContainer) {
            this.fullscreenContainer.style.display = 'none';
            this.currentImageElement = null;
        }
    }

    /**
     * Get the next image element with circular navigation
     * @returns {HTMLElement|null} Next image element or null
     */
    getNextImageElement() {
        if (!this.currentImageElement) {
            return null;
        }

        const allImages = this.getAllVisibleImageElements();

        if (allImages.length === 0) {
            return null;
        }

        const currentIndex = allImages.findIndex(img => img === this.currentImageElement);

        if (currentIndex === -1) {
            console.warn('Current image not found in visible images list');

            return null;
        }

        // Circular navigation: wrap to first image if at end
        const nextIndex = (currentIndex + 1) % allImages.length;

        return allImages[nextIndex];
    }

    /**
     * Get the previous image element with circular navigation
     * @returns {HTMLElement|null} Previous image element or null
     */
    getPreviousImageElement() {
        if (!this.currentImageElement) {
            return null;
        }

        const allImages = this.getAllVisibleImageElements();

        if (allImages.length === 0) {
            return null;
        }

        const currentIndex = allImages.findIndex(img => img === this.currentImageElement);

        if (currentIndex === -1) {
            console.error('Current image not found in visible images list');

            return null;
        }

        // Circular navigation: wrap to last image if at beginning
        const prevIndex = currentIndex === 0 ? allImages.length - 1 : currentIndex - 1;

        return allImages[prevIndex];
    }

    /**
     * Get all visible image elements in DOM order
     * @returns {HTMLElement[]} Array of all visible image elements
     */
    getAllVisibleImageElements() {
        const container = document.querySelector('.prompt-output');

        if (!container) {
            console.error('No .prompt-output container found');

            return [];
        }

        const wrappers = container.querySelectorAll('.image-wrapper');

        return Array.from(wrappers)
            .map(wrapper => wrapper.querySelector('img[data-id], img[data-image-id]'))
            .filter(img => img !== null);
    }

    /**
     * Extract image data directly from DOM element
     * @param {HTMLElement} imageElement - Image element
     * @returns {Object|null} Image data object
     */
    extractImageDataFromElement(imageElement) {
        if (!imageElement || !imageElement.dataset) {
            return null;
        }

        const { dataset } = imageElement;

        return {
            id: dataset.id || dataset.imageId,
            url: imageElement.src,
            title: dataset.title || 'Generated Image',
            prompt: dataset.prompt || '',
            original: dataset.original || dataset.prompt || '',
            provider: dataset.provider || 'unknown',
            model: dataset.model || 'unknown',
            guidance: dataset.guidance || 'N/A',
            steps: dataset.steps || 'N/A',
            seed: dataset.seed || 'N/A',
            rating: parseInt(dataset.rating) || 0,
            isPublic: dataset.isPublic === 'true',
            userId: dataset.userId,
            username: dataset.username,
            createdAt: dataset.createdAt || new Date().toISOString()
        };
    }

    /**
     * Setup fullscreen container
     */
    setupFullscreenContainer() {
        if (this.fullscreenContainer) {
            return;
        }

        this.fullscreenContainer = document.createElement('div');
        this.fullscreenContainer.className = 'full-screen';
        this.fullscreenContainer.setAttribute('role', 'dialog');
        this.fullscreenContainer.setAttribute('aria-modal', 'true');
        this.fullscreenContainer.setAttribute('aria-label', 'Fullscreen image view');
        this.fullscreenContainer.setAttribute('tabindex', '-1');
        this.fullscreenContainer.style.display = 'none';

        document.body.appendChild(this.fullscreenContainer);
    }

    /**
     * Populate fullscreen with image and controls
     * @param {Object} imageData - Image data
     */
    populateFullscreen(imageData) {
        // Create image container
        const imageContainer = this.createImageContainer(imageData);

        // Create info box
        const infoBox = this.createInfoBox(imageData);

        // Create navigation controls
        const navControls = this.createNavigationControls();

        // Append to fullscreen container
        this.fullscreenContainer.appendChild(imageContainer);
        this.fullscreenContainer.appendChild(navControls);
        this.fullscreenContainer.appendChild(infoBox);
    }

    /**
     * Create image container
     * @param {Object} imageData - Image data
     * @returns {HTMLElement} Image container
     */
    createImageContainer(imageData) {
        const container = document.createElement('div');

        container.className = 'fullscreen-image-container';

        const img = document.createElement('img');

        img.src = imageData.url;
        img.alt = imageData.title;
        img.className = 'fullscreen-image';

        container.appendChild(img);

        return container;
    }

    /**
     * Create info box using unified component
     * @param {Object} imageData - Image data
     * @returns {HTMLElement} Info box
     */
    createInfoBox(imageData) {
        return this.unifiedInfoBox.createInfoBox(imageData, {
            titleSource: 'title',
            titleElement: 'div',
            contentClass: 'info-box-content collapsed',
            useUIConfig: false,
            addDataAction: false
        });
    }

    /**
     * Create navigation controls
     * @returns {HTMLElement} Navigation controls
     */
    createNavigationControls() {
        const controls = document.createElement('div');

        controls.className = 'fullscreen-controls';

        const prevBtn = this.createButton('Previous', '←', () => this.navigatePrevious());
        const nextBtn = this.createButton('Next', '→', () => this.navigateNext());
        const closeBtn = this.createButton('Close', '×', () => this.closeFullscreen());
        const downloadBtn = this.createButton('Download', '↓', () => this.downloadImage());

        controls.appendChild(prevBtn);
        controls.appendChild(nextBtn);
        controls.appendChild(downloadBtn);
        controls.appendChild(closeBtn);

        return controls;
    }

    /**
     * Create button
     * @param {string} label - Button label
     * @param {string} text - Button text
     * @param {Function} onClick - Click handler
     * @returns {HTMLElement} Button element
     */
    createButton(label, text, onClick) {
        const button = document.createElement('button');

        button.setAttribute('aria-label', label);
        button.textContent = text;
        button.addEventListener('click', onClick);

        return button;
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Keyboard navigation
        document.addEventListener('keydown', this.handleKeyDown);

        // Touch events for mobile
        this.setupTouchEvents();

        // Background click to close
        this.fullscreenContainer.addEventListener('click', this.handleBackgroundClick);

        // Public status toggle
        this.setupPublicToggleEvents();
    }

    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
        if (this.fullscreenContainer.style.display === 'none') {
            return;
        }

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.navigatePrevious();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.navigateNext();
                break;
            case 'Escape':
                e.preventDefault();
                this.closeFullscreen();
                break;
            case '0': case '1': case '2': case '3': case '4': case '5':
                e.preventDefault();
                this.rateImage(parseInt(e.key));
                break;
        }
    }

    /**
     * Setup touch events for mobile navigation
     */
    setupTouchEvents() {
        this.fullscreenContainer.addEventListener('touchstart', this.handleTouchStart);
        this.fullscreenContainer.addEventListener('touchmove', this.handleTouchMove);
        this.fullscreenContainer.addEventListener('touchend', this.handleTouchEnd);
    }

    /**
     * Handle touch start
     * @param {TouchEvent} e - Touch event
     */
    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.isSwipeInProgress = true;
    }

    /**
     * Handle touch move
     * @param {TouchEvent} e - Touch event
     */
    handleTouchMove(e) {
        if (!this.isSwipeInProgress) {
            return;
        }
        e.preventDefault();
    }

    /**
     * Handle touch end
     * @param {TouchEvent} e - Touch event
     */
    handleTouchEnd(e) {
        if (!this.isSwipeInProgress) {
            return;
        }

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - this.touchStartX;
        const deltaY = Math.abs(touchEndY - this.touchStartY);

        // Check if this is a valid horizontal swipe
        if (Math.abs(deltaX) >= 50 && deltaY <= 100) {
            if (deltaX > 0) {
                // Swipe right - go to previous image
                this.navigatePrevious();
            } else {
                // Swipe left - go to next image
                this.navigateNext();
            }
        }

        this.isSwipeInProgress = false;
    }

    /**
     * Handle background click to close
     * @param {MouseEvent} e - Mouse event
     */
    handleBackgroundClick(e) {
        if (e.target === this.fullscreenContainer) {
            this.closeFullscreen();
        }
    }

    /**
     * Setup public toggle events
     */
    setupPublicToggleEvents() {
        // This will be handled by the unified info box component
        // No need for duplicate event setup
    }

    /**
     * Download current image
     */
    downloadImage() {
        if (!this.currentImageElement) {
            return;
        }

        const link = document.createElement('a');

        link.href = this.currentImageElement.src;
        link.download = this.currentImageElement.alt || 'image';
        link.target = '_blank';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Rate current image
     * @param {number} rating - Rating value (0-5)
     */
    async rateImage(rating) {
        if (!this.currentImageElement) {
            return;
        }

        const imageId = this.currentImageElement.dataset.id || this.currentImageElement.dataset.imageId;

        if (!imageId) {
            return;
        }

        // Update DOM immediately
        this.currentImageElement.dataset.rating = rating.toString();

        // Update fullscreen display
        const ratingElement = this.fullscreenContainer.querySelector('.rating-item .info-box-meta-value');

        if (ratingElement) {
            ratingElement.textContent = this.formatRating(rating);
        }

        try {
            // Call API to update server
            if (window.imageApi && window.imageApi.rateImage) {
                await window.imageApi.rateImage(imageId, rating);
                console.log('✅ Rating saved to server');
            }
        } catch (error) {
            console.error('❌ Error saving rating:', error);
        }
    }

    /**
     * Format rating display
     * @param {number} rating - Rating value
     * @returns {string} Formatted rating
     */
    formatRating(rating) {
        if (!rating || rating === 0) {
            return 'Not rated';
        }

        const stars = '★'.repeat(rating);
        const emptyStars = '☆'.repeat(5 - rating);

        return `${stars}${emptyStars} (${rating}/5)`;
    }

    /**
     * Check if navigation system is properly initialized
     * @returns {boolean} True if properly initialized
     */
    isInitialized() {
        return !!(this.fullscreenContainer && this.eventListenersSetup);
    }

    /**
     * Get current navigation state
     * @returns {Object} Navigation state information
     */
    getState() {
        return {
            isInitialized: this.isInitialized(),
            hasCurrentImage: !!this.currentImageElement,
            isNavigating: this.isNavigating,
            eventListenersSetup: this.eventListenersSetup,
            fullscreenVisible: this.fullscreenContainer?.style.display !== 'none'
        };
    }

    /**
     * Clean up event listeners
     */
    cleanup() {
        if (this.eventListenersSetup && this.fullscreenContainer) {
            // Remove keyboard event listener
            document.removeEventListener('keydown', this.handleKeyDown);

            // Remove touch event listeners
            this.fullscreenContainer.removeEventListener('touchstart', this.handleTouchStart);
            this.fullscreenContainer.removeEventListener('touchmove', this.handleTouchMove);
            this.fullscreenContainer.removeEventListener('touchend', this.handleTouchEnd);

            // Remove background click listener
            this.fullscreenContainer.removeEventListener('click', this.handleBackgroundClick);

            this.eventListenersSetup = false;
        }
    }
}

// Export for global access
window.UnifiedNavigation = UnifiedNavigation;
