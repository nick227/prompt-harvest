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

    }

    /**
     * Process prompt with AI enhancements
     */
    async processPrompt(prompt, multiplier = false, mixup = false, mashup = false, customVariables = '', promptHelpers = {}, req = null) {
        try {
            // This will be implemented when we extract the prompt service
            // For now, we'll import the generate module directly
            const generate = await import('../../../generate.js');

            return await generate.default.buildPrompt(
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
     * Organize prompt using AI
     */
    async organizePrompt(prompt, userId) {
        try {
            // Validate inputs
            if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
                throw new Error('Invalid prompt provided');
            }

            console.log('🤖 Organizing prompt with OpenAI:', {
                promptLength: prompt.length,
                userId
            });

            const systemPrompt = 'Organize this prompt into clear sections: Subject, Style, Details, Keywords. Preserve all information while making it structured and readable.';

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ];

            const result = await this.makeRequest(messages, {
                model: this.model, // Use GPT-3.5-turbo instead of GPT-4 for simple organization
                maxTokens: 200
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
            console.error('❌ Error organizing prompt:', error);

            // Re-throw with more specific error messages
            if (error.message.includes('API key')) {
                throw new Error('OpenAI API key not configured');
            } else if (error.message.includes('rate limit')) {
                throw new Error('OpenAI rate limit exceeded');
            } else if (error.message.includes('quota')) {
                throw new Error('OpenAI quota exceeded');
            } else {
                throw new Error(`OpenAI error: ${error.message}`);
            }
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
