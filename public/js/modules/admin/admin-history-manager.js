/**
 * Admin History Manager - Handles lazy loading of history data (billing, users, images)
 * Single Responsibility: Manage history data loading and actions
 */

/* global AdminAPIService, AdminSharedTable */

class AdminHistoryManager {
    constructor() {
        this.apiService = new AdminAPIService();
        this.sharedTable = new AdminSharedTable();
        this.cache = new Map();
        this.cacheTimeout = 60000; // 1 minute
    }

    async init() {
        console.log('📋 ADMIN-HISTORY: Initializing history manager...');

        // Initialize shared table
        this.sharedTable.init();

        console.log('✅ ADMIN-HISTORY: History manager initialized');
    }

    async getHistory(historyType, options = {}) {
        const cacheKey = this.getCacheKey(historyType, options);

        // Check cache first
        if (this.isCacheValid(cacheKey)) {
            console.log(`📋 ADMIN-HISTORY: Returning cached ${historyType} data`);

            return this.cache.get(cacheKey).data;
        }

        try {
            console.log(`📋 ADMIN-HISTORY: Fetching ${historyType} history...`);

            let result;

            switch (historyType) {
                case 'billing':
                    result = await this.fetchBillingHistory(options);
                    break;
                case 'users':
                    result = await this.fetchUsersHistory(options);
                    break;
                case 'images':
                    result = await this.fetchImagesHistory(options);
                    break;
                default:
                    throw new Error(`Unknown history type: ${historyType}`);
            }

            if (!result.success) {
                throw new Error(result.error || `Failed to fetch ${historyType} history`);
            }

            // Cache the result
            this.cache.set(cacheKey, {
                data: result.data,
                timestamp: Date.now()
            });

            console.log(`✅ ADMIN-HISTORY: ${historyType} history fetched successfully`);

            return result.data;

        } catch (error) {
            console.error(`❌ ADMIN-HISTORY: Failed to fetch ${historyType} history:`, error);
            throw error;
        }
    }

    async fetchBillingHistory(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 20,
            sort: options.sort || 'created_at',
            order: options.order || 'desc',
            ...options.filters
        };

        return await this.apiService.getBillingHistory(params);
    }

    async fetchUsersHistory(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 20,
            sort: options.sort || 'created_at',
            order: options.order || 'desc',
            ...options.filters
        };

        return await this.apiService.getUsersHistory(params);
    }

    async fetchImagesHistory(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 15,
            sort: options.sort || 'created_at',
            order: options.order || 'desc',
            ...options.filters
        };

        return await this.apiService.getImagesHistory(params);
    }

    async executeAction(actionData) {
        try {
            console.log(`🔧 ADMIN-HISTORY: Executing ${actionData.action} on ${actionData.historyType}`);

            let result;

            switch (actionData.historyType) {
                case 'billing':
                    result = await this.executeBillingAction(actionData);
                    break;
                case 'users':
                    result = await this.executeUsersAction(actionData);
                    break;
                case 'images':
                    result = await this.executeImagesAction(actionData);
                    break;
                case 'packages':
                    result = await this.executePackagesAction(actionData);
                    break;
                case 'promo-cards':
                    result = await this.executePromoCardsAction(actionData);
                    break;
                default:
                    throw new Error(`Unknown history type: ${actionData.historyType}`);
            }

            // Clear relevant cache after action
            this.clearHistoryCache(actionData.historyType);

            return result;

        } catch (error) {
            console.error('❌ ADMIN-HISTORY: Action execution failed:', error);

            return { success: false, error: error.message };
        }
    }

    async executeBillingAction(actionData) {
        const { action, id } = actionData;

        switch (action) {
            case 'view':
                return await this.apiService.getBillingDetails(id);
            case 'refund':
                return await this.apiService.refundPayment(id, actionData.reason);
            case 'export':
                return await this.apiService.exportBillingData(actionData.filters);
            default:
                throw new Error(`Unknown billing action: ${action}`);
        }
    }

    async executeUsersAction(actionData) {
        const { action, id } = actionData;

        switch (action) {
            case 'view':
                return await this.apiService.getUserDetails(id);
            case 'edit':
                return await this.apiService.updateUser(id, actionData.data);
            case 'suspend':
                return await this.apiService.suspendUser(id, actionData.reason);
            case 'activate':
                return await this.apiService.activateUser(id);
            case 'delete':
                return await this.apiService.deleteUser(id);
            case 'export':
                return await this.apiService.exportUsersData(actionData.filters);
            default:
                throw new Error(`Unknown users action: ${action}`);
        }
    }

    async executeImagesAction(actionData) {
        const { action, id } = actionData;

        switch (action) {
            case 'view':
                return await this.apiService.getImageDetails(id);
            case 'delete':
                return await this.apiService.deleteImage(id, false); // Soft delete
            case 'permanent-delete':
                return await this.apiService.deleteImage(id, true); // Permanent delete
            case 'moderate':
                return await this.apiService.moderateImage(id, actionData.moderateAction || 'approve');
            case 'toggle_visibility':
                return await this.apiService.toggleImageVisibility(id);
            case 'edit_tags':
                return await this.apiService.editImageTags(id, actionData.tags);
            case 'generate_tags':
                return await this.apiService.generateImageTags(id);
            case 'admin_hide':
                return await this.apiService.adminHideImage(id);
            case 'admin_show':
                return await this.apiService.adminShowImage(id);
            case 'export':
                return await this.apiService.exportImagesData(actionData.filters);
            default:
                throw new Error(`Unknown images action: ${action}`);
        }
    }

    async executePackagesAction(actionData) {
        const { action, id } = actionData;

        switch (action) {
            case 'view':
                return await this.apiService.getPackageDetails(id);
            case 'create':
                return await this.apiService.createPackage(actionData.packageData);
            case 'update':
                return await this.apiService.updatePackage(id, actionData.packageData);
            case 'delete':
                return await this.apiService.deletePackage(id);
            default:
                throw new Error(`Unknown packages action: ${action}`);
        }
    }

    async executePromoCardsAction(actionData) {
        const { action, id } = actionData;

        switch (action) {
            case 'view':
                return await this.apiService.getPromoCodeDetails(id);
            case 'create':
                return await this.apiService.createPromoCode(actionData.promoData);
            case 'update':
                return await this.apiService.updatePromoCode(id, actionData.promoData);
            case 'delete':
                return await this.apiService.deletePromoCode(id);
            default:
                throw new Error(`Unknown promo-cards action: ${action}`);
        }
    }

    getCacheKey(historyType, options) {
        return `${historyType}-${JSON.stringify(options)}`;
    }

    isCacheValid(cacheKey) {
        const cached = this.cache.get(cacheKey);

        if (!cached) {
            return false;
        }

        return (Date.now() - cached.timestamp) < this.cacheTimeout;
    }

    clearHistoryCache(historyType) {
        const keysToDelete = [];

        for (const [key, _] of this.cache) {
            if (key.startsWith(historyType)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
        console.log(`🧹 ADMIN-HISTORY: Cleared cache for ${historyType}`);
    }

    clearAllCache() {
        this.cache.clear();
        console.log('🧹 ADMIN-HISTORY: All cache cleared');
    }

    destroy() {
        this.clearAllCache();
        this.sharedTable.destroy();
        console.log('🗑️ ADMIN-HISTORY: History manager destroyed');
    }
}

// Export for global access
window.AdminHistoryManager = AdminHistoryManager;
