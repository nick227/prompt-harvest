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
    }

    /**
     * Handle initial URL parameters when page loads
     */
    handleInitialURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const tagParam = urlParams.get('tag');

            if (tagParam) {
                console.log(`🏷️ TAG ROUTER: Initial tag parameter found: ${tagParam}`);
                this.setActiveTags([tagParam]);
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
     * @param {Array} tags - Array of tag strings
     */
    setActiveTags(tags) {
        this.currentTags = Array.isArray(tags) ? tags : [];
        this.updateURL();
        this.notifyListeners();
    }

    /**
     * Add a tag to current active tags
     * @param {string} tag - Tag to add
     */
    addTag(tag) {
        if (tag && !this.currentTags.includes(tag)) {
            this.currentTags.push(tag);
            this.updateURL();
            this.notifyListeners();
        }
    }

    /**
     * Remove a tag from current active tags
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
     * Clear all active tags
     */
    clearTags() {
        this.currentTags = [];
        this.updateURL();
        this.notifyListeners();
    }

    /**
     * Get current active tags
     * @returns {Array} Current active tags
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
     * Update browser URL with current tags
     */
    updateURL() {
        try {
            const url = new URL(window.location);

            if (this.currentTags.length > 0) {
                // Use first tag for single tag parameter
                url.searchParams.set('tag', this.currentTags[0]);
            } else {
                url.searchParams.delete('tag');
            }

            // Update URL without triggering page reload
            window.history.replaceState({}, '', url);

            console.log(`🏷️ TAG ROUTER: URL updated with tags:`, this.currentTags);
        } catch (error) {
            console.warn('⚠️ TAG ROUTER: Error updating URL:', error);
        }
    }

    /**
     * Subscribe to tag changes
     * @param {string} id - Unique identifier for the listener
     * @param {Function} callback - Callback function to call when tags change
     */
    subscribe(id, callback) {
        this.listeners.set(id, callback);
    }

    /**
     * Unsubscribe from tag changes
     * @param {string} id - Listener identifier to remove
     */
    unsubscribe(id) {
        this.listeners.delete(id);
    }

    /**
     * Notify all listeners of tag changes
     */
    notifyListeners() {
        const tags = this.getActiveTags();
        console.log(`🏷️ TAG ROUTER: Notifying ${this.listeners.size} listeners with tags:`, tags);
        this.listeners.forEach((callback, id) => {
            try {
                console.log(`🏷️ TAG ROUTER: Calling listener: ${id}`);
                callback(tags);
            } catch (error) {
                console.error(`❌ TAG ROUTER: Error in listener ${id}:`, error);
            }
        });
    }

    /**
     * Get URL for a specific tag
     * @param {string} tag - Tag to create URL for
     * @returns {string} URL with tag parameter
     */
    getTagURL(tag) {
        const url = new URL(window.location);
        url.searchParams.set('tag', tag);
        return url.toString();
    }

    /**
     * Get URL without any tag parameters
     * @returns {string} URL without tag parameters
     */
    getClearURL() {
        const url = new URL(window.location);
        url.searchParams.delete('tag');
        return url.toString();
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.TagRouter = TagRouter;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TagRouter;
}
