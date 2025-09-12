// Simplified DOM-Based Navigation System
// Uses the existing images list DOM as the single source of truth
class SimplifiedNavigation {
    constructor() {
        this.currentImageElement = null;
        this.fullscreenContainer = null;
        this.eventListenersSetup = false;
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
        const allImages = this.getAllVisibleImageElements();

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
        if (!this.currentImageElement) { return null; }

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
        if (!this.currentImageElement) { return null; }

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

        const prevImage = allImages[prevIndex];

        return prevImage;
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
        const images = Array.from(wrappers)
            .map(wrapper => wrapper.querySelector('img[data-id], img[data-image-id]'))
            .filter(img => img !== null);

        return images;
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

        if (!imageElement) { return false; }

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
        if (this.fullscreenContainer) { return; }

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
     * Create info box
     * @param {Object} imageData - Image data
     * @returns {HTMLElement} Info box
     */
    createInfoBox(imageData) {
        const infoBox = document.createElement('div');

        infoBox.className = 'info-box';
        infoBox.setAttribute('role', 'complementary');
        infoBox.setAttribute('aria-label', 'Image information');

        // Create header
        const header = this.createInfoBoxHeader(imageData);

        infoBox.appendChild(header);

        // Create content
        const content = this.createInfoBoxContent(imageData);

        infoBox.appendChild(content);

        return infoBox;
    }

    /**
     * Create info box header
     * @param {Object} imageData - Image data
     * @returns {HTMLElement} Header element
     */
    createInfoBoxHeader(imageData) {
        const header = document.createElement('div');

        header.className = 'info-box-header';

        const title = document.createElement('div');

        title.className = 'info-box-title';
        title.textContent = imageData.title;

        const toggle = document.createElement('button');

        toggle.className = 'info-box-toggle';
        toggle.textContent = '−';
        toggle.setAttribute('aria-label', 'Toggle info box');

        header.appendChild(title);
        header.appendChild(toggle);

        return header;
    }

    /**
     * Create info box content
     * @param {Object} imageData - Image data
     * @returns {HTMLElement} Content element
     */
    createInfoBoxContent(imageData) {
        const content = document.createElement('div');

        content.className = 'info-box-content expanded';

        // Create metadata grid
        const metadata = this.createMetadataGrid(imageData);

        content.appendChild(metadata);

        // Create prompts section
        const prompts = this.createPromptsSection(imageData);

        content.appendChild(prompts);

        return content;
    }

    /**
     * Create metadata grid
     * @param {Object} imageData - Image data
     * @returns {HTMLElement} Metadata grid
     */
    createMetadataGrid(imageData) {
        const metadata = document.createElement('div');

        metadata.className = 'info-box-meta';

        const items = [
            { label: 'Provider', value: imageData.provider || 'Unknown' },
            { label: 'Public', value: this.createPublicToggle(imageData) },
            { label: 'Creator', value: imageData.username || imageData.creator || 'Unknown' },
            { label: 'Guidance', value: imageData.guidance || 'N/A' },
            { label: 'Rating', value: this.formatRating(imageData.rating) },
            { label: 'Created', value: this.formatDate(imageData.createdAt) }
        ];

        items.forEach(item => {
            const itemElement = this.createMetadataItem(item.label, item.value);

            metadata.appendChild(itemElement);
        });

        return metadata;
    }

    /**
     * Create metadata item
     * @param {string} label - Item label
     * @param {string|HTMLElement} value - Item value
     * @returns {HTMLElement} Metadata item
     */
    createMetadataItem(label, value) {
        const item = document.createElement('div');

        item.className = 'info-box-meta-item';

        if (label === 'Rating') {
            item.classList.add('rating-item');
        }

        const labelElement = document.createElement('div');

        labelElement.className = 'info-box-meta-label';
        labelElement.textContent = label;

        const valueElement = document.createElement('div');

        valueElement.className = 'info-box-meta-value';

        if (typeof value === 'string') {
            valueElement.innerHTML = value;
        } else if (value instanceof HTMLElement) {
            valueElement.appendChild(value);
        } else {
            valueElement.innerHTML = String(value);
        }

        item.appendChild(labelElement);
        item.appendChild(valueElement);

        return item;
    }

    /**
     * Create public toggle
     * @param {Object} imageData - Image data
     * @returns {HTMLElement} Public toggle
     */
    createPublicToggle(imageData) {
        const toggle = document.createElement('div');

        toggle.className = 'info-box-public-toggle';

        const checkbox = document.createElement('input');

        checkbox.type = 'checkbox';
        checkbox.className = 'public-status-checkbox';
        checkbox.id = `public-toggle-${imageData.id}`;
        checkbox.checked = imageData.isPublic || false;
        checkbox.setAttribute('data-image-id', imageData.id);

        const label = document.createElement('label');

        label.className = 'public-status-label';
        label.htmlFor = `public-toggle-${imageData.id}`;
        label.textContent = 'Public';

        toggle.appendChild(checkbox);
        toggle.appendChild(label);

        return toggle;
    }

    /**
     * Create prompts section
     * @param {Object} imageData - Image data
     * @returns {HTMLElement} Prompts section
     */
    createPromptsSection(imageData) {
        const prompts = document.createElement('div');

        prompts.className = 'info-box-prompts';

        if (imageData.original) {
            const originalItem = this.createPromptItem('Original Prompt', imageData.original);

            prompts.appendChild(originalItem);
        }

        if (imageData.prompt) {
            const finalItem = this.createPromptItem('Final Prompt', imageData.prompt);

            prompts.appendChild(finalItem);
        }

        return prompts;
    }

    /**
     * Create prompt item
     * @param {string} label - Prompt label
     * @param {string} value - Prompt value
     * @returns {HTMLElement} Prompt item
     */
    createPromptItem(label, value) {
        const item = document.createElement('div');

        item.className = 'info-box-prompt-item';

        const labelElement = document.createElement('div');

        labelElement.className = 'info-box-prompt-label';
        labelElement.textContent = label;

        const valueElement = document.createElement('div');

        valueElement.className = 'info-box-prompt-value';
        valueElement.textContent = value;
        valueElement.title = value; // Show full text on hover

        // Add copy functionality
        valueElement.style.cursor = 'pointer';
        valueElement.addEventListener('click', () => {
            navigator.clipboard.writeText(value).then(() => {
                alert('Copied to clipboard:');
            });
        });

        item.appendChild(labelElement);
        item.appendChild(valueElement);

        return item;
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
            if (this.fullscreenContainer.style.display === 'none') { return; }

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

        if (!checkbox) { return; }

        checkbox.addEventListener('change', async () => {
            const imageId = checkbox.getAttribute('data-image-id');
            const newStatus = checkbox.checked;

            // Update DOM immediately
            this.updateImageInDOM(imageId, { isPublic: newStatus });

            // Show loading state
            checkbox.disabled = true;
            label.textContent = 'Updating...';
            publicToggle.style.opacity = '0.6';

            try {
                // Call API to update server
                const response = await fetch(`/api/images/${imageId}/public`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isPublic: newStatus })
                });

                if (response.ok) {
                    console.log('✅ Public status updated');
                } else {
                    console.error('❌ Failed to update public status');
                    // Revert on failure
                    checkbox.checked = !newStatus;
                    this.updateImageInDOM(imageId, { isPublic: !newStatus });
                }
            } catch (error) {
                console.error('❌ Error updating public status:', error);
                // Revert on error
                checkbox.checked = !newStatus;
                this.updateImageInDOM(imageId, { isPublic: !newStatus });
            } finally {
                // Restore UI
                checkbox.disabled = false;
                label.textContent = 'Public';
                publicToggle.style.opacity = '1';
            }
        });
    }

    /**
     * Rate current image
     * @param {number} rating - Rating value (0-5)
     */
    async rateImage(rating) {
        if (!this.currentImageElement) { return; }

        const imageId = this.currentImageElement.dataset.id || this.currentImageElement.dataset.imageId;

        if (!imageId) { return; }

        // Update DOM immediately
        this.updateImageInDOM(imageId, { rating });

        // Update fullscreen display
        const ratingElement = this.fullscreenContainer.querySelector('.rating-item .info-box-meta-value');

        if (ratingElement) {
            ratingElement.textContent = this.formatRating(rating);
        }

        try {
            // Call API to update server
            const response = await fetch(`/api/images/${imageId}/rating`, {
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

    /**
     * Format date display
     * @param {string} dateString - Date string
     * @returns {string} Formatted date
     */
    formatDate(dateString) {
        if (!dateString) { return 'Unknown'; }

        try {
            const date = new Date(dateString);

            return date.toLocaleDateString();
        } catch {
            return 'Unknown';
        }
    }
}

// Export for global access
window.SimplifiedNavigation = SimplifiedNavigation;
