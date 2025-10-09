/**
 * Consolidated Authentication Service
 * Merges: auth-utils.js + unified-auth-utils.js + user-system.js
 * Single Responsibility: Manage all authentication and user state
 */

class AuthService {
    constructor() {
        // Core state
        this.currentUser = null;
        this.authState = null;
        this.isInitialized = false;
        this.authCheckPromise = null;

        // Event system
        this.authStateListeners = new Set();
        this.listeners = [];

        // UI state
        this.authContainer = null;
        this.userDisplay = null;

        // Initialize when dependencies are available
        this.init();
    }

    // ============================================================================
    // INITIALIZATION & DEPENDENCY MANAGEMENT
    // ============================================================================

    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Wait for dependencies
            await this.waitForDependencies();

            // Setup UI elements
            this.setupUI();

            // Check initial auth state
            await this.checkAuthState();

            // Setup event listeners
            this.setupEventListeners();

            // Periodically check auth state (in case token expires)
            setInterval(() => {
                this.checkAuthState();
            }, 30000); // Check every 30 seconds

            this.isInitialized = true;
        } catch (error) {
            console.error('❌ AUTH-SERVICE: Initialization failed:', error);
        }
    }

    /**
     * Wait for required dependencies to be available
     */
    async waitForDependencies() {
        const maxWait = 10000; // 10 seconds
        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
            if (window.userApi && window.userApi.isAuthenticated) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        throw new Error('AuthService: Required dependencies not available');
    }

    /**
     * Setup UI elements
     */
    setupUI() {
        this.authContainer = document.querySelector('[data-auth-container]');
        this.userDisplay = document.querySelector('[data-user-display]');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for auth state changes
        this.setupAuthListeners();

        // Listen for user system changes
        if (window.userSystem) {
            window.userSystem.addEventListener('authStateChanged', () => {
                this.checkAuthState();
            });
        }
    }

    // ============================================================================
    // CORE AUTHENTICATION METHODS
    // ============================================================================

    /**
     * Check current authentication state
     * @returns {boolean} Whether user is authenticated
     */
    async checkAuthState() {
        if (this.authCheckPromise) {
            return this.authCheckPromise;
        }

        this.authCheckPromise = this.performAuthCheck();
        const result = await this.authCheckPromise;

        this.authCheckPromise = null;

        return result;
    }

    /**
     * Perform actual auth check
     */
    async performAuthCheck() {
        try {
            // Wait for userApi to be available
            if (!window.userApi) {
                this.setUser(null);

                return false;
            }

            // Check if userApi is authenticated
            const isApiAuthenticated = window.userApi.isAuthenticated();

            if (!isApiAuthenticated) {
                this.setUser(null);

                return false;
            }

            // Get user profile
            const userData = await window.userApi.getProfile();

            // Handle different response structures
            const user = userData.data?.user || userData.user || userData;

            if (user && user.id) {
                this.setUser(user);

                return true;
            } else {
                this.setUser(null);

                return false;
            }
        } catch (error) {
            console.error('❌ AUTH-SERVICE: Auth check failed:', error);

            // Clear any invalid tokens
            if (window.userApi) {
                window.userApi.clearAuthToken();
            }

            this.setUser(null);

            return false;
        }
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
        if (this.currentUser && this.currentUser.id) {
            return this.currentUser.id;
        }

        // Try to get from userApi
        if (window.userApi && window.userApi.getCurrentUser) {
            const user = window.userApi.getCurrentUser();

            return user ? user.id : null;
        }

        return null;
    }

    /**
     * Get current user object
     * @returns {Object|null} Current user object or null
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Set current user
     * @param {Object|null} user - User object or null
     */
    setUser(user) {
        const wasAuthenticated = this.isAuthenticated();

        this.currentUser = user;
        this.authState = user !== null;

        // Notify listeners if auth state changed
        if (wasAuthenticated !== this.isAuthenticated()) {
            this.notifyAuthStateChange();
        }
    }

    // ============================================================================
    // TOKEN MANAGEMENT
    // ============================================================================

    /**
     * Get authentication token
     * @returns {string|null} Auth token or null
     */
    getAuthToken() {
        return window.AdminAuthUtils?.getAuthToken() || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    /**
     * Set authentication token
     * @param {string} token - Auth token
     * @param {boolean} remember - Whether to remember the token
     */
    setAuthToken(token, remember = false) {
        if (remember) {
            localStorage.setItem('authToken', token);
        } else {
            sessionStorage.setItem('authToken', token);
        }
    }

    /**
     * Clear authentication token
     */
    clearAuthToken() {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
    }

    /**
     * Check if token is expired
     * @param {string} token - JWT token
     * @returns {boolean} Whether token is expired
     */
    isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);

            return payload.exp < now;
        } catch {
            return true; // If we can't parse, consider it expired
        }
    }

    // ============================================================================
    // EVENT SYSTEM
    // ============================================================================

    /**
     * Setup auth listeners
     */
    setupAuthListeners() {
        // Listen for storage changes (token updates from other tabs)
        window.addEventListener('storage', e => {
            if (e.key === 'authToken') {
                this.checkAuthState();
            }
        });

        // Listen for visibility changes (user returns to tab)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkAuthState();
            }
        });
    }

    /**
     * Add auth state listener
     * @param {Function} callback - Callback function
     */
    addAuthStateListener(callback) {
        this.authStateListeners.add(callback);
    }

    /**
     * Remove auth state listener
     * @param {Function} callback - Callback function
     */
    removeAuthStateListener(callback) {
        this.authStateListeners.delete(callback);
    }

    /**
     * Notify auth state change
     */
    notifyAuthStateChange() {
        const isAuthenticated = this.isAuthenticated();

        // Notify listeners
        this.authStateListeners.forEach(callback => {
            try {
                callback(isAuthenticated, this.currentUser);
            } catch (error) {
                console.error('❌ AUTH-SERVICE: Error in auth state listener:', error);
            }
        });

        // Dispatch custom event
        const event = new CustomEvent('authStateChanged', {
            detail: { isAuthenticated, user: this.currentUser }
        });

        window.dispatchEvent(event);
    }

    // ============================================================================
    // COMPATIBILITY METHODS
    // ============================================================================

    /**
     * Get authentication state (compatibility method)
     */
    getAuthState() {
        return this.isAuthenticated();
    }

    /**
     * Get user profile (compatibility method)
     */
    getProfile() {
        return this.currentUser;
    }

    // getAuthToken method already exists above - removed duplicate
}

// Global access for backward compatibility
if (typeof window !== 'undefined') {
    window.AuthService = AuthService;
    window.authService = new AuthService();
}
