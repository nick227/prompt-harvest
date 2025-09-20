/**
 * TaggingService - Fire-and-forget image tagging using OpenAI
 *
 * This service handles asynchronous image tagging without blocking HTTP responses.
 * It uses OpenAI's function calling to generate high-quality tags from image prompts.
 */

import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

export class TaggingService {
    constructor() {
        this.prisma = new PrismaClient();
        this.maxRetries = 2;
        this.isProcessing = new Set(); // Track ongoing operations to prevent duplicates

        // Initialize OpenAI client
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        if (!process.env.OPENAI_API_KEY) {
            console.warn('⚠️ OPENAI_API_KEY not found. Tagging service will use fallback method.');
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

        const lastError = await this._tryOpenAITagging(imageId, prompt, metadata);

        if (lastError) {
            await this._tryFallbackTagging(imageId, prompt, metadata, lastError);
        }
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

                return null; // Success
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

        return lastError;
    }

    /**
     * Try fallback tagging method
     * @private
     */
    async _tryFallbackTagging(imageId, prompt, metadata, lastError) {
        try {
            console.log('🔄 OpenAI failed, trying fallback tagging method:', { imageId });
            const fallbackTags = await this._generateFallbackTags(prompt);

            await this._updateImageWithTags(imageId, fallbackTags, {
                metadata,
                attempt: 'fallback',
                service: 'fallback',
                openaiError: lastError
            });

            console.log('✅ Image tagged with fallback method:', { imageId, tags: fallbackTags });
        } catch (fallbackError) {
            console.error('❌ Both OpenAI and fallback tagging failed:', {
                imageId,
                openaiError: lastError?.message,
                fallbackError: fallbackError.message
            });
            throw fallbackError;
        }
    }

    /**
     * Update image with tags in database
     * @private
     */
    async _updateImageWithTags(imageId, tags, options) {
        const { metadata, attempt, service, openaiError } = options;
        const taggingMetadata = this._buildTaggingMetadata(metadata, attempt, service, openaiError);

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
    _buildTaggingMetadata(metadata, attempt, service, openaiError) {
        const taggingMetadata = {
            ...metadata,
            timestamp: new Date().toISOString(),
            attempt,
            service: `image-harvest-${service}`,
            method: service === 'openai' ? 'function-calling' : 'text-processing'
        };

        if (openaiError) {
            taggingMetadata.openaiError = openaiError.message;
        }

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
     * Fallback tag generation using simple text processing
     * @private
     */
    async _generateFallbackTags(prompt) {
        if (!prompt) {
            return [];
        }

        try {
            // Simple tag extraction as fallback
            const words = prompt.toLowerCase()
                .replace(/[^\w\s]/g, ' ') // Remove punctuation
                .split(/\s+/)
                .filter(word => word.length > 2);

            // Common words to filter out
            const stopWords = new Set([
                'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
                'before', 'after', 'above', 'below', 'between', 'among', 'is', 'are',
                'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
                'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can'
            ]);

            // Extract meaningful tags
            const tags = words
                .filter(word => !stopWords.has(word))
                .slice(0, 8); // Limit to 8 tags for fallback

            // Add some contextual tags
            const contextualTags = this._extractContextualTags(prompt);
            const allTags = [...new Set([...tags, ...contextualTags])];

            return allTags.slice(0, 10); // Ensure max 10 tags

        } catch (error) {
            console.error('Fallback tagging error:', error);

            return [];
        }
    }

    /**
     * Extract contextual tags based on prompt patterns (fallback method)
     * @private
     */
    _extractContextualTags(prompt) {
        const contextualTags = [];
        const lowerPrompt = prompt.toLowerCase();

        contextualTags.push(...this._extractArtStyleTags(lowerPrompt));
        contextualTags.push(...this._extractSubjectTags(lowerPrompt));
        contextualTags.push(...this._extractMoodTags(lowerPrompt));

        return contextualTags;
    }

    /**
     * Extract art style tags
     * @private
     */
    _extractArtStyleTags(lowerPrompt) {
        const artStyleTags = [];

        if (lowerPrompt.includes('painting')) {
            artStyleTags.push('painting');
        }
        if (lowerPrompt.includes('photograph') || lowerPrompt.includes('photo')) {
            artStyleTags.push('photography');
        }
        if (lowerPrompt.includes('digital art')) {
            artStyleTags.push('digital-art');
        }
        if (lowerPrompt.includes('sketch')) {
            artStyleTags.push('sketch');
        }
        if (lowerPrompt.includes('watercolor')) {
            artStyleTags.push('watercolor');
        }

        return artStyleTags;
    }

    /**
     * Extract subject tags
     * @private
     */
    _extractSubjectTags(lowerPrompt) {
        const subjectTags = [];

        if (lowerPrompt.includes('portrait')) {
            subjectTags.push('portrait');
        }
        if (lowerPrompt.includes('landscape')) {
            subjectTags.push('landscape');
        }
        if (lowerPrompt.includes('animal')) {
            subjectTags.push('animal');
        }
        if (lowerPrompt.includes('building') || lowerPrompt.includes('architecture')) {
            subjectTags.push('architecture');
        }

        return subjectTags;
    }

    /**
     * Extract mood/atmosphere tags
     * @private
     */
    _extractMoodTags(lowerPrompt) {
        const moodTags = [];

        if (lowerPrompt.includes('dark') || lowerPrompt.includes('gloomy')) {
            moodTags.push('dark');
        }
        if (lowerPrompt.includes('bright') || lowerPrompt.includes('vibrant')) {
            moodTags.push('bright');
        }
        if (lowerPrompt.includes('peaceful') || lowerPrompt.includes('calm')) {
            moodTags.push('peaceful');
        }
        if (lowerPrompt.includes('dramatic')) {
            moodTags.push('dramatic');
        }

        return moodTags;
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
