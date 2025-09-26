/**
 * Profile Router - Client-side routing for user profiles
 * Handles URL parsing and profile data loading for /u/username routes
 */
class ProfileRouter {
    constructor() {
        this.currentUsername = null;
        this.currentPage = 1;
        this.isLoading = false;

        this.init();
    }

    init() {
        // Extract username from URL path
        this.extractUsernameFromURL();

        // Handle browser back/forward navigation
        window.addEventListener('popstate', () => {
            this.extractUsernameFromURL();
            this.loadProfileData();
        });

        // Handle back to home button
        const backButton = document.getElementById('back-to-home');
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location.href = '/';
            });
        }
    }

    /**
     * Extract username from current URL
     */
    extractUsernameFromURL() {
        const path = window.location.pathname;
        const match = path.match(/^\/u\/([^\/]+)/);

        if (match && match[1]) {
            this.currentUsername = decodeURIComponent(match[1]);
            this.updatePageTitle();
        } else {
            this.currentUsername = null;
        }
    }

    /**
     * Update page title with username
     */
    updatePageTitle() {
        const titleElement = document.getElementById('profile-title');
        if (titleElement && this.currentUsername) {
            titleElement.textContent = `${this.currentUsername} - AutoImage`;
        }
    }

    /**
     * Load profile data for current username
     */
    async loadProfileData(page = 1) {
        if (!this.currentUsername || this.isLoading) {
            return;
        }

        this.isLoading = true;
        this.currentPage = page;

        this.showLoadingState();

        try {
            // Wait for feed system to be available
            await this.waitForFeedSystem();

            // Initialize profile feed manager
            if (!window.profileFeedManagerInstance) {
                window.profileFeedManagerInstance = new ProfileFeedManager(this.currentUsername);
                await window.profileFeedManagerInstance.init();
            }

            // Load user's images using the feed system
            await window.profileFeedManagerInstance.loadUserImages();

        } catch (error) {
            console.error('Profile Router: Error loading profile data:', error);
            this.showError('Failed to load profile. Please try again.');
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    }

    /**
     * Wait for profile feed components to be available
     */
    async waitForFeedSystem() {
        return new Promise((resolve) => {
        const checkFeedSystem = () => {
            if (window.ProfileFeedManager && window.FeedDOMManager && window.FeedUIManager && window.FeedViewManager) {
                resolve();
            } else {
                setTimeout(checkFeedSystem, 100);
            }
        };
            checkFeedSystem();
        });
    }

    /**
     * Display profile data (now handled by ProfileFeedManager)
     */
    displayProfileData(data) {
        // This method is now handled by the ProfileFeedManager
        // which reuses the existing feed system
        console.log('Profile data display handled by ProfileFeedManager');
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const loadingElement = document.getElementById('profile-loading');
        if (loadingElement) {
            loadingElement.classList.remove('hidden');
        }
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        const loadingElement = document.getElementById('profile-loading');
        if (loadingElement) {
            loadingElement.classList.add('hidden');
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
                    <p class="text-gray-500 mb-4">The user "${this.currentUsername}" does not exist.</p>
                    <a href="/" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">Go Home</a>
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
     * Get current username
     */
    getCurrentUsername() {
        return this.currentUsername;
    }

    /**
     * Get current page
     */
    getCurrentPage() {
        return this.currentPage;
    }
}

// Initialize profile router when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for feed components to be available
    await new Promise(resolve => {
        const checkComponents = () => {
            if (window.FeedAPIManager && window.FeedDOMManager && window.FeedUIManager && window.FeedViewManager && window.ProfileFeedManager) {
                resolve();
            } else {
                setTimeout(checkComponents, 100);
            }
        };
        checkComponents();
    });

    window.profileRouter = new ProfileRouter();

    // Load initial profile data
    if (window.profileRouter.getCurrentUsername()) {
        window.profileRouter.loadProfileData();
    }
});

// Export for global access
window.ProfileRouter = ProfileRouter;
