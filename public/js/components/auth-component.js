
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

        } catch (error) {
            console.error('❌ Error initializing authentication component:', error);
        }
    }

    setupEventListeners() {
        // Listen for authentication state changes
        window.addEventListener('authStateChanged', event => {
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

                setTimeout(() => this.checkAuthenticationState(), 100);

                return;
            }

            if (window.userApi.isAuthenticated()) {

                const userData = await window.userApi.getProfile();

                // Extract user data from response structure
                const _user = userData.data?.user || userData.user || userData;

                this.updateDisplay(_user);
            } else {

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

    updateDisplay(_user) {
        if (!this.container) {
            return;
        }

        this.user = _user;
        if (_user) {

            this.container.innerHTML = `
                <div class="flex items-center space-x-3">
                    <span class="text-gray-300 text-sm">Welcome, ${_user.email}</span>
                    <button id="logoutBtn"
                        class="text-gray-300 hover:text-red-400 transition-colors duration-200 text-sm">
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

                newLogoutBtn.addEventListener('click', e => {
                    e.preventDefault();
                    this.handleLogout();
                });
            }
        } else {

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
                window.showErrorMessage(`Logout failed: ${error.message}`);
            }
        }
    }

    // Public method to update authentication state
    setUser(_user) {
        this.updateDisplay(_user);

        // Dispatch event for other components when setUser is called externally
        window.dispatchEvent(new CustomEvent('authStateChanged', { detail: _user }));
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

const authComponent = new AuthComponent();

// Make it globally available
window.authComponent = authComponent;
