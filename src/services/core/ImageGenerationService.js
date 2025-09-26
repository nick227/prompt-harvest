/**
 * ImageGenerationService - Core image generation logic
 *
 * Handles the core image generation functionality with circuit breakers
 * and provider management. Extracted from EnhancedImageService.
 */

import { ValidationError } from '../../errors/CustomErrors.js';
import { circuitBreakerManager } from '../../utils/CircuitBreaker.js';

export class ImageGenerationService {
    constructor() {
        this.breakerConfigs = {
            aiService: { failureThreshold: 2, timeout: 30000 },
            imageGeneration: { failureThreshold: 3, timeout: 120000 }
        };
    }

    async generateImage(prompt, providers, guidance, userId, options = {}) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        try {
            return await this.executeImageGeneration(
                prompt, providers, guidance, userId, options, requestId
            );
        } catch (error) {
            throw error;
        }
    }

    async executeImageGeneration(prompt, providers, guidance, userId, options, requestId) {
        // Step 1: Validate inputs with circuit breaker
        await this.validateInputs(prompt, providers, guidance, userId);

        // Step 2: Process prompt with AI enhancement
        const processedPrompt = await this.processPromptWithBreaker(prompt, options);

        // Step 3: Generate image with circuit breaker
        return await this.generateImageWithBreaker(
            processedPrompt, prompt, requestId, providers, guidance, userId, options
        );
    }

    async validateInputs(prompt, providers, guidance, userId) {
        // Basic input validation
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            throw new ValidationError('Prompt is required and must be a non-empty string');
        }

        if (!providers || !Array.isArray(providers) || providers.length === 0) {
            throw new ValidationError('At least one provider must be specified');
        }

        if (guidance && (typeof guidance !== 'number' || guidance < 1 || guidance > 20)) {
            throw new ValidationError('Guidance must be a number between 1 and 20');
        }

        // Validate provider names
        const validProviders = ['flux', 'dalle3', 'nano-banana', 'imagen'];
        const invalidProviders = providers.filter(p => !validProviders.includes(p));
        if (invalidProviders.length > 0) {
            throw new ValidationError(`Invalid providers: ${invalidProviders.join(', ')}`);
        }
    }

    async processPromptWithBreaker(prompt, options) {
        return await circuitBreakerManager.execute('aiService', async () => {
            try {
                console.log('🔧 Processing prompt with AI enhancement...');

                // For MVP, return the original prompt with basic processing
                // TODO: Integrate with actual AI enhancement service when available
                const enhancedPrompt = prompt.trim();

                console.log('✅ Prompt processed successfully');
                return enhancedPrompt;
            } catch (error) {
                console.error('❌ AI enhancement failed:', error.message);
                // Fallback to original prompt if enhancement fails
                return prompt;
            }
        }, this.breakerConfigs.aiService);
    }

    async generateImageWithBreaker(prompt, original, promptId, providers, guidance, userId, options) {
        return await circuitBreakerManager.execute('imageGeneration', async () => {
            console.log('🔧 Generating image with providers:', providers);

            // This would contain the actual image generation logic
            // For now, return a mock result structure
            return {
                success: true,
                images: [{
                    url: 'https://example.com/generated-image.jpg',
                    provider: providers[0],
                    prompt,
                    originalPrompt: original
                }],
                requestId: promptId,
                userId
            };
        }, this.breakerConfigs.imageGeneration);
    }

    generateRequestId() {
        return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async getHealth() {
        return {
            service: 'ImageGenerationService',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            circuitBreakers: {
                aiService: circuitBreakerManager.getState('aiService'),
                imageGeneration: circuitBreakerManager.getState('imageGeneration')
            }
        };
    }
}
