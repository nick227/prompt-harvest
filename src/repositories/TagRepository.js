import { BaseRepository } from './BaseRepository.js';

export class TagRepository extends BaseRepository {
    constructor() {
        super('tags.db');
    }

    async findByUserAndImage(userId, imageId) {
        const params = {
            userId: userId || 'undefined',
            imageId
        };

        return await this.find(params);
    }

    async addTag(userId, imageId, tag) {
        const params = {
            imageId,
            tag,
            userId: userId || 'undefined'
        };
        const query = {
            imageId,
            tag,
            userId: userId || 'undefined'
        };

        return await this.upsert(query, params);
    }

    async removeTag(userId, imageId, tag) {
        const params = {
            imageId,
            tag,
            userId: userId || 'undefined'
        };

        return await this.remove(params);
    }

    async getTagsByImage(userId, imageId) {
        const tags = await this.findByUserAndImage(userId, imageId);

        return tags.map(obj => obj.tag);
    }

    async getTagsByUser(userId, limit = 8, page = 0) {
        const params = {
            userId: userId || 'undefined',
            limit,
            page
        };

        return await this.find(params);
    }

    async getImagesByTag(userId, tag, limit = 8, page = 0) {
        const params = {
            userId: userId || 'undefined',
            tag,
            limit,
            page
        };

        return await this.find(params);
    }

    async countTagsByImage(userId, imageId) {
        const params = {
            userId: userId || 'undefined',
            imageId
        };

        return await this.count(params);
    }

    async countTagsByUser(userId) {
        const params = {
            userId: userId || 'undefined'
        };

        return await this.count(params);
    }

    async getPopularTags(limit = 10) {
        // This would require aggregation, but NeDB doesn't support it directly
        // For now, we'll return all tags and let the service handle popularity
        const allTags = await this.find({});
        const tagCounts = {};

        allTags.forEach(tag => {
            tagCounts[tag.tag] = (tagCounts[tag.tag] || 0) + 1;
        });

        const sortedTags = Object.entries(tagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([tag]) => tag);

        return sortedTags;
    }
}
