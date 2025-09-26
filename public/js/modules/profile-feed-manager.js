/**
 * Profile Feed Manager - Reuses existing feed system for user profiles
 * Filters the feed to show only a specific user's images while maintaining
 * all existing functionality (fullscreen, rating, navigation, view switching)
 */
class ProfileFeedManager {
    constructor(username) {
        this.username = username;
        this.isInitialized = false;
        this.isLoading = false;
        this.currentPage = 1;
        this.hasMore = true;
        this.images = [];

        // Reuse existing feed components
        this.domManager = null;
        this.uiManager = null;
        this.viewManager = null;
        this.apiManager = null;

        // Bind methods
        this.loadUserImages = this.loadUserImages.bind(this);
        this.handleLastImageVisible = this.handleLastImageVisible.bind(this);
    }

    /**
     * Initialize the profile feed manager
     */
    async init() {
        if (this.isInitialized) {
            return this;
        }

        // Initialize profile feed manager

        try {
            // Wait for existing feed components to be available
            await this.waitForFeedComponents();

            // Initialize sub-managers
            this.initializeSubManagers();

            // Setup the feed for profile viewing
            await this.setupProfileFeed();

            this.isInitialized = true;

        } catch (error) {
            console.error('❌ PROFILE FEED: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Wait for feed system to be available
     */
    async waitForFeedComponents() {
        return new Promise(resolve => {
            const checkComponents = () => {
                // Check if feed system components are available
                if (window.FeedAPIManager && window.FeedDOMManager && window.FeedUIManager && window.FeedViewManager) {
                    resolve();
                } else {
                    // If components don't exist, wait for them to be created
                    setTimeout(checkComponents, 100);
                }
            };

            checkComponents();
        });
    }

    /**
     * Initialize sub-managers using existing feed components
     */
    initializeSubManagers() {
        // Create instances of feed components
        this.apiManager = new FeedAPIManager();
        this.domManager = new FeedDOMManager();
        this.uiManager = new FeedUIManager();
        this.viewManager = new FeedViewManager();

        // Initialize the managers
        this.domManager.init();
        this.uiManager.init();
        this.viewManager.init();
    }

    /**
     * Setup profile feed
     */
    async setupProfileFeed() {
        // Clear existing content only on initial load
        if (this.currentPage === 1) {
            this.clearFeed();
        }

        // Load user's images
        await this.loadUserImages();

        // Setup view switching (reuse existing functionality)
        this.setupViewSwitching();

        // Setup infinite scroll
        this.setupInfiniteScroll();
    }

    /**
     * Load user's images using existing API manager with custom endpoint
     */
    async loadUserImages() {
        if (this.isLoading || !this.hasMore) {
            return;
        }

        this.isLoading = true;
        this.showLoading();

        try {
            // Use existing API manager with custom profile endpoint
            const customEndpoint = `/api/profile/${this.username}?page=${this.currentPage}&limit=20`;
            const response = await this.apiManager.loadFeedImages('profile', this.currentPage, [], customEndpoint);

            // Check if response has the expected structure
            if (response.success) {
                // Parse response structure

                // Try different response structures
                let user; let images; let pagination;

                if (response.data) {
                    // Server returns: { success: true, data: { user, images, pagination } }
                    ({ user, images, pagination } = response.data);
                } else if (response.user || response.images) {
                    // Direct response structure
                    user = response.user;
                    images = response.images;
                    pagination = response.pagination;
                } else {
                    console.error('❌ PROFILE FEED: Unknown response structure:', response);
                    this.showError('Invalid API response structure');

                    return;
                }

                // Update profile header with user info (if available)
                if (user) {
                    this.updateProfileHeader(user);
                } else {
                    // Fallback: use username from URL
                    this.updateProfileHeader({
                        username: this.username,
                        createdAt: new Date().toISOString(),
                        picture: null
                    });
                }

                // Add images to feed using existing DOM manager
                if (images && images.length > 0) {
                    images.forEach(image => {
                        // Add username to image data for profile pages
                        const imageWithUsername = {
                            ...image,
                            username: user?.username || this.username
                        };

                        this.domManager.addImageToFeed(imageWithUsername, 'profile');
                    });
                }

                // Update pagination state
                if (pagination) {
                    this.hasMore = pagination.hasMore;
                    this.currentPage++;

                    // Update UI stats
                    this.updateProfileStats(pagination);
                }

                // Show image container after successful load
                this.showImageContainer();

            } else {
                this.showNoImagesMessage();
            }

        } catch (error) {
            console.error('❌ PROFILE FEED: Error loading user images:', error);

            // Show appropriate error message
            if (error.message.includes('404')) {
                this.showUserNotFound();
            } else {
                this.showError('Failed to load profile images');
            }
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    /**
     * Setup view switching (standalone implementation)
     */
    setupViewSwitching() {
        // Find view switch elements
        const viewRadios = document.querySelectorAll('input[name="view"]');

        viewRadios.forEach(radio => {
            radio.addEventListener('change', e => {
                if (e.target.checked) {
                    const view = e.target.value;

                    this.switchView(view);
                }
            });
        });
    }

    /**
     * Switch view (reuse existing view manager)
     */
    switchView(view) {
        if (this.viewManager) {
            this.viewManager.switchView(view);
        }
    }

    /**
     * Setup infinite scroll using existing feed system
     */
    setupInfiniteScroll() {
        // Use the existing feed system's infinite scroll
        if (window.profileFeedSystem && window.profileFeedSystem.fillToBottomManager) {
            // The existing fillToBottomManager will handle infinite scroll
            console.log('✅ PROFILE FEED: Using existing infinite scroll system');
        } else {
            // Fallback to custom event listener
            window.addEventListener('lastImageVisible', this.handleLastImageVisible.bind(this));
        }
    }

    /**
     * Handle last image visible (infinite scroll fallback)
     */
    handleLastImageVisible() {
        if (this.hasMore && !this.isLoading) {
            this.loadUserImages();
        }
    }

    /**
     * Clear feed content
     */
    clearFeed() {
        const container = document.getElementById('image-container-main');

        if (container) {
            container.innerHTML = '';
        }
    }

    /**
     * Show image container after successful load
     */
    showImageContainer() {
        const container = document.getElementById('image-container-main');

        if (container) {
            container.classList.remove('hidden');
            console.log('✅ PROFILE FEED: Image container shown');
        } else {
            console.error('❌ PROFILE FEED: Image container not found');
        }
    }

    /**
     * Add image to feed using existing DOM manager
     */
    addImageToFeed(imageData, context = 'profile') {
        if (this.domManager && this.domManager.addImageToFeed) {
            this.domManager.addImageToFeed(imageData, context);
        } else {
            console.error('❌ PROFILE FEED: DOM manager not available');
        }
    }


    /**
     * Show loading state
     */
    showLoading() {
        const loadingElement = document.getElementById('profile-loading');

        if (loadingElement) {
            loadingElement.classList.remove('hidden');
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loadingElement = document.getElementById('profile-loading');

        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
    }

    /**
     * Show no images message
     */
    showNoImagesMessage() {
        const container = document.getElementById('image-container-main');

        if (container) {
            container.innerHTML = `
                <div class="w-full text-center py-12">
                    <i class="fas fa-image text-6xl text-gray-600 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-400 mb-2">No Public Images</h3>
                    <p class="text-gray-500">This user hasn't shared any public images yet.</p>
                </div>
            `;
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const container = document.getElementById('image-container-main');

        if (container) {
            container.innerHTML = `
                <div class="w-full text-center py-12">
                    <i class="fas fa-exclamation-triangle text-6xl text-red-500 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-400 mb-2">Error</h3>
                    <p class="text-gray-500 mb-4">${message}</p>
                    <button onclick="location.reload()" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">Retry</button>
                </div>
            `;
        }
    }

    /**
     * Show user not found message
     */
    showUserNotFound() {
        const container = document.getElementById('image-container-main');

        if (container) {
            container.innerHTML = `
                <div class="w-full text-center py-12">
                    <i class="fas fa-user-slash text-6xl text-gray-600 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-400 mb-2">User Not Found</h3>
                    <p class="text-gray-500 mb-4">The user "${this.username}" does not exist.</p>
                    <a href="/" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">Go Home</a>
                </div>
            `;
        }
    }

    /**
     * Update profile header with user info
     */
    updateProfileHeader(user) {
        const usernameElement = document.getElementById('profile-username');
        const joinedElement = document.getElementById('profile-joined');
        const avatarElement = document.getElementById('profile-avatar');

        if (usernameElement) {
            usernameElement.textContent = user.username || 'Unknown User';
        }

        if (joinedElement) {
            const joinedDate = new Date(user.createdAt);

            joinedElement.textContent = `Joined ${joinedDate.toLocaleDateString()}`;
        }

        if (avatarElement && user.picture) {
            avatarElement.innerHTML = `<img src="${user.picture}" alt="${user.username}" class="w-16 h-16 rounded-full object-cover">`;
        }
    }

    /**
     * Update profile stats
     */
    updateProfileStats(pagination) {
        const imageCountElement = document.getElementById('image-count');
        const memberSinceElement = document.getElementById('member-since');
        const currentPageElement = document.getElementById('current-page');
        const totalPagesElement = document.getElementById('total-pages');

        if (imageCountElement) {
            imageCountElement.textContent = pagination.totalCount || 0;
        }

        if (memberSinceElement) {
            // Calculate days since joined
            const joinedDate = new Date(pagination.joinedAt || Date.now());
            const now = new Date();
            const diffTime = Math.abs(now - joinedDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            memberSinceElement.textContent = `${diffDays} days ago`;
        }

        if (currentPageElement) {
            currentPageElement.textContent = pagination.page || 1;
        }

        if (totalPagesElement) {
            totalPagesElement.textContent = pagination.totalPages || 1;
        }
    }

    /**
     * Get current username
     */
    getUsername() {
        return this.username;
    }

    /**
     * Get current page
     */
    getCurrentPage() {
        return this.currentPage;
    }

    /**
     * Check if loading
     */
    isLoading() {
        return this.isLoading;
    }

    /**
     * Check if has more images
     */
    hasMoreImages() {
        return this.hasMore;
    }

    /**
     * Cleanup
     */
    cleanup() {
        // Remove event listeners
        window.removeEventListener('lastImageVisible', this.handleLastImageVisible);

        // Clear feed content
        this.clearFeed();

        this.isInitialized = false;
    }
}

// Export for global access
window.ProfileFeedManager = ProfileFeedManager;
