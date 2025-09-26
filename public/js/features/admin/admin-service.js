/**
 * Consolidated Admin Service
 * Handles all admin API operations and data management
 * Consolidates: admin-api-service.js + admin-api-manager.js + admin-snapshot-service.js + admin-queue-service.js
 */

export class AdminService {
    constructor() {
        this.baseUrl = '/api/admin';
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
        this.isInitialized = false;
        
        // Queue management
        this.requestQueue = [];
        this.isProcessingQueue = false;
        
        // Snapshot management
        this.snapshots = new Map();
        this.snapshotHistory = [];
    }

    /**
     * Initialize admin service
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log('🔧 ADMIN-SERVICE: Initializing admin service...');
            
            // Setup request queue processing
            this.setupQueueProcessing();
            
            // Load initial snapshots
            await this.loadInitialSnapshots();
            
            this.isInitialized = true;
            console.log('✅ ADMIN-SERVICE: Admin service initialized');
        } catch (error) {
            console.error('❌ ADMIN-SERVICE: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup queue processing
     */
    setupQueueProcessing() {
        setInterval(() => {
            this.processQueue();
        }, 1000); // Process queue every second
    }

    /**
     * Load initial snapshots
     */
    async loadInitialSnapshots() {
        try {
            // Load system snapshots
            const systemSnapshot = await this.getSystemSnapshot();
            this.snapshots.set('system', systemSnapshot);
            
            // Load user snapshots
            const userSnapshot = await this.getUserSnapshot();
            this.snapshots.set('users', userSnapshot);
            
        } catch (error) {
            console.error('❌ ADMIN-SERVICE: Failed to load initial snapshots:', error);
        }
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
            console.error(`❌ ADMIN-SERVICE: API request failed: ${method} ${endpoint}`, error);
            throw error;
        }
    }

    /**
     * Load tab data
     * @param {string} tabName - Name of the tab
     * @returns {Promise<Object>} Tab data
     */
    async loadTabData(tabName) {
        console.log(`📊 ADMIN-SERVICE: Loading tab data: ${tabName}`);

        switch (tabName) {
            case 'summary':
                return await this.getSummaryData();
            case 'billing':
                return await this.getBillingData();
            case 'users':
                return await this.getUsersData();
            case 'images':
                return await this.getImagesData();
            case 'packages':
                return await this.getPackagesData();
            case 'models':
                return await this.getModelsData();
            case 'promo-cards':
                return await this.getPromoCardsData();
            case 'terms':
                return await this.getTermsData();
            case 'messages':
                return await this.getMessagesData();
            default:
                throw new Error(`Unknown tab: ${tabName}`);
        }
    }

    /**
     * Get summary data
     * @returns {Promise<Object>} Summary data
     */
    async getSummaryData() {
        const [stats, recentActivity, systemHealth] = await Promise.all([
            this.request('GET', '/stats'),
            this.request('GET', '/activity/recent'),
            this.request('GET', '/system/health')
        ]);

        return {
            stats,
            recentActivity,
            systemHealth
        };
    }

    /**
     * Get billing data
     * @returns {Promise<Object>} Billing data
     */
    async getBillingData() {
        const [transactions, revenue, packages] = await Promise.all([
            this.request('GET', '/billing/transactions'),
            this.request('GET', '/billing/revenue'),
            this.request('GET', '/billing/packages')
        ]);

        return {
            transactions,
            revenue,
            packages
        };
    }

    /**
     * Get users data
     * @returns {Promise<Object>} Users data
     */
    async getUsersData() {
        const [users, userStats, recentUsers] = await Promise.all([
            this.request('GET', '/users'),
            this.request('GET', '/users/stats'),
            this.request('GET', '/users/recent')
        ]);

        return {
            users,
            userStats,
            recentUsers
        };
    }

    /**
     * Get images data
     * @returns {Promise<Object>} Images data
     */
    async getImagesData() {
        const [images, imageStats, recentImages] = await Promise.all([
            this.request('GET', '/images'),
            this.request('GET', '/images/stats'),
            this.request('GET', '/images/recent')
        ]);

        return {
            images,
            imageStats,
            recentImages
        };
    }

    /**
     * Get packages data
     * @returns {Promise<Object>} Packages data
     */
    async getPackagesData() {
        const [packages, packageStats, recentPackages] = await Promise.all([
            this.request('GET', '/packages'),
            this.request('GET', '/packages/stats'),
            this.request('GET', '/packages/recent')
        ]);

        return {
            packages,
            packageStats,
            recentPackages
        };
    }

    /**
     * Get models data
     * @returns {Promise<Object>} Models data
     */
    async getModelsData() {
        const [models, modelStats, recentModels] = await Promise.all([
            this.request('GET', '/models'),
            this.request('GET', '/models/stats'),
            this.request('GET', '/models/recent')
        ]);

        return {
            models,
            modelStats,
            recentModels
        };
    }

    /**
     * Get promo cards data
     * @returns {Promise<Object>} Promo cards data
     */
    async getPromoCardsData() {
        const [promoCards, promoStats, recentPromos] = await Promise.all([
            this.request('GET', '/promo-cards'),
            this.request('GET', '/promo-cards/stats'),
            this.request('GET', '/promo-cards/recent')
        ]);

        return {
            promoCards,
            promoStats,
            recentPromos
        };
    }

    /**
     * Get terms data
     * @returns {Promise<Object>} Terms data
     */
    async getTermsData() {
        const [terms, termStats, recentTerms] = await Promise.all([
            this.request('GET', '/terms'),
            this.request('GET', '/terms/stats'),
            this.request('GET', '/terms/recent')
        ]);

        return {
            terms,
            termStats,
            recentTerms
        };
    }

    /**
     * Get messages data
     * @returns {Promise<Object>} Messages data
     */
    async getMessagesData() {
        const [messages, messageStats, recentMessages] = await Promise.all([
            this.request('GET', '/messages'),
            this.request('GET', '/messages/stats'),
            this.request('GET', '/messages/recent')
        ]);

        return {
            messages,
            messageStats,
            recentMessages
        };
    }

    /**
     * Submit form data
     * @param {string} formType - Type of form
     * @param {FormData} formData - Form data
     * @returns {Promise<Object>} Submission result
     */
    async submitForm(formType, formData) {
        const data = Object.fromEntries(formData);
        
        switch (formType) {
            case 'user':
                return await this.request('POST', '/users', data);
            case 'package':
                return await this.request('POST', '/packages', data);
            case 'model':
                return await this.request('POST', '/models', data);
            case 'promo-card':
                return await this.request('POST', '/promo-cards', data);
            case 'term':
                return await this.request('POST', '/terms', data);
            default:
                throw new Error(`Unknown form type: ${formType}`);
        }
    }

    /**
     * Export data
     * @param {string} type - Type of data to export
     * @returns {Promise<Object>} Export data
     */
    async exportData(type) {
        return await this.request('GET', `/export/${type}`);
    }

    /**
     * Delete an item
     * @param {string} itemId - ID of the item
     * @param {string} itemType - Type of the item
     * @returns {Promise<Object>} Delete result
     */
    async deleteItem(itemId, itemType) {
        return await this.request('DELETE', `/${itemType}/${itemId}`);
    }

    /**
     * Get an item
     * @param {string} itemId - ID of the item
     * @param {string} itemType - Type of the item
     * @returns {Promise<Object>} Item data
     */
    async getItem(itemId, itemType) {
        return await this.request('GET', `/${itemType}/${itemId}`);
    }

    /**
     * Get system snapshot
     * @returns {Promise<Object>} System snapshot
     */
    async getSystemSnapshot() {
        return await this.request('GET', '/snapshots/system');
    }

    /**
     * Get user snapshot
     * @returns {Promise<Object>} User snapshot
     */
    async getUserSnapshot() {
        return await this.request('GET', '/snapshots/users');
    }

    /**
     * Process request queue
     */
    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        try {
            const requests = [...this.requestQueue];
            this.requestQueue = [];

            for (const request of requests) {
                try {
                    await this.request(request.method, request.endpoint, request.data, request.options);
                } catch (error) {
                    console.error('❌ ADMIN-SERVICE: Queue request failed:', error);
                }
            }
        } finally {
            this.isProcessingQueue = false;
        }
    }

    /**
     * Add request to queue
     * @param {Object} request - Request to queue
     */
    queueRequest(request) {
        this.requestQueue.push(request);
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
export { AdminService };

// Global access for backward compatibility
if (typeof window !== 'undefined') {
    window.AdminService = AdminService;
}
