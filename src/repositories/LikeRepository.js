import { BaseRepository } from './BaseRepository.js';

export class LikeRepository extends BaseRepository {
    constructor() {
        super('likes.db');
    }

    async findByUserAndImage(userId, imageId) {
        const params = {
            userId: userId || 'undefined',
            imageId
        };

        return await this.findOne(params);
    }

    async addLike(userId, imageId) {
        const params = {
            userId: userId || 'undefined',
            imageId
        };

        return await this.insert(params);
    }

    async removeLike(userId, imageId) {
        const params = {
            userId: userId || 'undefined',
            imageId
        };

        return await this.remove(params);
    }

    async isLiked(userId, imageId) {
        const like = await this.findByUserAndImage(userId, imageId);

        return !!like;
    }

    async getLikesByUser(userId, limit = 8, page = 0) {
        const params = {
            userId: userId || 'undefined',
            limit,
            page
        };

        return await this.find(params);
    }

    async getLikesByImage(imageId, limit = 8, page = 0) {
        const params = {
            imageId,
            limit,
            page
        };

        return await this.find(params);
    }

    async countLikesByImage(imageId) {
        const params = { imageId };

        return await this.count(params);
    }

    async countLikesByUser(userId) {
        const params = {
            userId: userId || 'undefined'
        };

        return await this.count(params);
    }
}
