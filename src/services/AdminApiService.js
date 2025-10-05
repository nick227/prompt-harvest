/**
 * Admin API Service
 * Business logic layer for admin API endpoints
 * Removes direct database access from controllers
 */

import databaseClient from '../database/PrismaClient.js';

export class AdminApiService {
    constructor(enhancedImageService, blogService) {
        this.imageService = enhancedImageService;
        this.blogService = blogService;
        this.prisma = databaseClient.getClient();
    }

    /**
     * Generate image via service layer
     */
    async generateImage(data, user) {
        const {
            prompt,
            providers,
            guidance = 10,
            multiplier = '',
            mixup = false,
            mashup = false,
            autoPublic = false,
            customVariables = '',
            promptId = null,
            original = '',
            model = null,
            size = null
        } = data;

        return await this.imageService.generateImage(
            prompt,
            providers,
            guidance,
            user.id,
            {
                multiplier,
                mixup,
                mashup,
                autoPublic,
                customVariables,
                promptId,
                original,
                model,
                size
            }
        );
    }

    /**
     * Create blog post via service layer
     */
    async createBlogPost(data, user) {
        const {
            title,
            content,
            excerpt,
            thumbnail,
            tags = [],
            isPublished = false,
            isFeatured = false,
            metadata = {}
        } = data;

        return await this.blogService.createPost(user.id, {
            title,
            content,
            excerpt,
            thumbnail,
            tags,
            isPublished,
            isFeatured,
            metadata
        }, true);
    }

    /**
     * Get usage statistics via service layer
     */
    async getUsageStats(user, filters) {
        const { startDate, endDate, limit = 100 } = filters;

        const where = { userId: user.id };
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const [requests, totalCount] = await Promise.all([
            this.prisma.ApiRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit)
            }),
            this.prisma.ApiRequest.count({ where })
        ]);

        return {
            total: totalCount,
            successful: requests.filter(r => r.statusCode >= 200 && r.statusCode < 300).length,
            failed: requests.filter(r => r.statusCode >= 400).length,
            averageTime: requests.reduce((sum, r) => sum + (r.duration || 0), 0) / requests.length || 0,
            recent: requests.slice(0, 10).map(r => ({
                endpoint: r.endpoint,
                method: r.method,
                status: r.statusCode,
                duration: r.duration,
                createdAt: r.createdAt
            }))
        };
    }
}
