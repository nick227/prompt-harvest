/**
 * Centralized User System
 * Single Responsibility: Manage all user-related functionality
 * Replaces: user.js, auth-state-manager.js, user-manager.js, simplified-auth-component.js
 */

class UserSystem {
    constructor() {
        // Core state
        this.currentUser = null;
        this.isInitialized = false;
        this.authCheckPromise = null;

        // Event system
        this.authStateListeners = new Set();

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

            this.isInitialized = true;
            console.log('👤 USER-SYSTEM: Initialized successfully');
        } catch (error) {
            console.error('❌ USER-SYSTEM: Initialization failed:', error);
        }
    }

    async waitForDependencies() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max

        while (!window.userApi && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.userApi) {
            console.warn('⚠️ USER-SYSTEM: UserApi not available, using fallback initialization');
            // Continue without userApi - will use fallback methods
        }
    }

    // ============================================================================
    // AUTHENTICATION STATE MANAGEMENT
    // ============================================================================

    async checkAuthState() {
        // Prevent multiple simultaneous auth checks
        if (this.authCheckPromise) {
            return this.authCheckPromise;
        }

        this.authCheckPromise = this.performAuthCheck();
        const result = await this.authCheckPromise;

        this.authCheckPromise = null;

        return result;
    }

    async performAuthCheck() {
        try {
            // Wait for userApi to be available
            if (!window.userApi) {
                console.log('🔐 USER-SYSTEM: userApi not available, cannot check auth state');

                this.setUser(null);

                return false;
            }

            // Check if userApi is authenticated
            const isApiAuthenticated = window.userApi.isAuthenticated();

            console.log('🔐 USER-SYSTEM: userApi.isAuthenticated() returned:', isApiAuthenticated);

            if (!isApiAuthenticated) {
                console.log('🔐 USER-SYSTEM: userApi reports not authenticated, clearing user');

                this.setUser(null);

                return false;
            }

            // Get user profile
            console.log('🔐 USER-SYSTEM: Fetching user profile...');

            const userData = await window.userApi.getProfile();

            console.log('🔐 USER-SYSTEM: Profile check response:', userData);

            // Handle different response structures
            const user = userData.data?.user || userData.user || userData;

            if (user && user.id) {
                console.log('🔐 USER-SYSTEM: Valid user data found, setting user:', user.email);

                this.setUser(user);

                return true;
            } else {
                console.log('🔐 USER-SYSTEM: No valid user data in profile response');

                this.setUser(null);

                return false;
            }
        } catch (error) {
            console.error('❌ USER-SYSTEM: Auth check failed:', error);

            // Clear any invalid tokens
            if (window.userApi) {
                console.log('🔐 USER-SYSTEM: Clearing auth token due to error');
                window.userApi.clearAuthToken();
            }

            this.setUser(null);

            return false;
        }
    }

    /**
     * Get authentication state (compatibility method for auth-state-manager)
     */
    async getAuthState(forceRefresh = false) {
        console.log('🔐 USER-SYSTEM: getAuthState called', { forceRefresh, hasCached: !!this.currentUser });

        // Return cached state if available and not forcing refresh
        if (!forceRefresh && this.currentUser !== null) {
            console.log('🔐 USER-SYSTEM: Returning cached state');

            return {
                isAuthenticated: this.isAuthenticated(),
                user: this.currentUser
            };
        }

        // Perform fresh auth check
        console.log('🔐 USER-SYSTEM: Starting fresh auth check');
        const isAuthenticated = await this.checkAuthState();

        const result = {
            isAuthenticated,
            user: this.currentUser
        };

        // Notify all listeners
        this._notifyListeners(result);

        return result;
    }

    setUser(user) {
        const wasAuthenticated = !!this.currentUser;
        const isAuthenticated = !!user;

        this.currentUser = user;

        // Update UI
        this.updateUI();

        // Only dispatch event if auth state actually changed
        if (wasAuthenticated !== isAuthenticated) {
            this.dispatchAuthStateChange(user);
        }

        console.log('👤 USER-SYSTEM: User state updated:', user ? user.email : 'null');
    }

    // ============================================================================
    // PUBLIC API METHODS
    // ============================================================================

    getUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getUserId() {
        return this.currentUser?.id;
    }

    getEmail() {
        return this.currentUser?.email;
    }

    async login(email, password) {
        try {
            this.showLoadingState('login');

            const response = await window.userApi.login(email, password);

            console.log('🔐 USER-SYSTEM: Raw login response:', response);

            // Check if login was successful (no error field means success)
            if (!response.error && !response.message?.includes('failed')) {
                const userData = response.data?.user || response.user || response;

                if (userData) {
                    this.setUser(userData);
                    // this.showSuccessMessage('Login successful! Redirecting...');

                    setTimeout(() => {
                        window.location.href = '/';
                    }, 300);

                    return { success: true, user: userData };
                } else {
                    throw new Error('Login succeeded but no user data received');
                }
            } else {
                // Server returned an error
                const errorMessage = response.message || response.error || 'Login failed';

                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('❌ USER-SYSTEM: Login failed:', error);
            this.showErrorMessage(error.message || 'Login failed. Please try again.');
            throw error;
        } finally {
            this.hideLoadingState('login');
        }
    }

    async logout() {
        try {
            await window.userApi.logout();
            this.setUser(null);

            // this.showSuccessMessage('Logged out successfully');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);

            return { success: true };
        } catch (error) {
            console.error('❌ USER-SYSTEM: Logout failed:', error);
            // Still clear local state even if server logout fails
            this.setUser(null);
            throw error;
        }
    }

    async register(email, password, confirmPassword) {
        try {
            this.showLoadingState('register');

            // Client-side validation
            this.validateRegistrationInputs(email, password, confirmPassword);

            const response = await window.userApi.register(email, password, confirmPassword);

            // Check if registration was successful (no error field means success)
            if (!response.error && !response.message?.includes('already exists')) {
                const userData = response.data?.user || response.user || response;

                if (userData) {
                    this.setUser(userData);
                    // this.showSuccessMessage('Registration successful! Redirecting...');

                    setTimeout(() => {
                        window.location.href = '/';
                    }, 300);

                    return { success: true, user: userData };
                } else {
                    throw new Error('Registration succeeded but no user data received');
                }
            } else {
                // Server returned an error
                const errorMessage = response.message || response.error || 'Registration failed';

                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('❌ USER-SYSTEM: Registration failed:', error);
            this.showErrorMessage(error.message || 'Registration failed. Please try again.');
            throw error;
        } finally {
            this.hideLoadingState('register');
        }
    }

    // ============================================================================
    // VALIDATION METHODS
    // ============================================================================

    validateRegistrationInputs(email, password, confirmPassword) {
        if (!email || !this.isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        if (!password) {
            throw new Error('Password is required');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }
    }

    isValidEmail(email) {
        if (window.apiService && typeof window.apiService.isValidEmail === 'function') {
            return window.apiService.isValidEmail(email);
        }

        // Fallback validation
        const emailRegex = new RegExp(
            '^(([^<>()[\\]\\\\.,;:\\s@"]+(\\.[^<>()[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$'
        );

        return emailRegex.test(String(email).toLowerCase());
    }

    checkPasswordStrength(password) {
        let score = 0;
        const feedback = [];

        if (password.length >= 8) {
            score++;
        } else { feedback.push('At least 8 characters'); }

        if ((/[a-z]/).test(password)) {
            score++;
        } else { feedback.push('Lowercase letter'); }

        if ((/[A-Z]/).test(password)) {
            score++;
        } else { feedback.push('Uppercase letter'); }

        if ((/[0-9]/).test(password)) {
            score++;
        } else { feedback.push('Number'); }

        if ((/[^A-Za-z0-9]/).test(password)) {
            score++;
        } else { feedback.push('Special character'); }

        return {
            score,
            strength: score < 2 ? 'weak' : 'strong',
            color: score < 2 ? 'red' : 'green',
            feedback
        };
    }

    // ============================================================================
    // UI MANAGEMENT
    // ============================================================================

    setupUI() {
        // Check if header component is managing auth UI
        if (window.headerComponent) {
            console.log('🔒 USER-SYSTEM: Header component detected, skipping UI setup');

            return;
        }

        // Find or create auth container
        this.authContainer = document.querySelector('.auth-container') || this.createAuthContainer();

        // Find or create user display
        this.userDisplay = document.querySelector('.user-display') || this.createUserDisplay();
    }

    createAuthContainer() {
        // Check if header component is managing auth UI
        if (window.headerComponent) {
            console.log('🔒 USER-SYSTEM: Header component detected, skipping auth container creation');

            return null;
        }

        const container = document.createElement('div');

        container.className = 'auth-container flex items-center gap-4';

        container.innerHTML = `
            <div class="auth-buttons flex gap-2">
                <a href="/login.html" class="btn btn-sm btn-outline">Login</a>
                <a href="/register.html" class="btn btn-sm btn-primary">Register</a>
            </div>
        `;

        // Insert into header if available
        const header = document.querySelector('header');

        if (header) {
            header.appendChild(container);
        }

        return container;
    }

    createUserDisplay() {
        // Check if header component is managing auth UI
        if (window.headerComponent) {
            console.log('🔒 USER-SYSTEM: Header component detected, skipping user display creation');

            return null;
        }

        const display = document.createElement('div');

        display.className = 'user-display flex items-center gap-2';

        display.style.display = 'none';

        // Insert into header if available
        const header = document.querySelector('header');

        if (header) {
            header.appendChild(display);
        }

        return display;
    }

    updateUI() {
        if (!this.authContainer || !this.userDisplay) {
            return;
        }

        const user = this.getUser();

        if (user) {
            // User is logged in
            this.authContainer.style.display = 'none';
            this.userDisplay.style.display = 'flex';
            this.userDisplay.innerHTML = `
                <a href="/billing.html"><span class="text-sm text-gray-300">${user.email}</span></a>
                <button class="logout-btn btn btn-sm btn-outline">Logout</button>
            `;
        } else {
            // User is not logged in
            this.authContainer.style.display = 'flex';
            this.userDisplay.style.display = 'none';
        }
    }

    setupEventListeners() {
        // Listen for logout clicks
        document.addEventListener('click', e => {
            if (e.target.matches('.logout-btn')) {
                e.preventDefault();
                this.handleLogout();
            }
        });
    }

    async handleLogout() {
        try {
            await this.logout();
        } catch (error) {
            // Error already handled in logout method
        }
    }

    // ============================================================================
    // LOADING STATE MANAGEMENT
    // ============================================================================

    showLoadingState(type) {
        const form = document.getElementById(`${type}Form`);

        if (form) {
            // Try both submit and button types for compatibility
            const submitBtn = form.querySelector('button[type="submit"]') ||
                             form.querySelector(`#${type}SubmitBtn`);

            if (submitBtn) {
                submitBtn.disabled = true;
                const buttonText = type === 'login' ? 'Signing In...' : 'Creating Account...';

                submitBtn.innerHTML = `<span class="loading-spinner"></span> ${buttonText}`;
            }
        }
    }

    hideLoadingState(type) {
        const form = document.getElementById(`${type}Form`);

        if (form) {
            // Try both submit and button types for compatibility
            const submitBtn = form.querySelector('button[type="submit"]') ||
                             form.querySelector(`#${type}SubmitBtn`);

            if (submitBtn) {
                submitBtn.disabled = false;
                const buttonText = type === 'login' ? 'Sign In' : 'Create Account';

                submitBtn.textContent = buttonText;
            }
        }
    }

    // ============================================================================
    // MESSAGE DISPLAY
    // ============================================================================

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type = 'info') {
        // Use authMessaging for login/register forms if available
        if (window.authMessaging) {
            if (type === 'success') {
                window.authMessaging.showSuccess(message);
            } else if (type === 'error') {
                window.authMessaging.showError(message);
            } else {
                window.authMessaging.showLoading(message);
            }
        } else if (window.notificationService) {
            // Fallback to notification service
            window.notificationService.show(message, type);
        } else {
            // Final fallback to console logging
            console.log(`Message: ${message}`);
        }
    }


    // ============================================================================
    // EVENT SYSTEM
    // ============================================================================

    addAuthStateListener(callback) {
        this.authStateListeners.add(callback);

        // Immediately call with current state
        if (this.isInitialized) {
            callback(this.currentUser);
        }

        return () => {
            this.authStateListeners.delete(callback);
        };
    }

    removeAuthStateListener(callback) {
        this.authStateListeners.delete(callback);
    }

    notifyAuthStateListeners(authState) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(authState);
            } catch (error) {
                console.error('❌ USER-SYSTEM: Auth state listener error:', error);
            }
        });
    }

    dispatchAuthStateChange(user) {
        const isAuthenticated = !!user;

        // Dispatch custom event for backward compatibility
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { isAuthenticated, user }
        }));

        // Call all registered listeners
        this.authStateListeners.forEach(callback => {
            try {
                callback({ isAuthenticated, user });
            } catch (error) {
                console.error('❌ USER-SYSTEM: Auth state listener error:', error);
            }
        });
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    async refreshUser() {
        return this.checkAuthState();
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);

            window.location.href = `/login.html?redirect=${returnUrl}`;

            return false;
        }

        return true;
    }

    // ============================================================================
    // BACKWARD COMPATIBILITY
    // ============================================================================

    getCurrentUser() {
        return this.getUser();
    }

    getProfile() {
        return this.getUser();
    }

    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || null;
    }
}

// Create global instance
const userSystem = new UserSystem();

// Export for global access
if (typeof window !== 'undefined') {
    window.UserSystem = UserSystem;
    window.userSystem = userSystem;

    // Backward compatibility aliases
    window.userManager = userSystem;
    window.UserManager = UserSystem;
    window.authComponent = userSystem;
    window.simplifiedAuthComponent = userSystem;
    window.authStateManager = userSystem; // Compatibility with existing code
}

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UserSystem, userSystem };
}
