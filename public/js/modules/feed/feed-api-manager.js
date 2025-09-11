// Feed API Manager - Handles API calls for feed data
class FeedAPIManager {
    constructor() {
        this.config = FEED_CONFIG;
    }

    // Load feed images for specific filter
    async loadFeedImages(filter, page = 1) {
        console.log('🔍 FEED: Loading feed images for filter:', filter, 'page:', page);
        try {
            const endpoint = this.getEndpointForFilter(filter);
            const params = this.buildRequestParams(filter, page);

            console.log('🔍 FEED: Making API request to:', endpoint, 'with params:', params);
            const response = await this.makeAPIRequest(endpoint, params);

            return this.processAPIResponse(response, filter);
        } catch (error) {
            console.error(`❌ API ERROR: Failed to load ${filter} feed:`, error);
            throw error;
        }
    }

    // Get endpoint for filter
    getEndpointForFilter(filter) {
        switch (filter) {
            case FEED_CONSTANTS.FILTERS.USER:
                return FEED_CONSTANTS.ENDPOINTS.USER_FEED;
            case FEED_CONSTANTS.FILTERS.SITE:
            default:
                return FEED_CONSTANTS.ENDPOINTS.SITE_FEED;
        }
    }

    // Build request parameters
    buildRequestParams(filter, page) {
        const params = {
            page,
            limit: FEED_CONSTANTS.DEFAULTS.PAGE_SIZE
        };

        // Add user-specific parameters if needed
        if (filter === FEED_CONSTANTS.FILTERS.USER) {
            const user = this.getCurrentUserInfo();

            if (user && user.id) {
                params.userId = user.id;
            }
        }

        console.log('🔧 API: Building request params:', { filter, page, limit: params.limit });

        return params;
    }

    // Make API request
    async makeAPIRequest(endpoint, params) {
        console.log('🔗 API: Making request to:', endpoint, 'with params:', params);

        if (window.apiService) {
            return await window.apiService.get(endpoint, params);
        } else {
            // Fallback to fetch
            const url = new URL(endpoint, window.location.origin);

            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        }
    }

    // Process API response
    processAPIResponse(response, filter) {
        console.log('🔍 FEED: Processing API response for filter:', filter);
        try {
            // Handle different response structures
            let images = [];
            let hasMore = false;
            let totalCount = 0;

            console.log('🔍 API: Processing response structure:', {
                hasDataItems: response.data && Array.isArray(response.data.items),
                hasDataImages: response.data && Array.isArray(response.data.images),
                hasDirectImages: Array.isArray(response.images),
                hasDirectArray: Array.isArray(response),
                hasMoreField: 'hasMore' in response,
                hasMoreValue: response.hasMore,
                totalCountField: 'totalCount' in response,
                totalCountValue: response.totalCount,
                paginationTotal: response.data?.pagination?.total,
                paginationPage: response.data?.pagination?.page,
                paginationLimit: response.data?.pagination?.limit,
                paginationCount: response.data?.pagination?.count
            });

            // Handle the new API response structure: {success: true, data: {items: [...], pagination: {...}}}
            if (response.data && Array.isArray(response.data.items)) {
                images = response.data.items;

                // Debug: Log the first image to see what fields are included
                if (images.length > 0) {
                    console.log('🔍 API: First image data from server:', {
                        id: images[0].id,
                        isPublic: images[0].isPublic,
                        userId: images[0].userId,
                        hasIsPublic: 'isPublic' in images[0],
                        allFields: Object.keys(images[0])
                    });
                }
                totalCount = response.data.pagination?.total || images.length;
                const currentPage = response.data.pagination?.page || 0;
                const limit = response.data.pagination?.limit || 20;
                const itemsReturned = response.data.pagination?.count || images.length;

                // hasMore is true if we got a full page of results AND there are more items available
                // If we got fewer items than the limit, we've reached the end
                if (itemsReturned < limit) {
                    hasMore = false; // We got fewer items than requested, so no more pages
                } else {
                    hasMore = itemsReturned === limit && (currentPage * limit + itemsReturned) < totalCount;
                }

                console.log('🔍 API: hasMore calculation details:', {
                    currentPage,
                    limit,
                    itemsReturned,
                    totalCount,
                    logic: itemsReturned < limit ? 'itemsReturned < limit (end reached)' : 'itemsReturned === limit (check if more available)',
                    calculation: itemsReturned < limit ?
                        `${itemsReturned} < ${limit} = false` :
                        `${itemsReturned} === ${limit} && (${currentPage} * ${limit} + ${itemsReturned}) < ${totalCount}`,
                    result: hasMore
                });
            } else if (response.data && Array.isArray(response.data.images)) {
                const { images: dataImages, hasMore: dataHasMore, totalCount: dataTotalCount } = response.data;

                images = dataImages;
                hasMore = dataHasMore || false;
                totalCount = dataTotalCount || 0;
            } else if (Array.isArray(response.images)) {
                const { images: responseImages, hasMore: responseHasMore, totalCount: responseTotalCount } = response;

                images = responseImages;
                hasMore = responseHasMore || false;
                totalCount = responseTotalCount || 0;
            } else if (Array.isArray(response)) {
                images = response;
                hasMore = false;
                totalCount = response.length;
            }

            console.log('🔍 API: Processed values:', {
                imageCount: images.length,
                hasMore,
                totalCount,
                filter
            });

            // Normalize image data
            const normalizedImages = images.map(image => this.normalizeImageData(image, filter));

            return {
                images: normalizedImages,
                hasMore,
                totalCount,
                filter
            };
        } catch (error) {
            console.error('❌ API ERROR: Failed to process response:', error);
            throw error;
        }
    }

