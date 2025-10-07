/**
 * AI Prompt Service
 *
 * Handles prompt processing and AI operations for prompts.
 * Separates business logic from data operations.
 */

import { BaseAIService } from '../core/BaseAIService.js';
import { AIWordTypeService } from '../core/AIWordTypeService.js';

export class AIPromptService extends BaseAIService {
    constructor() {
        super();
        this.wordTypeService = new AIWordTypeService();
        this.generateModule = null;
    }

    /**
     * Process prompt with AI enhancements
     */
    async processPrompt(prompt, multiplier = false, mixup = false, mashup = false, customVariables = '', promptHelpers = {}, req = null) {
        try {
            // Cache the generate module import
            if (!this.generateModule) {
                this.generateModule = await import('../../../generate.js');
            }

            return await this.generateModule.default.buildPrompt(
                prompt,
                {
                    multiplier,
                    mixup,
                    mashup,
                    customVariables,
                    promptHelpers
                }
            );
        } catch (error) {
            console.error('❌ Error processing prompt:', error);
            throw error;
        }
    }

    /**
     * Get system prompt based on expand option
     */
    getOrganizeSystemPrompt(expandPrompt) {
        return expandPrompt
            ? 'Organize this AI image generation prompt into clear sections: Subject, Style, Details, Keywords. Preserve all information while making it structured and readable. Expand on the prompt to make the imagery more detailed and descriptive.'
            : 'Organize this AI image generation prompt into clear sections: Subject, Style, Details, Keywords. Preserve all information while making it structured and readable. Do not add new details, only reorganize what is already present.';
    }

    /**
     * Handle organize prompt errors
     */
    handleOrganizeError(error) {
        console.error('❌ Error organizing prompt:', error);

        if (error.message.includes('API key')) {
            throw new Error('OpenAI API key not configured');
        } else if (error.message.includes('rate limit')) {
            throw new Error('OpenAI rate limit exceeded');
        } else if (error.message.includes('quota')) {
            throw new Error('OpenAI quota exceeded');
        } else if (error.message.includes('timed out') || error.message.includes('aborted')) {
            throw new Error('Request timed out');
        } else {
            throw new Error(`OpenAI error: ${error.message}`);
        }
    }

    /**
     * Organize prompt using AI
     */
    async organizePrompt(prompt, userId, options = {}) {
        const { expandPrompt = true, signal = null, timeout = 30000 } = options;

        try {
            if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
                throw new Error('Invalid prompt provided');
            }

            console.log('🤖 Organizing prompt with OpenAI:', {
                promptLength: prompt.length,
                userId,
                expand: expandPrompt
            });

            const systemPrompt = this.getOrganizeSystemPrompt(expandPrompt);
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ];

            const result = await this.makeRequest(messages, {
                model: this.model,
                maxTokens: 1200,
                signal,
                timeout
            });

            if (!result.success) {
                throw new Error(`OpenAI request failed: ${result.error}`);
            }

            const organizedPrompt = result.response.content;

            if (!organizedPrompt || organizedPrompt.trim().length === 0) {
                throw new Error('Empty response from OpenAI');
            }

            console.log('✅ Prompt organized successfully:', {
                originalLength: prompt.length,
                organizedLength: organizedPrompt.length
            });

            return organizedPrompt;
        } catch (error) {
            this.handleOrganizeError(error);
        }
    }

    /**
     * Get word type replacement
     */
    async getWordType(word, limit = 8) {
        return await this.wordTypeService.getWordType(word, limit);
    }

    /**
     * Get word examples
     */
    async getWordExamples(word, limit = 8) {
        return await this.wordTypeService.getWordExamples(word, limit);
    }

    /**
     * Get word types
     */
    async getWordTypes(word, limit = 8) {
        return await this.wordTypeService.getWordTypes(word, limit);
    }

    /**
     * Add word type
     */
    async addWordType(word) {
        return await this.wordTypeService.addWordType(word);
    }

    /**
     * Delete word type
     */
    async deleteWordType(word) {
        return await this.wordTypeService.deleteWordType(word);
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this.wordTypeService.getWordTypeStats();
    }

    /**
     * Clear cache
     */
    clearCache() {
        // Clear word type cache if available
        if (this.wordTypeService.clearCache) {
            this.wordTypeService.clearCache();
        }

        return { success: true, message: 'Cache cleared' };
    }

    /**
     * Get service statistics
     */
    async getServiceStats() {
        const healthCheck = await this.healthCheck();

        return {
            serviceName: 'AIPromptService',
            status: healthCheck.status,
            model: this.model,
            maxTokens: this.maxTokens,
            temperature: this.temperature,
            timestamp: new Date().toISOString()
        };
    }
}
