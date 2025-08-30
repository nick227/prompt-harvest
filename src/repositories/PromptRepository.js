import { BaseRepository } from './BaseRepository.js';

export class PromptRepository extends BaseRepository {
    constructor() {
        super('prompts.db');
    }

    async findByUserId(userId, limit = 8, page = 0) {
        const params = {
            userId: userId || 'undefined',
            limit,
            page
        };
        const response = await this.find(params);

        return response.map(doc => doc.data);
    }

    async countByUserId(userId) {
        const params = {
            userId: userId || 'undefined'
        };

        return await this.count(params);
    }

    async savePrompt(userId, promptData) {
        const data = {
            userId: userId || 'undefined',
            data: promptData
        };

        return await this.insert(data);
    }

    async updatePrompt(userId, promptId, promptData) {
        const query = {
            userId: userId || 'undefined',
            _id: promptId
        };
        const update = {
            $set: { data: promptData }
        };

        return await this.update(query, update);
    }

    async deletePrompt(userId, promptId) {
        const query = {
            userId: userId || 'undefined',
            _id: promptId
        };

        return await this.remove(query);
    }

    async getPromptById(userId, promptId) {
        const query = {
            userId: userId || 'undefined',
            _id: promptId
        };
        const result = await this.findOne(query);

        return result ? result.data : null;
    }

    async getRecentPrompts(userId, limit = 5) {
        const params = {
            userId: userId || 'undefined',
            limit
        };
        const response = await this.find(params);

        return response.map(doc => doc.data);
    }
}
