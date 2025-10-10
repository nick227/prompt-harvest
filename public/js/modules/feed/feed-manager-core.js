// Feed Manager Core - Main orchestrator for feed functionality

/* global HybridTabService, FeedViewManager, FillToBottomManager, FeedDOMOperations, FeedImageHandler, FeedDownloadManager */
class FeedManager {
    constructor() {
        this.config = FEED_CONFIG;
        this.isInitialized = false;
        this.initialLoadPromise = null;
        this.isLoadingMore = false;

        // Rate limiting to prevent abuse (pause 3s every 6 pages)
        this.pagesLoadedInSession = 0;
        this.isRateLimited = false;
        this.RATE_LIMIT_PAGES = 6; // Pages before throttle kicks in
        this.RATE_LIMIT_DELAY = 3000; // 3 second pause

        // Initialize sub-managers (defer until needed)
        this.cacheManager = null;
        this.apiManager = null;
        this.uiManager = null;
        this.filterManager = null;
        this.tabService = null;
        this.viewManager = null;
        this.fillToBottomManager = null;

        // Initialize new modular components
        this.domOperations = null;
        this.imageHandler = null;
        this.downloadManager = null;

        // Use global tag router for URL parameter handling (will be set later if not available)
        this.tagRouter = window.tagRouter || null;

        // Bind methods to maintain context
        this.handleFilterChanged = this.handleFilterChanged.bind(this);
        this.handleLastImageVisible = this.handleLastImageVisible.bind(this);
        this.loadFilterImages = this.loadFilterImages.bind(this);
        this.handleTagChange = this.handleTagChange.bind(this);
    }

    // Initialize feed manager
    async init() {
        if (this.isInitialized) {
            return this;
        }

        try {
            await this.initializeSubManagers();
            this.setupEventListeners();
            await this.setupTagRouter();
            await this.setupFeed();
            await this.updateInitialTagFilter();
            this.isInitialized = true;
        } catch (error) {
            console.error('❌ FEED MANAGER: Feed Manager initialization failed:', error);
            throw error;
        }

        return this;
    }

    // Initialize sub-managers
    async initializeSubManagers() {
        // Check if all required classes are available
        const requiredClasses = [
            'FeedCacheManager', 'FeedAPIManager',
            'FeedUIManager', 'FeedFilterManager', 'HybridTabService',
            'FeedViewManager', 'FillToBottomManager', 'FeedDOMOperations',
            'FeedImageHandler', 'FeedDownloadManager'
        ];

        const missingClasses = requiredClasses.filter(className => typeof window[className] === 'undefined');

        if (missingClasses.length > 0) {
            console.error('❌ FEED MANAGER: Missing required classes:', missingClasses);
            throw new Error(`Missing required classes: ${missingClasses.join(', ')}`);
        }

        // Initialize sub-managers
        this.cacheManager = new window.FeedCacheManager();
        this.apiManager = new window.FeedAPIManager();
        this.domOperations = new window.FeedDOMOperations();
        this.downloadManager = new window.FeedDownloadManager();
        this.uiManager = new window.FeedUIManager(this.domOperations);
        this.filterManager = new window.FeedFilterManager(this.cacheManager, this);
        this.tabService = new window.HybridTabService();
        this.viewManager = new window.FeedViewManager();

        // Initialize image handler with dependencies (before fillToBottomManager)
        this.imageHandler = new window.FeedImageHandler(this.domOperations, this.viewManager, this.downloadManager);

        // Initialize fillToBottomManager with dependencies object
        this.fillToBottomManager = new window.FillToBottomManager({
            imageHandler: this.imageHandler,
            apiManager: this.apiManager,
            cacheManager: this.cacheManager,
            tagRouter: this.tagRouter,
            feedManager: this, // Reference for rate limiting check
            uiManager: this.uiManager // Reference for loading state coordination
        });

        this.domOperations.init();
        this.uiManager.init();
        this.filterManager.init();
        await this.tabService.init();
        this.viewManager.init();
    }

