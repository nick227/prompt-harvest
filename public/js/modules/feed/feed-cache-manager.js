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

    // Get cache for specific filter
    getCache(filter) {
        return this.cache[filter] || null;
    }

    // Set cache for specific filter
    setCache(filter, data) {
        if (this.cache[filter]) {
            console.log(`📊 CACHE: Setting cache for ${filter}:`, {
                imageCount: data.images?.length,
                hasMore: data.hasMore,
                currentPage: data.currentPage,
                isLoaded: data.isLoaded
            });

            this.cache[filter] = { ...this.cache[filter], ...data };
        }
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
    addImagesToCache(filter, images) {
        if (this.cache[filter]) {
            // Get existing image IDs to prevent duplicates
            const existingIds = new Set(this.cache[filter].images.map(img => img.id));

            // Filter out duplicate images
            const newImages = images.filter(image => {
                if (existingIds.has(image.id)) {
                    console.log('🚫 CACHE: Skipping duplicate image:', image.id);

                    return false;
                }

                return true;
            });

            // Add only new images to cache
            this.cache[filter].images = [...this.cache[filter].images, ...newImages];

            if (newImages.length > 0) {
                console.log(`✅ CACHE: Added ${newImages.length} new images to ${filter} cache`);
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
    updatePagination(filter, page, hasMore) {
        if (this.cache[filter]) {
            console.log(`📊 CACHE: Updating pagination for ${filter}:`, {
                oldPage: this.cache[filter].currentPage,
                newPage: page,
                oldHasMore: this.cache[filter].hasMore,
                newHasMore: hasMore
            });

            this.cache[filter].currentPage = page;
            this.cache[filter].hasMore = hasMore;
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
