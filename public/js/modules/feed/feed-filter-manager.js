// Feed Filter Manager - Handles filter switching and state management
class FeedFilterManager {
    constructor(cacheManager, feedManager) {
        this.cacheManager = cacheManager;
        this.feedManager = feedManager;
        this.currentFilter = FEED_CONSTANTS.DEFAULTS.CURRENT_FILTER;
        this.isInitialized = false;
        this.imageCountManager = new window.ImageCountManager();
    }

    // Initialize filter manager
    init() {
        this.setupFilterButtons();
        this.setupAuthListener();
        this.setupImageAdditionListener();

        // Set the filter immediately based on what's saved or default
        this.setDefaultFilter();

        this.isInitialized = true;
    }

    // Setup filter button event listeners
    setupFilterButtons() {
        // Handle dropdown change
        const ownerDropdown = document.querySelector(FEED_CONSTANTS.SELECTORS.OWNER_DROPDOWN);

        if (ownerDropdown) {
            ownerDropdown.addEventListener('change', e => {
                const newFilter = e.target.value;

                // Save user's manual choice
                this.saveFilter(newFilter);
                this.switchFilter(newFilter);
            });
        }

    }


    // Set default filter selection
    setDefaultFilter() {
        // Try to restore from localStorage first
        const savedFilter = this.getSavedFilter();

        if (savedFilter && this.isValidFilter(savedFilter)) {
            // Check if user can access the saved filter
            if (savedFilter === FEED_CONSTANTS.FILTERS.USER && !this.canAccessUserFilter()) {
                console.log('💾 FILTER: Saved "user" filter but user not authenticated, defaulting to "site"');
                this.setFilterSelection(FEED_CONSTANTS.FILTERS.SITE);
                this.currentFilter = FEED_CONSTANTS.FILTERS.SITE;
            } else {
                if (window.DEBUG_MODE) {
                    console.log('💾 FILTER: Using saved filter:', savedFilter);
                }
                this.setFilterSelection(savedFilter);
                this.currentFilter = savedFilter;
            }
        } else {
            // Use default filter, but check if user can access it
            const defaultFilter = FEED_CONSTANTS.DEFAULTS.CURRENT_FILTER;

            if (defaultFilter === FEED_CONSTANTS.FILTERS.USER && !this.canAccessUserFilter()) {
                console.log('💾 FILTER: Default is "user" but user not authenticated, defaulting to "site"');
                this.setFilterSelection(FEED_CONSTANTS.FILTERS.SITE);
                this.currentFilter = FEED_CONSTANTS.FILTERS.SITE;
            } else {
                if (window.DEBUG_MODE) {
                    console.log('💾 FILTER: Using default filter:', defaultFilter);
                }
                this.setFilterSelection(defaultFilter);
                this.currentFilter = defaultFilter;
            }
        }

        if (window.DEBUG_MODE) {
            console.log('💾 FILTER: Filter set to:', this.currentFilter);
        }

        // Notify that filter is ready
        this.dispatchFilterReadyEvent();
    }

    // Dispatch filter ready event
    dispatchFilterReadyEvent() {
        const event = new CustomEvent('filterManagerReady', {
            detail: { currentFilter: this.currentFilter }
        });
        window.dispatchEvent(event);
    }

    // Set filter selection in DOM
    setFilterSelection(filter) {
        // Handle dropdown selection
        const ownerDropdown = document.querySelector(FEED_CONSTANTS.SELECTORS.OWNER_DROPDOWN);

        if (ownerDropdown) {
            ownerDropdown.value = filter;
        }

    }

    // Get saved filter from localStorage
    getSavedFilter() {
        try {
            return localStorage.getItem(FEED_CONSTANTS.LOCALSTORAGE.SELECTED_FILTER);
        } catch (error) {
            console.warn('Failed to get saved filter from localStorage:', error);

            return null;
        }
    }

    // Save filter to localStorage
    saveFilter(filter) {
        try {
            localStorage.setItem(FEED_CONSTANTS.LOCALSTORAGE.SELECTED_FILTER, filter);
            console.log(`💾 FILTER: Saved filter '${filter}' to localStorage`);
        } catch (error) {
            console.warn('Failed to save filter to localStorage:', error);
        }
    }

