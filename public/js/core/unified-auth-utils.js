/**
 * Unified Authentication Utilities
 * Centralized interface for all frontend authentication and authorization checks
 *
 * This class consolidates all scattered auth checks into a single, consistent interface
 * for better maintainability and consistency across the application.
 */
class UnifiedAuthUtils {
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
            // Only check if page is visible to avoid unnecessary requests
            if (!document.hidden) {
                this.checkAuthState();
            }
        }, 60000); // Check every 60 seconds (reduced frequency)
    }

    // ============================================================================
    // CORE AUTHENTICATION METHODS
    // ============================================================================

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
     * Get current user ID
     * @returns {string|null} Current user ID or null
     */
    getCurrentUserId() {
        // Try multiple sources in order of reliability
        const sources = [
            () => this.getUserIdFromUserSystem(),
            () => this.getUserIdFromUserApi(),
            () => this.getUserIdFromToken(),
            () => this.getUserIdFromLocalStorage()
        ];

        for (const source of sources) {
            try {
                const userId = source();
                if (userId) {
                    return userId;
                }
            } catch (error) {
                console.warn('Error getting user ID from source:', error);
            }
        }

        return null;
    }

    /**
     * Get current user object
     * @returns {Object|null} Current user object or null
     */
    getCurrentUser() {
        // Try user system first
        if (window.userSystem && window.userSystem.getCurrentUser) {
            return window.userSystem.getCurrentUser();
        }

        // Fallback to userApi
        if (window.userApi && window.userApi.getCurrentUser) {
            return window.userApi.getCurrentUser();
        }

        return null;
    }

    /**
     * Get authentication token
     * @returns {string|null} Auth token or null
     */
    getAuthToken() {
        return window.AdminAuthUtils?.getAuthToken() || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    // ============================================================================
    // AUTHORIZATION METHODS
    // ============================================================================

    /**
     * Check if current user owns a specific image
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
        // This prevents unauthorized access to images with missing ownership data
        if (!imageData.userId) {
            console.warn('🔒 SECURITY: Image missing userId, denying ownership access for security');
            return false;
        }

        return imageData.userId === currentUserId;
    }

    /**
     * Check if user can modify a specific image
     * @param {Object} imageData - Image data object
     * @returns {boolean} Whether user can modify the image
     */
    canUserModifyImage(imageData) {
        return this.userOwnsImage(imageData);
    }

    /**
     * Check if user should see public toggle for an image
     * @param {Object} imageData - Image data object
     * @returns {boolean} Whether to show public toggle
     */
    shouldShowPublicToggle(imageData) {
        return this.userOwnsImage(imageData);
    }

    /**
     * Check if user can rate an image
     * @param {Object} imageData - Image data object
     * @returns {boolean} Whether user can rate the image
     */
    canUserRateImage(imageData) {
        if (!this.isAuthenticated() || !imageData) {
            return false;
        }

        // Users can rate public images or their own private images
        return imageData.isPublic || this.userOwnsImage(imageData);
    }

    /**
     * Check if user can access user filter
     * @returns {boolean} Whether user can access user filter
     */
    canAccessUserFilter() {
        return this.isAuthenticated();
    }

    /**
     * Check if user can access admin features
     * @returns {boolean} Whether user can access admin features
     */
    canAccessAdmin() {
        if (!this.isAuthenticated()) {
            return false;
        }

        const user = this.getCurrentUser();
        return user && (user.role === 'admin' || user.isAdmin === true);
    }

    // ============================================================================
    // AUTH STATE MANAGEMENT
    // ============================================================================

    /**
     * Check current authentication state
     * @returns {boolean} Whether user is authenticated
     */
    checkAuthState() {
        const wasAuthenticated = this.authState;
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

        // Check if userApi is available and authenticated
        if (window.userApi && window.userApi.isAuthenticated) {
            return window.userApi.isAuthenticated();
        }

        // Fallback: if we have a valid token, assume authenticated
        return true;
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

    // ============================================================================
    // EVENT SYSTEM
    // ============================================================================

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

    // ============================================================================
    // UI REFRESH METHODS
    // ============================================================================

    /**
     * Refresh UI elements based on authentication state
     * @param {boolean} isAuthenticated - Whether user is authenticated
     */
    refreshUI(isAuthenticated) {
        // Refresh rating buttons
        this.refreshRatingButtons(isAuthenticated);

        // Refresh public/private toggles
        this.refreshPublicToggles(isAuthenticated);

        // Refresh admin elements
        this.refreshAdminElements(isAuthenticated);
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
        const publicToggles = document.querySelectorAll('.info-box-public-toggle, .public-status-toggle-container');

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
     * Refresh admin elements visibility
     * @param {boolean} isAuthenticated - Whether user is authenticated
     */
    refreshAdminElements(isAuthenticated) {
        const adminElements = document.querySelectorAll('.admin-only, .admin-feature');

        adminElements.forEach(element => {
            if (isAuthenticated && this.canAccessAdmin()) {
                element.style.display = '';
            } else {
                element.style.display = 'none';
            }
        });
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Get user ID from user system
     * @returns {string|null} User ID or null
     * @private
     */
    getUserIdFromUserSystem() {
        if (window.userSystem && window.userSystem.getCurrentUser) {
            const user = window.userSystem.getCurrentUser();
            return user?.id || user?._id;
        }
        return null;
    }

    /**
     * Get user ID from userApi
     * @returns {string|null} User ID or null
     * @private
     */
    getUserIdFromUserApi() {
        if (window.userApi && window.userApi.getCurrentUser) {
            const user = window.userApi.getCurrentUser();
            return user?.id || user?._id;
        }
        return null;
    }

    /**
     * Get user ID from JWT token
     * @returns {string|null} User ID or null
     * @private
     */
    getUserIdFromToken() {
        const token = this.getAuthToken();
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.userId || payload.id || payload.sub;
            } catch (error) {
                console.warn('Error getting user ID from token:', error);
            }
        }
        return null;
    }

    /**
     * Get user ID from localStorage
     * @returns {string|null} User ID or null
     * @private
     */
    getUserIdFromLocalStorage() {
        try {
            const storedUserId = localStorage.getItem('userId');
            return storedUserId || null;
        } catch (error) {
            console.warn('Error getting user ID from localStorage:', error);
            return null;
        }
    }

    /**
     * Get authentication headers for API requests
     * @returns {Object} Headers object with auth token
     */
    getAuthHeaders() {
        const headers = { 'Content-Type': 'application/json' };

        if (this.isAuthenticated()) {
            const token = this.getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    /**
     * Require authentication - redirect to login if not authenticated
     * @param {string} redirectPath - Path to redirect to after login
     * @returns {boolean} Whether user is authenticated
     */
    requireAuth(redirectPath = '/login.html') {
        if (this.isAuthenticated()) {
            return true;
        }

        // Store current path for redirect after login
        if (redirectPath !== '/login.html') {
            localStorage.setItem('redirectAfterLogin', window.location.pathname);
        }

        window.location.href = redirectPath;
        return false;
    }
}

// Create global instance
window.UnifiedAuthUtils = new UnifiedAuthUtils();

// ES6 exports removed - loaded as regular script
