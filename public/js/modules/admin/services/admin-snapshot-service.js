/**
 * Admin Snapshot Service - Handles site performance snapshot data
 * Single Responsibility: Fetch and process site snapshot metrics
 */

// Globals: AdminAPIService (defined in .eslintrc.json)

class AdminSnapshotService {
    constructor() {
        this.apiService = new AdminAPIService();
        this.cache = null;
        this.lastFetch = null;
        this.cacheTimeout = 30000; // 30 seconds
    }

    async init() {

        // Check authentication before initializing
        if (!window.AdminAuthUtils?.hasValidToken()) {
            console.warn('🔐 ADMIN-SNAPSHOT: No valid token, skipping snapshot service initialization');

            return;
        }

        // Service is ready to use immediately
    }

    async getSiteSnapshot(forceRefresh = false) {
        // Return cached data if valid and not forcing refresh
        if (!forceRefresh && this.isCacheValid()) {
            return this.cache;
        }

        try {

            const [statsResult, metricsResult, healthResult] = await Promise.all([
                this.apiService.getDashboardStats(),
                this.apiService.getAnalytics({ period: '24h' }),
                this.apiService.getSystemHealth()
            ]);

            if (!statsResult.success || !metricsResult.success || !healthResult.success) {
                throw new Error('Failed to fetch complete snapshot data');
            }

            const snapshotData = {
                stats: statsResult.data.stats,
                metrics: statsResult.data.metrics,
                health: statsResult.data.health,
                recentImage: statsResult.data.recentImage,
                timestamp: Date.now()
            };

            // Cache the result
            this.cache = snapshotData;
            this.lastFetch = Date.now();


            return snapshotData;

        } catch (error) {
            console.error('❌ ADMIN-SNAPSHOT: Failed to fetch site snapshot:', error);

            // Return cached data if available, even if expired
            if (this.cache) {
                console.warn('⚠️ ADMIN-SNAPSHOT: Returning stale cache due to fetch failure');

                return this.cache;
            }

            throw error;
        }
    }

    isCacheValid() {
        if (!this.cache || !this.lastFetch) {
            return false;
        }

        return (Date.now() - this.lastFetch) < this.cacheTimeout;
    }

    getCachedSnapshot() {
        return this.cache;
    }

    clearCache() {
        this.cache = null;
        this.lastFetch = null;
    }

    destroy() {
        this.clearCache();
    }
}

// Export for global access
window.AdminSnapshotService = AdminSnapshotService;
