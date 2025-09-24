import { PrismaBaseRepository } from './PrismaBaseRepository.js';
import { NotFoundError } from '../errors/CustomErrors.js';

export class PromptRepository extends PrismaBaseRepository {
    constructor() {
        super('prompt');
    }

    /**
     * Find prompts by user ID with pagination
     * @param {string} userId - User ID
     * @param {number} limit - Number of prompts per page
     * @param {number} page - Page number (0-based)
     * @returns {Promise<Object>} Object with prompts and pagination info
     */
    async findByUserId(userId, limit = 10, page = 0) {
        const skip = page * limit;

        console.log('🔍 PROMPT REPOSITORY: findByUserId called with:', {
            userId,
            limit,
            page,
            skip
        });

        // Only handle authenticated users
        const whereClause = { userId };

        console.log('🔍 PROMPT REPOSITORY: Query details:', {
            userId,
            whereClause,
            limit,
            page,
            skip
        });

        // Get prompts and total count for user
        const [prompts, total] = await Promise.all([
            this.prisma.prompts.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            this.prisma.prompts.count({
                where: whereClause
            })
        ]);

        // Log if no prompts found for debugging
        if (prompts.length === 0) {
            console.log('🔍 PROMPT REPOSITORY: No prompts found for user:', userId);
        }

        console.log('🔍 PROMPT REPOSITORY: findByUserId result:', {
            promptsCount: prompts.length,
            total,
            hasMore: (skip + prompts.length) < total,
            whereClause,
            samplePrompt: prompts.length > 0
                ? {
                    id: prompts[0].id,
                    userId: prompts[0].userId,
                    prompt: `${prompts[0].prompt?.substring(0, 50)}...`,
                    createdAt: prompts[0].createdAt
                }
                : 'no prompts'
        });

        return {
            prompts,
            total,
            hasMore: (skip + prompts.length) < total,
            page,
            limit
        };
    }

    /**
     * Find a single prompt by ID
     * @param {string} id - Prompt ID
     * @returns {Promise<Object>} Prompt object
     */
    async findById(id) {
        const prompt = await this.prisma.prompts.findUnique({
            where: { id }
        });

        if (!prompt) {
            throw new NotFoundError(`Prompt with id ${id} not found`);
        }

        return prompt;
    }

    /**
     * Create a new prompt
     * @param {Object} data - Prompt data
     * @returns {Promise<Object>} Created prompt
     */
    async create(data) {
        return await this.prisma.prompts.create({
            data
        });
    }

    /**
     * Update a prompt
     * @param {string} id - Prompt ID
     * @param {Object} data - Update data
     * @returns {Promise<Object>} Updated prompt
     */
    async update(id, data) {
        return await this.prisma.prompts.update({
            where: { id },
            data
        });
    }

    /**
     * Delete a prompt
     * @param {string} id - Prompt ID
     * @returns {Promise<Object>} Deleted prompt
     */
    async delete(id) {
        return await this.prisma.prompts.delete({
            where: { id }
        });
    }

    /**
     * Count prompts by user ID
     * @param {string} userId - User ID
     * @returns {Promise<number>} Total count
     */
    async countByUserId(userId) {
        return await this.prisma.prompts.count({
            where: { userId }
        });
    }
}
