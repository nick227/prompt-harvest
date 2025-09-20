// Feed Manager - Main orchestrator for feed functionality

/* global HybridTabService, FeedViewManager, FillToBottomManager */
class FeedManager {
    constructor() {
        this.config = FEED_CONFIG;
        this.isInitialized = false;
        this.initialLoadPromise = null;
        this.isLoadingMore = false;

        // Initialize sub-managers
        this.cacheManager = new FeedCacheManager();
        this.domManager = new FeedDOMManager();
        this.apiManager = new FeedAPIManager();
        this.uiManager = new FeedUIManager(this.domManager);
        this.filterManager = new FeedFilterManager(this.cacheManager, this);
        this.tabService = new HybridTabService();
        this.viewManager = new FeedViewManager();
        this.fillToBottomManager = new FillToBottomManager(this.domManager, this.apiManager, this.cacheManager);

        // Bind methods to maintain context
        this.handleFilterChanged = this.handleFilterChanged.bind(this);
        this.handleLastImageVisible = this.handleLastImageVisible.bind(this);
        this.loadFilterImages = this.loadFilterImages.bind(this);
    }

    // Initialize feed manager
    async init() {
        if (this.isInitialized) {

            return this;
        }

        try {

            // Initialize sub-managers
            this.domManager.init();
            this.uiManager.init();
            this.filterManager.init();
            await this.tabService.init();
            this.viewManager.init();

            // Setup event listeners
            this.setupEventListeners();

            // Setup feed
            await this.setupFeed();

            this.isInitialized = true;
        } catch (error) {
            console.error('❌ FEED MANAGER: Feed Manager initialization failed:', error);
            throw error;
        }

        return this;
    }

    // Setup event listeners
    setupEventListeners() {
        // Listen for filter changes
        window.addEventListener(FEED_CONSTANTS.EVENTS.FILTER_CHANGED, this.handleFilterChanged);

        // Listen for last image visible (infinite scroll)
        window.addEventListener('lastImageVisible', this.handleLastImageVisible);

        // Setup window listeners
        this.uiManager.setupWindowListeners();
    }

    // Handle filter changed event
    async handleFilterChanged(event) {
        const { filter } = event.detail;

        await this.loadFilterImages(filter);
    }

    // Handle last image visible (infinite scroll)
    async handleLastImageVisible(_event) {
        const currentFilter = this.filterManager.getCurrentFilter();
        const cache = this.cacheManager.getCache(currentFilter);

        // Prevent multiple simultaneous calls
        if (this.isLoadingMore) {

            return;
        }

        if (cache && cache.hasMore && !this.uiManager.getLoading()) {
            this.isLoadingMore = true;
            try {
                await this.loadMoreImages(currentFilter);
            } finally {
                this.isLoadingMore = false;
            }
        }
    }

    // Setup feed
    async setupFeed() {
        if (this.initialLoadPromise) {

            return this.initialLoadPromise;
        }

        this.initialLoadPromise = this.loadInitialFeed();

        return this.initialLoadPromise;
    }

    // Force fresh feed load (for debugging/testing)
    async forceFreshFeedLoad() {
        this.initialLoadPromise = null; // Reset the cached promise

        return this.setupFeed();
    }

    // Load initial feed
    async loadInitialFeed() {
        try {
            const currentFilter = this.filterManager.getCurrentFilter();
            console.log(`🚀 FEED MANAGER: Loading initial feed for filter: ${currentFilter}`);

            await this.loadFilterImages(currentFilter);
        } catch (error) {
            console.error('❌ Failed to load initial feed:', error);
            this.uiManager.showErrorMessage();
        }
    }

    // Load filter images
    async loadFilterImages(filter) {
        try {
            // Check if user can access user filter
            if (filter === FEED_CONSTANTS.FILTERS.USER && !this.apiManager.isUserAuthenticated()) {
                this.uiManager.showLoginPrompt();
                return;
            }

            // Start smooth transition (fade out current content)
            const promptOutput = await this.uiManager.startSmoothTransition();


            // Load images from API
            const result = await this.apiManager.loadFeedImages(filter, 0);

            // Update cache
            this.cacheManager.setCache(filter, {
                images: result.images,
                hasMore: result.hasMore,
                currentPage: 0,
                isLoaded: true
            });

            // Clear and populate feed (content is now faded out, safe to clear)
            this.uiManager.clearFeedContent();

        if (result.images && Array.isArray(result.images)) {
            // Additional frontend filtering for site feed to ensure only public images
            const filteredImages = filter === FEED_CONSTANTS.FILTERS.SITE
                ? result.images.filter(image => image.isPublic === true)
                : result.images;

            console.log(`🔍 FEED FILTER: ${filter} filter - ${result.images.length} total, ${filteredImages.length} after filtering`);

            filteredImages.forEach((image) => {
                this.uiManager.addImageToFeed(image, filter);
            });

            // Show appropriate message if no images (use filtered count)
            if (filteredImages.length === 0) {
                this.uiManager.showNoImagesMessage();
            }
        } else {
            console.error(`❌ FEED MANAGER: result.images is not an array:`, result.images);
            this.uiManager.showNoImagesMessage();
        }


            // Refresh rating dropdown to include all loaded images' ratings
            if (window.ratingManager && window.ratingManager.refreshRatingDropdown) {
                window.ratingManager.refreshRatingDropdown();
            }

            // Complete smooth transition (fade in new content)
            await this.uiManager.completeSmoothTransition(promptOutput);

            // Reapply view after images are loaded and enhanced
            if (this.viewManager && this.viewManager.forceReapplyView) {
                this.viewManager.forceReapplyView();
            }

            // Check and fill to bottom after initial load
            setTimeout(() => {
                this.fillToBottomManager.checkAndFillToBottom(filter);
            }, 100);

        } catch (error) {
            console.error(`❌ Failed to load ${filter} images:`, error);

            // Ensure transition completes even on error
            const promptOutput = this.domManager.getElement('promptOutput');
            if (promptOutput && promptOutput.classList.contains(FEED_CONSTANTS.CLASSES.TRANSITIONING)) {
                await this.uiManager.completeSmoothTransition(promptOutput);
            }

            this.uiManager.showErrorMessage();
        } finally {
            this.uiManager.hideLoading();
        }
    }

