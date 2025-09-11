// Optimized Navigation System - Addresses all identified legacy issues
class OptimizedNavigation {
    constructor() {
        this.fullscreenContainer = null;
        this.currentImageElement = null;
        this.isInitialized = false;
    }

    /**
     * Initialize optimized navigation system
     */
    init() {
        if (this.isInitialized) return;

        this.setupEventDelegation();
        this.setupFullscreenContainer();
        this.isInitialized = true;

        console.log('🚀 Optimized navigation initialized');
    }

    /**
     * Setup single event delegation for all image clicks
     * OPTIMIZATION: Single event handler instead of individual handlers
     */
    setupEventDelegation() {
        document.addEventListener('click', (e) => {
            const imageElement = e.target.closest('img[data-id], img[data-image-id]');
            if (imageElement) {
                e.preventDefault();
                e.stopPropagation();
                this.openFullscreen(imageElement);
            }
        });
    }

    /**
     * Setup fullscreen container once
     * OPTIMIZATION: Create container once, reuse
     */
    setupFullscreenContainer() {
        if (this.fullscreenContainer) return;

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
     * Open fullscreen for image element
     * OPTIMIZATION: Direct DOM element instead of data objects
     */
    openFullscreen(imageElement) {
        if (!imageElement) {
            console.error('No image element provided');
            return;
        }

        this.currentImageElement = imageElement;

        // OPTIMIZATION: Extract data only when needed (lazy loading)
        const imageData = this.extractImageDataFromElement(imageElement);
        if (!imageData) {
            console.error('Could not extract image data from element');
            return;
        }

        // OPTIMIZATION: Update existing UI instead of recreating
        this.updateFullscreenContent(imageData);

        // Show fullscreen
        this.fullscreenContainer.style.display = 'flex';
        this.fullscreenContainer.focus();

        console.log('🎯 Opened fullscreen for:', imageData.id);
    }

    /**
     * Navigate to next image
     * OPTIMIZATION: O(1) DOM traversal instead of O(n) array operations
     */
    navigateNext() {
        const nextElement = this.getNextImageElement();
        if (nextElement) {
            this.openFullscreen(nextElement);
        } else {
            console.log('No next image available');
        }
    }

    /**
     * Navigate to previous image
     * OPTIMIZATION: O(1) DOM traversal instead of O(n) array operations
     */
    navigatePrevious() {
        const prevElement = this.getPreviousImageElement();
        if (prevElement) {
            this.openFullscreen(prevElement);
        } else {
            console.log('No previous image available');
        }
    }

    /**
     * Get next image element using DOM traversal
     * OPTIMIZATION: Direct DOM navigation (O(1) operation)
     */
    getNextImageElement() {
        if (!this.currentImageElement) return null;

        const listItem = this.currentImageElement.closest('li');
        if (!listItem) return null;

        const nextListItem = listItem.nextElementSibling;
        if (!nextListItem) return null;

        return nextListItem.querySelector('img[data-id], img[data-image-id]');
    }

    /**
     * Get previous image element using DOM traversal
     * OPTIMIZATION: Direct DOM navigation (O(1) operation)
     */
    getPreviousImageElement() {
        if (!this.currentImageElement) return null;

        const listItem = this.currentImageElement.closest('li');
        if (!listItem) return null;

        const prevListItem = listItem.previousElementSibling;
        if (!prevListItem) return null;

        return prevListItem.querySelector('img[data-id], img[data-image-id]');
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
     * Extract image data directly from DOM element
     * OPTIMIZATION: Direct property access, no loops or complex processing
     */
    extractImageDataFromElement(imageElement) {
        if (!imageElement || !imageElement.dataset) {
            return null;
        }

        const dataset = imageElement.dataset;

        // OPTIMIZATION: Direct property access instead of complex processing
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
     * Update fullscreen content
     * OPTIMIZATION: Update existing UI instead of recreating
     */
    updateFullscreenContent(imageData) {
        // Update image
        const img = this.fullscreenContainer.querySelector('.fullscreen-image');
        if (img) {
            img.src = imageData.url;
            img.alt = imageData.title;
        }

        // Update info box content
        this.updateInfoBox(imageData);

        // Update navigation controls
        this.updateNavigationControls();
    }

    /**
     * Update info box with new data
     * OPTIMIZATION: Update existing elements instead of recreating
     */
    updateInfoBox(imageData) {
        const infoBox = this.fullscreenContainer.querySelector('.info-box');
        if (!infoBox) {
            this.createInfoBox(imageData);
            return;
        }

        // Update title
        const title = infoBox.querySelector('.info-box-title');
        if (title) {
            title.textContent = imageData.title;
        }

        // Update metadata
        this.updateMetadataGrid(imageData);

        // Update prompts
        this.updatePromptsSection(imageData);
    }

    /**
     * Update metadata grid
     * OPTIMIZATION: Update existing elements instead of recreating
     */
    updateMetadataGrid(imageData) {
        const metadata = this.fullscreenContainer.querySelector('.info-box-meta');
        if (!metadata) return;

        // Update each metadata item
        const items = [
            { selector: '.info-box-meta-item:nth-child(1) .info-box-meta-value', value: imageData.provider || 'Unknown' },
            { selector: '.info-box-meta-item:nth-child(3) .info-box-meta-value', value: imageData.model || 'Unknown' },
            { selector: '.info-box-meta-item:nth-child(4) .info-box-meta-value', value: imageData.guidance || 'N/A' },
            { selector: '.info-box-meta-item:nth-child(5) .info-box-meta-value', value: imageData.steps || 'N/A' },
            { selector: '.info-box-meta-item:nth-child(6) .info-box-meta-value', value: imageData.seed || 'N/A' },
            { selector: '.info-box-meta-item:nth-child(7) .info-box-meta-value', value: this.formatRating(imageData.rating) },
            { selector: '.info-box-meta-item:nth-child(8) .info-box-meta-value', value: this.formatDate(imageData.createdAt) }
        ];

        items.forEach(item => {
            const element = metadata.querySelector(item.selector);
            if (element) {
                element.textContent = item.value;
            }
        });

        // Update public toggle
        const publicCheckbox = metadata.querySelector('.public-status-checkbox');
        if (publicCheckbox) {
            publicCheckbox.checked = imageData.isPublic || false;
            publicCheckbox.setAttribute('data-image-id', imageData.id);
        }
    }

    /**
     * Update prompts section
     * OPTIMIZATION: Update existing elements instead of recreating
     */
    updatePromptsSection(imageData) {
        const prompts = this.fullscreenContainer.querySelector('.info-box-prompts');
        if (!prompts) return;

        const promptItems = prompts.querySelectorAll('.info-box-prompt-item');

        // Update existing prompt items
        if (imageData.original && imageData.original !== imageData.prompt) {
            if (promptItems[0]) {
                const valueElement = promptItems[0].querySelector('.info-box-prompt-value');
                if (valueElement) {
                    valueElement.textContent = imageData.original;
                    valueElement.title = imageData.original;
                }
            }
        }

        if (imageData.prompt) {
            const finalItem = promptItems[imageData.original && imageData.original !== imageData.prompt ? 1 : 0];
            if (finalItem) {
                const valueElement = finalItem.querySelector('.info-box-prompt-value');
                if (valueElement) {
                    valueElement.textContent = imageData.prompt;
                    valueElement.title = imageData.prompt;
                }
            }
        }
    }

    /**
     * Update navigation controls
     * OPTIMIZATION: Update existing elements instead of recreating
     */
    updateNavigationControls() {
        const navControls = this.fullscreenContainer.querySelector('.fullscreen-controls');
        if (!navControls) {
            this.createNavigationControls();
            return;
        }

        // Navigation controls don't need updates, they're static
        // But we can update button states if needed
        const prevBtn = navControls.querySelector('button[aria-label="Previous"]');
        const nextBtn = navControls.querySelector('button[aria-label="Next"]');

        // Disable buttons if no next/prev available
        if (prevBtn) {
            prevBtn.disabled = !this.getPreviousImageElement();
        }
        if (nextBtn) {
            nextBtn.disabled = !this.getNextImageElement();
        }
    }

    /**
     * Create info box (only when needed)
     * OPTIMIZATION: Create UI components only once
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

        this.fullscreenContainer.appendChild(infoBox);
    }

    /**
     * Create info box header
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
     */
    createMetadataGrid(imageData) {
        const metadata = document.createElement('div');
        metadata.className = 'info-box-meta';

        const items = [
            { label: 'Provider', value: imageData.provider || 'Unknown' },
            { label: 'Public', value: this.createPublicToggle(imageData) },
            { label: 'Model', value: imageData.model || 'Unknown' },
            { label: 'Guidance', value: imageData.guidance || 'N/A' },
            { label: 'Steps', value: imageData.steps || 'N/A' },
            { label: 'Seed', value: imageData.seed || 'N/A' },
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
     */
    createPromptsSection(imageData) {
        const prompts = document.createElement('div');
        prompts.className = 'info-box-prompts';

        if (imageData.original && imageData.original !== imageData.prompt) {
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
        valueElement.title = value;
        valueElement.style.cursor = 'pointer';

        // Add copy functionality
        valueElement.addEventListener('click', () => {
            navigator.clipboard.writeText(value).then(() => {
                console.log('Copied to clipboard:', value);
            });
        });

        item.appendChild(labelElement);
        item.appendChild(valueElement);

        return item;
    }

    /**
     * Create navigation controls
     */
    createNavigationControls() {
        const controls = document.createElement('div');
        controls.className = 'fullscreen-controls';

        const prevBtn = this.createButton('Previous', '←', () => this.navigatePrevious());
        const nextBtn = this.createButton('Next', '→', () => this.navigateNext());
        const closeBtn = this.createButton('Close', '×', () => this.closeFullscreen());

        controls.appendChild(prevBtn);
        controls.appendChild(nextBtn);
        controls.appendChild(closeBtn);

        this.fullscreenContainer.appendChild(controls);
    }

    /**
     * Create button
     */
    createButton(label, text, onClick) {
        const button = document.createElement('button');
        button.setAttribute('aria-label', label);
        button.textContent = text;
        button.addEventListener('click', onClick);
        return button;
    }

    /**
     * Setup event listeners (only once)
     * OPTIMIZATION: Setup events once, not on every fullscreen open
     */
    setupEventListeners() {
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.fullscreenContainer.style.display === 'none') return;

            switch(e.key) {
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

        // Info box toggle (delegated)
        this.fullscreenContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('info-box-toggle')) {
                const content = this.fullscreenContainer.querySelector('.info-box-content');
                if (content) {
                    const isExpanded = content.classList.contains('expanded');
                    content.classList.toggle('expanded', !isExpanded);
                    content.classList.toggle('collapsed', isExpanded);
                    e.target.textContent = isExpanded ? '+' : '−';
                }
            }
        });

        // Public status toggle (delegated)
        this.fullscreenContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('public-status-checkbox')) {
                this.handlePublicToggleChange(e.target);
            }
        });
    }

