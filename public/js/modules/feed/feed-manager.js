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
            button.addEventListener('change', (e) => {
                this.currentOwnerFilter = e.target.value;
                this.resetAndReload();
            });
        });

        // Set default selection
        const siteButton = document.querySelector('input[name="owner"][value="site"]');
        if (siteButton) {
            siteButton.checked = true;
        }

        // Listen for authentication state changes
        window.addEventListener('authStateChanged', (event) => {
            const user = event.detail;
            if (!user && this.currentOwnerFilter === 'user') {
                // User logged out while viewing "Mine" filter, switch to "Site"
                console.log('🔧 User logged out, switching to site filter');
                this.currentOwnerFilter = 'site';
                const siteButton = document.querySelector('input[name="owner"][value="site"]');
                if (siteButton) {
                    siteButton.checked = true;
                }
                this.resetAndReload();
            }
        });
    }

    resetAndReload() {
        // Clear current images
        const promptOutput = document.querySelector(this.config.promptOutputSelector);
        if (promptOutput) {
            promptOutput.innerHTML = '';
        }

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

            // Add owner filter
            if (this.currentOwnerFilter === 'user') {
                // For user filter, we need to get the current user ID
                const userInfo = this.getCurrentUserInfo();
                if (userInfo && userInfo.id) {
                    params.append('userId', userInfo.id);
                } else {
                    // If no user logged in, show empty state with login prompt
                    console.log('No user logged in for user filter');
                    this.showLoginPrompt();
                    this.hasMoreData = false;
                    return;
                }
            }
            // For 'site' filter, don't add userId parameter (shows all public images)

            const url = `${API_ENDPOINTS.FEED}?${params.toString()}`;
            console.log('🔧 Loading feed with owner filter:', this.currentOwnerFilter, 'URL:', url);

            const response = await fetch(url);
            const results = await response.json();

            // check if we have more data
            if (results.length === 0) {
                this.hasMoreData = false;
                this.cleanupLazyLoading();

                return;
            }

            // process results - new API returns array of image objects directly
            for (let i = 0; i < results.length; i++) {
                // Only add image, not prompt (since each image has its own prompt)
                this.addImageToOutput(results[i]);
            }

            this.currentPageCount++;
            this.updateLazyLoadingTarget();

            // force grid layout after adding images
            this.forceGridLayout();

            // clear image order cache when new images are added
            if (window.imageComponent && window.imageComponent.clearImageOrderCache) {
                window.imageComponent.clearImageOrderCache();
            }
        } catch (error) {
            console.error('Feed fetch error:', error);
        } finally {
            this.isLoading = false;
        }
    }

    addPromptToOutput(result) {
        if (!result || !result.prompt) {
            return;
        }

        const promptOutput = Utils.dom.get(FEED_CONFIG.promptOutputSelector);

        if (!promptOutput) {
            return;
        }

        const li = Utils.dom.createElement('li', '', result.prompt);

        promptOutput.appendChild(li);
    }

    addImageToOutput(result, isNewlyGenerated = false) {
        if (!result || (!result.imageUrl && !result.image && !result.imageName)) {
            return;
        }

        // try ImageComponent first
        if (this.tryImageComponent(result, isNewlyGenerated)) {
            return;
        }

        // fallback to basic image
        this.createBasicImage(result, isNewlyGenerated);
    }

    tryImageComponent(result, isNewlyGenerated = false) {
        // ImageComponent should be available since it's loaded first
        if (!window.imageComponent) {
            console.warn('ImageComponent not available, using fallback');

            return false;
        }

        const imageData = this.createImageData(result);
        const container = this.getImageContainer();

        if (!container) {
            return false;
        }

        const li = this.createImageListItem();
        const wrapper = window.imageComponent.createImageWrapper(imageData);

        if (wrapper) {
            li.appendChild(wrapper);

            // Newly generated images go at the top, infinite scroll images go at the bottom
            if (isNewlyGenerated) {
                container.insertBefore(li, container.firstChild);
            } else {
                container.appendChild(li);
            }

            return true;
        }

        console.error('Failed to create image wrapper for:', imageData);

        return false;
    }


    createBasicImage(result, isNewlyGenerated = false) {
        const container = this.getImageContainer();

        if (!container) {
            return;
        }

        const li = this.createImageListItem();
        const img = this.createImageElement(result);

        li.appendChild(img);

        // Newly generated images go at the top, infinite scroll images go at the bottom
        if (isNewlyGenerated) {
            container.insertBefore(li, container.firstChild);
        } else {
            container.appendChild(li);
        }
    }

    createImageData(result) {
        const imageData = {
            id: result.id || result.imageId || 'unknown',
            url: result.imageUrl || result.image || result.url || `uploads/${result.imageName}`,
            title: result.prompt || 'Image',
            prompt: result.prompt || '',
            original: result.original || '',
            provider: result.provider || result.providerName || '',
            guidance: result.guidance || '',
            rating: result.rating || ''
        };

        return imageData;
    }

    getImageContainer() {
        return Utils.dom.get(this.config.imagesSelector) || document.querySelector('.prompt-output');
    }

    createImageListItem() {
        const li = Utils.dom.createElement('li', 'image-item');

        li.style.width = '100%';
        li.style.height = '150px';
        li.style.minHeight = '150px';
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.justifyContent = 'center';
        li.style.margin = '0';
        li.style.padding = '0';

        return li;
    }

    createImageElement(result) {
        const img = Utils.dom.createElement('img');

        this.setupImageProperties(img, result);
        this.addImageDataset(img, result);
        // Click events now handled by event delegation in ImageComponent

        return img;
    }

    setupImageProperties(img, result) {
        img.src = result.imageUrl || result.image || result.url || `uploads/${result.imageName}`;
        img.alt = result.prompt || '';
        img.title = result.prompt || '';
        img.style.width = '100%';
        img.style.height = '150px';
        img.style.objectFit = 'cover';
        img.style.cursor = 'pointer';

        // Add generated-image class for event delegation
        img.classList.add('generated-image');
    }

    addImageDataset(img, result) {

        if (result.id || result.imageId) {
            img.dataset.id = result.id || result.imageId;
        }
        if (result.prompt) {
            img.dataset.prompt = result.prompt;
        }
        if (result.original) {
            img.dataset.original = result.original;
        }
        if (result.provider || result.providerName) {
            img.dataset.provider = result.provider || result.providerName;
        }
        if (result.guidance) {
            img.dataset.guidance = result.guidance;
        }
        if (result.rating) {
            img.dataset.rating = result.rating;
        }
    }

    handleImageClick(result) {
        const imageData = this.createImageData(result);

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
                        this.setupFeedPromptsNew();
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
        const gridImages = document.querySelectorAll('.prompt-output .image-wrapper img, .prompt-output li.image-item img');

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
            const user = window.authComponent.getUser();
            if (user && user.id) {
                return user;
            }
        }

        // Fallback to localStorage
        const userData = localStorage.getItem('userData');
        if (userData) {
            try {
                const parsed = JSON.parse(userData);
                // Handle different response structures
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
}
