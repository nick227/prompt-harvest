import databaseClient from '../../database/PrismaClient.js';
import { taggingService } from '../TaggingService.js';

export class AdminImageManagementService {
    constructor() {
        this.prisma = databaseClient.getClient();
    }

    /**
     * Build where clause for image queries
     */
    buildImageWhereClause(filters) {
        const where = {};

        if (filters.status === 'public') {
            where.isPublic = true;
        } else if (filters.status === 'private') {
            where.isPublic = false;
        }

        if (filters.userId) {
            where.userId = filters.userId;
        }

        if (filters.provider) {
            where.provider = filters.provider;
        }

        if (filters.model) {
            where.model = filters.model;
        }

        if (filters.dateFrom || filters.dateTo) {
            where.createdAt = {};
            if (filters.dateFrom) {
                where.createdAt.gte = new Date(filters.dateFrom);
            }
            if (filters.dateTo) {
                where.createdAt.lte = new Date(filters.dateTo);
            }
        }

        if (filters.search) {
            where.OR = [
                { prompt: { contains: filters.search, mode: 'insensitive' } },
                { provider: { contains: filters.search, mode: 'insensitive' } },
                { model: { contains: filters.search, mode: 'insensitive' } }
            ];
        }

        return where;
    }

    /**
     * Get order by clause for image queries
     */
    getImageOrderByClause(sortBy, sortOrder) {
        const validSortFields = {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt',
            prompt: 'prompt',
            provider: 'provider',
            model: 'model',
            rating: 'rating'
        };

        const field = validSortFields[sortBy] || 'createdAt';
        const order = sortOrder === 'desc' ? 'desc' : 'asc';

        return { [field]: order };
    }

    /**
     * Get images with filtering and pagination
     */
    async getImages(filters = {}, pagination = {}) {
        const {
            page = 1,
            limit = 25,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = { ...filters, ...pagination };

        const skip = (page - 1) * limit;
        const where = this.buildImageWhereClause(filters);
        const orderBy = this.getImageOrderByClause(sortBy, sortOrder);

        const [images, totalCount] = await Promise.all([
            this.prisma.image.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            username: true
                        }
                    }
                },
                orderBy,
                skip,
                take: limit
            }),
            this.prisma.image.count({ where })
        ]);

        return {
            images,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        };
    }

    /**
     * Get detailed image information
     */
    async getImageDetails(imageId) {
        const image = await this.prisma.image.findUnique({
            where: { id: imageId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        name: true,
                        createdAt: true
                    }
                }
            }
        });

        if (!image) {
            throw new Error('Image not found');
        }

        return image;
    }

    /**
     * Delete image
     */
    async deleteImage(imageId) {
        const image = await this.prisma.image.findUnique({
            where: { id: imageId }
        });

        if (!image) {
            throw new Error('Image not found');
        }

        const result = await this.prisma.image.delete({
            where: { id: imageId }
        });

        return result;
    }

    /**
     * Moderate image (hide/show)
     */
    async moderateImage(imageId, action) {
        const image = await this.prisma.image.findUnique({
            where: { id: imageId }
        });

        if (!image) {
            throw new Error('Image not found');
        }

        const isPublic = action === 'show';
        const result = await this.prisma.image.update({
            where: { id: imageId },
            data: { isPublic }
        });

        return result;
    }

    /**
     * Toggle image visibility
     */
    async toggleVisibility(imageId) {
        const image = await this.prisma.image.findUnique({
            where: { id: imageId }
        });

        if (!image) {
            throw new Error('Image not found');
        }

        const result = await this.prisma.image.update({
            where: { id: imageId },
            data: { isPublic: !image.isPublic }
        });

        return result;
    }

    /**
     * Export images to CSV format
     */
    async exportImages(filters = {}) {
        const where = this.buildImageWhereClause(filters);

        const images = await this.prisma.image.findMany({
            where,
            include: {
                user: {
                    select: {
                        email: true,
                        username: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return images;
    }

    /**
     * Generate tags for image
     */
    async generateTags(imageId) {
        const image = await this.prisma.image.findUnique({
            where: { id: imageId }
        });

        if (!image) {
            throw new Error('Image not found');
        }

        try {
            const tags = await taggingService.generateTags(image.prompt, {
                provider: image.provider,
                model: image.model
            });

            const result = await this.prisma.image.update({
                where: { id: imageId },
                data: { tags }
            });

            return { success: true, tags, image: result };
        } catch (error) {
            console.error('Error generating tags:', error);
            throw new Error('Failed to generate tags');
        }
    }

    /**
     * Update image tags
     */
    async updateTags(imageId, tags) {
        const image = await this.prisma.image.findUnique({
            where: { id: imageId }
        });

        if (!image) {
            throw new Error('Image not found');
        }

        const result = await this.prisma.image.update({
            where: { id: imageId },
            data: { tags }
        });

        return result;
    }

    /**
     * Admin hide image
     */
    async adminHideImage(imageId, adminId, reason) {
        const image = await this.prisma.image.findUnique({
            where: { id: imageId }
        });

        if (!image) {
            throw new Error('Image not found');
        }

        const result = await this.prisma.image.update({
            where: { id: imageId },
            data: {
                isPublic: false,
                adminHidden: true,
                adminHiddenBy: adminId,
                adminHiddenAt: new Date(),
                adminHiddenReason: reason
            }
        });

        return result;
    }

    /**
     * Admin show image
     */
    async adminShowImage(imageId, adminId) {
        const image = await this.prisma.image.findUnique({
            where: { id: imageId }
        });

        if (!image) {
            throw new Error('Image not found');
        }

        const result = await this.prisma.image.update({
            where: { id: imageId },
            data: {
                isPublic: true,
                adminHidden: false,
                adminHiddenBy: null,
                adminHiddenAt: null,
                adminHiddenReason: null
            }
        });

        return result;
    }
}
