/**
 * Authentication Utilities Module
 * Provides common authentication and user management functions
 */
class AuthUtils {
    static getCurrentUserId() {
        // Try to get user ID from various sources
        if (window.userApi && window.userApi.getCurrentUser) {
            const user = window.userApi.getCurrentUser();
            return user?.id || user?._id;
        }

        // Fallback: try to get from localStorage or other sources
        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                // Decode JWT token to get user ID (basic implementation)
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.userId || payload.id;
            }
        } catch (error) {
            console.warn('Could not decode auth token:', error);
        }

        return null;
    }

    static isAuthenticated() {
        return window.userApi && window.userApi.isAuthenticated();
    }

    static getCurrentUser() {
        if (window.userApi && window.userApi.getCurrentUser) {
            return window.userApi.getCurrentUser();
        }
        return null;
    }

    static canUserModifyImage(imageData) {
        if (!imageData || !imageData.id) {
            return false;
        }

        // Check if user is authenticated
        if (!this.isAuthenticated()) {
            return false;
        }

        // If userId is not in the image data, assume it's the user's image
        // (since they can see it in their feed)
        const currentUserId = this.getCurrentUserId();

        if (!imageData.userId) {
            console.log('🔍 Image missing userId, assuming user owns it');
            return true; // Assume user owns it if they can see it
        }

        return currentUserId && imageData.userId === currentUserId;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.AuthUtils = AuthUtils;
}