    // Validate filter value
    isValidFilter(filter) {
        return Object.values(FEED_CONSTANTS.FILTERS).includes(filter);
    }

    // Clear saved filter from localStorage
    clearSavedFilter() {
        try {
            localStorage.removeItem(FEED_CONSTANTS.LOCALSTORAGE.SELECTED_FILTER);
            console.log('💾 FILTER: Cleared saved filter from localStorage');
        } catch (error) {
            console.warn('Failed to clear saved filter from localStorage:', error);
        }
    }

    // Setup authentication state change listener
    setupAuthListener() {
        window.addEventListener(FEED_CONSTANTS.EVENTS.AUTH_STATE_CHANGED, event => {
            const user = event.detail;

            this.handleAuthStateChange(user);
        });

        // Also listen for the standard authStateChanged event
        window.addEventListener('authStateChanged', event => {
            const user = event.detail;

            this.handleAuthStateChange(user);
        });
    }

    // Setup image addition listener to refresh counts
    setupImageAdditionListener() {
        window.addEventListener(FEED_CONSTANTS.EVENTS.IMAGE_ADDED, event => {
            const imageData = event.detail;

            // Clear cache for the relevant filter and refresh display
            if (imageData && imageData.isPublic !== undefined) {
                // Determine which filter this image affects
                const affectedFilter = imageData.isPublic ? 'site' : 'user';

                // Clear cache and refresh display for the affected filter
                this.clearImageCountCache(affectedFilter);

                // If this is the current filter, update display immediately
                if (affectedFilter === this.currentFilter) {
                    this.updateImageCountDisplay(affectedFilter);
                }
            }
        });
    }

    // Handle authentication state changes
    handleAuthStateChange(user) {
        if (!user && this.currentFilter === FEED_CONSTANTS.FILTERS.USER) {
            // User logged out while viewing "Mine" filter, switch to "Site"
            this.switchToSiteFilter();
        } else if (user && this.currentFilter === FEED_CONSTANTS.DEFAULTS.CURRENT_FILTER &&
                   FEED_CONSTANTS.DEFAULTS.CURRENT_FILTER === FEED_CONSTANTS.FILTERS.USER) {
            // User logged in and we're still on default filter, switch to user filter
            // Only switch if we're not already on the user filter
            if (this.currentFilter !== FEED_CONSTANTS.FILTERS.USER) {
                console.log('💾 FILTER: User logged in, switching to user filter');
                this.setFilterSelection(FEED_CONSTANTS.FILTERS.USER);
                this.currentFilter = FEED_CONSTANTS.FILTERS.USER;
                this.switchFilter(FEED_CONSTANTS.FILTERS.USER);
            } else if (window.DEBUG_MODE) {
                console.log('⏭️ FILTER: Already on user filter, skipping switch');
            }
        }
    }

