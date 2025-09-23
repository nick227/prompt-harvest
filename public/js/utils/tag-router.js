/**
 * Tag Router - Handles URL parameter-based tag filtering
 * Manages ?tag= parameter in URL and provides tag filtering functionality
 */
class TagRouter {
    constructor() {
        this.currentTags = [];
        this.listeners = new Map();
        this.init();
    }

    init() {
        // Handle initial URL parameters on page load
        this.handleInitialURL();

        // Listen for browser back/forward navigation
        window.addEventListener('popstate', () => {
            this.handleURLChange();
        });

        // Notify listeners after a short delay to ensure all listeners are subscribed
        setTimeout(() => {
            this.notifyListeners();
        }, 100);
    }

    /**
     * Handle initial URL parameters when page loads
     */
    handleInitialURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const tagParam = urlParams.get('tag');

            if (tagParam) {
                // Parse multiple tags from comma-separated string
                const tags = tagParam.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                this.setActiveTags(tags);
                // Notify listeners about initial tag state
                this.notifyListeners();
            } else {
                this.setActiveTags([]);
                // Notify listeners even when no tags (in case they need to clear state)
                this.notifyListeners();
            }
        } catch (error) {
            console.warn('⚠️ TAG ROUTER: Error handling initial URL:', error);
        }
    }

    /**
     * Handle URL changes (back/forward navigation)
     */
    handleURLChange() {
        this.handleInitialURL();
        this.notifyListeners();
    }

    /**
     * Set active tags and update URL
     * @param {Array<string>} tags - Array of tag names
     */
    setActiveTags(tags) {
        this.currentTags = tags || [];
        this.updateURL();
        this.notifyListeners();
    }

    /**
     * Add a tag to active tags
     * @param {string} tag - Tag to add
     */
    addTag(tag) {
        if (!this.currentTags.includes(tag)) {
            this.currentTags.push(tag);
            this.updateURL();
            this.notifyListeners();
        }
    }

    /**
     * Remove a tag from active tags
     * @param {string} tag - Tag to remove
     */
    removeTag(tag) {
        const index = this.currentTags.indexOf(tag);
        if (index > -1) {
            this.currentTags.splice(index, 1);
            this.updateURL();
            this.notifyListeners();
        }
    }

    /**
     * Toggle a tag (add if not present, remove if present)
     * @param {string} tag - Tag to toggle
     */
    toggleTag(tag) {
        if (this.currentTags.includes(tag)) {
            this.removeTag(tag);
        } else {
            this.addTag(tag);
        }
    }

    /**
     * Clear all active tags
     */
    clearTags() {
        this.currentTags = [];
        this.updateURL();
        this.notifyListeners();
    }

    /**
     * Get current active tags
     * @returns {Array<string>} Array of active tag names
     */
    getActiveTags() {
        return [...this.currentTags];
    }

    /**
     * Check if a tag is currently active
     * @param {string} tag - Tag to check
     * @returns {boolean} True if tag is active
     */
    isTagActive(tag) {
        return this.currentTags.includes(tag);
    }

    /**
     * Update URL with current tags
     */
    updateURL() {
        try {
            const url = new URL(window.location);

            if (this.currentTags.length > 0) {
                url.searchParams.set('tag', this.currentTags.join(','));
            } else {
                url.searchParams.delete('tag');
            }

            // Update URL without triggering page reload
            window.history.pushState({}, '', url);
        } catch (error) {
            console.warn('⚠️ TAG ROUTER: Error updating URL:', error);
        }
    }

    /**
     * Subscribe to tag changes
     * @param {string} listenerId - Unique identifier for the listener
     * @param {Function} callback - Callback function to call when tags change
     */
    subscribe(listenerId, callback) {
        this.listeners.set(listenerId, callback);
    }

    /**
     * Unsubscribe from tag changes
     * @param {string} listenerId - Unique identifier for the listener
     */
    unsubscribe(listenerId) {
        this.listeners.delete(listenerId);
        // console.log(`🏷️ TAG ROUTER: Unsubscribed listener ${listenerId}, total listeners: ${this.listeners.size}`);
    }

    /**
     * Notify all listeners of tag changes
     */
    notifyListeners() {
        const tags = this.getActiveTags();

        this.listeners.forEach((callback, listenerId) => {
            try {
                callback(tags, listenerId);
            } catch (error) {
                console.error(`❌ TAG ROUTER: Error in listener ${listenerId}:`, error);
            }
        });

        // Update all tag chips with active state
        this.updateTagChips();
    }

    /**
     * Update all tag chips to reflect active state
     */
    updateTagChips() {
        const activeTags = this.getActiveTags();

        // Update list view tag chips
        const listTagChips = document.querySelectorAll('.list-tags-container span');
        listTagChips.forEach(chip => {
            const tagText = chip.textContent.trim();
            if (activeTags.includes(tagText)) {
                chip.classList.add('tag-chip-active');
                chip.style.background = 'rgba(34, 197, 94, 0.3)';
                chip.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                chip.style.color = '#22c55e';
            } else {
                chip.classList.remove('tag-chip-active');
                chip.style.background = 'rgba(59, 130, 246, 0.2)';
                chip.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                chip.style.color = '#60a5fa';
            }
        });

        // Update info box tag chips
        const infoBoxTagChips = document.querySelectorAll('.info-box-tag-chip');
        infoBoxTagChips.forEach(chip => {
            const tagText = chip.textContent.trim();
            if (activeTags.includes(tagText)) {
                chip.classList.add('tag-chip-active');
                chip.style.background = 'rgba(34, 197, 94, 0.3)';
                chip.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                chip.style.color = '#22c55e';
            } else {
                chip.classList.remove('tag-chip-active');
                chip.style.background = 'rgba(59, 130, 246, 0.2)';
                chip.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                chip.style.color = 'rgb(96, 165, 250)';
            }
        });
    }

    /**
     * Get URL string with current tags
     * @returns {string} URL string with tag parameters
     */
    getURLString() {
        const url = new URL(window.location);

        if (this.currentTags.length > 0) {
            url.searchParams.set('tag', this.currentTags.join(','));
        } else {
            url.searchParams.delete('tag');
        }

        return url.toString();
    }

    /**
     * Navigate to a new URL with tags
     * @param {string} baseUrl - Base URL (optional, defaults to current location)
     * @param {Array<string>} tags - Tags to set
     */
    navigateWithTags(baseUrl = window.location.pathname, tags = []) {
        try {
            const url = new URL(baseUrl, window.location.origin);

            if (tags.length > 0) {
                url.searchParams.set('tag', tags.join(','));
            }

            window.location.href = url.toString();
        } catch (error) {
            console.warn('⚠️ TAG ROUTER: Error navigating with tags:', error);
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.TagRouter = TagRouter;
}
