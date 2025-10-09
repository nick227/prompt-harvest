/**
 * Authentication Utilities for Profile Management
 * Handles token management and user authentication checks
 */

class ProfileAuthUtils {
    /**
     * Get authentication token from storage
     */
    static getAuthToken() {
        return window.AdminAuthUtils?.getAuthToken() || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    /**
     * Get headers with authentication token
     */
    static getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = this.getAuthToken();

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.warn('⚠️ PROFILE: No auth token found for API call');
        }

        return headers;
    }

    /**
     * Check if user is authenticated
     */
    static isAuthenticated() {
        if (window.userSystem?.isInitialized) {
            const isAuth = window.userSystem.isAuthenticated();
            const user = window.userSystem.getUser();

            console.log('🔍 PROFILE: Auth check via userSystem:', {
                isAuthenticated: isAuth,
                hasUser: !!user,
                userId: user?.id
            });

            return isAuth;
        }

        const token = this.getAuthToken();

        return !!token;
    }

    /**
     * Wait for user system to be initialized
     */
    static async waitForUserSystem() {
        const maxWaitTime = 5000;
        const checkInterval = 100;
        let waited = 0;

        while (waited < maxWaitTime) {
            if (window.userSystem?.isInitialized) {
                return;
            }

            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
        }

        console.warn('⚠️ PROFILE: UserSystem not ready after 5 seconds, proceeding anyway');
    }

    /**
     * Get current user from global system
     */
    static async getCurrentUser() {
        try {
            await this.waitForUserSystem();

            if (window.userSystem?.isInitialized) {
                return window.userSystem.getUser();
            }

            // Fallback: try localStorage
            const userData = localStorage.getItem('currentUser');

            if (userData) {
                return JSON.parse(userData);
            }

            return null;
        } catch (error) {
            console.error('Failed to get current user:', error);

            return null;
        }
    }

    /**
     * Sync user data with global system
     */
    static syncUserData(user) {
        if (window.userSystem?.setUser) {
            window.userSystem.setUser(user);
        }
    }
}

// Export for global access
window.ProfileAuthUtils = ProfileAuthUtils;
