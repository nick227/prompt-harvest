// Feed API Manager - Handles API calls for feed data with deduplication
class FeedAPIManager {
    constructor() {
        this.config = FEED_CONFIG;
        // Use static/global maps for deduplication across all instances
        if (!FeedAPIManager.activeRequests) {
            FeedAPIManager.activeRequests = new Map();
        }
        if (!FeedAPIManager.requestCache) {
            FeedAPIManager.requestCache = new Map();
        }
        this.cacheTimeout = 5000; // 5 second cache
    }

    // Load feed images for specific filter with deduplication
    async loadFeedImages(filter, page = 1) {
        const requestKey = `${filter}-${page}`;

        // Check if request is already in progress
        if (FeedAPIManager.activeRequests.has(requestKey)) {
            console.log(`🔄 FEED: Request already in progress for ${requestKey}, waiting...`);
            return FeedAPIManager.activeRequests.get(requestKey);
        }

        // Check cache first
        const cached = this.getCachedRequest(requestKey);
        if (cached) {
            console.log(`📦 FEED: Using cached response for ${requestKey}`);
            return cached;
        }

        // Create new request
        const requestPromise = this.makeFeedRequest(filter, page);
        FeedAPIManager.activeRequests.set(requestKey, requestPromise);

        try {
            const response = await requestPromise;

            // Cache the response
            this.setCachedRequest(requestKey, response);

            return response;
        } finally {
            // Clean up active request
            FeedAPIManager.activeRequests.delete(requestKey);
        }
    }

    // Make the actual feed request
    async makeFeedRequest(filter, page) {
        try {
            // Use the correct endpoint based on filter
            let url;
            if (filter === 'user') {
                url = `/api/feed/user?page=${page}`;
            } else {
                // Use dedicated site feed endpoint to ensure only public images
                url = `/api/feed/site?page=${page}`;
            }

            console.log(`🌐 FEED: Making request to ${url}`);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Handle different response structures
            let images;
            if (data.images) {
                // Direct images property
                images = data.images;
            } else if (data.data && data.data.items) {
                // formatSuccessResponse/formatPaginatedResponse structure: { data: { items: [...] } }
                images = data.data.items;
            } else if (data.items) {
                // Direct items property
                images = data.items;
            } else {
                images = [];
            }

            // Return in consistent format
            const result = {
                images: images,
                pagination: data.pagination || data.data?.pagination,
                success: data.success !== false
            };

            console.log(`🔍 FEED: Returning result:`, result);
            return result;
        } catch (error) {
            console.error(`❌ FEED: Error loading feed images:`, error);
            throw error;
        }
    }

    // Get cached request if still valid
    getCachedRequest(requestKey) {
        const cached = FeedAPIManager.requestCache.get(requestKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    // Set cached request
    setCachedRequest(requestKey, data) {
        FeedAPIManager.requestCache.set(requestKey, {
            data,
            timestamp: Date.now()
        });

        // Clean up old cache entries
        this.cleanupCache();
    }

    // Clean up expired cache entries
    cleanupCache() {
        const now = Date.now();
        for (const [key, value] of FeedAPIManager.requestCache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                FeedAPIManager.requestCache.delete(key);
            }
        }
    }

    // Clear all caches
    clearCache() {
        FeedAPIManager.requestCache.clear();
        FeedAPIManager.activeRequests.clear();
    }

    // Get authentication token
    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    // Check if user is authenticated
    isUserAuthenticated() {
        const token = this.getAuthToken();
        return !!token;
    }

    // Load more images for pagination
    async loadMoreImages(filter, page) {
        return this.loadFeedImages(filter, page);
    }

    // Get current user info
    getCurrentUserInfo() {
        const token = this.getAuthToken();
        if (!token) {
            return null;
        }

        try {
            // Decode JWT token to get user info
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                id: payload.userId || payload.id,
                email: payload.email,
                username: payload.username
            };
        } catch (error) {
            console.error('Error decoding user token:', error);
            return null;
        }
    }
}

// Export for use in other modules
window.FeedAPIManager = FeedAPIManager;
