// Authentication Component - Reusable authentication widget for AutoImage
class AuthComponent {
    constructor(containerId = 'authentication') {
        this.containerId = containerId;
        this.container = null;
        this.user = null;
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (!document.body) {
            setTimeout(() => this.init(), 10);
            return;
        }

        try {
            this.container = document.getElementById(this.containerId);
            if (!this.container) {
                console.warn(`⚠️ Authentication container #${this.containerId} not found`);
                return;
            }

            this.setupEventListeners();

            // Wait a bit more for other components to initialize
            setTimeout(() => {
                this.checkAuthenticationState();
            }, 50);

            console.log('✅ Authentication component initialized');
        } catch (error) {
            console.error('❌ Error initializing authentication component:', error);
        }
    }

    setupEventListeners() {
        // Listen for authentication state changes
        window.addEventListener('authStateChanged', (event) => {
            this.updateDisplay(event.detail);
        });

        // Listen for logout events
        window.addEventListener('logout', () => {
            this.handleLogout();
        });
    }

    async checkAuthenticationState() {
        try {
            // Wait for userApi to be available
            if (!window.userApi) {
                console.log('🔍 UserApi not available yet, retrying in 100ms...');
                setTimeout(() => this.checkAuthenticationState(), 100);
                return;
            }

            if (window.userApi.isAuthenticated()) {
                console.log('🔍 User appears to be authenticated, fetching profile...');
                const userData = await window.userApi.getProfile();
                console.log('✅ User profile retrieved:', userData);

                // Extract user data from response structure
                const user = userData.data?.user || userData.user || userData;
                this.updateDisplay(user);
            } else {
                console.log('🔍 No authentication token found');
                this.updateDisplay(null);
            }
        } catch (error) {
            console.warn('⚠️ Failed to get user profile:', error.message);
            // Clear invalid authentication
            if (window.userApi) {
                window.userApi.clearAuthToken();
            }
            this.updateDisplay(null);
        }
    }

    updateDisplay(user) {
        if (!this.container) return;

        this.user = user;

        if (user) {
            console.log('🔧 Updating authentication display for:', user.email);
            this.container.innerHTML = `
                <div class="flex items-center space-x-3">
                    <span class="text-gray-300 text-sm">Welcome, ${user.email}</span>
                    <button id="logoutBtn" class="text-gray-300 hover:text-red-400 transition-colors duration-200 text-sm">
                        Logout
                    </button>
                </div>
            `;

            // Add logout button event listener (remove old ones first)
            const logoutBtn = this.container.querySelector('#logoutBtn');
            if (logoutBtn) {
                // Remove any existing listeners to prevent duplicates
                logoutBtn.replaceWith(logoutBtn.cloneNode(true));
                const newLogoutBtn = this.container.querySelector('#logoutBtn');
                newLogoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleLogout();
                });
            }
        } else {
            console.log('🔧 Resetting authentication display to login/register');
            this.container.innerHTML = `
                <div class="flex items-center space-x-2 text-sm">
                    <a href="/login.html" class="text-gray-300 hover:text-blue-400 transition-colors duration-200">
                        Login
                    </a>
                    <span class="text-gray-500">/</span>
                    <a href="/register.html" class="text-gray-300 hover:text-blue-400 transition-colors duration-200">
                        Register
                    </a>
                </div>
            `;
        }
    }

    async handleLogout() {
        try {
            console.log('🔧 Logging out user...');

            if (window.userApi) {
                await window.userApi.logout();
            }

            this.user = null;
            this.updateDisplay(null);

            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('authStateChanged', { detail: null }));

            // Show success message if available
            if (window.showSuccessMessage) {
                window.showSuccessMessage('Logged out successfully');
            }

            // Redirect to homepage after a short delay
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);

        } catch (error) {
            console.error('❌ Logout failed:', error);
            if (window.showErrorMessage) {
                window.showErrorMessage('Logout failed: ' + error.message);
            }
        }
    }

    // Public method to update authentication state
    setUser(user) {
        this.updateDisplay(user);

        // Dispatch event for other components when setUser is called externally
        window.dispatchEvent(new CustomEvent('authStateChanged', { detail: user }));
    }

    // Public method to get current user
    getUser() {
        return this.user;
    }

    // Public method to check if user is authenticated
    isAuthenticated() {
        return !!this.user;
    }
}

// Initialize authentication component
console.log('Authentication component script loaded');
const authComponent = new AuthComponent();

// Make it globally available
window.authComponent = authComponent;
