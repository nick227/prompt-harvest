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
                if (window.FeedManager && window.ProfileFeedManager) {
                    resolve();
                } else {
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
        try {
            console.log('🔍 PROFILE FEED: Available window objects:', {
                FeedManager: !!window.FeedManager,
                feedManager: !!window.feedManager
            });

            // Use the existing FeedManager instance
            this.feedManager = window.feedManager || new window.FeedManager();

            // Initialize the feed manager if needed BUT DON'T load initial feed
            if (this.feedManager && !this.feedManager.isInitialized) {
                // Initialize sub-managers but don't call init() which loads initial feed
                this.feedManager.initializeSubManagers();
                this.feedManager.setupEventListeners();
                this.feedManager.isInitialized = true;
            }

        } catch (error) {
            console.error('❌ PROFILE FEED: Failed to initialize feed manager:', error);
            throw error;
        }
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
            // Use direct API call - simpler and more reliable
            const responseData = await this.fetchProfileData();

            if (responseData.success) {
                await this.processProfileResponse(responseData);
            } else {
                this.showError('Failed to load profile data');
            }

        } catch (error) {
            this.handleLoadError(error);
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    /**
     * Fetch profile data from API
     */
    async fetchProfileData() {
        const customEndpoint = `/api/profile/${this.username}?page=${this.currentPage}&limit=20`;

        const response = await fetch(customEndpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`❌ PROFILE FEED: API request failed: ${response.status} ${response.statusText}`);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();


        // DEBUG: Log the isPublic values in the API response
        if (data.data && data.data.images) {
            console.log('🔍 DEBUG: isPublic values in API response:', data.data.images.map(img => ({
                id: img.id,
                isPublic: img.isPublic,
                prompt: `${img.prompt?.substring(0, 30)}...`
            })));
        }

        return data;
    }

    /**
     * Process profile API response
     */
    async processProfileResponse(responseData) {

        const { user, images, pagination } = this.parseResponseData(responseData);

        // SECURITY: Validate that all images are public
        const validatedImages = this.validateImagesArePublic(images);

        console.log('🔍 PROFILE FEED: Parsed data:', {
            hasUser: !!user,
            userUsername: user?.username,
            originalImageCount: images?.length || 0,
            validatedImageCount: validatedImages?.length || 0,
            hasPagination: !!pagination
        });

        // Update profile header
        const userToDisplay = user || this.createFallbackUser();

        this.updateProfileHeader(userToDisplay);

        // Handle images - use validated images only
        if (validatedImages && validatedImages.length > 0) {
            this.addImagesToFeed(validatedImages, user);
            this.showImageContainer();
        } else {
            this.showNoImagesMessage();
        }

        // Update pagination
        if (pagination) {
            this.updatePaginationState(pagination);
        }
    }

    /**
     * Parse response data structure
     */
    parseResponseData(responseData) {
        if (responseData.data) {
            return responseData.data;
        }

        if (responseData.user || responseData.images) {
            return {
                user: responseData.user,
                images: responseData.images,
                pagination: responseData.pagination
            };
        }

        console.error('❌ PROFILE FEED: Unknown response structure:', responseData);
        throw new Error('Invalid API response structure');
    }

    /**
     * Create fallback user data
     */
    createFallbackUser() {
        return {
            username: this.username,
            createdAt: new Date().toISOString(),
            picture: null
        };
    }

    /**
     * SECURITY: Validate that all images are public
     * This is a critical security check to prevent private images from being displayed
     */
    validateImagesArePublic(images) {
        if (!images || !Array.isArray(images)) {

            return images;
        }

        const privateImages = images.filter(image => image.isPublic === false || image.isPublic === undefined);

        if (privateImages.length > 0) {
            console.error('🚨 PROFILE SECURITY VIOLATION: Private images detected!', {
                privateImageCount: privateImages.length,
                privateImageIds: privateImages.map(img => img.id),
                totalImages: images.length
            });

            // Remove private images from the array
            const publicImages = images.filter(image => image.isPublic === true);

            console.log('🔒 PROFILE SECURITY: Removed private images, keeping only public ones:', {
                originalCount: images.length,
                publicCount: publicImages.length,
                removedCount: privateImages.length
            });

            // Return only public images
            return publicImages;
        }
        // User viewing own profile - return all images

        // Additional security check: Log image visibility status
        const publicImageCount = images.filter(img => img.isPublic === true).length;

        console.log('🔒 PROFILE SECURITY: Image visibility check:', {
            totalImages: images.length,
            confirmedPublic: publicImageCount,
            unknownStatus: images.length - publicImageCount
        });

        return images;
    }

    /**
     * Add images to feed using shared interface
     */
    addImagesToFeed(images, user) {

        // SECURITY: Final validation before displaying images
        this.validateImagesBeforeDisplay(images);

        // SECURITY: Ensure we're only adding public images to profile feed
        const publicImages = images.filter(image => image.isPublic === true);

        if (publicImages.length !== images.length) {
            console.error(`🚨 PROFILE SECURITY: Filtered out ${images.length - publicImages.length} private images before adding to feed`);
        }

        if (this.feedManager && this.feedManager.addImageToFeed) {
            publicImages.forEach(image => {
                const imageWithUsername = {
                    ...image,
                    username: user?.username || this.username
                };

                // Use 'site' filter to ensure public-only display
                this.feedManager.addImageToFeed(imageWithUsername, 'site');
            });
        } else {
            this.addImagesDirectlyToDOM(publicImages, user);
        }
    }

    /**
     * SECURITY: Validate images before display
     */
    validateImagesBeforeDisplay(images) {
        if (!images || !Array.isArray(images)) {
            return;
        }

        const privateImages = images.filter(img => img.isPublic !== true);

        if (privateImages.length > 0) {
            console.error('🚨 PROFILE SECURITY: Attempting to display private images!', {
                privateImageIds: privateImages.map(img => img.id)
            });
        }

        console.log('🔒 PROFILE SECURITY: Pre-display validation:', {
            totalImages: images.length,
            publicImages: images.filter(img => img.isPublic === true).length,
            privateImages: privateImages.length
        });
    }

    /**
     * Add images directly to DOM (fallback when FeedManager not available)
     */
    addImagesDirectlyToDOM(images, user) {
        const container = document.getElementById('image-container-main');

        if (!container) {
            console.error('❌ PROFILE FEED: Image container not found');

            return;
        }

        images.forEach(image => {
            // SECURITY: Only add public images to DOM
            if (image.isPublic === true) {
                const imageElement = this.createImageElement(image, user);

                container.appendChild(imageElement);
            } else {
                console.error(`🚨 PROFILE SECURITY: Blocked private image ${image.id} from DOM insertion`);
            }
        });
    }

    /**
     * Create image element for direct DOM insertion
     */
    createImageElement(image, _user) {
        const div = document.createElement('div');

        div.className = 'image-wrapper bg-gray-700 rounded-lg overflow-hidden cursor-pointer';
        div.style.width = '200px';
        div.style.height = '200px';
        div.dataset.imageId = image.id;

        const img = document.createElement('img');

        img.src = image.imageUrl;
        img.alt = image.prompt || 'Generated image';
        img.className = 'w-full h-full object-cover';
        img.loading = 'lazy';

        // Add click handler for fullscreen
        div.addEventListener('click', () => {
            this.openImageFullscreen(image);
        });

        div.appendChild(img);

        return div;
    }

    /**
     * Open image in fullscreen (simple implementation)
     */
    openImageFullscreen(image) {
        // Simple fullscreen implementation
        const overlay = document.createElement('div');

        overlay.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4';
        overlay.innerHTML = `
            <div class="relative max-w-4xl max-h-full">
                <img src="${image.imageUrl}" alt="${image.prompt || 'Generated image'}"
                     class="max-w-full max-h-full object-contain rounded-lg">
                <button onclick="this.parentElement.parentElement.remove()"
                        class="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full
                               hover:bg-opacity-70 transition-colors">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        // Close on escape key
        const handleEscape = e => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };

        document.addEventListener('keydown', handleEscape);
    }

    /**
     * Update pagination state
     */
    updatePaginationState(pagination) {
        this.hasMore = pagination.hasMore;
        this.currentPage++;
        this.updateProfileStats(pagination);
    }

    /**
     * Handle loading errors
     */
    handleLoadError(error) {
        console.error('❌ PROFILE FEED: Error loading user images:', error);

        if (error.message.includes('404')) {
            this.showUserNotFound();
        } else {
            this.showError('Failed to load profile images');
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
        } else {
            console.warn('⚠️ PROFILE FEED: Loading element not found');
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loadingElement = document.getElementById('profile-loading');

        if (loadingElement) {
            loadingElement.classList.add('hidden');
        } else {
            console.warn('⚠️ PROFILE FEED: Loading element not found');
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
                    <button onclick="location.reload()"
                            class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                        Retry
                    </button>
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
                    <a href="/" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                        Go Home
                    </a>
                </div>
            `;
        }
    }

    /**
     * Update profile header with user info
     */
    updateProfileHeader(user) {

        this.updateUsernameElement(user);
        this.updateJoinedElement(user);
        this.updateAvatarElement(user);
        this.updateMemberSinceElement(user);
    }

    updateUsernameElement(user) {
        const usernameElement = document.getElementById('profile-username');

        if (usernameElement) {
            const username = user.username || 'Unknown User';

            usernameElement.textContent = username;
        } else {
            console.error('❌ PROFILE FEED: Username element not found');
        }
    }

    updateJoinedElement(user) {
        const joinedElement = document.getElementById('profile-joined');

        if (joinedElement) {
            const joinedDate = new Date(user.createdAt);
            const joinedText = `Joined ${joinedDate.toLocaleDateString()}`;

            joinedElement.textContent = joinedText;
        } else {
            console.error('❌ PROFILE FEED: Joined element not found');
        }
    }

    updateAvatarElement(user) {
        const avatarElement = document.getElementById('profile-avatar');

        if (avatarElement && user.picture) {
            avatarElement.innerHTML =
                `<img src="${user.picture}" alt="${user.username}" class="w-16 h-16 rounded-full object-cover">`;
        } else if (avatarElement) {
            // Avatar element exists but no picture - leave default avatar
        } else {
            console.error('❌ PROFILE FEED: Avatar element not found');
        }
    }

    updateMemberSinceElement(user) {
        const memberSinceElement = document.getElementById('member-since');

        if (memberSinceElement && user.createdAt) {
            const joinedDate = new Date(user.createdAt);
            const now = new Date();
            const diffTime = Math.abs(now - joinedDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            memberSinceElement.textContent = `${diffDays} days ago`;
        } else if (memberSinceElement) {
            // Element exists but no created date - leave empty
        } else {
            console.error('❌ PROFILE FEED: Member since element not found');
        }
    }

    /**
     * Update profile stats
     */
    updateProfileStats(pagination) {
        const imageCountElement = document.getElementById('image-count');
        const memberSinceElement = document.getElementById('member-since');

        if (imageCountElement && pagination) {
            imageCountElement.textContent = pagination.totalCount || 0;
        }

        if (memberSinceElement) {
            // Calculate days since joined
            const joinedDate = new Date(pagination?.joinedAt || Date.now());
            const now = new Date();
            const diffTime = Math.abs(now - joinedDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            memberSinceElement.textContent = `${diffDays} days ago`;
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
