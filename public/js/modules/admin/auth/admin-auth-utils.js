/**
 * Admin Authentication Utilities
 * Centralized authentication validation for all admin components
 */

class AdminAuthUtils {
    /**
     * Check if user has valid authentication token
     * @returns {boolean} Whether user has valid token
     */
    static hasValidToken() {
        const token = this.getAuthToken();

        if (!token) {
            return false;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);

            return !(payload.exp && payload.exp < now);
        } catch (error) {
            return false;
        }
    }

    /**
     * Get authentication token from storage
     * @returns {string|null} Auth token or null
     */
    static getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    /**
     * Get authentication headers for API requests
     * @returns {Object} Headers object with authentication
     */
    static getAuthHeaders() {
        const token = this.getAuthToken();
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        return headers;
    }

    /**
     * Validate authentication before making API request
     * @param {string} endpoint - API endpoint being called
     * @returns {boolean} Whether request should proceed
     */
    static validateAuthBeforeRequest(endpoint) {
        if (!this.hasValidToken()) {
            console.warn(`🔐 ADMIN-AUTH-UTILS: No valid token for ${endpoint}, skipping request`);

            return false;
        }

        return true;
    }

    /**
     * Make authenticated fetch request with validation
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Fetch response
     */
    static async authenticatedFetch(url, options = {}) {
        if (!this.validateAuthBeforeRequest(url)) {
            throw new Error('Authentication required');
        }

        const headers = {
            ...this.getAuthHeaders(),
            ...options.headers
        };

        return fetch(url, {
            ...options,
            headers
        });
    }
}

// Export for global access
window.AdminAuthUtils = AdminAuthUtils;
