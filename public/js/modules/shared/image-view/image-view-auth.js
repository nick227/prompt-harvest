/**
 * Image View Authentication Utilities
 * Handles authentication context and user identification
 */

(function() {
    'use strict';

    /**
     * Get authentication headers for API requests
     * @returns {Object} Headers object with authentication
     */
    const getAuthHeaders = () => {
    // Use centralized auth utils for consistency
        if (window.UnifiedAuthUtils) {
            return window.UnifiedAuthUtils.getAuthHeaders();
        }

        // Fallback to local implementation if centralized utils not available
        const headers = { 'Content-Type': 'application/json' };

        if (window.userApi && window.userApi.isAuthenticated()) {
            const token = window.userApi.getAuthToken();

            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
        }

        return headers;
    };

    /**
 * Check if currently viewing the public filter
 * @returns {boolean} True if in public view
 */
    const isCurrentlyInPublicView = () => {
        if (window.feedManager && window.feedManager.getCurrentFilter) {
            return window.feedManager.getCurrentFilter() === 'public';
        }

        // Fallback: check DOM for active public option
        const ownerDropdown = document.querySelector('select[name="owner"]');

        return ownerDropdown && ownerDropdown.value === 'public';
    };

    /**
 * Get current user ID
 * @returns {string|null} Current user ID
 */
    const getCurrentUserId = () => {
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
    };

    // Export to window
    if (typeof window !== 'undefined') {
        window.ImageViewAuth = {
            getAuthHeaders,
            isCurrentlyInPublicView,
            isCurrentlyInSiteView: isCurrentlyInPublicView, // Backward compatibility alias
            getCurrentUserId
        };
    }
})();