    // Normalize image data
    normalizeImageData(image, filter) {
        // Normalize image URL to ensure consistent format
        let imageUrl = image.imageUrl || image.url || image.image_url || '';

        // Don't modify base64 data - it should be handled by the image component
        // Only add leading slash for actual URL paths
        if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/') &&
            !imageUrl.startsWith('iVBORw0KGgo') && !imageUrl.startsWith('/9j/')) {
            imageUrl = `/${imageUrl}`;
        }

        return {
            id: image.id || image._id || '',
            url: imageUrl,
            title: image.title || image.prompt || '',
            prompt: image.prompt || image.title || '',
            rating: image.rating || 0,
            provider: image.provider || 'unknown',
            original: image.original || '',
            guidance: image.guidance || '',
            isPublic: image.isPublic || false,
            userId: image.userId || null,
            filter,
            createdAt: image.createdAt || image.created_at || new Date().toISOString()
        };
    }

    // Get current user info
    getCurrentUserInfo() {
        // Try to get user info from user system
        if (window.userSystem && window.userSystem.getUser) {
            const user = window.userSystem.getUser();

            if (user && user.id) {
                return user;
            }
        }

        // Fallback to auth component
        if (window.authComponent && window.authComponent.getUser) {
            const user = window.authComponent.getUser();

            if (user && user.id) {
                return user;
            }
        }

        // Fallback to localStorage
        const userData = localStorage.getItem(FEED_CONSTANTS.CACHE_KEYS.USER_DATA);

        if (userData) {
            try {
                const parsed = JSON.parse(userData);

                // Handle different response structures
                if (parsed.data?.user?.id) {
                    return parsed.data.user;
                } else if (parsed.user?.id) {
                    return parsed.user;
                } else if (parsed.id) {
                    return parsed;
                }
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }

        return null;
    }

    // Check if user is authenticated
    isUserAuthenticated() {
        if (window.userSystem && window.userSystem.isAuthenticated) {
            return window.userSystem.isAuthenticated();
        }

        if (window.authComponent && window.authComponent.isAuthenticated) {
            return window.authComponent.isAuthenticated();
        }

        return false;
    }

    // Refresh feed data
    async refreshFeed(filter) {
        try {
            // Clear cache for the filter
            if (window.feedCacheManager) {
                window.feedCacheManager.clearCache(filter);
            }

            // Load fresh data
            return await this.loadFeedImages(filter, 1);
        } catch (error) {
            console.error(`❌ API ERROR: Failed to refresh ${filter} feed:`, error);
            throw error;
        }
    }

    // Load more images (pagination)
    async loadMoreImages(filter, page) {
        try {
            return await this.loadFeedImages(filter, page);
        } catch (error) {
            console.error(`❌ API ERROR: Failed to load more ${filter} images:`, error);
            throw error;
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedAPIManager = FeedAPIManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedAPIManager;
}
