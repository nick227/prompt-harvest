import { PrismaTagRepository } from '../repositories/PrismaTagRepository.js';
import { ValidationError, NotFoundError as _NotFoundError } from '../errors/CustomErrors.js';

export class TagService {
    constructor() {
        this.tagRepository = new PrismaTagRepository();
    }

    async createTag(userId, imageId, tag) {
        if (!userId || !imageId || !tag) {
            throw new ValidationError('User ID, Image ID, and Tag are required');
        }

        // Check if tag already exists for this image
        const existingTag = await this.tagRepository.findTag(userId, imageId, tag);

        if (existingTag) {
            throw new ValidationError('Tag already exists for this image');
        }

        return await this.tagRepository.createTag({
            userId,
            imageId,
            tag,
            createdAt: new Date()
        });
    }

    async deleteTag(userId, imageId, tag) {
        if (!userId || !imageId || !tag) {
            throw new ValidationError('User ID, Image ID, and Tag are required');
        }

        return await this.tagRepository.deleteTag(userId, imageId, tag);
    }

    async getTagsByImageId(imageId) {
        if (!imageId) {
            throw new ValidationError('Image ID is required');
        }

        return await this.tagRepository.getTagsByImageId(imageId);
    }

    async getTagsByUserId(userId) {
        if (!userId) {
            throw new ValidationError('User ID is required');
        }

        return await this.tagRepository.getTagsByUserId(userId);
    }

    async findTag(userId, imageId, tag) {
        if (!userId || !imageId || !tag) {
            return null;
        }

        return await this.tagRepository.findTag(userId, imageId, tag);
    }
}
