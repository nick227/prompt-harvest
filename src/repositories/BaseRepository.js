import DB from '../../db/DB.js';

export class BaseRepository {
    constructor(dbName) {
        this.db = new DB(dbName);
    }

    // Basic CRUD operations
    async findOne(query) {
        return await this.db.findOne(query);
    }

    async find(query) {
        return await this.db.find(query);
    }

    async insert(data) {
        return await this.db.insert(data);
    }

    async update(query, update) {
        return await this.db.update(query, update);
    }

    async remove(query) {
        return await this.db.remove(query);
    }

    async count(query) {
        return await this.db.count(query);
    }

    async upsert(query, data) {
        return await this.db.upsert(query, data);
    }

    // Enhanced operations
    async findById(id) {
        return await this.findOne({ _id: id });
    }

    async findByIds(ids) {
        return await this.find({ _id: { $in: ids } });
    }

    async findByUserId(userId, limit = 8, page = 0) {
        const params = {
            userId: userId || 'undefined',
            limit,
            page
        };

        return await this.find(params);
    }

    async countByUserId(userId) {
        const params = {
            userId: userId || 'undefined'
        };

        return await this.count(params);
    }

    async deleteById(id) {
        return await this.remove({ _id: id });
    }

    async updateById(id, update) {
        return await this.update({ _id: id }, update);
    }

    // Pagination helpers
    async findWithPagination(query = {}, limit = 8, page = 0) {
        const params = {
            ...query,
            limit,
            page
        };

        return await this.find(params);
    }

    // Batch operations
    async insertMany(documents) {
        const results = [];

        for (const doc of documents) {
            const result = await this.insert(doc);

            results.push(result);
        }

        return results;
    }

    async updateMany(query, update) {
        const documents = await this.find(query);
        const results = [];

        for (const doc of documents) {
            const result = await this.updateById(doc._id, update);

            results.push(result);
        }

        return results;
    }

    async removeMany(query) {
        const documents = await this.find(query);
        const results = [];

        for (const doc of documents) {
            const result = await this.deleteById(doc._id);

            results.push(result);
        }

        return results;
    }
}
