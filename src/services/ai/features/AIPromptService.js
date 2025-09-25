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

        console.log('🔧 AIPromptService constructor initialized');
    }

    /**
     * Process prompt with AI enhancements
     */
    async processPrompt(prompt, multiplier = false, mixup = false, mashup = false, customVariables = '', photogenic = false, artistic = false, avatar = false, req = null) {
        try {
            // This will be implemented when we extract the prompt service
            // For now, we'll import the feed module directly
            const feed = await import('../../../feed.js');

            return await feed.default.buildPrompt(
                prompt,
                multiplier,
                mixup,
                mashup,
                customVariables,
                photogenic,
                artistic,
                avatar,
                req
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
                userId: userId
            });

            const systemPrompt = `You are a prompt organization expert. Your task is to take a user's prompt and organize it into a clear, structured format with the following sections:

**Organization Structure:**
1. **Subject**: The main subject or object
2. **Style**: Artistic style, mood, or visual approach
3. **Details**: Specific details, colors, lighting, composition
4. **Keywords**: Important keywords and descriptors

**Guidelines:**
- Preserve all important information from the original prompt
- Make it more organized and structured
- Use clear section headers
- Keep the original intent intact
- Make it more readable and professional

**Output Format:**
Return the organized prompt with clear section headers and structured information.

Make sure to preserve all the important information from the original prompt while making it more organized and structured.`;

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Please organize this prompt: "${prompt}"` }
            ];

            const result = await this.makeRequest(messages, {
                model: this.model4,
                max_tokens: 500
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
