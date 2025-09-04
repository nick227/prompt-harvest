import databaseClient from '../database/PrismaClient.js';
import { DatabaseError } from '../errors/CustomErrors.js';

export class PrismaBaseRepository {
    constructor(modelName) {
        this.modelName = modelName;
        this.prisma = databaseClient.getClient();
    }

    // Create a new record
    async create(data) {
        try {
            return await this.prisma[this.modelName].create({
                data
            });
        } catch (error) {
            throw new DatabaseError(`Failed to create ${this.modelName}`, 'create', error);
        }
    }

    // Find a record by ID
    async findById(id) {
        try {
            return await this.prisma[this.modelName].findUnique({
                where: { id }
            });
        } catch (error) {
            throw new DatabaseError(`Failed to find ${this.modelName} by ID`, 'findById', error);
        }
    }

    // Find multiple records by IDs
    async findByIds(ids) {
        try {
            return await this.prisma[this.modelName].findMany({
                where: {
                    id: { in: ids }
                }
            });
        } catch (error) {
            throw new DatabaseError(`Failed to find ${this.modelName}s by IDs`, 'findByIds', error);
        }
    }

    // Find records by user ID
    async findByUserId(userId, options = {}) {
        try {
            const { skip = 0, take = 10, orderBy = { createdAt: 'desc' } } = options;

            return await this.prisma[this.modelName].findMany({
                where: { userId },
                skip,
                take,
                orderBy
            });
        } catch (error) {
            throw new DatabaseError(`Failed to find ${this.modelName}s by user ID`, 'findByUserId', error);
        }
    }

    // Count records by user ID
    async countByUserId(userId) {
        try {
            return await this.prisma[this.modelName].count({
                where: { userId }
            });
        } catch (error) {
            throw new DatabaseError(`Failed to count ${this.modelName}s by user ID`, 'countByUserId', error);
        }
    }

    // Update a record by ID
    async updateById(id, data) {
        try {
            return await this.prisma[this.modelName].update({
                where: { id },
                data
            });
        } catch (error) {
            throw new DatabaseError(`Failed to update ${this.modelName}`, 'updateById', error);
        }
    }

    // Delete a record by ID
    async deleteById(id) {
        try {
            return await this.prisma[this.modelName].delete({
                where: { id }
            });
        } catch (error) {
            throw new DatabaseError(`Failed to delete ${this.modelName}`, 'deleteById', error);
        }
    }

    // Find records with pagination
    async findWithPagination(options = {}) {
        try {
            const { skip = 0, take = 10, where = {}, orderBy = { createdAt: 'desc' }, include = {} } = options;

            const [data, total] = await Promise.all([
                this.prisma[this.modelName].findMany({
                    where,
                    skip,
                    take,
                    orderBy,
                    include
                }),
                this.prisma[this.modelName].count({ where })
            ]);

            return {
                data,
                pagination: {
                    skip,
                    take,
                    total,
                    hasMore: skip + take < total,
                    totalPages: Math.ceil(total / take),
                    currentPage: Math.floor(skip / take) + 1
                }
            };
        } catch (error) {
            throw new DatabaseError(`Failed to find ${this.modelName}s with pagination`, 'findWithPagination', error);
        }
    }

    // Insert multiple records
    async insertMany(data) {
        try {
            return await this.prisma[this.modelName].createMany({
                data,
                skipDuplicates: true
            });
        } catch (error) {
            throw new DatabaseError(`Failed to insert multiple ${this.modelName}s`, 'insertMany', error);
        }
    }

    // Update multiple records
    async updateMany(where, data) {
        try {
            return await this.prisma[this.modelName].updateMany({
                where,
                data
            });
        } catch (error) {
            throw new DatabaseError(`Failed to update multiple ${this.modelName}s`, 'updateMany', error);
        }
    }

    // Delete multiple records
    async deleteMany(where) {
        try {
            return await this.prisma[this.modelName].deleteMany({
                where
            });
        } catch (error) {
            throw new DatabaseError(`Failed to delete multiple ${this.modelName}s`, 'deleteMany', error);
        }
    }

    // Count all records
    async count(where = {}) {
        try {
            return await this.prisma[this.modelName].count({
                where
            });
        } catch (error) {
            throw new DatabaseError(`Failed to count ${this.modelName}s`, 'count', error);
        }
    }

    // Find first record matching criteria
    async findFirst(where, include = {}) {
        try {
            return await this.prisma[this.modelName].findFirst({
                where,
                include
            });
        } catch (error) {
            throw new DatabaseError(`Failed to find first ${this.modelName}`, 'findFirst', error);
        }
    }

    // Find all records matching criteria
    async findMany(where = {}, include = {}, orderBy = { createdAt: 'desc' }) {
        try {
            return await this.prisma[this.modelName].findMany({
                where,
                include,
                orderBy
            });
        } catch (error) {
            throw new DatabaseError(`Failed to find ${this.modelName}s`, 'findMany', error);
        }
    }

    // Execute raw query
    async executeRaw(query, params = []) {
        try {
            return await this.prisma.$queryRawUnsafe(query, ...params);
        } catch (error) {
            throw new DatabaseError(`Failed to execute raw query on ${this.modelName}`, 'executeRaw', error);
        }
    }
}
