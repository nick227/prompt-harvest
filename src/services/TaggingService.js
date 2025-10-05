/**
 * TaggingService - Fire-and-forget image tagging using OpenAI
 *
 * This service handles asynchronous image tagging without blocking HTTP responses.
 * It uses OpenAI's function calling to generate high-quality tags from image prompts.
 */

import databaseClient from '../database/PrismaClient.js';
import OpenAI from 'openai';

export class TaggingService {
    constructor() {
        this.prisma = databaseClient.getClient();
        this.maxRetries = 2;
        this.isProcessing = new Set(); // Track ongoing operations to prevent duplicates

        // Initialize OpenAI client
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        if (!process.env.OPENAI_API_KEY) {
            console.warn('⚠️ OPENAI_API_KEY not found. Tagging service will not function.');
        }
    }

    /**
     * Fire-and-forget tagging request
     * This method does NOT block the calling function
     *
     * @param {string} imageId - The saved image ID
     * @param {string} prompt - The final prompt used for generation
     * @param {Object} metadata - Additional metadata (optional)
     */
    async tagImageAsync(imageId, prompt, metadata = {}) {
        // Prevent duplicate processing - add to set immediately
        if (this.isProcessing.has(imageId)) {
            console.log('🏷️ Tagging already in progress for image:', imageId);

            return;
        }

        // Add to processing set immediately to prevent race conditions
        this.isProcessing.add(imageId);

        // Fire-and-forget: don't await this call
        this._performTaggingRequest(imageId, prompt, metadata)
            .catch(error => {
                // Log error but don't throw - this is fire-and-forget
                console.error('🏷️ Tagging service error (non-blocking):', {
                    imageId,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            })
            .finally(() => {
                // Remove from processing set
                this.isProcessing.delete(imageId);
            });
    }

    /**
     * Internal method to perform the actual tagging
     * @private
     */
    async _performTaggingRequest(imageId, prompt, metadata) {
        console.log('🏷️ Starting OpenAI tagging process (fire-and-forget):', {
            imageId,
            prompt: prompt ? `${prompt.substring(0, 50)}...` : 'undefined'
        });

        await this._tryOpenAITagging(imageId, prompt, metadata);
    }

    /**
     * Try OpenAI tagging with retries
     * @private
     */
    async _tryOpenAITagging(imageId, prompt, metadata) {
        let lastError;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const tags = await this._generateTagsWithOpenAI(prompt);

                await this._updateImageWithTags(imageId, tags, {
                    metadata,
                    attempt,
                    service: 'openai'
                });

                console.log('✅ Image tagged successfully with OpenAI:', { imageId, tags, attempt });

                return; // Success
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ OpenAI tagging attempt ${attempt} failed:`, {
                    imageId,
                    error: error.message,
                    willRetry: attempt < this.maxRetries
                });

                if (attempt < this.maxRetries) {
                    await this._delay(2000 * attempt);
                }
            }
        }

        // If all attempts failed, throw the last error
        throw lastError;
    }


    /**
     * Update image with tags in database
     * @private
     */
    async _updateImageWithTags(imageId, tags, options) {
        const { metadata, attempt, service } = options;
        const taggingMetadata = this._buildTaggingMetadata(metadata, attempt, service);

        await this.prisma.image.update({
            where: { id: imageId },
            data: {
                tags,
                taggedAt: new Date(),
                taggingMetadata
            }
        });
    }

    /**
     * Build tagging metadata object
     * @private
     */
    _buildTaggingMetadata(metadata, attempt, service) {
        const taggingMetadata = {
            ...metadata,
            timestamp: new Date().toISOString(),
            attempt,
            service: `image-harvest-${service}`,
            method: 'function-calling'
        };

        return taggingMetadata;
    }

    /**
     * Generate tags using OpenAI function calling
     * @private
     */
    async _generateTagsWithOpenAI(prompt) {
        this._validateOpenAIInput(prompt);

        try {
            const response = await this._callOpenAIAPI(prompt);
            const tags = this._extractTagsFromResponse(response);
            const cleanTags = this._validateAndCleanTags(tags);

            console.log('🤖 OpenAI generated tags:', {
                originalCount: tags.length,
                cleanCount: cleanTags.length,
                tags: cleanTags
            });

            return cleanTags;

        } catch (error) {
            console.error('OpenAI tagging error:', {
                error: error.message,
                prompt: prompt ? `${prompt.substring(0, 100)}...` : 'undefined'
            });
            throw error;
        }
    }

    /**
     * Validate OpenAI input parameters
     * @private
     */
    _validateOpenAIInput(prompt) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }

        if (!prompt || prompt.trim().length === 0) {
            throw new Error('Empty prompt provided');
        }
    }

    /**
     * Call OpenAI API with function calling
     * @private
     */
    async _callOpenAIAPI(prompt) {
        return await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at analyzing image generation prompts and extracting relevant tags. Generate 2-10 descriptive tags that would help categorize and search for images based on the prompt.'
                },
                {
                    role: 'user',
                    content: `Analyze this image generation prompt and generate relevant tags: "${prompt}"`
                }
            ],
            functions: [this._getTaggingFunctionSchema()],
            function_call: { name: 'generate_image_tags' },
            temperature: 0.3,
            max_tokens: 200
        });
    }

    /**
     * Get the function schema for tagging
     * @private
     */
    _getTaggingFunctionSchema() {
        return {
            name: 'generate_image_tags',
            description: 'Generate relevant tags for an image based on its generation prompt',
            parameters: {
                type: 'object',
                properties: {
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Array of 2-10 descriptive tags for the image',
                        minItems: 2,
                        maxItems: 10
                    }
                },
                required: ['tags']
            }
        };
    }

    /**
     * Extract tags from OpenAI response
     * @private
     */
    _extractTagsFromResponse(response) {
        const functionCall = response.choices[0]?.message?.function_call;

        if (!functionCall || functionCall.name !== 'generate_image_tags') {
            throw new Error('OpenAI did not return expected function call');
        }

        const args = JSON.parse(functionCall.arguments);

        return args.tags || [];
    }

    /**
     * Validate and clean tags
     * @private
     */
    _validateAndCleanTags(tags) {
        const cleanTags = tags
            .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length <= 50) // Reasonable tag length limit
            .slice(0, 10); // Ensure max 10 tags

        if (cleanTags.length < 2) {
            throw new Error('OpenAI returned insufficient tags');
        }

        return cleanTags;
    }


    /**
     * Simple delay utility
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleanup method to close Prisma connection
     */
    async cleanup() {
        await this.prisma.$disconnect();
    }
}

// Export singleton instance
export const taggingService = new TaggingService();
