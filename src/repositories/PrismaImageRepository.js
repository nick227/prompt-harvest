import { PrismaBaseRepository } from './PrismaBaseRepository.js';
import { NotFoundError } from '../errors/CustomErrors.js';

export class PrismaImageRepository extends PrismaBaseRepository {
    constructor() {
        super('image');
    }

    // Create image with user relation
    async createImage(imageData) {
        return await this.create(imageData);
    }

    // Get image by ID with relations
    async getImageById(id) {
        const image = await this.prisma.image.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                },
                likes: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                },
                tags: true
            }
        });

        if (!image) {
            throw new NotFoundError('Image not found', 'image');
        }

        return image;
    }

    // Get images by user with pagination
    async getImagesByUser(userId, limit = 8, page = 0) {
        const skip = page * limit;
        
        return await this.findWithPagination({
            where: { userId },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                likes: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                },
                tags: true
            }
        });
    }

    // Get recent images
    async getRecentImages(limit = 10) {
        return await this.prisma.image.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true
                    }
                },
                likes: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                },
                tags: true
            }
        });
    }

    // Update image rating
    async updateRating(id, rating) {
        const image = await this.findById(id);
        if (!image) {
            throw new NotFoundError('Image not found', 'image');
        }

        return await this.updateById(id, { rating });
    }

    // Get images by provider
    async getImagesByProvider(provider, limit = 10) {
        return await this.prisma.image.findMany({
            where: { provider },
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            }
        });
    }

    // Get popular images (by likes count)
    async getPopularImages(limit = 10) {
        return await this.prisma.image.findMany({
            take: limit,
            orderBy: [
                {
                    likes: {
                        _count: 'desc'
                    }
                },
                { createdAt: 'desc' }
            ],
            include: {
                user: {
                    select: {
                        id: true,
                        username: true
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        tags: true
                    }
                }
            }
        });
    }

    // Search images by prompt
    async searchImages(searchTerm, limit = 10) {
        return await this.prisma.image.findMany({
            where: {
                OR: [
                    { prompt: { contains: searchTerm, mode: 'insensitive' } },
                    { original: { contains: searchTerm, mode: 'insensitive' } }
                ]
            },
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            }
        });
    }

    // Get image statistics
    async getImageStats() {
        const [totalImages, totalLikes, totalTags, imagesByProvider] = await Promise.all([
            this.prisma.image.count(),
            this.prisma.like.count(),
            this.prisma.tag.count(),
            this.prisma.image.groupBy({
                by: ['provider'],
                _count: {
                    id: true
                }
            })
        ]);

        return {
            totalImages,
            totalLikes,
            totalTags,
            imagesByProvider: imagesByProvider.reduce((acc, item) => {
                acc[item.provider] = item._count.id;
                return acc;
            }, {}),
            timestamp: new Date().toISOString()
        };
    }
}
