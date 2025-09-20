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
        // Always exclude admin-hidden images from public feeds
        let whereClause;

        if (userId) {
            // For authenticated users: get own images + public images from others
            // Exclude admin-hidden images from all queries
            whereClause = {
                AND: [
                    { isHidden: false }, // Exclude admin-hidden images
                    {
                        OR: [
                            { userId }, // User's own images (public or private)
                            {
                                isPublic: true,
                                userId: { not: userId } // Public images from other users only
                            }
                        ]
                    }
                ]
            };
        } else {
            // For anonymous users: only public images, exclude admin-hidden
            whereClause = {
                isPublic: true,
                isHidden: false // Exclude admin-hidden images
            };
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

        // Get only public images for the public feed, exclude admin-hidden images
        const [images, total] = await Promise.all([
            this.prisma.image.findMany({
                where: {
                    isPublic: true,
                    isHidden: false // Exclude admin-hidden images
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip
            }),
            this.prisma.image.count({
                where: {
                    isPublic: true,
                    isHidden: false // Exclude admin-hidden images
                }
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
        // Always exclude admin-hidden images from public feeds
        let whereClause;

        if (userId) {
            // For authenticated users: get own images + public images from others
            // Exclude admin-hidden images from all queries
            whereClause = {
                AND: [
                    { isHidden: false }, // Exclude admin-hidden images
                    {
                        OR: [
                            { userId }, // User's own images (public or private)
                            {
                                isPublic: true,
                                userId: { not: userId } // Public images from other users only
                            }
                        ]
                    }
                ]
            };
        } else {
            // For anonymous users: only public images, exclude admin-hidden
            whereClause = {
                isPublic: true,
                isHidden: false // Exclude admin-hidden images
            };
        }

        return await this.prisma.image.count({
            where: whereClause
        });
    }

    async countAll() {
        return await this.prisma.image.count({
            where: {
                isPublic: true,
                isHidden: false // Exclude admin-hidden images
            }
        });
    }

    async findPublicImages(limit = 8, page = 0) {
        const skip = page * limit;

        // Get only public images for the public feed, exclude admin-hidden images
        const whereClause = {
            isPublic: true,
            isHidden: false // Exclude admin-hidden images
        };

        console.log('🔍 REPOSITORY: findPublicImages called with whereClause:', whereClause);

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

        // Safety check: verify all returned images are actually public
        const nonPublicImages = images.filter(img => !img.isPublic);
        if (nonPublicImages.length > 0) {
            console.error('🚨 REPOSITORY PRIVACY VIOLATION: Non-public images returned from findPublicImages!', nonPublicImages);
            // Filter out non-public images as safety measure
            const safeImages = images.filter(img => img.isPublic);
            console.log(`🔧 REPOSITORY: Filtered out ${nonPublicImages.length} non-public images, returning ${safeImages.length} safe images`);
            return {
                images: safeImages,
                hasMore: skip + limit < total,
                totalCount: total
            };
        }

        console.log(`✅ REPOSITORY: findPublicImages returning ${images.length} public images`);
        return {
            images,
            hasMore: skip + limit < total,
            totalCount: total
        };
    }

    async findUserImages(userId, limit = 8, page = 0) {
        const skip = page * limit;

        console.log('🔄 IMAGE-REPOSITORY: findUserImages called with:', { userId, limit, page, skip });

        // First, let's check if ANY images exist for this user
        const totalImagesForUser = await this.prisma.image.count({ where: { userId } });
        console.log('🔍 IMAGE-REPOSITORY: Total images in database for user:', totalImagesForUser);

        const whereClause = { userId };
        console.log('🔄 IMAGE-REPOSITORY: Using whereClause:', whereClause);

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

        // Safety check: verify all returned images belong to the user
        const otherUserImages = images.filter(img => img.userId !== userId);
        if (otherUserImages.length > 0) {
            console.error('🚨 REPOSITORY PRIVACY VIOLATION: Other users images returned from findUserImages!', otherUserImages);
            // Filter out other users' images as safety measure
            const safeImages = images.filter(img => img.userId === userId);
            console.log(`🔧 REPOSITORY: Filtered out ${otherUserImages.length} other users images, returning ${safeImages.length} safe images`);
            return {
                images: safeImages,
                hasMore: skip + limit < totalCount,
                totalCount: totalCount - otherUserImages.length
            };
        }

        console.log('✅ IMAGE-REPOSITORY: findUserImages result:', {
            imagesFound: images.length,
            totalCount,
            hasMore: skip + limit < totalCount,
            firstImage: images[0] ? {
                id: images[0].id,
                userId: images[0].userId,
                provider: images[0].provider,
                model: images[0].model,
                createdAt: images[0].createdAt
            } : null
        });

        return {
            images,
            hasMore: skip + limit < totalCount,
            totalCount
        };
    }

    async deleteById(id) {
        return await this.prisma.image.delete({
            where: { id }
        });
    }

    async create(imageData) {
        return await this.prisma.image.create({
            data: imageData
        });
    }

    async update(id, data) {
        return await this.prisma.image.update({
            where: { id },
            data
        });
    }

    async findWithLikes(id) {
        return await this.prisma.image.findUnique({
            where: { id },
            include: {
                user: true,
                likes: true,
                tags: true
            }
        });
    }
}
