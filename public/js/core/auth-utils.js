// Authentication Utilities - Shared client-side authentication checks
class AuthUtils {
    constructor() {
        this.authState = null;
        this.listeners = [];
        this.init();
    }

    /**
     * Initialize authentication state monitoring
     */
    init() {
        // Check initial auth state
        this.checkAuthState();

        // Listen for auth state changes
        this.setupAuthListeners();

        // Periodically check auth state (in case token expires)
        setInterval(() => {
            this.checkAuthState();
        }, 30000); // Check every 30 seconds
    }

    /**
     * Check current authentication state
     * @returns {boolean} Whether user is authenticated
     */
    checkAuthState() {
        const wasAuthenticated = this.isAuthenticated();
        const isNowAuthenticated = this.getCurrentAuthState();

        if (wasAuthenticated !== isNowAuthenticated) {
            this.authState = isNowAuthenticated;
            this.notifyListeners(isNowAuthenticated);
        }

        return isNowAuthenticated;
    }

    /**
     * Get current authentication state
     * @returns {boolean} Whether user is currently authenticated
     */
    getCurrentAuthState() {
        // Check for auth token
        const token = this.getAuthToken();
        if (!token) {
            return false;
        }

        // Check if token is expired
        if (this.isTokenExpired(token)) {
            return false;
        }

        // Check if user system is available and authenticated
        if (window.userSystem && window.userSystem.isInitialized) {
            return window.userSystem.isAuthenticated();
        }

        // Fallback: if we have a valid token, assume authenticated
        return true;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} Whether user is authenticated
     */
    isAuthenticated() {
        if (this.authState !== null) {
            return this.authState;
        }
        return this.getCurrentAuthState();
    }

    /**
     * Get authentication token
     * @returns {string|null} Auth token or null
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    /**
     * Check if token is expired
     * @param {string} token - JWT token
     * @returns {boolean} Whether token is expired
     */
    isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            return payload.exp < currentTime;
        } catch (error) {
            console.warn('Error parsing token:', error);
            return true; // If we can't parse it, consider it expired
        }
    }

    /**
     * Setup authentication state listeners
     */
    setupAuthListeners() {
        // Listen for storage changes (login/logout in other tabs)
        window.addEventListener('storage', (e) => {
            if (e.key === 'authToken') {
                this.checkAuthState();
            }
        });

        // Listen for custom auth events
        window.addEventListener('authStateChanged', () => {
            this.checkAuthState();
        });

        // Listen for user system events
        if (window.userSystem) {
            window.userSystem.addEventListener?.('authStateChanged', () => {
                this.checkAuthState();
            });
        }
    }

    /**
     * Add authentication state change listener
     * @param {Function} callback - Callback function to call when auth state changes
     */
    addAuthListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Remove authentication state change listener
     * @param {Function} callback - Callback function to remove
     */
    removeAuthListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Notify all listeners of auth state change
     * @param {boolean} isAuthenticated - New authentication state
     */
    notifyListeners(isAuthenticated) {
        this.listeners.forEach(callback => {
            try {
                callback(isAuthenticated);
            } catch (error) {
                console.error('Error in auth listener:', error);
            }
        });

        // Also trigger global UI refresh
        this.refreshUI(isAuthenticated);
    }

    /**
     * Refresh UI elements based on authentication state
     * @param {boolean} isAuthenticated - Whether user is authenticated
     */
    refreshUI(isAuthenticated) {
        // Refresh rating buttons
        this.refreshRatingButtons(isAuthenticated);

        // Refresh public/private toggles
        this.refreshPublicToggles(isAuthenticated);
    }

    /**
     * Refresh rating buttons visibility
     * @param {boolean} isAuthenticated - Whether user is authenticated
     */
    refreshRatingButtons(isAuthenticated) {
        const ratingContainers = document.querySelectorAll('.rating-buttons');

        ratingContainers.forEach(container => {
            if (isAuthenticated) {
                // Show rating buttons
                const imageId = container.getAttribute('data-image-id');
                if (imageId && window.RatingButtons) {
                    const ratingButtons = new window.RatingButtons(imageId);
                    ratingButtons.showRatingButtons(container);
                }
            } else {
                // Hide rating buttons
                container.innerHTML = '';
            }
        });
    }

    /**
     * Refresh public/private toggles visibility
     * @param {boolean} isAuthenticated - Whether user is authenticated
     */
    refreshPublicToggles(isAuthenticated) {
        const publicToggles = document.querySelectorAll('.info-box-public-toggle');

        publicToggles.forEach(toggle => {
            if (isAuthenticated) {
                // Show toggle if user owns the image
                toggle.style.display = '';
            } else {
                // Hide toggle for non-authenticated users
                toggle.style.display = 'none';
            }
        });
    }

    /**
     * Get current user ID
     * @returns {string|null} Current user ID or null
     */
    getCurrentUserId() {
        // Try to get from user system first
        if (window.userSystem && window.userSystem.getCurrentUser) {
            const user = window.userSystem.getCurrentUser();
            return user?.id || user?._id;
        }

        // Fallback: try to get from token
        const token = this.getAuthToken();
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.userId || payload.id;
            } catch (error) {
                console.warn('Error getting user ID from token:', error);
            }
        }

        return null;
    }

    /**
     * Check if user owns a specific image
     * @param {Object} imageData - Image data object
     * @returns {boolean} Whether current user owns the image
     */
    userOwnsImage(imageData) {
        if (!this.isAuthenticated() || !imageData) {
            return false;
        }

        const currentUserId = this.getCurrentUserId();
        if (!currentUserId) {
            return false;
        }

        // SECURITY: Never assume ownership if userId is missing
        if (!imageData.userId) {
            console.warn('🔒 SECURITY: Image missing userId, denying ownership access for security');
            return false;
        }

        return imageData.userId === currentUserId;
    }
}

// Create global instance
window.AuthUtils = new AuthUtils();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthUtils;
}
