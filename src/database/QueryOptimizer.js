/**
 * QueryOptimizer - Database query optimization utilities
 *
 * Provides optimized query patterns and caching strategies for common database operations.
 */

import databaseClient from './PrismaClient.js';

export class QueryOptimizer {
    constructor() {
        this.prisma = databaseClient.getClient();
        this.queryCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Optimized image feed query with proper indexing
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Optimized query result
     */
    async getOptimizedImageFeed(options = {}) {
        const {
            limit = 8,
            page = 0,
            tags = [],
            userId = null,
            isPublic = true
        } = options;

        const skip = page * limit;
        const cacheKey = `feed_${limit}_${page}_${tags.join(',')}_${userId}_${isPublic}`;

        // Check cache first
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            // Build optimized where clause
            const whereClause = { isPublic };
            if (userId) {
                whereClause.userId = userId;
            }
            if (tags.length > 0) {
                whereClause.tags = {
                    some: {
                        name: {
                            in: tags
                        }
                    }
                };
            }

            // Use optimized query with proper select
            const [images, totalCount] = await Promise.all([
                this.prisma.image.findMany({
                    where: whereClause,
                    select: {
                        id: true,
                        prompt: true,
                        original: true,
                        isPublic: true,
                        rating: true,
                        createdAt: true,
                        userId: true,
                        tags: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        user: {
                            select: {
                                id: true,
                                username: true,
                                picture: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit
                }),
                this.prisma.image.count({
                    where: whereClause
                })
            ]);

            const result = {
                images,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            };

            // Cache the result
            this.setCache(cacheKey, result);
            return result;

        } catch (error) {
            console.error('❌ Optimized image feed query failed:', error);
            throw error;
        }
    }

    /**
     * Optimized user images query
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Optimized query result
     */
    async getOptimizedUserImages(userId, options = {}) {
        const {
            limit = 50,
            page = 0,
            tags = [],
            isPublic = null
        } = options;

        const skip = page * limit;
        const cacheKey = `user_images_${userId}_${limit}_${page}_${tags.join(',')}_${isPublic}`;

        // Check cache first
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const whereClause = { userId };
            if (isPublic !== null) {
                whereClause.isPublic = isPublic;
            }
            if (tags.length > 0) {
                whereClause.tags = {
                    some: {
                        name: {
                            in: tags
                        }
                    }
                };
            }

            const [images, totalCount] = await Promise.all([
                this.prisma.image.findMany({
                    where: whereClause,
                    select: {
                        id: true,
                        prompt: true,
                        original: true,
                        isPublic: true,
                        rating: true,
                        createdAt: true,
                        tags: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit
                }),
                this.prisma.image.count({
                    where: whereClause
                })
            ]);

            const result = {
                images,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            };

            // Cache the result
            this.setCache(cacheKey, result);
            return result;

        } catch (error) {
            console.error('❌ Optimized user images query failed:', error);
            throw error;
        }
    }

    /**
     * Optimized model query with caching
     * @returns {Promise<Array>} Active models
     */
    async getOptimizedActiveModels() {
        const cacheKey = 'active_models';

        // Check cache first
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const models = await this.prisma.model.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    name: true,
                    provider: true,
                    cost: true,
                    isActive: true
                },
                orderBy: { name: 'asc' }
            });

            // Cache for longer since models don't change often
            this.setCache(cacheKey, models, 30 * 60 * 1000); // 30 minutes
            return models;

        } catch (error) {
            console.error('❌ Optimized active models query failed:', error);
            throw error;
        }
    }

    /**
     * Batch user lookup to avoid N+1 queries
     * @param {Array} userIds - Array of user IDs
     * @returns {Promise<Array>} User data
     */
    async batchGetUsers(userIds) {
        if (!userIds || userIds.length === 0) {
            return [];
        }

        const uniqueUserIds = [...new Set(userIds)];
        const cacheKey = `batch_users_${uniqueUserIds.sort().join(',')}`;

        // Check cache first
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const users = await this.prisma.user.findMany({
                where: { id: { in: uniqueUserIds } },
                select: {
                    id: true,
                    username: true,
                    picture: true
                }
            });

            // Cache the result
            this.setCache(cacheKey, users);
            return users;

        } catch (error) {
            console.error('❌ Batch user lookup failed:', error);
            throw error;
        }
    }

    /**
     * Optimized image count query
     * @param {string} userId - User ID (optional)
     * @param {boolean} isPublic - Public status filter
     * @returns {Promise<number>} Image count
     */
    async getOptimizedImageCount(userId = null, isPublic = null) {
        const cacheKey = `image_count_${userId}_${isPublic}`;

        // Check cache first
        const cached = this.getFromCache(cacheKey);
        if (cached !== null) {
            return cached;
        }

        try {
            const whereClause = {};
            if (userId) {
                whereClause.userId = userId;
            }
            if (isPublic !== null) {
                whereClause.isPublic = isPublic;
            }

            const count = await this.prisma.image.count({
                where: whereClause
            });

            // Cache for shorter time since counts change more frequently
            this.setCache(cacheKey, count, 2 * 60 * 1000); // 2 minutes
            return count;

        } catch (error) {
            console.error('❌ Optimized image count query failed:', error);
            throw error;
        }
    }

    /**
     * Cache management methods
     */
    getFromCache(key) {
        const cached = this.queryCache.get(key);
        if (cached && Date.now() - cached.timestamp < cached.timeout) {
            return cached.data;
        }
        if (cached) {
            this.queryCache.delete(key);
        }
        return null;
    }

    setCache(key, data, timeout = this.cacheTimeout) {
        this.queryCache.set(key, {
            data,
            timestamp: Date.now(),
            timeout
        });
    }

    clearCache(pattern = null) {
        if (pattern) {
            for (const key of this.queryCache.keys()) {
                if (key.includes(pattern)) {
                    this.queryCache.delete(key);
                }
            }
        } else {
            this.queryCache.clear();
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getCacheStats() {
        return {
            size: this.queryCache.size,
            keys: Array.from(this.queryCache.keys()),
            memoryUsage: process.memoryUsage()
        };
    }
}
