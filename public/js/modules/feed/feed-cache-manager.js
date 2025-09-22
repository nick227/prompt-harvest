// Feed Cache Manager - Handles caching of feed data and scroll positions
class FeedCacheManager {
    constructor() {
        this.cache = {
            site: {
                images: [],
                currentPage: 0,
                hasMore: true,
                isLoaded: false,
                scrollPosition: 0
            },
            user: {
                images: [],
                currentPage: 0,
                hasMore: true,
                isLoaded: false,
                scrollPosition: 0
            }
        };
    }

    // Generate cache key for filter and tags
    getCacheKey(filter, tags = []) {
        if (tags.length > 0) {
            return `${filter}-tags-${tags.join(',')}`;
        }
        return filter;
    }

    // Get cache for specific filter and tags
    getCache(filter, tags = []) {
        const key = this.getCacheKey(filter, tags);
        return this.cache[key] || null;
    }

    // Set cache for specific filter and tags
    setCache(filter, data, tags = []) {
        const key = this.getCacheKey(filter, tags);

        // Initialize cache entry if it doesn't exist
        if (!this.cache[key]) {
            this.cache[key] = {
                images: [],
                currentPage: 0,
                hasMore: true,
                isLoaded: false,
                scrollPosition: 0
            };
        }

        // console.log(`📊 CACHE: Setting cache for ${key}:`, {
        //     imageCount: data.images?.length,
        //     hasMore: data.hasMore,
        //     currentPage: data.currentPage,
        //     isLoaded: data.isLoaded
        // });

        this.cache[key] = { ...this.cache[key], ...data };
    }

    // Save scroll position for current filter
    saveScrollPosition(filter) {
        if (this.cache[filter]) {
            this.cache[filter].scrollPosition = window.scrollY;
        }
    }

    // Restore scroll position for filter
    restoreScrollPosition(filter) {
        const cache = this.cache[filter];

        if (cache && cache.scrollPosition > 0) {
            window.scrollTo(0, cache.scrollPosition);
        }
    }

    // Clear cache for specific filter
    clearCache(filter) {
        if (this.cache[filter]) {
            this.cache[filter] = {
                images: [],
                currentPage: 0,
                hasMore: true,
                isLoaded: false,
                scrollPosition: 0
            };
        }
    }

    // Clear all caches
    clearAllCaches() {
        Object.keys(this.cache).forEach(filter => {
            this.clearCache(filter);
        });
    }

    // Add images to cache
    addImagesToCache(filter, images, tags = []) {
        const key = this.getCacheKey(filter, tags);
        if (this.cache[key]) {
            // Get existing image IDs to prevent duplicates
            const existingIds = new Set(this.cache[key].images.map(img => img.id));

            // Filter out duplicate images
            const newImages = images.filter(image => {
                if (existingIds.has(image.id)) {
                    console.log('🚫 CACHE: Skipping duplicate image:', image.id);

                    return false;
                }

                return true;
            });

            // Add only new images to cache
            this.cache[key].images = [...this.cache[key].images, ...newImages];

            if (newImages.length > 0) {
                console.log(`✅ CACHE: Added ${newImages.length} new images to ${key} cache`);
            }
        }
    }

    // Get images from cache
    getImagesFromCache(filter) {
        return this.cache[filter]?.images || [];
    }

    // Check if filter is loaded
    isFilterLoaded(filter) {
        return this.cache[filter]?.isLoaded || false;
    }

    // Set filter as loaded
    setFilterLoaded(filter, loaded = true) {
        if (this.cache[filter]) {
            this.cache[filter].isLoaded = loaded;
        }
    }

    // Get cache statistics
    getCacheStats() {
        const stats = {};

        Object.keys(this.cache).forEach(filter => {
            const cache = this.cache[filter];

            stats[filter] = {
                imageCount: cache.images.length,
                currentPage: cache.currentPage,
                hasMore: cache.hasMore,
                isLoaded: cache.isLoaded,
                scrollPosition: cache.scrollPosition
            };
        });

        return stats;
    }

    // Update pagination info
    updatePagination(filter, page, hasMore, tags = []) {
        const key = this.getCacheKey(filter, tags);
        if (this.cache[key]) {
            console.log(`📊 CACHE: Updating pagination for ${key}:`, {
                oldPage: this.cache[key].currentPage,
                newPage: page,
                oldHasMore: this.cache[key].hasMore,
                newHasMore: hasMore
            });

            this.cache[key].currentPage = page;
            this.cache[key].hasMore = hasMore;
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedCacheManager = FeedCacheManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedCacheManager;
}