    // Switch to site filter
    switchToSiteFilter() {
        this.setFilterSelection(FEED_CONSTANTS.FILTERS.SITE);
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

    // Switch filter with intelligent tab service
    async switchFilter(newFilter) {
        // Prevent unnecessary switches to the same filter
        if (this.currentFilter === newFilter) {
            if (window.DEBUG_MODE) {
                console.log(`⏭️ FILTER: Already on '${newFilter}' filter, skipping switch`);
            }

            return;
        }

        console.log(`🔄 FILTER: Switching from '${this.currentFilter}' to '${newFilter}'`);
        console.log('📊 FILTER: Cache state before switch:', this.cacheManager.getCacheStats());

        this.showLoadingOverlay();
        this.cacheManager.saveScrollPosition(this.currentFilter);

        const tabServiceAvailable = await this.waitForTabService();

        await this.performFilterSwitch(newFilter, tabServiceAvailable);

        this.currentFilter = newFilter;
        this.saveFilter(newFilter);
        await this.handleFilterImages(newFilter);
        this.updateImageCountDisplay(newFilter);
        this.dispatchFilterChangedEvent(newFilter);
    }

    // Show loading overlay for 2 seconds
    showLoadingOverlay() {
        const promptOutput = document.querySelector(FEED_CONSTANTS.SELECTORS.PROMPT_OUTPUT);

        if (promptOutput) {
            promptOutput.classList.add('loading');
            setTimeout(() => {
                promptOutput.classList.remove('loading');
            }, 600);
        } else {
            console.error('❌ LOADING: Prompt output element not found');
        }
    }

    // Wait for tab service to be available
    async waitForTabService() {
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            const tabServiceAvailable = !!(window.feedManager && window.feedManager.tabService);

            if (tabServiceAvailable) { return true; }

            console.log(`⏳ FILTER: Waiting for tab service... attempt ${attempts + 1}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        return false;
    }

    // Perform the actual filter switch
    async performFilterSwitch(newFilter, tabServiceAvailable) {
        if (tabServiceAvailable) {
            console.log('🚀 FILTER: Using intelligent tab service for filtering');
            const result = window.feedManager.tabService.switchToFilter(newFilter);

            console.log('✅ FILTER: Tab service switch completed:', result);
        } else {
            console.log('⚠️ FILTER: Tab service not available, using fallback method');
            this.hideFilterImages(this.currentFilter);
            this.showFilterImages(newFilter);
        }
    }

    // Handle loading or restoring filter images
    async handleFilterImages(newFilter) {
        if (!this.cacheManager.isFilterLoaded(newFilter)) {
            console.log(`📥 FILTER: Loading '${newFilter}' images for first time`);
            await this.loadFilterImages(newFilter);
        } else {
            console.log(`✅ FILTER: Using cached '${newFilter}' images`);
            this.cacheManager.restoreScrollPosition(newFilter);
        }
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

    // Load filter images using the main FeedManager
    async loadFilterImages(filter) {
        if (!this.feedManager) {
            throw new Error('FeedManager instance not available');
        }

        return await this.feedManager.loadFilterImages(filter);
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
        // Use centralized auth utils for consistency
        if (window.UnifiedAuthUtils) {
            return window.UnifiedAuthUtils.canAccessUserFilter();
        }

        // Fallback: Check multiple authentication sources for robustness
        if (window.userSystem && window.userSystem.isAuthenticated()) {
            return true;
        }

        // Fallback: check if we have a valid token
        if (window.userApi && window.userApi.isAuthenticated()) {
            return true;
        }

        // Fallback: check localStorage for user data
        try {
            const userData = localStorage.getItem('userData');

            if (userData) {
                const parsed = JSON.parse(userData);

                return !!(parsed.id || parsed.data?.user?.id || parsed.user?.id);
            }
        } catch (e) {
            // Ignore parsing errors
        }

        return false;
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

        // Update dropdown options
        const ownerDropdown = document.querySelector(FEED_CONSTANTS.SELECTORS.OWNER_DROPDOWN);

        if (ownerDropdown) {
            const siteOption = ownerDropdown.querySelector('option[value="site"]');
            const userOption = ownerDropdown.querySelector('option[value="user"]');

            if (siteOption) {
                siteOption.disabled = !availableFilters.includes(FEED_CONSTANTS.FILTERS.SITE);
            }

            if (userOption) {
                userOption.disabled = !availableFilters.includes(FEED_CONSTANTS.FILTERS.USER);
            }
        }

    }


    /**
     * Update image count display for a specific filter
     * @param {string} filter - Filter type
     */
    async updateImageCountDisplay(filter) {
        try {
            console.log(`📊 FILTER: Updating image count display for ${filter}`);
            await this.imageCountManager.updateDisplayForFilter(filter);
        } catch (error) {
            console.error(`📊 FILTER: Failed to update image count display for ${filter}:`, error);
        }
    }

    /**
     * Get current image count for a filter
     * @param {string} filter - Filter type
     * @returns {Promise<number>} Image count
     */
    async getImageCount(filter) {
        return await this.imageCountManager.getImageCount(filter);
    }

    /**
     * Clear image count cache for a filter
     * @param {string} filter - Filter type
     */
    clearImageCountCache(filter) {
        this.imageCountManager.clearCache(filter);
    }

    /**
     * Clear all image count caches
     */
    clearAllImageCountCaches() {
        this.imageCountManager.clearAllCaches();
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
