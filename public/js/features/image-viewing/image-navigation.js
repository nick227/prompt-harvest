/**
 * Consolidated Image Navigation
 * Handles image navigation controls and functionality
 * Consolidates: navigation-controls.js + unified-navigation.js
 */

export class ImageNavigation {
    constructor() {
        this.isInitialized = false;
        this.currentIndex = 0;
        this.totalImages = 0;
        this.navigationContainer = null;
        
        // Navigation state
        this.canGoNext = false;
        this.canGoPrev = false;
        
        // Selectors
        this.selectors = {
            navigation: '.image-navigation',
            prevButton: '.btn-prev',
            nextButton: '.btn-next',
            counter: '.image-counter',
            thumbnails: '.image-thumbnails'
        };
    }

    /**
     * Initialize image navigation
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log('🧭 IMAGE-NAVIGATION: Initializing navigation...');
            
            // Setup DOM elements
            this.setupDOMElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize navigation components
            this.initializeComponents();
            
            this.isInitialized = true;
            console.log('✅ IMAGE-NAVIGATION: Navigation initialized');
        } catch (error) {
            console.error('❌ IMAGE-NAVIGATION: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup DOM elements
     */
    setupDOMElements() {
        this.navigationContainer = document.querySelector(this.selectors.navigation);
        
        if (!this.navigationContainer) {
            console.warn('⚠️ IMAGE-NAVIGATION: Navigation container not found');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation button clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches(this.selectors.prevButton)) {
                this.goToPrevious();
            } else if (e.target.matches(this.selectors.nextButton)) {
                this.goToNext();
            }
        });

        // Thumbnail clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('.thumbnail-item')) {
                const index = parseInt(e.target.dataset.index);
                this.goToIndex(index);
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });

        // Touch/swipe navigation
        this.setupTouchNavigation();
    }

    /**
     * Setup touch navigation
     */
    setupTouchNavigation() {
        let startX = 0;
        let startY = 0;
        let endX = 0;
        let endY = 0;

        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });

        document.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            endY = e.changedTouches[0].clientY;
            
            this.handleSwipe(startX, startY, endX, endY);
        });
    }

    /**
     * Handle swipe gesture
     * @param {number} startX - Start X coordinate
     * @param {number} startY - Start Y coordinate
     * @param {number} endX - End X coordinate
     * @param {number} endY - End Y coordinate
     */
    handleSwipe(startX, startY, endX, endY) {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const minSwipeDistance = 50;

        // Check if it's a horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0) {
                // Swipe right - go to previous
                this.goToPrevious();
            } else {
                // Swipe left - go to next
                this.goToNext();
            }
        }
    }

    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyboardNavigation(event) {
        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                this.goToPrevious();
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.goToNext();
                break;
            case 'Home':
                event.preventDefault();
                this.goToFirst();
                break;
            case 'End':
                event.preventDefault();
                this.goToLast();
                break;
        }
    }

    /**
     * Update navigation
     * @param {number} totalImages - Total number of images
     * @param {number} currentIndex - Current image index
     */
    updateNavigation(totalImages, currentIndex) {
        this.totalImages = totalImages;
        this.currentIndex = currentIndex;
        
        // Update navigation state
        this.canGoPrev = currentIndex > 0;
        this.canGoNext = currentIndex < totalImages - 1;
        
        // Update UI
        this.updateNavigationUI();
        this.updateCounter();
        this.updateThumbnails();
    }

    /**
     * Update navigation UI
     */
    updateNavigationUI() {
        const prevButton = document.querySelector(this.selectors.prevButton);
        const nextButton = document.querySelector(this.selectors.nextButton);
        
        if (prevButton) {
            prevButton.disabled = !this.canGoPrev;
            prevButton.classList.toggle('disabled', !this.canGoPrev);
        }
        
        if (nextButton) {
            nextButton.disabled = !this.canGoNext;
            nextButton.classList.toggle('disabled', !this.canGoNext);
        }
    }

    /**
     * Update counter
     */
    updateCounter() {
        const counter = document.querySelector(this.selectors.counter);
        if (counter) {
            counter.textContent = `${this.currentIndex + 1} of ${this.totalImages}`;
        }
    }

    /**
     * Update thumbnails
     */
    updateThumbnails() {
        const thumbnails = document.querySelector(this.selectors.thumbnails);
        if (!thumbnails) {
            return;
        }

        // Update active thumbnail
        thumbnails.querySelectorAll('.thumbnail-item').forEach((thumb, index) => {
            thumb.classList.toggle('active', index === this.currentIndex);
        });
    }

    /**
     * Go to previous image
     */
    goToPrevious() {
        if (this.canGoPrev) {
            const newIndex = this.currentIndex - 1;
            this.goToIndex(newIndex);
        }
    }

    /**
     * Go to next image
     */
    goToNext() {
        if (this.canGoNext) {
            const newIndex = this.currentIndex + 1;
            this.goToIndex(newIndex);
        }
    }

    /**
     * Go to specific index
     * @param {number} index - Target index
     */
    goToIndex(index) {
        if (index >= 0 && index < this.totalImages && index !== this.currentIndex) {
            this.currentIndex = index;
            
            // Dispatch navigation event
            this.dispatchNavigationEvent('index', { index });
            
            // Update navigation
            this.updateNavigation(this.totalImages, this.currentIndex);
        }
    }

    /**
     * Go to first image
     */
    goToFirst() {
        if (this.totalImages > 0) {
            this.goToIndex(0);
        }
    }

    /**
     * Go to last image
     */
    goToLast() {
        if (this.totalImages > 0) {
            this.goToIndex(this.totalImages - 1);
        }
    }

    /**
     * Dispatch navigation event
     * @param {string} type - Event type
     * @param {Object} detail - Event detail
     */
    dispatchNavigationEvent(type, detail) {
        const event = new CustomEvent('imageNavigation', {
            detail: { type, ...detail }
        });
        document.dispatchEvent(event);
    }

    /**
     * Initialize components
     */
    initializeComponents() {
        // Initialize navigation buttons
        this.initializeNavigationButtons();
        
        // Initialize counter
        this.initializeCounter();
        
        // Initialize thumbnails
        this.initializeThumbnails();
    }

    /**
     * Initialize navigation buttons
     */
    initializeNavigationButtons() {
        if (!this.navigationContainer) {
            return;
        }

        // Create navigation buttons if they don't exist
        if (!this.navigationContainer.querySelector(this.selectors.prevButton)) {
            const prevButton = document.createElement('button');
            prevButton.className = 'btn-prev';
            prevButton.innerHTML = '<i class="fas fa-arrow-left"></i>';
            prevButton.setAttribute('aria-label', 'Previous image');
            this.navigationContainer.appendChild(prevButton);
        }

        if (!this.navigationContainer.querySelector(this.selectors.nextButton)) {
            const nextButton = document.createElement('button');
            nextButton.className = 'btn-next';
            nextButton.innerHTML = '<i class="fas fa-arrow-right"></i>';
            nextButton.setAttribute('aria-label', 'Next image');
            this.navigationContainer.appendChild(nextButton);
        }
    }

    /**
     * Initialize counter
     */
    initializeCounter() {
        if (!this.navigationContainer) {
            return;
        }

        // Create counter if it doesn't exist
        if (!this.navigationContainer.querySelector(this.selectors.counter)) {
            const counter = document.createElement('div');
            counter.className = 'image-counter';
            counter.textContent = '0 of 0';
            this.navigationContainer.appendChild(counter);
        }
    }

    /**
     * Initialize thumbnails
     */
    initializeThumbnails() {
        if (!this.navigationContainer) {
            return;
        }

        // Create thumbnails container if it doesn't exist
        if (!this.navigationContainer.querySelector(this.selectors.thumbnails)) {
            const thumbnails = document.createElement('div');
            thumbnails.className = 'image-thumbnails';
            this.navigationContainer.appendChild(thumbnails);
        }
    }

    /**
     * Generate thumbnails HTML
     * @param {Array} images - Images array
     * @returns {string} HTML string
     */
    generateThumbnailsHTML(images) {
        return images.map((image, index) => `
            <div class="thumbnail-item ${index === this.currentIndex ? 'active' : ''}" 
                 data-index="${index}" 
                 data-image-id="${image.id}">
                <img src="${image.thumbnail || image.url}" alt="${image.alt || ''}" loading="lazy">
            </div>
        `).join('');
    }

    /**
     * Update thumbnails with images
     * @param {Array} images - Images array
     */
    updateThumbnails(images) {
        const thumbnails = document.querySelector(this.selectors.thumbnails);
        if (thumbnails) {
            thumbnails.innerHTML = this.generateThumbnailsHTML(images);
        }
    }

    /**
     * Get current index
     * @returns {number} Current index
     */
    getCurrentIndex() {
        return this.currentIndex;
    }

    /**
     * Get total images
     * @returns {number} Total images
     */
    getTotalImages() {
        return this.totalImages;
    }

    /**
     * Check if can go previous
     * @returns {boolean} Whether can go previous
     */
    canGoPrevious() {
        return this.canGoPrev;
    }

    /**
     * Check if can go next
     * @returns {boolean} Whether can go next
     */
    canGoNext() {
        return this.canGoNext;
    }

    /**
     * Check if navigation is ready
     * @returns {boolean} Whether navigation is ready
     */
    isReady() {
        return this.isInitialized;
    }
}

// Export for ES6 modules
export { ImageNavigation };

// Global access for backward compatibility
if (typeof window !== 'undefined') {
    window.ImageNavigation = ImageNavigation;
}
