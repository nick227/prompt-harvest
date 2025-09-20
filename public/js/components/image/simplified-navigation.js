// Simplified DOM-Based Navigation System
// Uses the existing images list DOM as the single source of truth
class SimplifiedNavigation {
    constructor() {
        this.currentImageElement = null;
        this.fullscreenContainer = null;
        this.eventListenersSetup = false;

        // Initialize unified info box component
        this.unifiedInfoBox = new window.UnifiedInfoBox();
    }

    /**
     * Check if currently viewing the site filter
     * @returns {boolean} True if in site view
     */
    isCurrentlyInSiteView() {
        if (window.feedManager && window.feedManager.getCurrentFilter) {
            return window.feedManager.getCurrentFilter() === 'site';
        }

        // Fallback: check DOM for active site button
        const siteButton = document.querySelector('input[name="owner"][value="site"]');

        return siteButton && siteButton.checked;
    }

    /**
     * Remove image from feed if available
     * @param {string} imageId - Image ID to remove
     */
    removeImageFromFeedIfAvailable(imageId) {
        if (window.feedManager && window.feedManager.removeImageFromFeed) {
            const removed = window.feedManager.removeImageFromFeed(imageId);

            if (removed) {
                console.log(`🗑️ Removed image ${imageId} from feed (made private)`);
            }
        }
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

        // Debug: show current position in all images
        const _allImages = this.getAllVisibleImageElements();

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

    }

    /**
     * Navigate to next image in DOM order
     */
    navigateNext() {
        const nextElement = this.getNextImageElement();

        if (nextElement) {
            this.openFullscreen(nextElement);
        }
    }

