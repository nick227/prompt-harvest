/**
 * Admin Queue Service - Handles queue status fetching and management
 * Single Responsibility: Manage queue-related API calls and data
 */

class AdminQueueService {
    constructor() {
        this.apiBaseUrl = window.ADMIN_CONFIG?.apiBaseUrl || '/api/admin';
        this.cacheTimeout = 5 * 1000; // 5 seconds cache for queue data
        this.cache = {
            data: null,
            timestamp: 0
        };
    }

    /**
     * Get queue status from API
     * @returns {Promise<Object>} Queue status data
     */
    async getQueueStatus() {
        try {
            // Check cache first
            const now = Date.now();
            if (this.cache.data && (now - this.cache.timestamp) < this.cacheTimeout) {
                return this.cache.data;
            }

            const response = await fetch(`${this.apiBaseUrl}/queue/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Failed to fetch queue status');
            }

            // Cache the result
            this.cache.data = result.data;
            this.cache.timestamp = now;

            return result.data;
        } catch (error) {
            console.error('❌ ADMIN-QUEUE: Error fetching queue status:', error);
            throw error;
        }
    }


    /**
     * Clear the queue
     * @returns {Promise<Object>} Clear result
     */
    async clearQueue() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/queue/clear`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Failed to clear queue');
            }

            // Clear cache after successful clear
            this.clearCache();

            return result.data;
        } catch (error) {
            console.error('❌ ADMIN-QUEUE: Error clearing queue:', error);
            throw error;
        }
    }

    /**
     * Get authentication token
     * @returns {string} Auth token
     */
    getAuthToken() {
        // Try to get token from localStorage or sessionStorage
        return localStorage.getItem('authToken') ||
               sessionStorage.getItem('authToken') ||
               '';
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.data = null;
        this.cache.timestamp = 0;
    }


    /**
     * Format queue health status for display
     * @param {string} status - Health status
     * @returns {Object} Formatted status with color and icon
     */
    formatHealthStatus(status) {
        const statusMap = {
            healthy: { color: 'green', icon: 'fa-check-circle', label: 'Healthy' },
            warning: { color: 'yellow', icon: 'fa-exclamation-triangle', label: 'Warning' },
            error: { color: 'red', icon: 'fa-times-circle', label: 'Error' }
        };

        return statusMap[status] || { color: 'gray', icon: 'fa-question-circle', label: 'Unknown' };
    }

    /**
     * Format queue processing status
     * @param {boolean} isProcessing - Processing status
     * @returns {Object} Formatted status
     */
    formatProcessingStatus(isProcessing) {
        return {
            text: isProcessing ? 'Processing' : 'Idle',
            icon: isProcessing ? 'fa-cog fa-spin' : 'fa-pause-circle',
            color: isProcessing ? 'blue' : 'gray'
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminQueueService;
} else {
    window.AdminQueueService = AdminQueueService;
}
