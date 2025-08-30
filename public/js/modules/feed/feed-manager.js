// feed Manager - Handles feed loading and image display
class FeedManager {
    constructor() {
        this.config = FEED_CONFIG;
        this.currentPageCount = 0;
        this.isSetupComplete = false;
        this.isLoading = false;
        this.hasMoreData = true;
        this.intersectionObserver = null;
        this.lastImageElement = null;
        this.currentOwnerFilter = 'site'; // Default to site (all public images)

        // Enhanced caching system for client-side filtering
        this.filterCache = {
            site: {
                images: [],
                currentPage: 0,
                hasMore: true,
                isLoaded: false,
                scrollPosition: 0
            },
            user: {
                images: [],
                currentPage: 0,
                hasMore: true,
                isLoaded: false,
                scrollPosition: 0
            }
        };
    }

    init() {
        // Initialize feed manager
        this.setupFeed();
        this.setupOwnerFilter();

        return this;
    }

    setupOwnerFilter() {
        const ownerButtons = document.querySelectorAll('input[name="owner"]');

        ownerButtons.forEach(button => {
            button.addEventListener('change', e => {
                const newFilter = e.target.value;

                this.switchFilter(newFilter);
            });
        });

        // Set default selection
        const siteButton = document.querySelector('input[name="owner"][value="site"]');

        if (siteButton) {
            siteButton.checked = true;
        }

        // Listen for authentication state changes
        window.addEventListener('authStateChanged', event => {
            const _user = event.detail;

            if (!_user && this.currentOwnerFilter === 'user') {
                // User logged out while viewing "Mine" filter, switch to "Site"

                const siteButton = document.querySelector('input[name="owner"][value="site"]');

                if (siteButton) {
                    siteButton.checked = true;
                }
                this.switchFilter('site');
            }
        });
    }

    // Smart filter switching without server requests (when possible)
    async switchFilter(newFilter) {
        console.log(`🔄 FILTER: Switching from '${this.currentOwnerFilter}' to '${newFilter}'`);
        console.log('📊 FILTER: Cache state before switch:', this.getFilterStats());

        // Save current scroll position
        this.saveScrollPosition();

        // Hide current filter's images
        this.hideFilterImages(this.currentOwnerFilter);

        // Update current filter
        this.currentOwnerFilter = newFilter;

        // Show new filter's images (load if needed)
        if (this.filterCache[newFilter].isLoaded) {
            console.log(`✅ FILTER: Showing cached '${newFilter}' images`);
            this.showFilterImages(newFilter);
            this.restoreScrollPosition(newFilter);
        } else {
            console.log(`📥 FILTER: Loading '${newFilter}' images for first time`);
            await this.loadFilterImages(newFilter);
        }

        // Update pagination state for current system compatibility
        this.syncPaginationState();

        // Update lazy loading target
        this.updateLazyLoadingTarget();

        console.log('📊 FILTER: Cache state after switch:', this.getFilterStats());
    }

    // Legacy method for backwards compatibility and emergency resets
    resetAndReload() {
        console.log('🔄 RESET: Full reload requested');

        // Clear current images
        const promptOutput = document.querySelector(this.config.promptOutputSelector);

        if (promptOutput) {
            promptOutput.innerHTML = '';
        }

        // Reset cache for current filter
        this.filterCache[this.currentOwnerFilter] = {
            images: [],
            currentPage: 0,
            hasMore: true,
            isLoaded: false,
            scrollPosition: 0
        };

        // Reset pagination
        this.currentPageCount = 0;
        this.hasMoreData = true;
        this.isLoading = false;

        // Reload with new filter
        this.setupFeedPromptsNew();
    }

    async setupFeed() {
        try {
            await this.setupFeedPromptsNew();

            // Mark the initial filter (site) as loaded
            this.filterCache[this.currentOwnerFilter].isLoaded = true;

            this.isSetupComplete = true;
            this.setupLazyLoading();

            return true;
        } catch (error) {
            return false;
        }
    }

