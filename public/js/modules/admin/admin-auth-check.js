/**
 * Admin Authentication Check
 * Handles authentication verification and login redirect for admin dashboard
 */

class AdminAuthCheck {
    constructor() {
        this.isInitialized = false;
        this.authCheckInterval = null;
    }

    /**
     * Initialize admin authentication check
     */
    async init() {
        if (this.isInitialized) return;

        console.log('🔐 ADMIN-AUTH: Initializing authentication check...');

        try {
            // Check authentication status
            const authStatus = await this.checkAuthStatus();

            if (!authStatus.isAuthenticated) {
                this.showLoginRequired();
                return;
            }

            if (!authStatus.isAdmin) {
                this.showAdminRequired();
                return;
            }

            // User is authenticated and is admin
            this.showAdminWelcome(authStatus.user);
            this.startPeriodicAuthCheck();

        } catch (error) {
            console.error('❌ ADMIN-AUTH: Authentication check failed:', error);
            this.showAuthError(error);
        }

        this.isInitialized = true;
    }

    /**
     * Check authentication status
     */
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/admin/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data;
            } else {
                return {
                    isAuthenticated: false,
                    isAdmin: false,
                    message: 'Authentication failed'
                };
            }
        } catch (error) {
            console.error('❌ ADMIN-AUTH: Auth check request failed:', error);
            return {
                isAuthenticated: false,
                isAdmin: false,
                message: 'Network error'
            };
        }
    }

    /**
     * Get authentication token from storage
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    /**
     * Show login required message
     */
    showLoginRequired() {
        const content = document.getElementById('admin-section-content');
        if (!content) return;

        content.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-50">
                <div class="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
                    <div class="text-center">
                        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                            <i class="fas fa-lock text-red-600 text-xl"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
                        <p class="text-gray-600 mb-6">You need to be logged in to access the admin dashboard.</p>

                        <div class="space-y-4">
                            <a href="/login.html"
                               class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <i class="fas fa-sign-in-alt mr-2"></i>
                                Go to Login
                            </a>

                            <a href="/register.html"
                               class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <i class="fas fa-user-plus mr-2"></i>
                                Create Account
                            </a>
                        </div>

                        <div class="mt-6 p-4 bg-blue-50 rounded-md">
                            <h3 class="text-sm font-medium text-blue-900 mb-2">Admin Setup Instructions:</h3>
                            <ol class="text-xs text-blue-800 text-left space-y-1">
                                <li>1. Login with an existing account</li>
                                <li>2. Contact your system administrator to grant admin privileges</li>
                                <li>3. Or run the admin setup script: <code class="bg-blue-100 px-1 rounded">node scripts/setup-admin-user.js</code></li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Show admin privileges required message
     */
    showAdminRequired() {
        const content = document.getElementById('admin-section-content');
        if (!content) return;

        content.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-50">
                <div class="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
                    <div class="text-center">
                        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                            <i class="fas fa-exclamation-triangle text-yellow-600 text-xl"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h2>
                        <p class="text-gray-600 mb-6">You are logged in, but you don't have admin privileges.</p>

                        <div class="space-y-4">
                            <a href="/index.html"
                               class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <i class="fas fa-home mr-2"></i>
                                Go to Main Site
                            </a>

                            <button onclick="location.reload()"
                                    class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <i class="fas fa-refresh mr-2"></i>
                                Refresh Page
                            </button>
                        </div>

                        <div class="mt-6 p-4 bg-yellow-50 rounded-md">
                            <h3 class="text-sm font-medium text-yellow-900 mb-2">Need Admin Access?</h3>
                            <p class="text-xs text-yellow-800 text-left">
                                Contact your system administrator to grant admin privileges to your account.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Show admin welcome message
     */
    showAdminWelcome(user) {
        const content = document.getElementById('admin-section-content');
        if (!content) return;

        // Don't overwrite if there's already content
        if (content.children.length > 0) return;

        // Create a small welcome banner
        const welcomeBanner = document.createElement('div');
        welcomeBanner.className = 'bg-green-50 border border-green-200 rounded-md p-3 mb-4';
        welcomeBanner.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-check-circle text-green-600 mr-2"></i>
                <span class="text-sm text-green-800">
                    Welcome, <strong>${user.username}</strong> (${user.email}) - Admin access verified
                </span>
                <button onclick="this.parentElement.parentElement.remove()"
                        class="ml-auto text-green-600 hover:text-green-800">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Insert at the top of the content
        content.insertBefore(welcomeBanner, content.firstChild);
    }

    /**
     * Show authentication error
     */
    showAuthError(error) {
        const content = document.getElementById('admin-section-content');
        if (!content) return;

        content.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-50">
                <div class="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
                    <div class="text-center">
                        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                            <i class="fas fa-exclamation-circle text-red-600 text-xl"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h2>
                        <p class="text-gray-600 mb-6">Failed to verify authentication status.</p>

                        <div class="space-y-4">
                            <button onclick="location.reload()"
                                    class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <i class="fas fa-refresh mr-2"></i>
                                Retry
                            </button>

                            <a href="/login.html"
                               class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <i class="fas fa-sign-in-alt mr-2"></i>
                                Go to Login
                            </a>
                        </div>

                        <div class="mt-6 p-4 bg-red-50 rounded-md">
                            <h3 class="text-sm font-medium text-red-900 mb-2">Error Details:</h3>
                            <p class="text-xs text-red-800 text-left">${error.message}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Start periodic authentication check
     */
    startPeriodicAuthCheck() {
        // Check auth status every 5 minutes
        this.authCheckInterval = setInterval(async () => {
            try {
                const authStatus = await this.checkAuthStatus();
                if (!authStatus.isAuthenticated || !authStatus.isAdmin) {
                    console.log('🔐 ADMIN-AUTH: Authentication lost, reloading page...');
                    location.reload();
                }
            } catch (error) {
                console.warn('⚠️ ADMIN-AUTH: Periodic check failed:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    /**
     * Stop periodic authentication check
     */
    stopPeriodicAuthCheck() {
        if (this.authCheckInterval) {
            clearInterval(this.authCheckInterval);
            this.authCheckInterval = null;
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopPeriodicAuthCheck();
        this.isInitialized = false;
    }
}

// Export for use
window.AdminAuthCheck = AdminAuthCheck;
