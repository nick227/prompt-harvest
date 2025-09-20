/**
 * Admin API Service - Centralized API communication for admin operations
 * Single Responsibility: Handle all admin API requests and responses
 */

/* global AdminDemoDataService */

class AdminAPIService {
    constructor() {
        this.baseUrl = '/api/admin';
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds

        // Use demo data service for development (can be toggled)
        this.demoService = new AdminDemoDataService();
        this.useDemoData = false; // Set to false to use live data
    }

    /**
     * Get authentication token from storage
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    /**
     * Get authentication headers
     */
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        };

        // Add JWT token if available
        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log('🔑 ADMIN-API: Adding auth header with token:', `${token.substring(0, 20)}...`);
        } else {
            console.log('🔑 ADMIN-API: No auth token found in storage');
        }

        return headers;
    }

    async request(method, endpoint, data = null, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        const config = {
            method,
            headers: {
                ...this.getAuthHeaders(),
                ...options.headers
            },
            credentials: 'include',
            ...options
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }

        // Debug logging
        console.log('🔑 ADMIN-API: Making request:', {
            method,
            url,
            data,
            config
        });

        try {
            const response = await fetch(url, config);

            console.log('🔑 ADMIN-API: Response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.log('🔑 ADMIN-API: Error response body:', errorText);
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log('🔑 ADMIN-API: Response data:', result);
            return result;
        } catch (error) {
            console.error(`🚨 ADMIN-API: Request failed for ${endpoint}:`, error);

            // Handle 401 errors gracefully - fall back to demo data if available
            if (error.message && error.message.includes('401')) {
                console.log('🔐 ADMIN-API: 401 Unauthorized - user may not be authenticated as admin');
                if (this.useDemoData) {
                    console.log('📊 ADMIN-API: Falling back to demo data for development');
                    return this.getDemoDataForEndpoint(endpoint);
                }
            }

            throw error;
        }
    }

    /**
     * Get demo data for a specific endpoint when API fails
     * @param {string} endpoint - API endpoint
     * @returns {Object} Demo data for the endpoint
     */
    getDemoDataForEndpoint(endpoint) {
        if (endpoint === '/dashboard') {
            return this.demoService.getDashboardStats();
        } else if (endpoint === '/activity') {
            return this.demoService.getAnalytics();
        } else if (endpoint === '/activity/health') {
            return this.demoService.getSystemHealth();
        } else if (endpoint === '/payments') {
            return this.demoService.getBillingHistory();
        } else if (endpoint === '/users') {
            return this.demoService.getUsersHistory();
        } else if (endpoint === '/images') {
            return this.demoService.getImagesHistory();
        }

        // Default fallback
        return { success: false, message: 'Demo data not available for this endpoint' };
    }

    async getCached(endpoint, cacheKey = null, ttl = null) {
        const key = cacheKey || endpoint;
        const timeout = ttl || this.cacheTimeout;
        const cached = this.cache.get(key);

        if (cached && (Date.now() - cached.timestamp) < timeout) {
            return cached.data;
        }

        const data = await this.request('GET', endpoint);

        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });

        return data;
    }

    // Dashboard/Snapshot APIs
    async getDashboardStats() {
        if (this.useDemoData) {
            return await this.demoService.getSiteSnapshot();
        }

        return await this.getCached('/dashboard', 'dashboard-stats');
    }

    async getAnalytics(params = {}) {
        if (this.useDemoData) {
            return await this.demoService.getAnalytics(params);
        }
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/activity${queryString ? `?${queryString}` : ''}`;

        return await this.getCached(endpoint, `analytics-${queryString}`);
    }

    async getSystemHealth() {
        if (this.useDemoData) {
            return await this.demoService.getSystemHealth();
        }

        return await this.getCached('/activity/health', 'system-health', 10000); // 10 second cache
    }

    // Billing History APIs
    async getBillingHistory(params = {}) {
        if (this.useDemoData) {
            return await this.demoService.getBillingHistory(params);
        }
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/payments${queryString ? `?${queryString}` : ''}`;

        return await this.request('GET', endpoint);
    }

    async getBillingDetails(id) {
        if (this.useDemoData) {
            return await this.demoService.getBillingDetails(id);
        }

        return await this.request('GET', `/payments/${id}`);
    }

    async refundPayment(id, reason) {
        if (this.useDemoData) {
            return await this.demoService.refundPayment(id, reason);
        }

        return await this.request('POST', `/payments/${id}/refund`, { reason });
    }

    async exportBillingData(filters = {}) {
        if (this.useDemoData) {
            return await this.demoService.exportBillingData(filters);
        }

        const queryString = new URLSearchParams(filters).toString();
        const endpoint = `/payments/export${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                ...this.getAuthHeaders(),
                Accept: 'text/csv'
            }
        });

        if (!response.ok) {
            throw new Error(`Export failed: ${response.status} ${response.statusText}`);
        }

        return await response.blob();
    }

    // Users History APIs
    async getUsersHistory(params = {}) {
        if (this.useDemoData) {
            return await this.demoService.getUsersHistory(params);
        }
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/users${queryString ? `?${queryString}` : ''}`;

        return await this.request('GET', endpoint);
    }

    async getUserDetails(id) {
        if (this.useDemoData) {
            return await this.demoService.getUserDetails(id);
        }

        return await this.request('GET', `/users/${id}`);
    }

    async updateUser(id, userData) {
        if (this.useDemoData) {
            return await this.demoService.updateUser(id, userData);
        }

        return await this.request('PUT', `/users/${id}`, userData);
    }

    async suspendUser(id, reason) {
        if (this.useDemoData) {
            return await this.demoService.suspendUser(id, reason);
        }

        return await this.request('POST', `/users/${id}/suspend`, { reason });
    }

    async activateUser(id) {
        if (this.useDemoData) {
            return await this.demoService.activateUser(id);
        }

        return await this.request('POST', `/users/${id}/unsuspend`);
    }

    async deleteUser(id) {
        if (this.useDemoData) {
            return await this.demoService.deleteUser(id);
        }

        return await this.request('DELETE', `/users/${id}`);
    }

    async exportUsersData(filters = {}) {
        if (this.useDemoData) {
            return await this.demoService.exportUsersData(filters);
        }

        const queryString = new URLSearchParams(filters).toString();
        const endpoint = `/users/export${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                ...this.getAuthHeaders(),
                Accept: 'text/csv'
            }
        });

        if (!response.ok) {
            throw new Error(`Export failed: ${response.status} ${response.statusText}`);
        }

        return await response.blob();
    }

    // Images History APIs
    async getImagesHistory(params = {}) {
        if (this.useDemoData) {
            return await this.demoService.getImagesHistory(params);
        }
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/images${queryString ? `?${queryString}` : ''}`;

        return await this.request('GET', endpoint);
    }

    async getImageDetails(id) {
        if (this.useDemoData) {
            return await this.demoService.getImageDetails(id);
        }

        return await this.request('GET', `/images/${id}`);
    }

    async deleteImage(id) {
        if (this.useDemoData) {
            return await this.demoService.deleteImage(id);
        }

        return await this.request('DELETE', `/images/${id}`);
    }

    async moderateImage(id, action) {
        if (this.useDemoData) {
            return await this.demoService.moderateImage(id, action);
        }

        return await this.request('POST', `/images/${id}/moderate`, { action });
    }

    async toggleImageVisibility(id) {
        if (this.useDemoData) {
            return await this.demoService.toggleImageVisibility(id);
        }

        return await this.request('POST', `/images/${id}/toggle-visibility`);
    }

    async editImageTags(id, tags) {
        if (this.useDemoData) {
            return await this.demoService.editImageTags(id, tags);
        }

        return await this.request('POST', `/images/${id}/update-tags`, { tags });
    }

    async generateImageTags(id) {
        if (this.useDemoData) {
            return await this.demoService.generateImageTags(id);
        }

        return await this.request('POST', `/images/${id}/generate-tags`);
    }

    async adminHideImage(id) {
        if (this.useDemoData) {
            return await this.demoService.adminHideImage(id);
        }

        return await this.request('POST', `/images/${id}/admin-hide`);
    }

    async adminShowImage(id) {
        if (this.useDemoData) {
            return await this.demoService.adminShowImage(id);
        }

        return await this.request('POST', `/images/${id}/admin-show`);
    }

    async exportImagesData(filters = {}) {
        if (this.useDemoData) {
            return await this.demoService.exportImagesData(filters);
        }

        const queryString = new URLSearchParams(filters).toString();
        const endpoint = `/images/export${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                ...this.getAuthHeaders(),
                Accept: 'text/csv'
            }
        });

        if (!response.ok) {
            throw new Error(`Export failed: ${response.status} ${response.statusText}`);
        }

        return await response.blob();
    }

    // Generic HTTP methods
    async get(endpoint, options = {}) {
        return await this.request('GET', endpoint, null, options);
    }

    async post(endpoint, data = null, options = {}) {
        return await this.request('POST', endpoint, data, options);
    }

    async put(endpoint, data = null, options = {}) {
        return await this.request('PUT', endpoint, data, options);
    }

    async patch(endpoint, data = null, options = {}) {
        return await this.request('PATCH', endpoint, data, options);
    }

    async delete(endpoint, options = {}) {
        return await this.request('DELETE', endpoint, null, options);
    }

    // Promo Code Management
    async getPromoCodesHistory(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const endpoint = `/promo-codes${queryParams ? `?${queryParams}` : ''}`;

        return await this.getCached(endpoint, `promo-codes-${JSON.stringify(params)}`);
    }

    async getPromoCodeDetails(id) {
        return await this.get(`/promo-codes/${id}`);
    }

    async createPromoCode(promoData) {
        return await this.post('/promo-codes', promoData);
    }

    async updatePromoCode(id, promoData) {
        return await this.put(`/promo-codes/${id}`, promoData);
    }

    async deletePromoCode(id) {
        return await this.delete(`/promo-codes/${id}`);
    }

    async getPromoCodeStats(id = null) {
        const endpoint = id ? `/promo-codes/${id}/stats` : '/promo-codes/stats';
        return await this.get(endpoint);
    }

    // Package Management
    async getPackagesHistory(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const endpoint = `/packages${queryParams ? `?${queryParams}` : ''}`;

        return await this.getCached(endpoint, `packages-${JSON.stringify(params)}`);
    }

    async getPackageDetails(id) {
        return await this.get(`/packages/${id}`);
    }

    async createPackage(packageData) {
        return await this.post('/packages', packageData);
    }

    async updatePackage(id, packageData) {
        return await this.put(`/packages/${id}`, packageData);
    }

    async deletePackage(id) {
        return await this.delete(`/packages/${id}`);
    }

    // Utility methods
    downloadBlob(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    clearCache(key = null) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
        console.log('🧹 ADMIN-API: Cache cleared');
    }

    destroy() {
        this.clearCache();
        console.log('🗑️ ADMIN-API: API service destroyed');
    }
}

// Export for global access
window.AdminAPIService = AdminAPIService;
