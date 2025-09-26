/**
 * FeedService - Image feed and discovery
 *
 * Handles public feed, user feeds, and image discovery functionality.
 * Extracted from EnhancedImageService.
 */

import { ValidationError } from '../../errors/CustomErrors.js';
import databaseClient from '../../database/PrismaClient.js';

export class FeedService {
    constructor() {
        this.prisma = databaseClient.getClient();
    }

    async getFeed(userId, limit = 8, page = 0, tags = []) {
        console.log('🔧 FeedService.getFeed called:', { userId, limit, page, tags });

        try {
            const skip = page * limit;
            const whereClause = { isPublic: true };

            // Add tag filtering if provided
            if (tags && tags.length > 0) {
                whereClause.tags = {
                    some: {
                        name: {
                            in: tags
                        }
                    }
                };
            }

            const images = await this.prisma.image.findMany({
                where: whereClause,
                include: {
                    tags: true,
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
            });

            const totalCount = await this.prisma.image.count({
                where: whereClause
            });

            return {
                images,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            };
        } catch (error) {
            console.error('❌ Error fetching feed:', error);
            throw error;
        }
    }

    async getUserPublicImages(userId, limit = 20, page = 1) {
        console.log('🔧 FeedService.getUserPublicImages called:', { userId, limit, page });

        if (!userId) {
            throw new ValidationError('User ID is required');
        }

        try {
            const skip = (page - 1) * limit;

            const images = await this.prisma.image.findMany({
                where: {
                    userId,
                    isPublic: true
                },
                include: {
                    tags: true,
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
            });

            const totalCount = await this.prisma.image.count({
                where: {
                    userId,
                    isPublic: true
                }
            });

            return {
                images,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            };
        } catch (error) {
            console.error('❌ Error fetching user public images:', error);
            throw error;
        }
    }

    async getUserOwnImages(userId, limit = 8, page = 0, tags = []) {
        console.log('🔧 FeedService.getUserOwnImages called:', { userId, limit, page, tags });

        if (!userId) {
            throw new ValidationError('User ID is required');
        }

        try {
            const skip = page * limit;
            const whereClause = { userId };

            // Add tag filtering if provided
            if (tags && tags.length > 0) {
                whereClause.tags = {
                    some: {
                        name: {
                            in: tags
                        }
                    }
                };
            }

            const images = await this.prisma.image.findMany({
                where: whereClause,
                include: {
                    tags: true,
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
            });

            const totalCount = await this.prisma.image.count({
                where: whereClause
            });

            return {
                images,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            };
        } catch (error) {
            console.error('❌ Error fetching user own images:', error);
            throw error;
        }
    }

    async getActiveModels() {

        try {
            return await this.prisma.model.findMany({
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
        } catch (error) {
            console.error('❌ Error fetching active models:', error);
            throw error;
        }
    }

    async getHealth() {
        return {
            service: 'FeedService',
            status: 'healthy',
            timestamp: new Date().toISOString()
        };
    }
}
