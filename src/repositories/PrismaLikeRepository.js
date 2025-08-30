import { PrismaBaseRepository } from './PrismaBaseRepository.js';
import { NotFoundError } from '../errors/CustomErrors.js';

export class PrismaLikeRepository extends PrismaBaseRepository {
    constructor() {
        super('likes');
    }

    async createLike(likeData) {
        return await this.prisma.likes.create({
            data: likeData
        });
    }

    async deleteLike(userId, imageId) {
        const like = await this.prisma.likes.findFirst({
            where: {
                userId,
                imageId
            }
        });

        if (!like) {
            throw new NotFoundError('Like not found');
        }

        return await this.prisma.likes.delete({
            where: { id: like.id }
        });
    }

    async findLike(userId, imageId) {
        return await this.prisma.likes.findFirst({
            where: {
                userId,
                imageId
            }
        });
    }

    async getLikesByImageId(imageId) {
        return await this.prisma.likes.findMany({
            where: { imageId },
            include: {
                user: true
            }
        });
    }

    async getLikesByUserId(userId) {
        return await this.prisma.likes.findMany({
            where: { userId },
            include: {
                image: true
            }
        });
    }
}
