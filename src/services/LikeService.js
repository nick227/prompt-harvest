import { PrismaLikeRepository } from '../repositories/PrismaLikeRepository.js';
import { ValidationError, NotFoundError as _NotFoundError } from '../errors/CustomErrors.js';

export class LikeService {
    constructor() {
        this.likeRepository = new PrismaLikeRepository();
    }

    async createLike(userId, imageId) {
        if (!userId || !imageId) {
            throw new ValidationError('User ID and Image ID are required');
        }

        // Check if like already exists
        const existingLike = await this.likeRepository.findLike(userId, imageId);

        if (existingLike) {
            throw new ValidationError('User has already liked this image');
        }

        return await this.likeRepository.createLike({
            userId,
            imageId,
            createdAt: new Date()
        });
    }

    async deleteLike(userId, imageId) {
        if (!userId || !imageId) {
            throw new ValidationError('User ID and Image ID are required');
        }

        return await this.likeRepository.deleteLike(userId, imageId);
    }

    async checkIfLiked(userId, imageId) {
        if (!userId || !imageId) {
            return false;
        }

        const like = await this.likeRepository.findLike(userId, imageId);

        return !!like;
    }

    async getLikesByImageId(imageId) {
        if (!imageId) {
            throw new ValidationError('Image ID is required');
        }

        return await this.likeRepository.getLikesByImageId(imageId);
    }

    async getLikesByUserId(userId) {
        if (!userId) {
            throw new ValidationError('User ID is required');
        }

        return await this.likeRepository.getLikesByUserId(userId);
    }
}
