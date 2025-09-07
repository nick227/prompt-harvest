// Feed Manager - Main orchestrator for feed functionality
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
        this.filterManager = new FeedFilterManager(this.cacheManager);

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

            // Setup event listeners
            this.setupEventListeners();

            // Setup feed
            await this.setupFeed();

            this.isInitialized = true;
            console.log('✅ Feed Manager initialized successfully');
        } catch (error) {
            console.error('❌ Feed Manager initialization failed:', error);
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

        console.log('🔍 INFINITE SCROLL: Last image visible event triggered');
        console.log('🔍 INFINITE SCROLL: Current filter:', currentFilter);
        console.log('🔍 INFINITE SCROLL: Cache state:', {
            hasMore: cache?.hasMore,
            currentPage: cache?.currentPage,
            imageCount: cache?.images?.length,
            isLoading: this.uiManager.getLoading(),
            isLoadingMore: this.isLoadingMore
        });

        // Prevent multiple simultaneous calls
        if (this.isLoadingMore) {
            console.log('⏹️ INFINITE SCROLL: Already loading more, skipping');

            return;
        }

        if (cache && cache.hasMore && !this.uiManager.getLoading()) {
            console.log('🚀 INFINITE SCROLL: Loading more images...');
            this.isLoadingMore = true;
            try {
                await this.loadMoreImages(currentFilter);
            } finally {
                this.isLoadingMore = false;
            }
        } else {
            console.log('⏹️ INFINITE SCROLL: Not loading more - hasMore:', cache?.hasMore, 'isLoading:', this.uiManager.getLoading());
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

    // Load initial feed
    async loadInitialFeed() {
        try {
            const currentFilter = this.filterManager.getCurrentFilter();

            await this.loadFilterImages(currentFilter);
        } catch (error) {
            console.error('❌ Failed to load initial feed:', error);
            this.uiManager.showErrorMessage();
        }
    }

    // Load filter images
    async loadFilterImages(filter) {
        try {
            this.uiManager.showLoading();

            // Check if user can access user filter
            if (filter === FEED_CONSTANTS.FILTERS.USER && !this.apiManager.isUserAuthenticated()) {
                this.uiManager.showLoginPrompt();

                return;
            }

            // Load images from API
            const result = await this.apiManager.loadFeedImages(filter, 0);

            // Update cache
            this.cacheManager.setCache(filter, {
                images: result.images,
                hasMore: result.hasMore,
                currentPage: 0,
                isLoaded: true
            });

            // Clear and populate feed
            this.uiManager.clearFeedContent();
            result.images.forEach(image => {
                this.uiManager.addImageToFeed(image, filter);
            });

            // Show appropriate message if no images
            if (result.images.length === 0) {
                this.uiManager.showNoImagesMessage();
            }

            // Force grid layout
            this.uiManager.forceGridLayout();

        } catch (error) {
            console.error(`❌ Failed to load ${filter} images:`, error);
            this.uiManager.showErrorMessage();
        } finally {
            this.uiManager.hideLoading();
        }
    }

    // Load more images (pagination)
    async loadMoreImages(filter) {
        try {
            console.log('📥 LOAD MORE: Starting to load more images for filter:', filter);

            this.uiManager.showLoading();

            const cache = this.cacheManager.getCache(filter);
            const nextPage = cache.currentPage + 1;

            console.log('📥 LOAD MORE: Current page:', cache.currentPage, 'Next page:', nextPage);

            const result = await this.apiManager.loadMoreImages(filter, nextPage);

            console.log('📥 LOAD MORE: API result:', {
                imageCount: result.images?.length,
                hasMore: result.hasMore,
                totalCount: result.totalCount
            });

            // Add new images to cache
            this.cacheManager.addImagesToCache(filter, result.images);
            this.cacheManager.updatePagination(filter, nextPage, result.hasMore);

            // Add new images to DOM
            result.images.forEach(image => {
                this.uiManager.addImageToFeed(image, filter);
            });

            console.log('📥 LOAD MORE: Completed successfully');

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

            // Force grid layout
            this.uiManager.forceGridLayout();

            console.log(`🚀 FEED FLOW: addImageToOutput called for: ${imageData.id}`);
        } catch (error) {
            console.error('❌ Failed to add image to output:', error);
        }
    }

    // Setup feed prompts new (legacy method)
    setupFeedPromptsNew() {
        // This method is kept for backward compatibility
        // It's essentially the same as setupFeed now
        return this.setupFeed();
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
