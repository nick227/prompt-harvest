/**
 * Consolidated Image Service
 * Handles all image operations and API calls
 * Consolidates: image-data.js + image-generation-api.js + image-dom-manager.js
 */

export class ImageService {
    constructor() {
        this.baseUrl = '/api/images';
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
        this.isInitialized = false;
    }

    /**
     * Initialize image service
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log('🖼️ IMAGE-SERVICE: Initializing image service...');
            
            // Setup cache cleanup
            this.setupCacheCleanup();
            
            this.isInitialized = true;
            console.log('✅ IMAGE-SERVICE: Image service initialized');
        } catch (error) {
            console.error('❌ IMAGE-SERVICE: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup cache cleanup
     */
    setupCacheCleanup() {
        setInterval(() => {
            this.cleanupCache();
        }, 60000); // Cleanup every minute
    }

    /**
     * Get authentication token
     * @returns {string|null} Auth token or null
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    /**
     * Get authentication headers
     * @returns {Object} Headers with auth token
     */
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        };

        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    /**
     * Make API request
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} API response
     */
    async request(method, endpoint, data = null, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const cacheKey = `${method}:${url}:${JSON.stringify(data)}`;

        // Check cache first
        if (method === 'GET' && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        const config = {
            method,
            headers: this.getAuthHeaders(),
            ...options
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            // Cache GET requests
            if (method === 'GET') {
                this.cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });
            }

            return result;
        } catch (error) {
            console.error(`❌ IMAGE-SERVICE: API request failed: ${method} ${endpoint}`, error);
            throw error;
        }
    }

    /**
     * Get images
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Images array
     */
    async getImages(options = {}) {
        const queryParams = new URLSearchParams(options);
        const endpoint = queryParams.toString() ? `?${queryParams}` : '';
        
        const response = await this.request('GET', endpoint);
        return response.images || response.data || [];
    }

    /**
     * Get image by ID
     * @param {string} id - Image ID
     * @returns {Promise<Object>} Image object
     */
    async getImage(id) {
        const response = await this.request('GET', `/${id}`);
        return response.image || response.data;
    }

    /**
     * Create new image
     * @param {Object} imageData - Image data
     * @returns {Promise<Object>} Created image
     */
    async createImage(imageData) {
        const response = await this.request('POST', '', imageData);
        return response.image || response.data;
    }

    /**
     * Update image
     * @param {string} id - Image ID
     * @param {Object} imageData - Updated image data
     * @returns {Promise<Object>} Updated image
     */
    async updateImage(id, imageData) {
        const response = await this.request('PUT', `/${id}`, imageData);
        return response.image || response.data;
    }

    /**
     * Delete image
     * @param {string} id - Image ID
     * @returns {Promise<Object>} Delete result
     */
    async deleteImage(id) {
        const response = await this.request('DELETE', `/${id}`);
        return response;
    }

    /**
     * Download image
     * @param {string} id - Image ID
     * @returns {Promise<Blob>} Image blob
     */
    async downloadImage(id) {
        const response = await fetch(`${this.baseUrl}/${id}/download`, {
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error(`Download failed: ${response.statusText}`);
        }

        return await response.blob();
    }

    /**
     * Share image
     * @param {string} id - Image ID
     * @param {Object} shareOptions - Share options
     * @returns {Promise<Object>} Share result
     */
    async shareImage(id, shareOptions = {}) {
        const response = await this.request('POST', `/${id}/share`, shareOptions);
        return response;
    }

    /**
     * Like image
     * @param {string} id - Image ID
     * @returns {Promise<Object>} Like result
     */
    async likeImage(id) {
        const response = await this.request('POST', `/${id}/like`);
        return response;
    }

    /**
     * Unlike image
     * @param {string} id - Image ID
     * @returns {Promise<Object>} Unlike result
     */
    async unlikeImage(id) {
        const response = await this.request('DELETE', `/${id}/like`);
        return response;
    }

    /**
     * Get image statistics
     * @param {string} id - Image ID
     * @returns {Promise<Object>} Image statistics
     */
    async getImageStats(id) {
        const response = await this.request('GET', `/${id}/stats`);
        return response.stats || response.data;
    }

    /**
     * Get image comments
     * @param {string} id - Image ID
     * @returns {Promise<Array>} Image comments
     */
    async getImageComments(id) {
        const response = await this.request('GET', `/${id}/comments`);
        return response.comments || response.data || [];
    }

    /**
     * Add image comment
     * @param {string} id - Image ID
     * @param {string} comment - Comment text
     * @returns {Promise<Object>} Comment result
     */
    async addImageComment(id, comment) {
        const response = await this.request('POST', `/${id}/comments`, { comment });
        return response;
    }

    /**
     * Get image tags
     * @param {string} id - Image ID
     * @returns {Promise<Array>} Image tags
     */
    async getImageTags(id) {
        const response = await this.request('GET', `/${id}/tags`);
        return response.tags || response.data || [];
    }

    /**
     * Add image tag
     * @param {string} id - Image ID
     * @param {string} tag - Tag name
     * @returns {Promise<Object>} Tag result
     */
    async addImageTag(id, tag) {
        const response = await this.request('POST', `/${id}/tags`, { tag });
        return response;
    }

    /**
     * Remove image tag
     * @param {string} id - Image ID
     * @param {string} tag - Tag name
     * @returns {Promise<Object>} Remove result
     */
    async removeImageTag(id, tag) {
        const response = await this.request('DELETE', `/${id}/tags/${tag}`);
        return response;
    }

    /**
     * Search images
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Search results
     */
    async searchImages(query, options = {}) {
        const searchParams = {
            q: query,
            ...options
        };
        
        const response = await this.request('GET', '/search', searchParams);
        return response.images || response.data || [];
    }

    /**
     * Get image feed
     * @param {Object} options - Feed options
     * @returns {Promise<Array>} Feed images
     */
    async getImageFeed(options = {}) {
        const response = await this.request('GET', '/feed', options);
        return response.images || response.data || [];
    }

    /**
     * Get user images
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} User images
     */
    async getUserImages(userId, options = {}) {
        const response = await this.request('GET', `/user/${userId}`, options);
        return response.images || response.data || [];
    }

    /**
     * Get popular images
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Popular images
     */
    async getPopularImages(options = {}) {
        const response = await this.request('GET', '/popular', options);
        return response.images || response.data || [];
    }

    /**
     * Get recent images
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Recent images
     */
    async getRecentImages(options = {}) {
        const response = await this.request('GET', '/recent', options);
        return response.images || response.data || [];
    }

    /**
     * Get image metadata
     * @param {string} id - Image ID
     * @returns {Promise<Object>} Image metadata
     */
    async getImageMetadata(id) {
        const response = await this.request('GET', `/${id}/metadata`);
        return response.metadata || response.data;
    }

    /**
     * Update image metadata
     * @param {string} id - Image ID
     * @param {Object} metadata - Updated metadata
     * @returns {Promise<Object>} Update result
     */
    async updateImageMetadata(id, metadata) {
        const response = await this.request('PUT', `/${id}/metadata`, metadata);
        return response;
    }

    /**
     * Get image versions
     * @param {string} id - Image ID
     * @returns {Promise<Array>} Image versions
     */
    async getImageVersions(id) {
        const response = await this.request('GET', `/${id}/versions`);
        return response.versions || response.data || [];
    }

    /**
     * Create image version
     * @param {string} id - Image ID
     * @param {Object} versionData - Version data
     * @returns {Promise<Object>} Version result
     */
    async createImageVersion(id, versionData) {
        const response = await this.request('POST', `/${id}/versions`, versionData);
        return response;
    }

    /**
     * Cleanup cache
     */
    cleanupCache() {
        const now = Date.now();
        for (const [key, cached] of this.cache.entries()) {
            if (now - cached.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache size
     * @returns {number} Cache size
     */
    getCacheSize() {
        return this.cache.size;
    }
}

// Export for ES6 modules
export { ImageService };

// Global access for backward compatibility
if (typeof window !== 'undefined') {
    window.ImageService = ImageService;
}
