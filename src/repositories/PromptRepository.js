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

        // Handle anonymous users - get recent prompts from anonymous users
        let whereClause = { userId };

        if (userId === 'anonymous' || userId?.startsWith('anonymous_')) {
            // For anonymous users, get recent prompts from all anonymous users
            whereClause = {
                userId: {
                    startsWith: 'anonymous_'
                }
            };
        }

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

        // If no prompts found, try to get some recent prompts to debug
        if (prompts.length === 0) {
            console.log('🔍 PROMPT REPOSITORY: No prompts found, checking recent prompts in database');

            // Get the 5 most recent prompts to see what's in the database
            const recentPrompts = await this.prisma.prompts.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5
            });

            console.log('🔍 PROMPT REPOSITORY: Recent prompts in database:', {
                count: recentPrompts.length,
                sampleUserIds: recentPrompts.map(p => p.userId),
                samplePrompts: recentPrompts.map(p => ({
                    id: p.id,
                    userId: p.userId,
                    prompt: `${p.prompt?.substring(0, 50)}...`,
                    createdAt: p.createdAt
                }))
            });
        }

        // If no prompts found and we're looking for anonymous prompts, try a fallback query
        if (prompts.length === 0 && (userId === 'anonymous' || userId?.startsWith('anonymous_'))) {
            console.log('🔍 PROMPT REPOSITORY: No prompts found with startsWith, trying fallback query');

            // Try to get any prompts that contain 'anonymous' in the userId
            const fallbackPrompts = await this.prisma.prompts.findMany({
                where: {
                    userId: {
                        contains: 'anonymous'
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            });

            if (fallbackPrompts.length > 0) {
                console.log('🔍 PROMPT REPOSITORY: Fallback query found prompts:', fallbackPrompts.length);
                prompts.push(...fallbackPrompts);
            }
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