    // Setup tag router subscription
    async setupTagRouter() {
        if (window.tagRouter) {
            this.tagRouter = window.tagRouter;
            // Using global tag router for subscription
        }

        if (this.tagRouter) {
            // Subscribing to tag router changes
            this.tagRouter.subscribe('feedManager', this.handleTagChange);
        } else {
            // Tag router not available yet, will connect later
        }
    }

    // Connect to tag router when it becomes available
    connectTagRouter() {
        if (window.tagRouter && !this.tagRouter) {
            // Connecting to tag router that became available
            this.tagRouter = window.tagRouter;
            this.tagRouter.subscribe('feedManager', this.handleTagChange);
            // Tag router connected successfully
        }
    }

    // Update initial tag filter indicator
    async updateInitialTagFilter() {
        if (this.tagRouter) {
            const currentTags = this.tagRouter.getActiveTags();

            if (currentTags.length > 0) {
                // Updating tag filter indicator with initial tags
                this.uiManager.updateTagFilterIndicator(currentTags);
            }
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Bind event handlers to preserve 'this' context
        this.boundHandleFilterChanged = this.handleFilterChanged.bind(this);
        this.boundHandleLastImageVisible = this.handleLastImageVisible.bind(this);

        // Listen for filter changes
        window.addEventListener(FEED_CONSTANTS.EVENTS.FILTER_CHANGED, this.boundHandleFilterChanged);

        // Listen for last image visible (infinite scroll) - CRITICAL: must be bound!
        window.addEventListener('lastImageVisible', this.boundHandleLastImageVisible);

        // Setup window listeners
        this.uiManager.setupWindowListeners();
    }

    // Handle filter changed event
    async handleFilterChanged(event) {
        const { filter } = event.detail;

        // Reset rate limiting when changing filters (each filter gets fresh limit)
        this.pagesLoadedInSession = 0;
        this.isRateLimited = false;

        await this.loadFilterImages(filter);
    }

    // Handle last image visible (infinite scroll)
    async handleLastImageVisible() {
        const currentFilter = this.filterManager.getCurrentFilter();
        const cache = this.cacheManager.getCache(currentFilter);

        // Prevent multiple simultaneous calls
        if (this.isLoadingMore) {
            return;
        }

        // Rate limiting check - pause every 6 pages for 3 seconds
        if (this.isRateLimited) {
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

    // Handle tag changes from tag router
    async handleTagChange(activeTags) {
        try {
            // Tag change detected

            // Update tag filter indicator
            if (this.uiManager.updateTagFilterIndicator) {
                this.uiManager.updateTagFilterIndicator(activeTags);
            }

            // Get current filter
            const currentFilter = this.filterManager.getCurrentFilter();

            // Reload images with new tag filter
            await this.loadFilterImages(currentFilter);

        } catch (error) {
            console.error('❌ FEED MANAGER: Error handling tag change:', error);
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
            // Wait for filter manager to complete initialization before getting current filter
            await this.waitForFilterManagerReady();

            const currentFilter = this.filterManager.getCurrentFilter();

            if (window.DEBUG_MODE) {
                // Loading initial feed for filter
            }

            await this.loadFilterImages(currentFilter);
        } catch (error) {
            console.error('❌ Failed to load initial feed:', error);
            this.domOperations.showErrorMessage();
        }
    }

    // Wait for filter manager to be ready
    async waitForFilterManagerReady() {
        return new Promise(resolve => {
            // Check if filter manager is already initialized AND has a current filter set
            if (this.filterManager && this.filterManager.isInitialized && this.filterManager.currentFilter) {
                if (window.DEBUG_MODE) {
                    // Filter manager is already ready
                }
                resolve();

                return;
            }

            // Listen for filter manager ready event
            const handleFilterReady = event => {
                if (window.DEBUG_MODE) {
                    // Filter manager ready event received
                }
                window.removeEventListener('filterManagerReady', handleFilterReady);
                resolve();
            };

            window.addEventListener('filterManagerReady', handleFilterReady);

            // Fallback timeout in case event never fires
            setTimeout(() => {
                console.warn('⚠️ FEED MANAGER: Filter manager ready event timeout, proceeding anyway');
                window.removeEventListener('filterManagerReady', handleFilterReady);
                resolve();
            }, 3000);
        });
    }

    // Load filter images
    async loadFilterImages(filter) {
        try {
            // Check if user can access user filter
            if (filter === FEED_CONSTANTS.FILTERS.PRIVATE && !this.apiManager.isUserAuthenticated()) {
                this.domOperations.showLoginPrompt();

                return;
            }

            // Start smooth transition (fade out current content)
            const promptOutput = await this.uiManager.startSmoothTransition();

            // Get current active tags from tag router
            const activeTags = this.tagRouter ? this.tagRouter.getActiveTags() : [];

            // Load images from API with tag filtering
            const result = await this.apiManager.loadFeedImages(filter, 0, activeTags);

            // Extract hasMore from multiple possible locations in API response
            // Priority: result.hasMore > result.data.hasMore > result.pagination.hasMore > default true
            const hasMore = result.hasMore ?? result.data?.hasMore ?? result.pagination?.hasMore ?? true;

            // Update cache with tags
            this.cacheManager.setCache(filter, {
                images: result.images,
                hasMore,
                currentPage: 0,
                isLoaded: true
            }, activeTags);

            // Clear and populate feed (content is now faded out, safe to clear)
            this.domOperations.clearFeedContent();

            if (result.images && Array.isArray(result.images)) {
                // Additional frontend filtering for site feed to ensure only public images
                const filteredImages = filter === FEED_CONSTANTS.FILTERS.PUBLIC
                    ? result.images.filter(image => image.isPublic === true)
                    : result.images;

                filteredImages.forEach(image => {
                    this.imageHandler.addImageToFeed(image, filter);
                });

                // Show appropriate message if no images (use filtered count)
                if (filteredImages.length === 0) {
                    this.domOperations.showNoImagesMessage();
                }
            } else {
                console.error('❌ FEED MANAGER: result.images is not an array:', result.images);
                this.domOperations.showNoImagesMessage();
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
            const promptOutput = this.domOperations.getElement('promptOutput');

            if (promptOutput && promptOutput.classList.contains(FEED_CONSTANTS.CLASSES.TRANSITIONING)) {
                await this.uiManager.completeSmoothTransition(promptOutput);
            }

            this.domOperations.showErrorMessage();
        } finally {
            this.uiManager.setLoading(false);
        }
    }

    // Load more images (pagination)
    async loadMoreImages(filter) {
        try {
            this.uiManager.setLoading(true);

            const activeTags = this.tagRouter ? this.tagRouter.getActiveTags() : [];
            const cache = this.cacheManager.getCache(filter, activeTags);
            const nextPage = cache.currentPage + 1;

            const result = await this.apiManager.loadMoreImages(filter, nextPage, activeTags);

            // Extract hasMore from multiple possible locations in API response
            // Priority: result.hasMore > result.data.hasMore > result.pagination.hasMore > default false
            const hasMore = result.hasMore ?? result.data?.hasMore ?? result.pagination?.hasMore ?? false;

            // Add new images to cache
            this.cacheManager.addImagesToCache(filter, result.images, activeTags);
            this.cacheManager.updatePagination(filter, nextPage, hasMore, activeTags);

            // Add new images to DOM
            result.images.forEach(image => {
                this.imageHandler.addImageToFeed(image, filter);
            });

            // Increment page counter and check rate limit
            this.pagesLoadedInSession++;

            // Apply rate limiting every 6 pages (3-second cooldown)
            if (this.pagesLoadedInSession % this.RATE_LIMIT_PAGES === 0) {
                this.isRateLimited = true;

                // Keep showing the loading spinner during cooldown
                this.uiManager.setLoading(true);

                setTimeout(() => {
                    this.isRateLimited = false;
                    this.uiManager.setLoading(false);

                    // Trigger a re-check in case user scrolled during cooldown
                    const lastImage = this.domOperations.getLastImageElement();

                    if (lastImage && this.uiManager.isElementInViewport(lastImage)) {
                        this.handleLastImageVisible();
                    }
                }, this.RATE_LIMIT_DELAY);
            }

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
            this.uiManager.setLoading(false);
        }
    }

    // Refresh feed
    async refreshFeed() {
        try {
            const currentFilter = this.filterManager.getCurrentFilter();

            await this.loadFilterImages(currentFilter);
        } catch (error) {
            console.error('❌ Failed to refresh feed:', error);
            this.domOperations.showErrorMessage();
        }
    }

    // Add image to output (for new generations)
    addImageToOutput(imageData) {
        try {
            const currentFilter = this.filterManager.getCurrentFilter();

            // Add to cache
            this.cacheManager.addImagesToCache(currentFilter, [imageData]);

            // Add to DOM
            this.addImageToFeed(imageData, currentFilter);

            // Refresh rating dropdown to include new image's rating
            if (window.ratingManager && window.ratingManager.refreshRatingDropdown) {
                window.ratingManager.refreshRatingDropdown();
            }

        } catch (error) {
            console.error('❌ Failed to add image to output:', error);
        }
    }

    // Add image to feed (wrapper for backward compatibility)
    addImageToFeed(imageData, filter) {
        if (!imageData || !imageData.id) {
            console.error('❌ FEED MANAGER: Invalid image data provided to addImageToFeed');

            return false;
        }

        return this.imageHandler.addImageToFeed(imageData, filter);
    }

    /**
     * Load images for a specific context (profile, home, etc.)
     * @param {string} context - 'profile' for public images only, 'home' for user's own images
     * @param {Object} options - Configuration options
     */
    async loadImagesForContext(context, options = {}) {
        if (context === 'profile') {
            // For profile pages, only load public images
            return await this.apiManager.loadFeedImages('site', options.page || 0, options.tags || [], options.customEndpoint);
        } else if (context === 'home') {
            // For home page, load user's own images (public and private)
            return await this.apiManager.loadFeedImages('user', options.page || 0, options.tags || []);
        } else {
            console.error(`❌ FEED MANAGER: Unknown context: ${context}`);
            throw new Error(`Unknown context: ${context}`);
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
        return this.domOperations.removeImageFromFeed(imageId);
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

const initFeedManager = async() => {
    // Check if all required dependencies are available
    const requiredDependencies = [
        'FEED_CONFIG', 'FEED_CONSTANTS', 'FeedCacheManager',
        'FeedAPIManager', 'FeedUIManager', 'FeedFilterManager', 'HybridTabService',
        'FeedViewManager', 'FillToBottomManager', 'FeedDOMOperations',
        'FeedImageHandler', 'FeedDownloadManager'
    ];

    const missingDeps = requiredDependencies.filter(dep => {
        if (dep.startsWith('FEED_')) {
            return typeof window[dep] === 'undefined';
        } else {
            return typeof window[dep] === 'undefined';
        }
    });

    if (missingDeps.length > 0) {
        console.warn('⚠️ FEED MANAGER: Missing dependencies, retrying in 100ms:', missingDeps);
        setTimeout(() => initFeedManager().catch(console.error), 100);

        return;
    }

    // All dependencies available, proceeding with initialization

    try {
        feedManager = new FeedManager();
        window.feedManager = feedManager;

        // SECURITY: Check if we're on a profile page - don't auto-initialize feed loading
        const isProfilePage = window.location.pathname.startsWith('/u/') ||
                             window.location.pathname.includes('/profile');

        if (isProfilePage) {
            // Initialize sub-managers but don't load initial feed
            await feedManager.initializeSubManagers();
            feedManager.setupEventListeners();
            feedManager.isInitialized = true;
        } else {
            // Initialize the feed manager (this sets up tag router subscription)
            await feedManager.init();
        }

        // Export functions for global access (maintaining backward compatibility)
        const setupFeed = async() => await feedManager.setupFeed();
        const setupFeedPromptsNew = async() => await feedManager.loadInitialFeed(); // Use new method
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
    } catch (error) {
        console.error('❌ FEED MANAGER: Failed to initialize:', error);
        // Retry after a short delay
        setTimeout(() => initFeedManager().catch(console.error), 500);
    }
};

// Initialize with a small delay to ensure all dependencies are loaded
const initWithDelay = () => {

    // Small delay to ensure all dependencies are loaded
    setTimeout(() => {
        initFeedManager().catch(console.error);
    }, 100);
};

// Start initialization with delay
initWithDelay();

// Export for global access
window.FeedManager = FeedManager;
window.feedManager = feedManager;

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedManager;
}
