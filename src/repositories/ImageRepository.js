import { PrismaBaseRepository } from './PrismaBaseRepository.js';
import { NotFoundError } from '../errors/CustomErrors.js';

export class ImageRepository extends PrismaBaseRepository {
    constructor() {
        super('image');
    }

    async findById(id) {
        const image = await this.prisma.image.findUnique({
            where: { id }
        });

        if (!image) {
            throw new NotFoundError(`Image with id ${id} not found`);
        }

        return image;
    }

    async findByUserId(userId, limit = 8, page = 0) {
        const skip = page * limit;

        console.log('🔍 REPOSITORY: findByUserId called with:', {
            userId,
            limit,
            page,
            skip,
            whereClause: userId ? { userId } : {}
        });

        // Handle anonymous access - return only public images
        // For authenticated users - return their own images + public images from other users
        let whereClause;

        if (userId) {
            // For authenticated users: get own images + public images from others
            whereClause = {
                OR: [
                    { userId }, // User's own images (public or private)
                    {
                        isPublic: true,
                        userId: { not: userId } // Public images from other users only
                    }
                ]
            };
        } else {
            // For anonymous users: only public images
            whereClause = { isPublic: true };
        }

        // Get images and total count for user
        const [images, total] = await Promise.all([
            this.prisma.image.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip
            }),
            this.prisma.image.count({
                where: whereClause
            })
        ]);

        return {
            images,
            hasMore: skip + limit < total,
            totalCount: total
        };
    }

    async findAll(limit = 8, page = 0) {
        const skip = page * limit;

        // Get only public images for the public feed
        const [images, total] = await Promise.all([
            this.prisma.image.findMany({
                where: { isPublic: true },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip
            }),
            this.prisma.image.count({
                where: { isPublic: true }
            })
        ]);

        return {
            images,
            hasMore: skip + limit < total,
            totalCount: total
        };
    }

    async updateRating(id, rating) {
        return await this.prisma.image.update({
            where: { id },
            data: { rating }
        });
    }

    async updatePublicStatus(id, isPublic) {
        return await this.prisma.image.update({
            where: { id },
            data: { isPublic }
        });
    }

    async countByUserId(userId) {
        // Handle anonymous access - return total count for public images only
        // For authenticated users - return count of their own images + public images from other users
        let whereClause;

        if (userId) {
            // For authenticated users: get own images + public images from others
            whereClause = {
                OR: [
                    { userId }, // User's own images (public or private)
                    {
                        isPublic: true,
                        userId: { not: userId } // Public images from other users only
                    }
                ]
            };
        } else {
            // For anonymous users: only public images
            whereClause = { isPublic: true };
        }

        return await this.prisma.image.count({
            where: whereClause
        });
    }

    async countAll() {
        return await this.prisma.image.count({
            where: { isPublic: true }
        });
    }

    async findPublicImages(limit = 8, page = 0) {
        const skip = page * limit;

        // Get only public images for the public feed
        const [images, total] = await Promise.all([
            this.prisma.image.findMany({
                where: { isPublic: true },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip
            }),
            this.prisma.image.count({
                where: { isPublic: true }
            })
        ]);

        return {
            images,
            hasMore: skip + limit < total,
            totalCount: total
        };
    }

    async deleteById(id) {
        return await this.prisma.image.delete({
            where: { id }
        });
    }

    async createImage(imageData) {
        return await this.prisma.image.create({
            data: imageData
        });
    }

    async getImageById(id) {
        return await this.prisma.image.findUnique({
            where: { id },
            include: {
                user: true,
                likes: true,
                tags: true
            }
        });
    }

    async findUserOwnImages(userId, limit = 8, page = 0) {
        const skip = page * limit;

        console.log('🔍 REPOSITORY: findUserOwnImages called with:', {
            userId,
            limit,
            page,
            skip
        });

        if (!userId) {
            throw new Error('User ID is required for finding user own images');
        }

        // Only return images that belong to the user (regardless of public/private status)
        const whereClause = { userId };

        const [images, totalCount] = await Promise.all([
            this.prisma.image.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: skip
            }),
            this.prisma.image.count({
                where: whereClause
            })
        ]);

        console.log('🔍 REPOSITORY: findUserOwnImages result:', {
            imageCount: images.length,
            totalCount,
            userId
        });

        return { images, totalCount };
    }
}
