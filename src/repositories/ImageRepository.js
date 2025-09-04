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

        // Get images and total count for user
        const [images, total] = await Promise.all([
            this.prisma.image.findMany({
                where: { userId: userId || 'undefined' },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip
            }),
            this.prisma.image.count({
                where: { userId: userId || 'undefined' }
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

        // Get images and total count
        const [images, total] = await Promise.all([
            this.prisma.image.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip
            }),
            this.prisma.image.count()
        ]);

        return {
            images,
            hasMore: skip + limit < total,
            totalCount: total
        };
    }

    async updateRating(id, rating) {
        const image = await this.prisma.image.update({
            where: { id },
            data: { rating }
        });

        return image;
    }

    async countByUserId(userId) {
        return await this.prisma.image.count({
            where: { userId: userId || 'undefined' }
        });
    }

    async countAll() {
        return await this.prisma.image.count();
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
}