    /**
     * Handle public toggle change
     */
    async handlePublicToggleChange(checkbox) {
        const imageId = checkbox.getAttribute('data-image-id');
        const newStatus = checkbox.checked;
        const label = checkbox.nextElementSibling;
        const toggle = checkbox.closest('.info-box-public-toggle');

        // Update DOM immediately
        this.updateImageInDOM(imageId, { isPublic: newStatus });

        // Show loading state
        checkbox.disabled = true;
        label.textContent = 'Updating...';
        toggle.style.opacity = '0.6';

        try {
            const response = await fetch(`/api/images/${imageId}/public`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublic: newStatus })
            });

            if (response.ok) {
                console.log('✅ Public status updated');
            } else {
                console.error('❌ Failed to update public status');
                checkbox.checked = !newStatus;
                this.updateImageInDOM(imageId, { isPublic: !newStatus });
            }
        } catch (error) {
            console.error('❌ Error updating public status:', error);
            checkbox.checked = !newStatus;
            this.updateImageInDOM(imageId, { isPublic: !newStatus });
        } finally {
            checkbox.disabled = false;
            label.textContent = 'Public';
            toggle.style.opacity = '1';
        }
    }

    /**
     * Rate current image
     */
    async rateImage(rating) {
        if (!this.currentImageElement) return;

        const imageId = this.currentImageElement.dataset.id || this.currentImageElement.dataset.imageId;
        if (!imageId) return;

        // Update DOM immediately
        this.updateImageInDOM(imageId, { rating });

        // Update fullscreen display
        const ratingElement = this.fullscreenContainer.querySelector('.rating-item .info-box-meta-value');
        if (ratingElement) {
            ratingElement.textContent = this.formatRating(rating);
        }

        console.log(`✅ Rating updated to ${rating}/5`);

        try {
            const response = await fetch(`/api/images/${imageId}/rating`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating })
            });

            if (response.ok) {
                console.log('✅ Rating saved to server');
            } else {
                console.error('❌ Failed to save rating');
            }
        } catch (error) {
            console.error('❌ Error saving rating:', error);
        }
    }

    /**
     * Update image data in DOM
     * OPTIMIZATION: Direct DOM update instead of cache management
     */
    updateImageInDOM(imageId, updates) {
        const imageElement = document.querySelector(`img[data-id="${imageId}"], img[data-image-id="${imageId}"]`);
        if (!imageElement) return false;

        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined) {
                imageElement.dataset[key] = updates[key].toString();
            }
        });

        return true;
    }

    /**
     * Format rating display
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
     */
    formatDate(dateString) {
        if (!dateString) return 'Unknown';

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        } catch {
            return 'Unknown';
        }
    }
}

// Export for global access
window.OptimizedNavigation = OptimizedNavigation;
