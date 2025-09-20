import { PromptRepository } from '../repositories/PromptRepository.js';
import { validatePaginationParams } from '../utils/ValidationService.js';

export class PromptService {
    constructor() {
        this.promptRepository = new PromptRepository();
    }

    /**
     * Get user prompts with pagination
     * @param {string} userId - User ID
     * @param {Object} paginationParams - Pagination parameters
     * @returns {Promise<Object>} Paginated prompts response
     */
    async getUserPrompts(userId, paginationParams = {}) {
        console.log('🔍 PROMPT SERVICE: getUserPrompts called with:', {
            userId,
            paginationParams
        });

        // Validate pagination parameters
        const { limit, page } = validatePaginationParams(paginationParams, 50);

        // Get prompts from repository
        const result = await this.promptRepository.findByUserId(userId, limit, page);

        // Normalize prompt data
        const normalizedPrompts = result.prompts.map(prompt => this.normalizePromptData(prompt));

        console.log('🔍 PROMPT SERVICE: getUserPrompts result:', {
            promptsCount: normalizedPrompts.length,
            total: result.total,
            hasMore: result.hasMore,
            page: result.page,
            limit: result.limit
        });

        return {
            prompts: normalizedPrompts,
            pagination: {
                total: result.total,
                hasMore: result.hasMore,
                page: result.page,
                limit: result.limit
            }
        };
    }

    /**
     * Get a single prompt by ID
     * @param {string} promptId - Prompt ID
     * @param {string} userId - User ID (for ownership verification)
     * @returns {Promise<Object>} Prompt object
     */
    async getPromptById(promptId, userId) {
        console.log('🔍 PROMPT SERVICE: getPromptById called with:', {
            promptId,
            userId
        });

        const prompt = await this.promptRepository.findById(promptId);

        // Verify ownership
        if (prompt.userId !== userId) {
            throw new Error('Unauthorized access to prompt');
        }

        return this.normalizePromptData(prompt);
    }

    /**
     * Create a new prompt
     * @param {Object} promptData - Prompt data
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Created prompt
     */
    async createPrompt(promptData, userId) {
        console.log('🔍 PROMPT SERVICE: createPrompt called with:', {
            promptData: {
                ...promptData,
                prompt: promptData.prompt?.substring(0, 50) + '...'
            },
            userId
        });

        const data = {
            ...promptData,
            userId
        };

        const prompt = await this.promptRepository.create(data);
        return this.normalizePromptData(prompt);
    }

    /**
     * Update a prompt
     * @param {string} promptId - Prompt ID
     * @param {Object} updateData - Update data
     * @param {string} userId - User ID (for ownership verification)
     * @returns {Promise<Object>} Updated prompt
     */
    async updatePrompt(promptId, updateData, userId) {
        console.log('🔍 PROMPT SERVICE: updatePrompt called with:', {
            promptId,
            updateData,
            userId
        });

        // Verify ownership first
        await this.getPromptById(promptId, userId);

        const prompt = await this.promptRepository.update(promptId, updateData);
        return this.normalizePromptData(prompt);
    }

    /**
     * Delete a prompt
     * @param {string} promptId - Prompt ID
     * @param {string} userId - User ID (for ownership verification)
     * @returns {Promise<Object>} Deletion result
     */
    async deletePrompt(promptId, userId) {
        console.log('🔍 PROMPT SERVICE: deletePrompt called with:', {
            promptId,
            userId
        });

        // Verify ownership first
        await this.getPromptById(promptId, userId);

        await this.promptRepository.delete(promptId);
        return { success: true, message: 'Prompt deleted successfully' };
    }

    /**
     * Normalize prompt data for API response
     * @param {Object} prompt - Raw prompt data from database
     * @returns {Object} Normalized prompt data
     */
    normalizePromptData(prompt) {
        return {
            id: prompt.id,
            userId: prompt.userId,
            prompt: prompt.prompt,
            original: prompt.original,
            provider: prompt.provider,
            guidance: prompt.guidance,
            createdAt: prompt.createdAt,
            updatedAt: prompt.updatedAt
        };
    }
}
