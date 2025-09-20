import { PrismaBaseRepository } from './PrismaBaseRepository.js';
import { NotFoundError } from '../errors/CustomErrors.js';

export class PrismaTagRepository extends PrismaBaseRepository {
    constructor() {
        super('tags');
    }

    async createTag(tagData) {
        return await this.prisma.tags.create({
            data: tagData
        });
    }

    async deleteTag(userId, imageId, tag) {
        const tagRecord = await this.prisma.tags.findFirst({
            where: {
                userId,
                imageId,
                tag
            }
        });

        if (!tagRecord) {
            throw new NotFoundError('Tag not found');
        }

        return await this.prisma.tags.delete({
            where: { id: tagRecord.id }
        });
    }

    async getTagsByImageId(imageId) {
        return await this.prisma.tags.findMany({
            where: { imageId },
            include: {
                user: true
            }
        });
    }

    async getTagsByUserId(userId) {
        return await this.prisma.tags.findMany({
            where: { userId },
            include: {
                image: true
            }
        });
    }

    async findTag(userId, imageId, tag) {
        return await this.prisma.tags.findFirst({
            where: {
                userId,
                imageId,
                tag
            }
        });
    }
}