    async setupFeedPromptsNew() {
        if (this.isLoading || !this.hasMoreData) {
            return;
        }

        this.isLoading = true;
        try {
            // Build query parameters based on owner filter
            const params = new URLSearchParams({
                limit: this.config.requestLimit,
                page: this.currentPageCount
            });

            // Always fetch all images (site view) - filtering is done client-side
            // Note: userId parameter is not added to ensure we always get the full dataset
            // Client-side filtering will handle showing user-specific vs all images

            const url = `${API_ENDPOINTS.FEED}?${params.toString()}`;
            const response = await fetch(url);
            const _results = await response.json();

            // check if we have more data
            if (_results.length === 0) {
                this.hasMoreData = false;
                this.cleanupLazyLoading();

                return;
            }

            // process results - new API returns array of image objects directly
            for (let i = 0;
                i < _results.length; i++) {
                // Only add image, not prompt (since each image has its own prompt)
                this.addImageToOutput(_results[i]);
            }

            this.currentPageCount++;
            this.updateLazyLoadingTarget();

            // force grid layout after adding images
            this.forceGridLayout();

            // clear image order cache when new images are added
            if (window.imageComponent && window.imageComponent.clearImageOrderCache) {
                window.imageComponent.clearImageOrderCache();
            }

            // Sync pagination state with filter cache
            this.syncPaginationState();
        } catch (error) {
            console.error('Feed fetch error:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // Helper methods for smart filtering system
    saveScrollPosition() {
        const promptOutput = document.querySelector(this.config.promptOutputSelector);

        if (promptOutput) {
            this.filterCache[this.currentOwnerFilter].scrollPosition = promptOutput.scrollTop;
        }
    }

    restoreScrollPosition(filter) {
        const promptOutput = document.querySelector(this.config.promptOutputSelector);

        if (promptOutput) {
            setTimeout(() => {
                promptOutput.scrollTop = this.filterCache[filter].scrollPosition;
            }, 100); // Small delay to ensure DOM is updated
        }
    }

    hideFilterImages(filter) {
        const promptOutput = document.querySelector(this.config.promptOutputSelector);

        if (!promptOutput) {
            console.warn('❌ FILTER: No prompt output container found');

            return;
        }

        // Hide all images that don't match the current filter
        const allImages = promptOutput.querySelectorAll('li[data-filter]');

        console.log(`🔧 FILTER: Hiding ${allImages.length} total images`);

        allImages.forEach(img => {
            img.style.display = 'none';
        });
    }

    showFilterImages(filter) {
        const promptOutput = document.querySelector(this.config.promptOutputSelector);

        if (!promptOutput) {
            console.warn('❌ FILTER: No prompt output container found');

            return;
        }

        const currentUser = this.getCurrentUserInfo();
        const allImages = promptOutput.querySelectorAll('li[data-user-id]');
        let shownCount = 0;

        allImages.forEach(img => {
            const imageUserId = img.getAttribute('data-user-id');
            let shouldShow = false;

            if (filter === 'site') {
                // Show all images for site filter
                shouldShow = true;
            } else if (filter === 'user') {
                // Show only current user's images
                shouldShow = currentUser && imageUserId === currentUser.id;
            }

            if (shouldShow) {
                img.style.display = '';
                shownCount++;
            } else {
                img.style.display = 'none';
            }
        });

        console.log(`🔧 FILTER: Showing ${shownCount} images for '${filter}' filter out of ${allImages.length} total`);

        // If user filter shows very few results, try loading more images
        if (filter === 'user' && shownCount < 10 && this.hasMoreData) {
            console.log('📥 FILTER: User filter shows few results, loading more images...');
            setTimeout(() => this.setupFeedPromptsNew(), 100);
        }
    }

    async loadFilterImages(filter) {
        if (filter === 'user') {
            // For user filter, we need to check if site data is available
            if (!this.filterCache['site'].isLoaded) {
                console.log('📥 FILTER: Loading all images first (required for user filtering)');
                // Load all images first
                await this.setupFeedPromptsNew();
                this.filterCache['site'].isLoaded = true;
            }

            // Now show user-filtered images
            console.log('🔧 FILTER: Applying client-side user filter');
            this.showFilterImages(filter);
            this.filterCache[filter].isLoaded = true;
        } else {
            // For site filter, load all images normally
            this.currentPageCount = this.filterCache[filter].currentPage;
            this.hasMoreData = this.filterCache[filter].hasMore;
            await this.setupFeedPromptsNew();
            this.filterCache[filter].isLoaded = true;
        }
    }

    syncPaginationState() {
        // Sync the current pagination state with the active filter cache
        this.filterCache[this.currentOwnerFilter].currentPage = this.currentPageCount;
        this.filterCache[this.currentOwnerFilter].hasMore = this.hasMoreData;
    }

    // Clear cache for a specific filter (useful for refreshing)
    clearFilterCache(filter) {
        if (this.filterCache[filter]) {
            this.filterCache[filter] = {
                images: [],
                currentPage: 0,
                hasMore: true,
                isLoaded: false,
                scrollPosition: 0
            };
        }
    }

    // Get current filter statistics for debugging
    getFilterStats() {
        return {
            currentFilter: this.currentOwnerFilter,
            cacheState: Object.keys(this.filterCache).reduce((stats, filter) => {
                const cache = this.filterCache[filter];

                stats[filter] = {
                    imageCount: cache.images.length,
                    currentPage: cache.currentPage,
                    hasMore: cache.hasMore,
                    isLoaded: cache.isLoaded
                };

                return stats;
            }, {})
        };
    }

    addPromptToOutput(_result) {
        if (!_result || !_result.prompt) {
            return;
        }

        const promptOutput = Utils.dom.get(FEED_CONFIG.promptOutputSelector);

        if (!promptOutput) {
            return;
        }

        const li = Utils.dom.createElement('li', '', _result.prompt);

        promptOutput.appendChild(li);
    }

    addImageToOutput(_result, isNewlyGenerated = false) {
        if (!_result || (!_result.imageUrl && !_result.image && !_result.imageName)) {
            return;
        }

        // try ImageComponent first
        if (this.tryImageComponent(_result, isNewlyGenerated)) {
            return;
        }

        // fallback to basic image
        this.createBasicImage(_result, isNewlyGenerated);
    }

    tryImageComponent(_result, isNewlyGenerated = false) {
        // ImageComponent should be available since it's loaded first
        if (!window.imageComponent) {
            console.warn('ImageComponent not available, using fallback');

            return false;
        }

        const imageData = this.createImageData(_result);
        const _container = this.getImageContainer();

        if (!_container) {
            return false;
        }

        const li = this.createImageListItem(_result);
        const wrapper = window.imageComponent.createImageWrapper(imageData);

        if (wrapper) {
            li.appendChild(wrapper);

            // Newly generated images go at the top, infinite scroll images go at the bottom
            if (isNewlyGenerated) {
                _container.insertBefore(li, _container.firstChild);
            } else {
                _container.appendChild(li);
            }

            return true;
        }

        console.error('Failed to create image wrapper for:', imageData);

        return false;
    }

    createBasicImage(_result, isNewlyGenerated = false) {
        const _container = this.getImageContainer();

        if (!_container) {
            return;
        }

        const li = this.createImageListItem(_result);
        const img = this.createImageElement(_result);

        li.appendChild(img);

        // Newly generated images go at the top, infinite scroll images go at the bottom
        if (isNewlyGenerated) {
            _container.insertBefore(li, _container.firstChild);
        } else {
            _container.appendChild(li);
        }
    }

    createImageData(_result) {
        const imageData = {
            id: _result.id || _result.imageId || 'unknown',
            url: _result.imageUrl || _result.image || _result.url || `uploads/${_result.imageName}`,
            title: _result.prompt || 'Image',
            prompt: _result.prompt || '',
            original: _result.original || '',
            provider: _result.provider || _result.providerName || '',
            guidance: _result.guidance || '',
            rating: _result.rating || ''
        };

        return imageData;
    }

    getImageContainer() {
        return Utils.dom.get(this.config.imagesSelector) || document.querySelector('.prompt-output');
    }

    createImageListItem(_result) {
        const li = Utils.dom.createElement('li', 'image-item');

        li.style.width = '100%';
        li.style.height = '150px';
        li.style.minHeight = '150px';
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.justifyContent = 'center';
        li.style.margin = '0';
        li.style.padding = '0';

        // Add data attributes for smart filtering
        if (_result) {
            // Determine if this is a user's image or site image
            const currentUser = this.getCurrentUserInfo();
            const isUserImage = currentUser && _result.userId === currentUser.id;
            const filterType = isUserImage ? 'user' : 'site';

            li.setAttribute('data-filter', filterType);
            li.setAttribute('data-user-id', _result.userId || 'unknown');
            li.setAttribute('data-image-id', _result.id || _result.imageId || 'unknown');

            // Debug logging (can be removed in production)
            if (!_result.userId) {
                console.warn(`⚠️ FILTER: Image ${_result.id || _result.imageId} missing userId field`);
            }

            // Cache this image in the appropriate filter
            this.filterCache[filterType].images.push(_result);
        }

        return li;
    }

    createImageElement(_result) {
        const img = Utils.dom.createElement('img');

        this.setupImageProperties(img, _result);
        this.addImageDataset(img, _result);
        // Click events now handled by event delegation in ImageComponent

        return img;
    }

    setupImageProperties(img, _result) {
        img.src = _result.imageUrl || _result.image || _result.url || `uploads/${_result.imageName}`;
        img.alt = _result.prompt || '';
        img.title = _result.prompt || '';
        img.style.width = '100%';
        img.style.height = '150px';
        img.style.objectFit = 'cover';
        img.style.cursor = 'pointer';

        // Add generated-image class for event delegation
        img.classList.add('generated-image');
    }

    addImageDataset(img, _result) {

        if (_result.id || _result.imageId) {
            img.dataset.id = _result.id || _result.imageId;
        }
        if (_result.prompt) {
            img.dataset.prompt = _result.prompt;
        }
        if (_result.original) {
            img.dataset.original = _result.original;
        }
        if (_result.provider || _result.providerName) {
            img.dataset.provider = _result.provider || _result.providerName;
        }
        if (_result.guidance) {
            img.dataset.guidance = _result.guidance;
        }
        if (_result.rating) {
            img.dataset.rating = _result.rating;
        }
    }

    handleImageClick(_result) {
        const imageData = this.createImageData(_result);

        // ensure image component is initialized
        this.ensureImageComponentInitialized();

        // try multiple ways to open fullscreen
        if (window.imageComponent && window.imageComponent.openFullscreen) {
            window.imageComponent.openFullscreen(imageData);
        } else if (window.imageComponent && window.imageComponent.openFullscreenGlobal) {
            window.imageComponent.openFullscreenGlobal(imageData);
        } else if (window.openFullscreenGlobal) {
            window.openFullscreenGlobal(imageData);
        } else {
            console.error('No fullscreen system available');
        }
    }

    ensureImageComponentInitialized() {
        // ImageComponent should already be available since it's loaded first
        if (window.imageComponent) {
            return; // already initialized
        }

        if (window.ImageComponent) {
            try {
                window.imageComponent = new window.ImageComponent();
                window.imageComponent.init();
            } catch (error) {
                console.error('Failed to initialize ImageComponent:', error);
            }
        } else {
            console.error('ImageComponent class not found - check script loading order');
        }
    }

    async loadMoreImages() {
        await this.setupFeedPromptsNew();
    }

    setupLazyLoading() {
        if (!this.config.lazyLoading.enabled) {
            console.warn('⚠️ Lazy loading is disabled in config');

            return;
        }

        this.intersectionObserver = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && this.hasMoreData && !this.isLoading) {
                        // Use the current filter's pagination state
                        const filterCache = this.filterCache[this.currentOwnerFilter];

                        if (filterCache.hasMore) {
                            this.setupFeedPromptsNew();
                        }
                    }
                });
            }, {
                threshold: this.config.lazyLoading.threshold,
                rootMargin: this.config.lazyLoading.rootMargin
            }
        );
        this.updateLazyLoadingTarget();
    }

    updateLazyLoadingTarget() {
        if (!this.intersectionObserver) {
            console.warn('⚠️ No intersection observer available for lazy loading target update');

            return;
        }

        // remove previous target
        if (this.lastImageElement) {
            this.intersectionObserver.unobserve(this.lastImageElement);
        }

        // find the last image element - ONLY from the grid, not fullscreen
        const gridImages = document.querySelectorAll('.prompt-output.image-wrapper img, .prompt-output li.image-item img');

        if (gridImages.length > 0) {
            this.lastImageElement = gridImages[gridImages.length - 1];
            this.intersectionObserver.observe(this.lastImageElement);
        } else {
            console.warn('⚠️ No grid images found for lazy loading target');
        }
    }

    cleanupLazyLoading() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }
        this.lastImageElement = null;
    }

    resetFeed() {
        this.currentPageCount = 0;
        this.hasMoreData = true;
        this.isLoading = false;
        this.cleanupLazyLoading();

        const promptOutput = Utils.dom.get(FEED_CONFIG.promptOutputSelector);

        if (promptOutput) {
            promptOutput.innerHTML = '';
        }

        // re-setup lazy loading after reset
        this.setupLazyLoading();

        // force grid layout after reset
        this.forceGridLayout();
    }

    // utility methods for external access
    getCurrentPageCount() {
        return this.currentPageCount;
    }

    isComplete() {
        return this.isSetupComplete;
    }

    setComplete(complete = true) {
        this.isSetupComplete = complete;
    }

    hasMoreImages() {
        return this.hasMoreData;
    }

    isLoadingImages() {
        return this.isLoading;
    }

    forceGridLayout() {
        const promptOutput = document.querySelector('.prompt-output');

        if (promptOutput) {
            // ensure grid view is applied
            promptOutput.classList.remove('river-view', 'list-view');
            promptOutput.classList.add('grid-view');

            // force grid display
            promptOutput.style.display = 'grid';
            promptOutput.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
            promptOutput.style.gridAutoRows = 'minmax(150px, auto)';
            promptOutput.style.gridGap = '5px';
            promptOutput.style.gridAutoFlow = 'dense';
            promptOutput.style.listStyle = 'none';

            // ensure all image items are properly styled
            const imageItems = promptOutput.querySelectorAll('li.image-item');

            imageItems.forEach(item => {
                item.style.display = 'flex';
                item.style.minHeight = '150px';
                item.style.margin = '0';
                item.style.padding = '0';
            });

            // hide text-only items
            const allListItems = promptOutput.querySelectorAll('li');

            allListItems.forEach(li => {
                if (!li.querySelector('.image-wrapper') && !li.classList.contains('image-item')) {
                    li.style.display = 'none';
                }
            });
        }
    }

    clearImageOrderCache() {
        if (window.imageComponent && window.imageComponent.clearImageOrderCache) {
            window.imageComponent.clearImageOrderCache();
        }
    }

    async refreshFeed() {
        // reset feed state
        this.currentPageCount = 0;
        this.hasMoreData = true;
        this.isLoading = false;

        // clear existing content
        const promptOutput = Utils.dom.get(FEED_CONFIG.promptOutputSelector);

        if (promptOutput) {
            promptOutput.innerHTML = '';
        }

        // clear image order cache
        this.clearImageOrderCache();

        // reload feed from beginning
        await this.setupFeedPromptsNew();

        // re-setup lazy loading
        this.setupLazyLoading();

        // force grid layout
        this.forceGridLayout();

    }

    getCurrentUserInfo() {
        // Try to get user info from auth component
        if (window.authComponent && window.authComponent.getUser) {
            const _user = window.authComponent.getUser();

            if (_user && _user.id) {
                return _user;
            }
        }

        // Fallback to localStorage
        const userData = localStorage.getItem('userData');

        if (userData) {
            try {
                const parsed = JSON.parse(userData);

                // Handle different response structures
                // TODO: Refactor nested ternary
                if (parsed.data?.user?.id) {
                    return parsed.data.user;
                } else if (parsed.user?.id) {
                    return parsed.user;
                } else if (parsed.id) {
                    return parsed;
                }
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }

        return null;
    }

    showLoginPrompt() {
        const promptOutput = document.querySelector(this.config.promptOutputSelector);

        if (promptOutput) {
            promptOutput.innerHTML = `
                <div class="flex flex-col items-center justify-center p-8 text-center">
                    <div class="text-gray-400 text-lg mb-4">
                        <i class="fas fa-lock text-2xl mb-2"></i>
                        <p>Please log in to view your images</p>
                    </div>
                    <div class="flex gap-4">
                        <a href="/login.html" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                            Login
                        </a>
                        <a href="/register.html" class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors">
                            Register
                        </a>
                    </div>
                </div>
            `;
        }
    }
}

// initialize Feed Manager
const feedManager = new FeedManager();

// export functions for global access (maintaining backward compatibility)
const setupFeed = async() => await feedManager.setupFeed();
const setupFeedPromptsNew = () => feedManager.setupFeedPromptsNew();

const refreshFeed = async() => await feedManager.refreshFeed();

// export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedManager;
}

// export for global access
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
