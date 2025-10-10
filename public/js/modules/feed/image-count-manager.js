// Image Count Manager - Handles fetching and caching image counts for different filters
class ImageCountManager {
    constructor() {
        this.counts = {
            site: null,
            user: null
        };
        this.isLoading = false;
        this.lastFetchTime = {
            site: null,
            user: null
        };
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    }

    /**
     * Get image count for a specific filter
     * @param {string} filter - Filter type ('site' or 'user')
     * @returns {Promise<number>} Image count
     */
    async getImageCount(filter) {
        // Check if we have a recent cached count
        if (this.isCountCached(filter)) {
            return this.counts[filter];
        }

        // Prevent multiple simultaneous requests
        if (this.isLoading) {
            return this.waitForCurrentRequest(filter);
        }

        return this.fetchImageCount(filter);
    }

    /**
     * Check if count is cached and still valid
     * @param {string} filter - Filter type
     * @returns {boolean} True if cached and valid
     */
    isCountCached(filter) {
        if (this.counts[filter] === null) {
            return false;
        }

        const lastFetch = this.lastFetchTime[filter];

        if (!lastFetch) {

            return false;
        }

        const now = Date.now();
        const isExpired = (now - lastFetch) > this.cacheTimeout;

        if (isExpired) {
            return false;
        }

        return true;
    }

    /**
     * Wait for current request to complete
     * @param {string} filter - Filter type
     * @returns {Promise<number>} Image count
     */
    async waitForCurrentRequest(filter) {
        return new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (!this.isLoading && this.counts[filter] !== null) {
                    clearInterval(checkInterval);
                    resolve(this.counts[filter]);
                }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve(0);
            }, 10000);
        });
    }

    /**
     * Fetch image count from API
     * @param {string} filter - Filter type
     * @returns {Promise<number>} Image count
     */
    async fetchImageCount(filter) {
        this.isLoading = true;

        try {
            let response;

            if (filter === FEED_CONSTANTS.FILTERS.PUBLIC) {
                // For public filter, get count of public images from all users
                response = await this.fetchSiteImageCount();
            } else if (filter === FEED_CONSTANTS.FILTERS.PRIVATE) {
                // For private filter, get count of user's own images
                response = await this.fetchUserImageCount();
            } else {
                console.error(`📊 COUNT: Unknown filter type: ${filter}`);
                this.counts[filter] = 0;

                return 0;
            }

            if (response !== null && response !== undefined && typeof response === 'number' && response >= 0) {
                this.counts[filter] = response;
                this.lastFetchTime[filter] = Date.now();

                return this.counts[filter];
            } else {
                console.error('📊 COUNT: Invalid response format:', {
                    response,
                    responseType: typeof response,
                    isNumber: typeof response === 'number',
                    filter
                });
                this.counts[filter] = 0;

                return 0;
            }
        } catch (error) {
            console.error(`📊 COUNT: Failed to fetch count for ${filter}:`, error);
            this.counts[filter] = 0;

            return 0;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Fetch count of public images (site filter)
     * @returns {Promise<number>} Count of public images
     */
    async fetchSiteImageCount() {
        try {
            // Use the site feed endpoint to get total count of public images
            const headers = {
                Accept: 'application/json'
            };

            // Add auth token if available
            const token = window.AdminAuthUtils?.getAuthToken() || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/feed/site?page=0&limit=1', {
                headers
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.data && data.data.pagination) {
                // The total count is in data.pagination.total
                const totalCount = data.data.pagination.total;

                if (typeof totalCount === 'number') {
                    return totalCount;
                } else {
                    console.error('📊 COUNT: total is not a number:', totalCount, 'type:', typeof totalCount);

                    return 0;
                }
            } else {
                console.error('📊 COUNT: Invalid site feed response format - missing pagination:', {
                    success: data.success,
                    hasData: !!data.data,
                    hasPagination: !!data.data?.pagination,
                    dataKeys: data.data ? Object.keys(data.data) : 'no data',
                    fullResponse: data
                });

                return 0;
            }
        } catch (error) {
            console.error('📊 COUNT: Failed to fetch site image count:', error);

            return 0;
        }
    }

    /**
     * Fetch count of user's own images (mine filter)
     * @returns {Promise<number>} Count of user's images
     */
    async fetchUserImageCount() {
        try {
            // Prepare headers with authentication if available
            const headers = {
                Accept: 'application/json'
            };

            // Add authentication header if user is logged in
            if (window.userApi && window.userApi.isAuthenticated()) {
                const token = window.userApi.getAuthToken();

                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }

            // Use the user feed endpoint to get total count of user's images
            const response = await fetch('/api/feed/user?page=0&limit=1', {
                headers
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // User not authenticated, return 0 for mine filter
                    return 0;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.data && data.data.pagination) {
                // The total count is in data.pagination.total
                const totalCount = data.data.pagination.total;

                if (typeof totalCount === 'number') {
                    return totalCount;
                } else {
                    console.error('📊 COUNT: total is not a number:', totalCount, 'type:', typeof totalCount);

                    return 0;
                }
            } else {
                console.error('📊 COUNT: Invalid user feed response format - missing pagination:', {
                    success: data.success,
                    hasData: !!data.data,
                    hasPagination: !!data.data?.pagination,
                    dataKeys: data.data ? Object.keys(data.data) : 'no data',
                    fullResponse: data
                });

                return 0;
            }
        } catch (error) {
            console.error('📊 COUNT: Failed to fetch user image count:', error);

            return 0;
        }
    }

    /**
     * Update the display element with the count
     * @param {string} filter - Filter type
     * @param {number} count - Image count
     */
    updateDisplay(filter, count) {
        const displayElement = document.getElementById('num-images');

        if (displayElement) {
            displayElement.textContent = count.toLocaleString();
        }
    }

    /**
     * Get and update display for a specific filter
     * @param {string} filter - Filter type
     */
    async updateDisplayForFilter(filter) {
        try {
            const count = await this.getImageCount(filter);

            this.updateDisplay(filter, count);
        } catch (error) {
            console.error(`📊 COUNT: Failed to update display for ${filter}:`, error);
            this.updateDisplay(filter, 0);
        }
    }

    /**
     * Clear cache for a specific filter
     * @param {string} filter - Filter type
     */
    clearCache(filter) {
        this.counts[filter] = null;
        this.lastFetchTime[filter] = null;
    }

    /**
     * Clear all caches
     */
    clearAllCaches() {
        this.counts = {
            site: null,
            user: null
        };
        this.lastFetchTime = {
            site: null,
            user: null
        };
    }

    /**
     * Get current cached counts
     * @returns {Object} Current counts
     */
    getCurrentCounts() {
        return { ...this.counts };
    }

    /**
     * Check if counts are available
     * @returns {boolean} True if any counts are available
     */
    hasCounts() {
        return this.counts.site !== null || this.counts.user !== null;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.ImageCountManager = ImageCountManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageCountManager;
}
