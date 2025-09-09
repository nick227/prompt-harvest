import OpenAI from 'openai';
import configManager from '../config/ConfigManager.js';

/**
 * AI Enhancement Service
 *
 * This service handles AI-powered prompt enhancement using OpenAI.
 * It takes a processed prompt and enhances it to be more descriptive,
 * creative, and optimized for image generation.
 */
export class AIEnhancementService {
    constructor() {
        const aiConfig = configManager.ai;

        if (!aiConfig.openaiApiKey) {
            throw new Error('OpenAI API key is required for AIEnhancementService');
        }

        this.openai = new OpenAI({
            apiKey: aiConfig.openaiApiKey
        });
        this.maxTokens = Math.min(aiConfig.maxTokens || 1000, 4000); // Cap at 4000 to be safe
        this.model = aiConfig.openaiModel || 'gpt-3.5-turbo-16k';
        this.temperature = aiConfig.temperature || 0.7;
    }

    /**
     * Enhance a prompt using AI
     * @param {string} prompt - The processed prompt to enhance
     * @param {Object} options - Enhancement options
     * @returns {Promise<string>} Enhanced prompt
     */
    async enhancePrompt(prompt) {
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            throw new Error('Prompt is required and must be a non-empty string');
        }

        try {
            const systemPrompt = this.buildSystemPrompt();
            const userPrompt = this.buildUserPrompt(prompt);

            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                max_tokens: this.maxTokens,
                temperature: this.temperature
            });

            const enhancedPrompt = response.choices[0]?.message?.content?.trim();

            if (!enhancedPrompt) {
                throw new Error('No enhanced prompt received from OpenAI');
            }

            return enhancedPrompt;

        } catch (error) {
            console.error('❌ AI ENHANCEMENT: Failed to enhance prompt', {
                error: error.message,
                prompt
            });

            // Return original prompt if enhancement fails
            console.warn('⚠️ AI ENHANCEMENT: Returning original prompt due to enhancement failure');

            return prompt;
        }
    }

    /**
     * Build system prompt for AI enhancement
     * @param {string} style - Enhancement style
     * @param {string} detail - Detail level
     * @param {string} length - Output length
     * @returns {string} System prompt
     */
    buildSystemPrompt() {
        return `You are an expert AI prompt engineer specializing in image generation prompts.
        Your task is to enhance and improve prompts to make them more effective for AI image generation.

STYLE: Focus on technical accuracy and precise descriptions
DETAIL: Add detailed specific visual elements into clarity
LENGTH: Create detailed descriptions (250+ words)

Guidelines:
- Enhance the prompt to be more descriptive and visually specific
- Add relevant artistic, technical, or stylistic elements
- Maintain the core intent of the original prompt
- Use vivid, descriptive language that helps AI image generators
- Include relevant art styles, lighting, composition, or mood when appropriate
- Avoid changing the fundamental subject or concept
- Make the prompt more engaging and specific for image generation
- Add cinematic elements like lighting, camera angles, and mood

Return only the enhanced prompt, no explanations or additional text.`;
    }

    /**
     * Build user prompt for AI enhancement
     * @param {string} prompt - Original prompt
     * @returns {string} User prompt
     */
    buildUserPrompt(prompt) {
        return `Please enhance this image generation prompt to make it more effective, organized and creative:

"${prompt}"

Enhance it while keeping the core concept intact.

Extend it to at least 250 words.

Only return the exact enhanced prompt text.

`;
    }

    /**
     * Check if the service is healthy
     * @returns {Promise<Object>} Health status
     */
    async getHealth() {
        try {
            // Test with a simple prompt
            await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'user',
                        content: 'Test'
                    }
                ],
                max_tokens: 10
            });

            return {
                service: 'AIEnhancementService',
                status: 'healthy',
                model: this.model,
                maxTokens: this.maxTokens,
                temperature: this.temperature
            };
        } catch (error) {
            return {
                service: 'AIEnhancementService',
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

// Export singleton instance
export const aiEnhancementService = new AIEnhancementService();
export default aiEnhancementService;
