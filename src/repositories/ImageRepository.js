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

    async findPublicImages(limit = 8, page = 0, tags = []) {
        const skip = page * limit;

        // Get only public images for the public feed, exclude admin-hidden images
        const whereClause = {
            isPublic: true,
            isHidden: false // Exclude admin-hidden images
        };

        // Add tag filtering if tags are provided
        if (tags && tags.length > 0) {
            // Use JSON_CONTAINS to find images that contain ALL specified tags
            // This implements AND logic: image must contain all selected tags
            whereClause.AND = tags.map(tag => ({
                tags: {
                    path: '$',
                    array_contains: [tag.toLowerCase()]
                }
            }));
        }


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


            return {
                images: safeImages,
                hasMore: skip + limit < total,
                totalCount: total
            };
        }


        return {
            images,
            hasMore: skip + limit < total,
            totalCount: total
        };
    }

    /**
     * Build where clause for user images with optional tag filtering
     */
    buildUserImagesWhereClause(userId, tags = []) {
        const whereClause = { userId };

        if (tags && tags.length > 0) {
            whereClause.AND = tags.map(tag => ({
                tags: {
                    path: '$',
                    array_contains: [tag.toLowerCase()]
                }
            }));
        }

        return whereClause;
    }

    /**
     * Fetch images and count with pagination
     */
    async fetchUserImagesWithPagination(whereClause, limit, skip) {
        return await Promise.all([
            this.prisma.image.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip
            }),
            this.prisma.image.count({ where: whereClause })
        ]);
    }

    /**
     * Validate privacy and filter out other users' images
     */
    validateAndFilterUserImages(images, userId, totalCount) {
        const otherUserImages = images.filter(img => img.userId !== userId);

        if (otherUserImages.length > 0) {
            console.error('🚨 REPOSITORY PRIVACY VIOLATION: Other users images returned from findUserImages!', otherUserImages);
            const safeImages = images.filter(img => img.userId === userId);


            return {
                images: safeImages,
                totalCount: totalCount - otherUserImages.length
            };
        }

        return { images, totalCount };
    }

    /**
     * Format and log results
     */
    logUserImagesResults(images, totalCount, hasMore, tags, _skip, _limit) {
        console.log(`✅ IMAGE-REPOSITORY: findUserImages returning ${images.length} user images${tags.length > 0 ? ` filtered by tags: ${tags.join(', ')}` : ''}:`, {
            imagesFound: images.length,
            totalCount,
            hasMore,
            firstImage: images[0]
                ? {
                    id: images[0].id,
                    userId: images[0].userId,
                    provider: images[0].provider,
                    model: images[0].model,
                    createdAt: images[0].createdAt
                }
                : null
        });
    }

    async findUserImages(userId, limit = 8, page = 0, tags = []) {
        const skip = page * limit;


        // Check total images for user
        const totalImagesForUser = await this.prisma.image.count({ where: { userId } });


        // Build where clause and fetch data
        const whereClause = this.buildUserImagesWhereClause(userId, tags);


        const [images, totalCount] = await this.fetchUserImagesWithPagination(whereClause, limit, skip);

        // Validate privacy and filter
        const { images: safeImages, totalCount: safeTotalCount } = this.validateAndFilterUserImages(images, userId, totalCount);

        const hasMore = skip + limit < safeTotalCount;

        this.logUserImagesResults(safeImages, safeTotalCount, hasMore, tags, skip, limit);

        return {
            images: safeImages,
            hasMore,
            totalCount: safeTotalCount
        };
    }

    /**
     * Find public images for a specific user (for profile display)
     * @param {string} userId - User ID
     * @param {number} limit - Number of images per page
     * @param {number} page - Page number (0-based)
     * @returns {Promise<Object>} Images with pagination metadata
     */
    async findUserPublicImages(userId, limit = 20, page = 0) {
        const skip = page * limit;

        const whereClause = {
            userId,
            isPublic: true
        };

        const [images, totalCount] = await Promise.all([
            this.prisma.image.findMany({
                where: whereClause,
                select: {
                    id: true,
                    prompt: true,
                    original: true,
                    imageUrl: true,
                    provider: true,
                    rating: true,
                    isPublic: true,
                    userId: true,
                    createdAt: true,
                    updatedAt: true
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: limit
            }),
            this.prisma.image.count({ where: whereClause })
        ]);

        // Validation: Log if database returns non-public images
        const nonPublicImages = images.filter(img => img.isPublic !== true);

        if (nonPublicImages.length > 0) {
            console.error('🚨 REPOSITORY INTEGRITY ERROR: findUserPublicImages returned non-public images!', {
                userId,
                count: nonPublicImages.length,
                imageIds: nonPublicImages.map(img => img.id)
            });
        }

        return {
            images,
            totalCount,
            hasMore: skip + limit < totalCount
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
