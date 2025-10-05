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
            return;
        }

        this.currentImageElement = imageElement;

        // Extract data directly from DOM element
        const imageData = this.extractImageDataFromElement(imageElement);

        if (!imageData) {
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

        // Ensure info box state is properly initialized
        this.initializeInfoBoxState();
    }

    /**
     * Navigate to next image with circular navigation
     */
    navigateNext() {
        if (this.isNavigating) {
            return;
        }
        this.isNavigating = true;

        // Save current info box state before navigating
        this.saveCurrentInfoBoxState();

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

        // Save current info box state before navigating
        this.saveCurrentInfoBoxState();

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

        // Try exact match first
        let currentIndex = allImages.findIndex(img => img === this.currentImageElement);

        // If exact match fails, try matching by ID
        if (currentIndex === -1) {
            const currentId = this.currentImageElement.dataset.id || this.currentImageElement.dataset.imageId;

            if (currentId) {
                currentIndex = allImages.findIndex(img => {
                    const imgId = img.dataset.id || img.dataset.imageId;

                    return imgId === currentId;
                });
            }
        }

        // If still no match, try matching by src
        if (currentIndex === -1) {
            currentIndex = allImages.findIndex(img => img.src === this.currentImageElement.src);
        }

        if (currentIndex === -1) {
            return null;
        }

        // Handle single image case
        if (allImages.length === 1) {
            return allImages[0];
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

        // Try exact match first
        let currentIndex = allImages.findIndex(img => img === this.currentImageElement);

        // If exact match fails, try matching by ID
        if (currentIndex === -1) {
            const currentId = this.currentImageElement.dataset.id || this.currentImageElement.dataset.imageId;

            if (currentId) {
                currentIndex = allImages.findIndex(img => {
                    const imgId = img.dataset.id || img.dataset.imageId;

                    return imgId === currentId;
                });
            }
        }

        // If still no match, try matching by src
        if (currentIndex === -1) {
            currentIndex = allImages.findIndex(img => img.src === this.currentImageElement.src);
        }

        if (currentIndex === -1) {
            return null;
        }

        // Handle single image case
        if (allImages.length === 1) {
            return allImages[0];
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
        // Try multiple approaches to find images
        let foundImages = [];

        // Approach 1: Look in common containers
        const containers = ['#image-container-main'];

        for (const containerSelector of containers) {
            const container = document.querySelector(containerSelector);

            if (!container) {
                continue;
            }

            // Try different selectors within this container
            const selectors = [
                'img[data-id]',
                'img[data-image-id]',
                '.image-wrapper img',
                '.generated-image',
                'img[src*="uploads"]',
                'img[src*="r2.dev"]',
                'img[src*="flux_"]'
            ];

            for (const selector of selectors) {
                const images = container.querySelectorAll(selector);

                if (images.length > 0) {
                    const validImages = Array.from(images).filter(img => {
                        // Must have an ID or be a generated image
                        const hasId = img.dataset.id || img.dataset.imageId;
                        const isGenerated = img.classList.contains('generated-image') ||
                                          img.src.includes('uploads/') ||
                                          img.src.includes('r2.dev') ||
                                          img.src.includes('flux_');
                        const isVisible = img.offsetParent !== null && img.src;

                        return (hasId || isGenerated) && isVisible;
                    });

                    if (validImages.length > 0) {
                        foundImages = validImages;
                        break;
                    }
                }
            }

            if (foundImages.length > 0) {
                break;
            }
        }

        // Approach 2: If still no images, try global search
        if (foundImages.length === 0) {
            const globalSelectors = [
                'img[data-id]',
                'img[data-image-id]',
                'img[src*="uploads"]',
                'img[src*="r2.dev"]',
                'img[src*="flux_"]'
            ];

            for (const selector of globalSelectors) {
                const images = document.querySelectorAll(selector);

                if (images.length > 0) {
                    const validImages = Array.from(images).filter(img => {
                        const isVisible = img.offsetParent !== null && img.src;
                        const isGenerated = img.src.includes('uploads/') ||
                                          img.src.includes('r2.dev') ||
                                          img.src.includes('flux_') ||
                                          img.classList.contains('generated-image');

                        return isVisible && isGenerated;
                    });

                    if (validImages.length > 0) {
                        foundImages = validImages;
                        break;
                    }
                }
            }
        }

        // No visible images found

        return foundImages;
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

        // Get current user ID as fallback for missing userId
        const currentUserId = this.getCurrentUserId();

        // Generate title from first 8 characters of prompt
        const generateTitle = prompt => {
            if (!prompt) {
                return 'Generated Image';
            }

            return prompt.substring(0, 8);
        };

        const prompt = dataset.prompt || '';

        return {
            id: dataset.id || dataset.imageId,
            url: imageElement.src,
            title: generateTitle(prompt),
            prompt,
            original: dataset.original || prompt || '',
            provider: dataset.provider || 'unknown',
            model: dataset.model || dataset.provider || 'unknown', // Use model field, fallback to provider
            guidance: dataset.guidance || 'N/A',
            steps: dataset.steps || 'N/A',
            seed: dataset.seed || 'N/A',
            rating: parseInt(dataset.rating) || 0,
            isPublic: dataset.isPublic === 'true',
            userId: dataset.userId || currentUserId, // Use current user as fallback
            username: dataset.username || 'Unknown User', // Provide fallback for username
            createdAt: dataset.createdAt || new Date().toISOString(),
            tags: window.TagUtils ? window.TagUtils.parseTags(dataset.tags) : (dataset.tags ? JSON.parse(dataset.tags) : []) // ✅ Include tags with centralized parsing
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
        img.id = `fullscreen-image-${imageData.id}`;

        // Set data attributes for zoom functionality
        this.setFullscreenImageDataAttributes(img, imageData);

        // Setup zoom functionality using FullscreenComponents
        this.setupImageZoom(img);

        container.appendChild(img);

        return container;
    }

    /**
     * Create info box using unified component
     * @param {Object} imageData - Image data
     * @returns {HTMLElement} Info box
     */
    createInfoBox(imageData) {
        // Get saved state for info box
        const savedState = this.getInfoBoxState();

        const infoBox = this.unifiedInfoBox.createInfoBox(imageData, {
            titleSource: 'title',
            titleElement: 'div',
            contentClass: savedState.isExpanded ? 'info-box-content expanded' : 'info-box-content collapsed',
            useUIConfig: false,
            addDataAction: false
        });

        // Update the toggle button text to match the state
        const toggleButton = infoBox.querySelector('.info-box-toggle');

        if (toggleButton) {
            toggleButton.textContent = savedState.isExpanded ? '−' : '+';
        }

        return infoBox;
    }

    /**
     * Create navigation controls
     * @returns {HTMLElement} Navigation controls
     */
    createNavigationControls() {
        const controls = document.createElement('div');

        controls.className = 'fullscreen-controls';

        const prevBtn = this.createButton('Previous', '← previous', () => {
            this.navigatePrevious();
        });
        const nextBtn = this.createButton('Next', 'next →', () => {
            this.navigateNext();
        });
        const closeBtn = this.createButton('Close', 'close', () => {
            this.closeFullscreen();
        });
        const downloadBtn = this.createButton('Download', 'download', () => this.downloadImage());

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

        // Setup info box toggle events for state persistence
        this.setupInfoBoxToggleEvents();
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
     * Setup info box toggle events for state persistence
     */
    setupInfoBoxToggleEvents() {
        // Listen for custom info box toggle events
        window.addEventListener('infoBoxToggle', e => {
            this.saveInfoBoxState({ isExpanded: e.detail.isExpanded });
        });

        // Also listen for direct clicks on toggle buttons as backup
        this.fullscreenContainer.addEventListener('click', e => {
            const toggle = e.target.closest('.info-box-toggle');

            if (toggle) {
                setTimeout(() => {
                    // Small delay to allow the unified info box to update the DOM
                    this.saveCurrentInfoBoxState();
                }, 50);
            }
        });
    }

    /**
     * Download current image
     */
    async downloadImage() {
        if (!this.currentImageElement) {
            return;
        }

        try {
            // Fetch the image as a blob to force Save As dialog
            const response = await fetch(this.currentImageElement.src);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const fileName = this.generateFileNameFromPrompt();

            // Create object URL and download
            const objectUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');

            link.href = objectUrl;
            link.download = fileName;
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up object URL
            URL.revokeObjectURL(objectUrl);

        } catch (error) {
            console.error('❌ DOWNLOAD: Blob download failed, trying fallback:', error);

            // Fallback to old method
            try {
                const link = document.createElement('a');

                link.href = this.currentImageElement.src;
                link.download = this.generateFileNameFromPrompt();
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (fallbackError) {
                console.error('❌ DOWNLOAD: All download methods failed:', fallbackError);
            }
        }
    }

    /**
     * Generate filename from final prompt (first 30 characters)
     * @returns {string} Sanitized filename
     */
    generateFileNameFromPrompt() {
        // Get final prompt from dataset (check multiple possible fields)
        const finalPrompt = this.currentImageElement.dataset.final ||
                           this.currentImageElement.dataset.finalPrompt ||
                           this.currentImageElement.dataset.enhancedPrompt ||
                           this.currentImageElement.dataset.prompt ||
                           this.currentImageElement.alt ||
                           'Generated Image';

        // Take first 30 characters
        const truncatedPrompt = finalPrompt.length > 30 ?
            finalPrompt.substring(0, 30)
            : finalPrompt;

        // Sanitize filename - remove invalid characters but keep spaces
        const sanitized = truncatedPrompt
            .replace(/[<>:"/\\|?*.,;(){}[\]!@#$%^&+=`~]/g, '') // Remove invalid filename characters
            .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
            .trim(); // Remove leading/trailing spaces

        // Ensure we have a valid filename
        if (!sanitized || sanitized.length === 0) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            return `Generated Image ${timestamp}.jpg`;
        }

        // Add .jpg extension if not present
        return sanitized.endsWith('.jpg') ? sanitized : `${sanitized}.jpg`;
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
        const visible =
            this.fullscreenContainer &&
            this.fullscreenContainer.style.display !== 'none';

        return {
            isInitialized: this.isInitialized(),
            hasCurrentImage: !!this.currentImageElement,
            isNavigating: this.isNavigating,
            eventListenersSetup: this.eventListenersSetup,
            fullscreenVisible: !!visible
        };
    }

    /**
     * Set data attributes for fullscreen image
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data object
     */
    setFullscreenImageDataAttributes(img, imageData) {
        const dataAttributes = [
            'id', 'url', 'prompt', 'original', 'final', 'provider', 'model',
            'guidance', 'seed', 'steps', 'rating', 'isPublic', 'createdAt'
        ];

        dataAttributes.forEach(attr => {
            if (imageData[attr] !== undefined) {
                img.setAttribute(`data-${attr}`, imageData[attr]);
            }
        });
    }

    /**
     * Setup image zoom functionality
     * @param {HTMLImageElement} img - Image element
     */
    setupImageZoom(img) {
        this.initializeImageZoom(img);
        this.setupZoomFunctionality(img);
    }

    /**
     * Initialize image zoom properties
     * @param {HTMLImageElement} img - Image element
     */
    initializeImageZoom(img) {
        img.style.cursor = 'zoom-in';
        img.style.transition = 'transform 0.2s ease';
        img.style.userSelect = 'none';

        // Always start at zoom level 1 for new images
        img.dataset.zoom = '1';

        // Initialize position if not set
        if (!img.dataset.translateX) {
            img.dataset.translateX = '0';
        }
        if (!img.dataset.translateY) {
            img.dataset.translateY = '0';
        }

        // Apply initial zoom level (always 1)
        img.style.transform = 'scale(1) translate(0px, 0px)';
        img.style.cursor = 'zoom-in';
    }

    /**
     * Setup zoom functionality for the image
     * @param {HTMLImageElement} img - Image element
     */
    setupZoomFunctionality(img) {
        // Click event listener for zoom functionality
        img.addEventListener('click', e => {
            e.stopPropagation();

            const currentZoom = parseFloat(img.dataset.zoom);
            // Cycle through zoom levels: 1 → 1.5 → 2 → 2.5 → 3 → 1
            const newZoom = currentZoom >= 3 ? 1 : currentZoom + 0.5;

            img.dataset.zoom = newZoom.toString();

            // Reset position when zooming
            img.dataset.translateX = '0';
            img.dataset.translateY = '0';

            img.style.transform = `scale(${newZoom}) translate(0px, 0px)`;

            // Update cursor based on zoom level
            img.style.cursor = newZoom >= 3 ? 'zoom-out' : 'zoom-in';
        });

        // Double-click event listener to reset zoom and position
        img.addEventListener('dblclick', e => {
            e.stopPropagation();

            // Reset zoom and position to default
            img.dataset.zoom = '1';
            img.dataset.translateX = '0';
            img.dataset.translateY = '0';

            img.style.transform = 'scale(1) translate(0px, 0px)';
            img.style.cursor = 'zoom-in';
        });
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

    /**
     * Get current user ID from auth service
     * @returns {string|null} Current user ID
     */
    getCurrentUserId() {
        // Try multiple sources for user ID
        if (window.UnifiedAuthUtils && window.UnifiedAuthUtils.getCurrentUserId) {
            return window.UnifiedAuthUtils.getCurrentUserId();
        }
        if (window.authService && window.authService.getCurrentUserId) {
            return window.authService.getCurrentUserId();
        }
        if (window.userApi && window.userApi.getCurrentUser) {
            const user = window.userApi.getCurrentUser();

            return user?.id;
        }

        return null;
    }

    /**
     * Get info box state from localStorage
     * @returns {Object} Info box state
     */
    getInfoBoxState() {
        try {
            const saved = localStorage.getItem('fullscreen-info-box-state');

            return saved ? JSON.parse(saved) : { isExpanded: false };
        } catch (error) {
            console.warn('Failed to get info box state:', error);

            return { isExpanded: false };
        }
    }

    /**
     * Save info box state to localStorage
     * @param {Object} state - Info box state
     */
    saveInfoBoxState(state) {
        try {
            localStorage.setItem('fullscreen-info-box-state', JSON.stringify(state));
        } catch (error) {
            console.warn('Failed to save info box state:', error);
        }
    }

    /**
     * Save current info box state from DOM before navigating
     */
    saveCurrentInfoBoxState() {
        if (!this.fullscreenContainer) {
            return;
        }

        const content = this.fullscreenContainer.querySelector('.info-box-content');

        if (content) {
            const isExpanded = content.classList.contains('expanded');

            this.saveInfoBoxState({ isExpanded });
        }
    }

    /**
     * Initialize info box state after fullscreen is created
     */
    initializeInfoBoxState() {
        if (!this.fullscreenContainer) {
            return;
        }

        const content = this.fullscreenContainer.querySelector('.info-box-content');
        const toggle = this.fullscreenContainer.querySelector('.info-box-toggle');

        if (content && toggle) {
            const savedState = this.getInfoBoxState();

            // Ensure the content has the correct classes
            if (savedState.isExpanded) {
                content.classList.remove('collapsed');
                content.classList.add('expanded');
                toggle.textContent = '−';
            } else {
                content.classList.remove('expanded');
                content.classList.add('collapsed');
                toggle.textContent = '+';
            }

        }
    }
}

// Export for global access
window.UnifiedNavigation = UnifiedNavigation;