    /**
     * Navigate to previous image in DOM order
     */
    navigatePrevious() {
        const prevElement = this.getPreviousImageElement();

        if (prevElement) {
            this.openFullscreen(prevElement);
        }
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
    * Download image
     */
    downloadImage() {
        if (this.currentImageElement) {
            // Create a temporary link element for download
            const link = document.createElement('a');

            link.href = this.currentImageElement.src;
            link.download = this.currentImageElement.alt || 'image';
            link.target = '_blank';

            // Append to body, click, and remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    /**
     * Get the next image element in DOM order
     * @returns {HTMLElement|null} Next image element or null
     */
    getNextImageElement() {
        if (!this.currentImageElement) {
            return null;
        }

        // Get all visible images in DOM order
        const allImages = this.getAllVisibleImageElements();
        const currentIndex = allImages.findIndex(img => img === this.currentImageElement);

        if (currentIndex === -1) {
            console.warn('🔍 Current image not found in visible images list');

            return null;
        }

        // Get next image in array
        const nextIndex = currentIndex + 1;

        if (nextIndex >= allImages.length) {
            return null;
        }

        return allImages[nextIndex];

    }

    /**
     * Get the previous image element in DOM order
     * @returns {HTMLElement|null} Previous image element or null
     */
    getPreviousImageElement() {
        if (!this.currentImageElement) {
            return null;
        }

        // Get all visible images in DOM order
        const allImages = this.getAllVisibleImageElements();
        const currentIndex = allImages.findIndex(img => img === this.currentImageElement);

        if (currentIndex === -1) {
            console.error('🔍 Current image not found in visible images list');

            return null;
        }

        // Get previous image in array
        const prevIndex = currentIndex - 1;

        if (prevIndex < 0) {
            return null;
        }

        return allImages[prevIndex];
    }

    /**
     * Get all visible image elements in DOM order
     * @returns {HTMLElement[]} Array of all visible image elements
     */
    getAllVisibleImageElements() {
        const container = document.querySelector('.prompt-output');

        if (!container) {
            console.error('🔍 No .prompt-output container found');

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
            createdAt: dataset.createdAt || new Date().toISOString()
        };
    }

    /**
     * Update image data in DOM element
     * @param {string} imageId - Image ID
     * @param {Object} updates - Data updates
     */
    updateImageInDOM(imageId, updates) {
        const imageElement = document.querySelector(`img[data-id="${imageId}"], img[data-image-id="${imageId}"]`);

        if (!imageElement) {
            return false;
        }

        // Update dataset attributes
        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined) {
                imageElement.dataset[key] = updates[key].toString();
            }
        });

        return true;
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

        // Setup event listeners only once
        if (!this.eventListenersSetup) {
            this.setupEventListeners(navControls, infoBox);
            this.eventListenersSetup = true;
        }

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
        // Use unified info box with SimplifiedNavigation configuration
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

        const prevBtn = this.createButton('Previous', 'Previous', () => this.navigatePrevious());
        const nextBtn = this.createButton('Next', 'Next', () => this.navigateNext());
        const closeBtn = this.createButton('Close', 'Close', () => this.closeFullscreen());
        const downloadBtn = this.createButton('Download', 'Download', () => this.downloadImage());

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
     * Setup event listeners
     * @param {HTMLElement} navControls - Navigation controls
     * @param {HTMLElement} infoBox - Info box
     */
    setupEventListeners(navControls, infoBox) {
        // Keyboard navigation
        document.addEventListener('keydown', e => {
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
        });

        // Info box toggle
        const toggleBtn = infoBox.querySelector('.info-box-toggle');
        const content = infoBox.querySelector('.info-box-content');

        if (toggleBtn && content) {
            toggleBtn.addEventListener('click', () => {
                const isExpanded = content.classList.contains('expanded');

                content.classList.toggle('expanded', !isExpanded);
                content.classList.toggle('collapsed', isExpanded);
                toggleBtn.textContent = isExpanded ? '+' : '−';
            });
        }

        // Public status toggle
        const publicToggle = infoBox.querySelector('.info-box-public-toggle');

        if (publicToggle) {
            this.setupPublicToggleEvents(publicToggle);
        }
    }

    /**
     * Setup public toggle events
     * @param {HTMLElement} publicToggle - Public toggle element
     */
    setupPublicToggleEvents(publicToggle) {
        const checkbox = publicToggle.querySelector('.public-status-checkbox');
        const label = publicToggle.querySelector('.public-status-label');

        if (!checkbox) {
            return;
        }

        checkbox.addEventListener('change', () => {
            this.handlePublicStatusChange(checkbox, label, publicToggle);
        });
    }

    /**
     * Handle public status change
     * @param {HTMLElement} checkbox - Checkbox element
     * @param {HTMLElement} label - Label element
     * @param {HTMLElement} publicToggle - Public toggle container
     */
    async handlePublicStatusChange(checkbox, label, publicToggle) {
        const imageId = checkbox.getAttribute('data-image-id');
        const newStatus = checkbox.checked;

        // Update DOM immediately
        this.updateImageInDOM(imageId, { isPublic: newStatus });

        // Show loading state
        this.setPublicToggleLoadingState(checkbox, label, publicToggle, true);

        try {
            const success = await this.updatePublicStatusOnServer(imageId, newStatus);

            if (success) {
                console.log('✅ Public status updated');

                // Remove image from feed if it became private and we're in site view
                if (!newStatus && this.isCurrentlyInSiteView()) {
                    this.removeImageFromFeedIfAvailable(imageId);
                }
            } else {
                this.revertPublicStatusChange(checkbox, imageId, newStatus);
            }
        } catch (error) {
            console.error('❌ Error updating public status:', error);
            this.revertPublicStatusChange(checkbox, imageId, newStatus);
        } finally {
            this.setPublicToggleLoadingState(checkbox, label, publicToggle, false);
        }
    }

    /**
     * Set public toggle loading state
     * @param {HTMLElement} checkbox - Checkbox element
     * @param {HTMLElement} label - Label element
     * @param {HTMLElement} publicToggle - Public toggle container
     * @param {boolean} isLoading - Whether to show loading state
     */
    setPublicToggleLoadingState(checkbox, label, publicToggle, isLoading) {
        checkbox.disabled = isLoading;
        label.textContent = isLoading ? 'Updating...' : 'Public';
        publicToggle.style.opacity = isLoading ? '0.6' : '1';
    }

    /**
     * Update public status on server
     * @param {string} imageId - Image ID
     * @param {boolean} newStatus - New public status
     * @returns {Promise<boolean>} Success status
     */
    async updatePublicStatusOnServer(imageId, newStatus) {
        const headers = { 'Content-Type': 'application/json' };

        if (window.userApi && window.userApi.isAuthenticated()) {
            const token = window.userApi.getAuthToken();

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        const response = await fetch(`/api/images/${imageId}/public-status`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ isPublic: newStatus })
        });

        if (!response.ok) {
            console.error('❌ Failed to update public status');
        }

        return response.ok;
    }

    /**
     * Revert public status change on failure
     * @param {HTMLElement} checkbox - Checkbox element
     * @param {string} imageId - Image ID
     * @param {boolean} attemptedStatus - Status that was attempted
     */
    revertPublicStatusChange(checkbox, imageId, attemptedStatus) {
        checkbox.checked = !attemptedStatus;
        this.updateImageInDOM(imageId, { isPublic: !attemptedStatus });
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
        this.updateImageInDOM(imageId, { rating });

        // Update fullscreen display
        const ratingElement = this.fullscreenContainer.querySelector('.rating-item .info-box-meta-value');

        if (ratingElement) {
            ratingElement.textContent = this.formatRating(rating);
        }

        try {
            // Call API to update server
            const _response = await fetch(`/api/images/${imageId}/rating`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating })
            });

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

}

// Export for global access
window.SimplifiedNavigation = SimplifiedNavigation;
