/**
 * Consolidated User Service
 * Manages user state, profile, and user-related functionality
 * Integrates with AuthService for authentication
 */

class UserService {
    constructor() {
        // Core state
        this.currentUser = null;
        this.isInitialized = false;
        this.userListeners = new Set();

        // Initialize when dependencies are available
        this.init();
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Wait for auth service
            await this.waitForAuthService();

            // Setup event listeners
            this.setupEventListeners();

            // Load initial user data
            await this.loadUserData();

            this.isInitialized = true;
        } catch (error) {
            console.error('❌ USER-SERVICE: Initialization failed:', error);
        }
    }

    /**
     * Wait for auth service to be available
     */
    async waitForAuthService() {
        const maxWait = 10000; // 10 seconds
        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
            if (window.authService && window.authService.isInitialized) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        throw new Error('UserService: AuthService not available');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for auth state changes
        if (window.authService) {
            window.authService.addAuthStateListener((isAuthenticated, user) => {
                if (isAuthenticated && user) {
                    this.setUser(user);
                } else {
                    this.clearUser();
                }
            });
        }

        // Listen for user profile updates
        window.addEventListener('userProfileUpdated', (event) => {
            this.updateUserProfile(event.detail);
        });
    }

    // ============================================================================
    // USER DATA MANAGEMENT
    // ============================================================================

    /**
     * Load user data from auth service
     */
    async loadUserData() {
        try {
            if (window.authService && window.authService.isAuthenticated()) {
                const user = window.authService.getCurrentUser();
                if (user) {
                    this.setUser(user);
                }
            }
        } catch (error) {
            console.error('❌ USER-SERVICE: Failed to load user data:', error);
        }
    }

    /**
     * Set current user
     * @param {Object} user - User object
     */
    setUser(user) {
        const previousUser = this.currentUser;
        this.currentUser = user;

        // Notify listeners if user changed
        if (previousUser !== user) {
            this.notifyUserChange(user);
        }
    }

    /**
     * Clear current user
     */
    clearUser() {
        const previousUser = this.currentUser;
        this.currentUser = null;

        // Notify listeners if user was cleared
        if (previousUser !== null) {
            this.notifyUserChange(null);
        }
    }

    /**
     * Get current user
     * @returns {Object|null} Current user object or null
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get current user ID
     * @returns {string|null} Current user ID or null
     */
    getCurrentUserId() {
        return this.currentUser ? this.currentUser.id : null;
    }

    /**
     * Check if user is logged in
     * @returns {boolean} Whether user is logged in
     */
    isLoggedIn() {
        return this.currentUser !== null;
    }

    /**
     * Update user profile
     * @param {Object} profileData - Updated profile data
     */
    updateUserProfile(profileData) {
        if (this.currentUser) {
            this.currentUser = { ...this.currentUser, ...profileData };
            this.notifyUserChange(this.currentUser);
        }
    }

    // ============================================================================
    // USER PROPERTIES
    // ============================================================================

    /**
     * Get user email
     * @returns {string|null} User email or null
     */
    getUserEmail() {
        return this.currentUser ? this.currentUser.email : null;
    }

    /**
     * Get user name
     * @returns {string|null} User name or null
     */
    getUserName() {
        return this.currentUser ? this.currentUser.name || this.currentUser.username : null;
    }

    /**
     * Get user role
     * @returns {string|null} User role or null
     */
    getUserRole() {
        return this.currentUser ? this.currentUser.role : null;
    }

    /**
     * Check if user is admin
     * @returns {boolean} Whether user is admin
     */
    isAdmin() {
        return this.getUserRole() === 'admin';
    }

    /**
     * Get user preferences
     * @returns {Object} User preferences
     */
    getUserPreferences() {
        return this.currentUser ? this.currentUser.preferences || {} : {};
    }

    /**
     * Set user preferences
     * @param {Object} preferences - User preferences
     */
    setUserPreferences(preferences) {
        if (this.currentUser) {
            this.currentUser.preferences = { ...this.currentUser.preferences, ...preferences };
            this.notifyUserChange(this.currentUser);
        }
    }

    // ============================================================================
    // EVENT SYSTEM
    // ============================================================================

    /**
     * Add user change listener
     * @param {Function} callback - Callback function
     */
    addUserListener(callback) {
        this.userListeners.add(callback);
    }

    /**
     * Remove user change listener
     * @param {Function} callback - Callback function
     */
    removeUserListener(callback) {
        this.userListeners.delete(callback);
    }

    /**
     * Notify user change
     * @param {Object|null} user - User object or null
     */
    notifyUserChange(user) {
        // Notify listeners
        this.userListeners.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('❌ USER-SERVICE: Error in user listener:', error);
            }
        });

        // Dispatch custom event
        const event = new CustomEvent('userChanged', {
            detail: { user }
        });
        window.dispatchEvent(event);
    }

    // ============================================================================
    // COMPATIBILITY METHODS
    // ============================================================================

    /**
     * Get user (compatibility method)
     * @returns {Object|null} Current user object or null
     */
    getUser() {
        return this.getCurrentUser();
    }

    /**
     * Get user ID (compatibility method)
     * @returns {string|null} Current user ID or null
     */
    getUserId() {
        return this.getCurrentUserId();
    }

    /**
     * Check if user is authenticated (compatibility method)
     * @returns {boolean} Whether user is authenticated
     */
    isAuthenticated() {
        return this.isLoggedIn();
    }
}

// Global access for backward compatibility
if (typeof window !== 'undefined') {
    window.UserService = UserService;
    window.userService = new UserService();
}
