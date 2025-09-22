import OpenAI from 'openai';
import dotenv from 'dotenv';
import modelInterface from '../ModelInterface.js';

dotenv.config();

export class OpenAIProvider {
    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    /**
     * Validate OpenAI configuration
     */
    validateConfig() {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }

        return true;
    }

    /**
     * Generate image using OpenAI DALL-E
     */
    async generateImage(prompt, guidance, size = '1024x1024') {
        this.validateConfig();

        const keyValidation = await this.validateApiKey();

        if (keyValidation) {
            throw new Error('OpenAI API key validation failed');
        }

        try {
            const response = await this.client.images.generate({
                model: 'dall-e-3',
                prompt,
                n: 1,
                size,
                quality: 'standard',
                style: 'natural'
            });

            if (!response.data || !response.data[0] || !response.data[0].b64_json) {
                throw new Error('Invalid response format from OpenAI');
            }

            return {
                success: true,
                data: response.data[0].b64_json,
                provider: 'openai',
                model: 'dall-e-3'
            };

        } catch (error) {
            if (error.status === 400) {
                if (error.code === 'content_policy_violation') {
                    throw new Error('Content policy violation: Prompt contains inappropriate content');
                }
                throw new Error(`OpenAI API error: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Validate OpenAI API key
     */
    async validateApiKey() {
        try {
            await this.client.models.list();

            return false; // Key is valid
        } catch (error) {
            return true; // Key validation failed
        }
    }

    /**
     * Check if provider is available
     */
    isAvailable() {
        return !!process.env.OPENAI_API_KEY;
    }

    /**
     * Get provider configuration
     */
    getConfig() {
        return {
            type: 'openai',
            name: 'OpenAI DALL-E',
            available: this.isAvailable(),
            models: ['dall-e-3'],
            maxPromptLength: 4000,
            supportedSizes: ['1024x1024', '1792x1024', '1024x1792']
        };
    }
}
