/**
 * AI Enhancement Service
 *
 * This service handles AI-powered prompt enhancement using OpenAI.
 * It takes a processed prompt and enhances it to be more descriptive,
 * creative, and optimized for image generation.
 */

import { BaseAIService } from '../core/BaseAIService.js';

export class AIEnhancementService extends BaseAIService {
    constructor() {
        super();

        // Override specific configuration for enhancement
        this.maxTokens = Math.min(this.maxTokens, 4000); // Cap at 4000 to be safe
        this.model = 'gpt-3.5-turbo-16k'; // Use 16k model for longer prompts

        console.log('🔧 AIEnhancementService constructor:', {
            model: this.model,
            maxTokens: this.maxTokens,
            temperature: this.temperature
        });
    }

    /**
     * Enhance a prompt using AI
     * @param {string} prompt - The processed prompt to enhance
     * @returns {Promise<string>} Enhanced prompt
     */
    async enhancePrompt(prompt) {
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            throw new Error('Prompt is required and must be a non-empty string');
        }

        console.log('🤖 AI ENHANCEMENT: Starting enhancement for prompt:', {
            originalLength: prompt.length,
            preview: `${prompt.substring(0, 100)}...`,
            model: this.model,
            maxTokens: this.maxTokens,
            temperature: this.temperature
        });

        try {
            const systemPrompt = this.buildSystemPrompt();
            const userPrompt = this.buildUserPrompt(prompt);

            console.log('🤖 AI ENHANCEMENT: Sending request to OpenAI...');

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ];

            const result = await this.makeRequest(messages, {
                model: this.model,
                max_tokens: this.maxTokens,
                temperature: this.temperature
            });

            if (!result.success) {
                throw new Error(`OpenAI request failed: ${result.error}`);
            }

            const enhancedPrompt = result.response.content;

            if (!enhancedPrompt || enhancedPrompt.trim().length === 0) {
                throw new Error('Empty response from OpenAI');
            }

            console.log('✅ AI ENHANCEMENT: Enhancement completed:', {
                originalLength: prompt.length,
                enhancedLength: enhancedPrompt.length,
                improvement: `${((enhancedPrompt.length - prompt.length) / prompt.length * 100).toFixed(1)}%`
            });

            return enhancedPrompt;

        } catch (error) {
            console.error('❌ AI ENHANCEMENT: Enhancement failed:', error);
            throw error;
        }
    }

    /**
     * Build system prompt for enhancement
     */
    buildSystemPrompt() {
        return `You are an expert AI prompt enhancer for image generation. Your task is to take a user's prompt and enhance it to be more descriptive, creative, and optimized for AI image generation.

**Enhancement Guidelines:**
1. **Add descriptive details** - Include specific visual elements, colors, lighting, composition
2. **Improve style descriptors** - Add artistic style, mood, atmosphere
3. **Enhance quality keywords** - Include resolution, quality, and technical terms
4. **Maintain original intent** - Keep the core concept while making it more detailed
5. **Optimize for AI models** - Use terms that work well with image generation AI

**Quality Standards:**
- Make prompts more specific and detailed
- Add visual composition elements (close-up, wide shot, etc.)
- Include lighting and mood descriptions
- Add artistic style references when appropriate
- Use high-quality descriptive language

**Output Format:**
- Return only the enhanced prompt
- No explanations or additional text
- Keep it concise but detailed
- Ensure it's ready for image generation

Remember: Your goal is to transform simple prompts into rich, detailed descriptions that will produce better images.`;
    }

    /**
     * Build user prompt for enhancement
     */
    buildUserPrompt(prompt) {
        return `Please enhance this prompt for better image generation:

"${prompt}"

Make it more descriptive, detailed, and optimized for AI image generation while maintaining the original intent.`;
    }

    /**
     * Get enhancement statistics
     */
    async getEnhancementStats() {
        const healthCheck = await this.healthCheck();

        return {
            serviceName: 'AIEnhancementService',
            status: healthCheck.status,
            model: this.model,
            maxTokens: this.maxTokens,
            temperature: this.temperature,
            timestamp: new Date().toISOString()
        };
    }
}

// Export class for lazy instantiation
export default AIEnhancementService;