    // Load more images (pagination)
    async loadMoreImages(filter) {
        try {

            this.uiManager.showLoading();

            const cache = this.cacheManager.getCache(filter);
            const nextPage = cache.currentPage + 1;


            const result = await this.apiManager.loadMoreImages(filter, nextPage);

            // Add new images to cache
            this.cacheManager.addImagesToCache(filter, result.images);
            this.cacheManager.updatePagination(filter, nextPage, result.hasMore);

            // Add new images to DOM
            result.images.forEach(image => {
                this.uiManager.addImageToFeed(image, filter);
            });

            // Reapply view after new images are loaded
            if (this.viewManager && this.viewManager.forceReapplyView) {
                this.viewManager.forceReapplyView();
            }

            // Check and fill to bottom after loading more images
            setTimeout(() => {
                this.fillToBottomManager.checkAndFillToBottom(filter);
            }, 100);

        } catch (error) {
            console.error(`❌ Failed to load more ${filter} images:`, error);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    // Refresh feed
    async refreshFeed() {
        try {
            const currentFilter = this.filterManager.getCurrentFilter();

            await this.loadFilterImages(currentFilter);
        } catch (error) {
            console.error('❌ Failed to refresh feed:', error);
            this.uiManager.showErrorMessage();
        }
    }

    // Add image to output (for new generations)
    addImageToOutput(imageData, _download = false) {
        try {
            const currentFilter = this.filterManager.getCurrentFilter();

            // Add to cache
            this.cacheManager.addImagesToCache(currentFilter, [imageData]);

            // Add to DOM
            this.uiManager.addImageToFeed(imageData, currentFilter);


            // Refresh rating dropdown to include new image's rating
            if (window.ratingManager && window.ratingManager.refreshRatingDropdown) {
                window.ratingManager.refreshRatingDropdown();
            }

        } catch (error) {
            console.error('❌ Failed to add image to output:', error);
        }
    }


    // Get filter statistics
    getFilterStats() {
        return this.cacheManager.getCacheStats();
    }

    // Clear filter cache
    clearFilterCache(filter) {
        this.cacheManager.clearCache(filter);
    }

    // Get current user info
    getCurrentUserInfo() {
        return this.apiManager.getCurrentUserInfo();
    }

    // Check if user is authenticated
    isUserAuthenticated() {
        return this.apiManager.isUserAuthenticated();
    }

    // Get current filter
    getCurrentFilter() {
        return this.filterManager.getCurrentFilter();
    }

    // Switch filter
    async switchFilter(filter) {
        return await this.filterManager.switchFilter(filter);
    }

    // Remove specific image from feed
    removeImageFromFeed(imageId) {
        return this.uiManager.removeImageFromFeed(imageId);
    }

    // Cleanup
    cleanup() {
        this.uiManager.cleanup();
        this.isInitialized = false;
        this.initialLoadPromise = null;
    }
}

// Initialize when dependencies are available
let feedManager = null;

const initFeedManager = () => {
    if (typeof FEED_CONFIG !== 'undefined' && typeof FEED_CONSTANTS !== 'undefined') {
        feedManager = new FeedManager();

        // Export functions for global access (maintaining backward compatibility)
        const setupFeed = async() => await feedManager.setupFeed();
        const setupFeedPromptsNew = () => feedManager.setupFeedPromptsNew();
        const refreshFeed = async() => await feedManager.refreshFeed();

        // Export for testing
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = FeedManager;
        }

        // Export for global access
        if (typeof window !== 'undefined') {
            window.FeedManager = FeedManager;
            window.feedManager = feedManager;
            window.setupFeed = setupFeed;
            window.setupFeedPromptsNew = setupFeedPromptsNew;
            window.refreshFeed = refreshFeed;

            // Debug helpers
            window.getFilterStats = () => feedManager.getFilterStats();
            window.clearFilterCache = filter => feedManager.clearFilterCache(filter);
        }
    } else {
        // Retry after a short delay
        setTimeout(initFeedManager, FEED_CONSTANTS.DEFAULTS.RETRY_DELAY);
    }
};

// Start initialization
initFeedManager();
