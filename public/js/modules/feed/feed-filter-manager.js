// Feed Filter Manager - Handles filter switching and state management
class FeedFilterManager {
    constructor(cacheManager) {
        this.cacheManager = cacheManager;
        this.currentFilter = FEED_CONSTANTS.DEFAULTS.CURRENT_FILTER;
        this.isInitialized = false;
    }

    // Initialize filter manager
    init() {
        this.setupFilterButtons();
        this.setupAuthListener();
        this.isInitialized = true;
    }

    // Setup filter button event listeners
    setupFilterButtons() {
        const ownerButtons = document.querySelectorAll(FEED_CONSTANTS.SELECTORS.OWNER_BUTTONS);

        ownerButtons.forEach(button => {
            button.addEventListener('change', e => {
                const newFilter = e.target.value;

                this.switchFilter(newFilter);
            });
        });

        // Set default selection
        this.setDefaultFilter();
    }

    // Set default filter selection
    setDefaultFilter() {
        const siteButton = document.querySelector(FEED_CONSTANTS.SELECTORS.SITE_BUTTON);

        if (siteButton) {
            siteButton.checked = true;
        }
    }

    // Setup authentication state change listener
    setupAuthListener() {
        window.addEventListener(FEED_CONSTANTS.EVENTS.AUTH_STATE_CHANGED, event => {
            const user = event.detail;

            this.handleAuthStateChange(user);
        });
    }

    // Handle authentication state changes
    handleAuthStateChange(user) {
        if (!user && this.currentFilter === FEED_CONSTANTS.FILTERS.USER) {
            // User logged out while viewing "Mine" filter, switch to "Site"
            this.switchToSiteFilter();
        }
    }

    // Switch to site filter
    switchToSiteFilter() {
        const siteButton = document.querySelector(FEED_CONSTANTS.SELECTORS.SITE_BUTTON);

        if (siteButton) {
            siteButton.checked = true;
        }
        this.switchFilter(FEED_CONSTANTS.FILTERS.SITE);
    }

    // Get current filter
    getCurrentFilter() {
        return this.currentFilter;
    }

    // Set current filter
    setCurrentFilter(filter) {
        this.currentFilter = filter;
    }

    // Switch filter with caching logic
    async switchFilter(newFilter) {
        console.log(`🔄 FILTER: Switching from '${this.currentFilter}' to '${newFilter}'`);
        console.log('📊 FILTER: Cache state before switch:', this.cacheManager.getCacheStats());

        // Save current scroll position
        this.cacheManager.saveScrollPosition(this.currentFilter);

        // Hide current filter's images
        this.hideFilterImages(this.currentFilter);

        // Update current filter
        this.currentFilter = newFilter;

        // Show new filter's images (load if needed)
        if (this.cacheManager.isFilterLoaded(newFilter)) {
            console.log(`✅ FILTER: Showing cached '${newFilter}' images`);
            this.showFilterImages(newFilter);
            this.cacheManager.restoreScrollPosition(newFilter);
        } else {
            console.log(`📥 FILTER: Loading '${newFilter}' images for first time`);
            await this.loadFilterImages(newFilter);
        }

        // Dispatch filter changed event
        this.dispatchFilterChangedEvent(newFilter);
    }

    // Hide images for specific filter
    hideFilterImages(filter) {
        const images = document.querySelectorAll(FEED_CONSTANTS.SELECTORS.IMAGE_WRAPPERS);

        images.forEach(img => {
            if (img.dataset.filter === filter) {
                img.classList.add(FEED_CONSTANTS.CLASSES.HIDDEN);
            }
        });
    }

    // Show images for specific filter
    showFilterImages(filter) {
        const images = document.querySelectorAll(FEED_CONSTANTS.SELECTORS.IMAGE_WRAPPERS);

        images.forEach(img => {
            if (img.dataset.filter === filter) {
                img.classList.remove(FEED_CONSTANTS.CLASSES.HIDDEN);
            }
        });
    }

    // Load filter images (to be implemented by main manager)
    async loadFilterImages(_filter) {
        // This will be implemented by the main FeedManager
        // It's here as a placeholder for the filter switching logic
        throw new Error('loadFilterImages must be implemented by FeedManager');
    }

    // Dispatch filter changed event
    dispatchFilterChangedEvent(filter) {
        const event = new CustomEvent(FEED_CONSTANTS.EVENTS.FILTER_CHANGED, {
            detail: { filter, previousFilter: this.currentFilter }
        });

        window.dispatchEvent(event);
    }

    // Check if user can access user filter
    canAccessUserFilter() {
        return window.userSystem && window.userSystem.isAuthenticated();
    }

    // Get available filters based on authentication
    getAvailableFilters() {
        const filters = [FEED_CONSTANTS.FILTERS.SITE];

        if (this.canAccessUserFilter()) {
            filters.push(FEED_CONSTANTS.FILTERS.USER);
        }

        return filters;
    }

    // Update filter button states
    updateFilterButtonStates() {
        const availableFilters = this.getAvailableFilters();

        // Update site button
        const siteButton = document.querySelector(FEED_CONSTANTS.SELECTORS.SITE_BUTTON);

        if (siteButton) {
            siteButton.disabled = !availableFilters.includes(FEED_CONSTANTS.FILTERS.SITE);
        }

        // Update user button
        const userButton = document.querySelector(FEED_CONSTANTS.SELECTORS.USER_BUTTON);

        if (userButton) {
            userButton.disabled = !availableFilters.includes(FEED_CONSTANTS.FILTERS.USER);
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedFilterManager = FeedFilterManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedFilterManager;
}
