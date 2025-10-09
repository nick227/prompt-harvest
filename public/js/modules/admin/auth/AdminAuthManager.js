/**
 * Admin Authentication Manager
 * Handles all authentication-related functionality for the admin dashboard
 * Extracted from admin.js for better modularity and maintainability
 */

class AdminAuthManager {
    /**
     * Check if user is authenticated and has admin privileges
     * @returns {Promise<boolean>} True if authenticated as admin
     */
    static async checkAdminAuthentication() {
        try {

            // Check if userApi is available
            if (!window.userApi) {
                console.error('❌ ADMIN: userApi not available');

                return false;
            }


            // Check if user is authenticated
            const isAuthenticated = window.userApi.isAuthenticated();


            if (!isAuthenticated) {
                return false;
            }

            // Get user profile to check admin status
            let userProfile;

            try {
                userProfile = await window.userApi.getProfile();
            } catch (error) {
                console.error('❌ ADMIN: Profile fetch failed:', error);

                // Fallback: try to get user info from localStorage/sessionStorage
                const fallbackUser = this.getFallbackUserInfo();

                if (fallbackUser && fallbackUser.isAdmin) {
                    return true;
                }

                return false;
            }

            if (!userProfile || !userProfile.data) {

                // Fallback: try to get user info from localStorage/sessionStorage
                const fallbackUser = this.getFallbackUserInfo();

                if (fallbackUser && fallbackUser.isAdmin) {
                    return true;
                }

                return false;
            }

            // Check if user has admin privileges

            const isAdmin = userProfile.data.user?.isAdmin === true;

            console.log('🔍 ADMIN: isAdmin check:', {
                isAdmin: userProfile.data.user?.isAdmin,
                isAdminType: typeof userProfile.data.user?.isAdmin,
                isAdminStrict: isAdmin,
                userData: userProfile.data.user
            });

            if (!isAdmin) {
                return false;
            }

            return true;

        } catch (error) {
            console.error('❌ ADMIN: Authentication check failed:', error);

            return false;
        }
    }

    /**
     * Get admin user information
     * @returns {Promise<Object>} Admin user data
     */
    static async getAdminUserInfo() {
        try {
            const userProfile = await window.userApi.getProfile();

            return {
                email: userProfile.data.user.email,
                name: userProfile.data.user.name || userProfile.data.user.email,
                isAdmin: userProfile.data.user.isAdmin
            };
        } catch (error) {
            console.error('❌ ADMIN: Failed to get user info:', error);

            return { email: 'Unknown', name: 'Unknown', isAdmin: false };
        }
    }

    /**
     * Get fallback user info from localStorage/sessionStorage
     * @returns {Object|null} User data or null
     */
    static getFallbackUserInfo() {
        try {
            // Try to get user info from various possible storage locations
            const possibleKeys = [
                'user',
                'userData',
                'currentUser',
                'authUser',
                'userInfo'
            ];

            for (const key of possibleKeys) {
                // Check localStorage
                const localData = localStorage.getItem(key);

                if (localData) {
                    try {
                        const userData = JSON.parse(localData);

                        if (userData && userData.isAdmin) {
                            return userData;
                        }
                    } catch (e) {
                        // Ignore parsing errors
                    }
                }

                // Check sessionStorage
                const sessionData = sessionStorage.getItem(key);

                if (sessionData) {
                    try {
                        const userData = JSON.parse(sessionData);

                        if (userData && userData.isAdmin) {
                            return userData;
                        }
                    } catch (e) {
                        // Ignore parsing errors
                    }
                }
            }

            // Check if there's a user object in window
            if (window.userSystem && window.userSystem.getUser) {
                const user = window.userSystem.getUser();

                if (user && user.isAdmin) {
                    return user;
                }
            }

            return null;
        } catch (error) {
            console.error('❌ ADMIN: Error getting fallback user info:', error);

            return null;
        }
    }

    /**
     * Wait for userApi to be available
     * @returns {Promise<boolean>} True if userApi is available
     */
    static async waitForUserApi() {
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds max

        while (!window.userApi && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.userApi) {
            console.error('❌ ADMIN: userApi not available after waiting');
            console.error('🔍 ADMIN: Available window objects:', Object.keys(window).filter(key => key.includes('user') || key.includes('api') || key.includes('Api')));

            return false;
        }


        // Additional check to ensure userApi methods are available
        if (typeof window.userApi.isAuthenticated !== 'function') {
            console.error('❌ ADMIN: userApi.isAuthenticated is not a function');

            return false;
        }

        if (typeof window.userApi.getProfile !== 'function') {
            console.error('❌ ADMIN: userApi.getProfile is not a function');

            return false;
        }

        return true;
    }
}

// Export for use in other modules
window.AdminAuthManager = AdminAuthManager;
