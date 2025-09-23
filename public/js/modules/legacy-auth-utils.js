/**
 * Legacy Authentication Utilities Module (Static)
 * Provides common authentication and user management functions
 * This is a legacy static implementation - use UnifiedAuthUtils for new code
 */
class LegacyAuthUtils {
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

        // SECURITY: Never assume ownership if userId is missing
        if (!imageData.userId) {
            console.warn('🔒 SECURITY: Image missing userId, denying ownership access for security');
            return false;
        }

        return currentUserId && imageData.userId === currentUserId;
    }
}

// Export for global access (legacy compatibility)
if (typeof window !== 'undefined') {
    window.AuthUtils = LegacyAuthUtils;
    window.LegacyAuthUtils = LegacyAuthUtils;
}
