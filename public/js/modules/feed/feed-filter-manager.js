// Feed Filter Manager - Handles filter switching and state management
class FeedFilterManager {
    constructor(cacheManager, feedManager) {
        this.cacheManager = cacheManager;
        this.feedManager = feedManager;
        this.currentFilter = FEED_CONSTANTS.DEFAULTS.CURRENT_FILTER;
        this.isInitialized = false;
        this.imageCountManager = new window.ImageCountManager();
    }

    // Initialize filter manager with DOM-ready check
    init() {
        // Ensure DOM is ready before initializing
        if (document.readyState === 'loading') {
            console.log('⏳ FILTER: Waiting for DOM to be ready...');
            document.addEventListener('DOMContentLoaded', () => this._performInit());
        } else {
            // DOM is already ready
            this._performInit();
        }
    }

    // Internal initialization method
    _performInit() {
        console.log('🚀 FILTER: Initializing filter manager...');

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

                if (!this.isValidFilter(newFilter)) {
                    console.error(`❌ Invalid filter value: "${newFilter}"`);

                    return;
                }

                // Save user's manual choice
                this.saveFilter(newFilter);

                // Check if search is active
                const isSearchActive = window.searchManager?.state?.isSearchActive;

                if (isSearchActive) {
                    // FIX 5: Save previousFilter before updating
                    const previousFilter = this.currentFilter;

                    // When search is active, just filter the search results (don't load new feed images)
                    if (window.feedManager?.tabService) {
                        window.feedManager.tabService.switchToFilter(newFilter);

                        // Update state for search case (since we're not calling this.switchFilter)
                        this.currentFilter = newFilter;
                        this.syncFilterWithHybridTabService();

                        // FIX 5: Update counts and dispatch events even in search mode
                        this.updateImageCountDisplay(newFilter);
                        this.dispatchFilterChangedEvent(newFilter, previousFilter);
                    } else {
                        console.error('❌ TabService not available!');
                    }
                } else {
                    // Normal feed: load new images for the selected filter
                    // NOTE: switchFilter() will update currentFilter internally
                    this.switchFilter(newFilter);
                }
            });
        } else {
            console.error('❌ FILTER MANAGER: Owner dropdown not found!');
        }

    }


    // Set default filter selection with guaranteed fallback
    setDefaultFilter() {
        const targetFilter = this._determineTargetFilter();

        // Set the filter in DOM and internal state
        console.log(`📌 FILTER: Setting default filter to "${targetFilter}"`);
        this.currentFilter = targetFilter;
        this.setFilterSelection(targetFilter);
        this.saveFilter(targetFilter);

        // FIX 2: Update image count for initial filter
        this.updateImageCountDisplay(targetFilter);

        // Sync and notify
        this.syncFilterWithHybridTabService();
        this.dispatchFilterReadyEvent();

        // Verification - ensure dropdown value stuck (especially important on mobile)
        setTimeout(() => this._verifyDropdownValue(targetFilter), 500);
    }

    // Determine which filter to use based on localStorage and auth state
    _determineTargetFilter() {
        // Try localStorage first
        const savedFilter = this.getSavedFilter();

        if (savedFilter && this.isValidFilter(savedFilter)) {
            if (savedFilter === FEED_CONSTANTS.FILTERS.PRIVATE && !this.canAccessUserFilter()) {
                console.log(`🔄 FILTER: Saved "${savedFilter}" requires auth, using public`);

                return FEED_CONSTANTS.FILTERS.PUBLIC;
            }

            return savedFilter;
        }

        // Use default from config
        const defaultFilter = FEED_CONSTANTS.DEFAULTS.CURRENT_FILTER;

        if (defaultFilter === FEED_CONSTANTS.FILTERS.PRIVATE && !this.canAccessUserFilter()) {
            console.log(`🔄 FILTER: Default "${defaultFilter}" requires auth, using public`);

            return FEED_CONSTANTS.FILTERS.PUBLIC;
        }

        // Final safety check
        if (!defaultFilter || !this.isValidFilter(defaultFilter)) {
            console.warn(`⚠️ FILTER: Invalid default "${defaultFilter}", using public`);

            return FEED_CONSTANTS.FILTERS.PUBLIC;
        }

        return defaultFilter;
    }

    // Verify that dropdown value matches expected filter
    _verifyDropdownValue(expectedFilter) {
        const ownerDropdown = document.querySelector(FEED_CONSTANTS.SELECTORS.OWNER_DROPDOWN);

        if (ownerDropdown) {
            const actualValue = ownerDropdown.value;

            if (!actualValue || actualValue !== expectedFilter) {
                console.error(`❌ FILTER VERIFICATION FAILED: Expected "${expectedFilter}", got "${actualValue || '(empty)'}"`);
                console.log('🔧 FILTER: Attempting to fix...');

                // Try to fix it
                ownerDropdown.value = expectedFilter;

                // If it still doesn't work, force set to first available option
                if (ownerDropdown.value !== expectedFilter && ownerDropdown.options.length > 0) {
                    const fallback = ownerDropdown.options[0].value;

                    console.warn(`⚠️ FILTER: Forcing fallback to "${fallback}"`);
                    ownerDropdown.value = fallback;
                    this.currentFilter = fallback;
                    this.saveFilter(fallback);
                }
            } else {
                console.log(`✅ FILTER VERIFICATION: Dropdown correctly set to "${actualValue}"`);
            }
        } else {
            console.error('❌ FILTER VERIFICATION: Dropdown element not found!');
        }
    }

    // Sync filter state with HybridTabService
    syncFilterWithHybridTabService() {
        if (window.feedManager?.tabService) {
            window.feedManager.tabService.setFilter(this.currentFilter);
        }
    }

    // Dispatch filter ready event
    dispatchFilterReadyEvent() {
        const event = new CustomEvent('filterManagerReady', {
            detail: { currentFilter: this.currentFilter }
        });

        window.dispatchEvent(event);
    }

    // Set filter selection in DOM with retry mechanism
    setFilterSelection(filter, retryCount = 0) {
        // Handle dropdown selection
        const ownerDropdown = document.querySelector(FEED_CONSTANTS.SELECTORS.OWNER_DROPDOWN);

        if (ownerDropdown) {
            // Set the value
            ownerDropdown.value = filter;

            // CRITICAL: Verify the value was actually set
            if (ownerDropdown.value !== filter) {
                const currentValue = ownerDropdown.value;

                console.warn(`⚠️ FILTER: Failed to set dropdown to "${filter}", ` +
                    `current value: "${currentValue}"`);

                // If the filter option doesn't exist, fall back to first available option
                if (ownerDropdown.options.length > 0) {
                    const fallbackValue = ownerDropdown.options[0].value;

                    console.log(`🔄 FILTER: Falling back to first available option: "${fallbackValue}"`);
                    ownerDropdown.value = fallbackValue;

                    // Update internal state to match reality
                    this.currentFilter = fallbackValue;
                    this.saveFilter(fallbackValue);
                }
            } else {
                console.log(`✅ FILTER: Dropdown successfully set to "${filter}"`);
            }
        } else if (retryCount < 5) {
            // MOBILE FIX: Retry after a delay (element might not be rendered yet)
            console.warn(`⚠️ FILTER: Dropdown not found (attempt ${retryCount + 1}/5), retrying...`);
            setTimeout(() => {
                this.setFilterSelection(filter, retryCount + 1);
            }, 100 * (retryCount + 1)); // Exponential backoff: 100ms, 200ms, 300ms, 400ms, 500ms
        } else {
            console.error(`❌ FILTER: Owner dropdown not found after ${retryCount + 1} attempts!`);
        }
    }

    // Get saved filter from localStorage
    getSavedFilter() {
        try {
            let savedFilter = localStorage.getItem(FEED_CONSTANTS.LOCALSTORAGE.SELECTED_FILTER);

            // Migrate legacy values (site → public, user → private)
            if (savedFilter === 'site') {
                savedFilter = 'public';
                this.saveFilter('public'); // Update localStorage
            } else if (savedFilter === 'user') {
                savedFilter = 'private';
                this.saveFilter('private'); // Update localStorage
            }

            return savedFilter;
        } catch (error) {
            console.warn('Failed to get saved filter from localStorage:', error);

            return null;
        }
    }

    // Save filter to localStorage
    saveFilter(filter) {
        try {
            localStorage.setItem(FEED_CONSTANTS.LOCALSTORAGE.SELECTED_FILTER, filter);
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
                const affectedFilter = imageData.isPublic ? 'public' : 'private';

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
        if (!user && this.currentFilter === FEED_CONSTANTS.FILTERS.PRIVATE) {
            // User logged out while viewing "Private" filter, switch to "Public"
            this.switchToPublicFilter();
        } else if (user && this.currentFilter === FEED_CONSTANTS.DEFAULTS.CURRENT_FILTER &&
                   FEED_CONSTANTS.DEFAULTS.CURRENT_FILTER === FEED_CONSTANTS.FILTERS.PRIVATE) {
            // User logged in and we're still on default filter, switch to private filter
            // Only switch if we're not already on the private filter
            if (this.currentFilter !== FEED_CONSTANTS.FILTERS.PRIVATE) {
                this.setFilterSelection(FEED_CONSTANTS.FILTERS.PRIVATE);
                this.currentFilter = FEED_CONSTANTS.FILTERS.PRIVATE;
                this.switchFilter(FEED_CONSTANTS.FILTERS.PRIVATE);
            }
        }
    }

    // Switch to public filter
    switchToPublicFilter() {
        this.setFilterSelection(FEED_CONSTANTS.FILTERS.PUBLIC);
        this.switchFilter(FEED_CONSTANTS.FILTERS.PUBLIC);
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
            return;
        }

        // FIX 1: Save previousFilter BEFORE updating currentFilter
        const previousFilter = this.currentFilter;

        this.showLoadingOverlay();
        this.cacheManager.saveScrollPosition(this.currentFilter);

        const tabServiceAvailable = await this.waitForTabService();

        await this.performFilterSwitch(newFilter, tabServiceAvailable);

        this.currentFilter = newFilter;
        this.saveFilter(newFilter);

        // Sync with TabService after switchFilter updates state
        this.syncFilterWithHybridTabService();

        await this.handleFilterImages(newFilter);
        this.updateImageCountDisplay(newFilter);
        this.dispatchFilterChangedEvent(newFilter, previousFilter);
    }

    // FIX 3: Show loading overlay (600ms duration)
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

    // Hide loading overlay
    hideLoadingOverlay() {
        const promptOutput = document.querySelector(FEED_CONSTANTS.SELECTORS.PROMPT_OUTPUT);

        if (promptOutput) {
            promptOutput.classList.remove('loading');
        }
    }

    // FIX 4: Wait for tab service to be available (increased for slower devices)
    async waitForTabService() {
        let attempts = 0;
        const maxAttempts = 10; // Increased from 3 to 10 for slower mobile devices

        while (attempts < maxAttempts) {
            const tabServiceAvailable = !!(window.feedManager && window.feedManager.tabService);

            if (tabServiceAvailable) { return true; }

            // Progressive backoff: 50ms, 100ms, 150ms, etc. (max 1000ms total)
            await new Promise(resolve => setTimeout(resolve, 50 + (attempts * 50)));
            attempts++;
        }

        return false;
    }

    // Perform the actual filter switch
    async performFilterSwitch(newFilter, tabServiceAvailable) {
        if (tabServiceAvailable) {
            window.feedManager.tabService.switchToFilter(newFilter);
        } else {
            this.hideFilterImages(this.currentFilter);
            this.showFilterImages(newFilter);
        }
    }

    // Handle loading or restoring filter images
    async handleFilterImages(newFilter) {
        const isLoaded = this.cacheManager.isFilterLoaded(newFilter);

        if (!isLoaded) {
            await this.loadFilterImages(newFilter);
        } else {
            this.cacheManager.restoreScrollPosition(newFilter);
        }

        this.hideLoadingOverlay();
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
    dispatchFilterChangedEvent(filter, previousFilter) {
        const event = new CustomEvent(FEED_CONSTANTS.EVENTS.FILTER_CHANGED, {
            detail: { filter, previousFilter }
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
        const filters = [FEED_CONSTANTS.FILTERS.PUBLIC];

        if (this.canAccessUserFilter()) {
            filters.push(FEED_CONSTANTS.FILTERS.PRIVATE);
        }

        return filters;
    }

    // Update filter button states
    updateFilterButtonStates() {
        const availableFilters = this.getAvailableFilters();

        // Update dropdown options
        const ownerDropdown = document.querySelector(FEED_CONSTANTS.SELECTORS.OWNER_DROPDOWN);

        if (ownerDropdown) {
            const publicOption = ownerDropdown.querySelector('option[value="public"]');
            const privateOption = ownerDropdown.querySelector('option[value="private"]');

            if (publicOption) {
                publicOption.disabled = !availableFilters.includes(FEED_CONSTANTS.FILTERS.PUBLIC);
            }

            if (privateOption) {
                privateOption.disabled = !availableFilters.includes(FEED_CONSTANTS.FILTERS.PRIVATE);
            }
        }

    }


    /**
     * Update image count display for a specific filter
     * @param {string} filter - Filter type
     */
    async updateImageCountDisplay(filter) {
        try {
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

