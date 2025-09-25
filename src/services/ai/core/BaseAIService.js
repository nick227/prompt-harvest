/**
 * Base AI Service
 *
 * Common OpenAI operations and configuration for all AI services.
 * Provides shared functionality to reduce redundancy.
 */

import OpenAI from 'openai';
import configManager from '../../../config/ConfigManager.js';

export class BaseAIService {
    constructor() {
        this.initializeOpenAI();
        this.initializeConfiguration();
    }

    /**
     * Initialize OpenAI client with consistent configuration
     */
    initializeOpenAI() {
        const apiKey = process.env.OPENAI_API_KEY || configManager.ai?.openaiApiKey;

        if (!apiKey) {
            throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable or configure in configManager.ai.openaiApiKey');
        }

        this.openai = new OpenAI({
            apiKey: apiKey
        });

        console.log('🔧 BaseAIService: OpenAI client initialized');
    }

    /**
     * Initialize common configuration
     */
    initializeConfiguration() {
        const aiConfig = configManager.ai || {};

        this.maxTokens = aiConfig.maxTokens || 1000;
        this.temperature = aiConfig.temperature || 0.7;
        this.model = aiConfig.openaiModel || 'gpt-3.5-turbo';
        this.model4 = aiConfig.openaiModel4 || 'gpt-4';
        this.maxTokens4 = aiConfig.maxTokens4 || 4000;
    }

    /**
     * Common health check for all AI services
     */
    async healthCheck() {
        try {
            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 5,
                temperature: 0
            });

            return {
                status: 'healthy',
                model: this.model,
                timestamp: new Date().toISOString(),
                response: response.choices[0]?.message?.content || 'No response'
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Common OpenAI request method with error handling
     */
    async makeRequest(messages, options = {}) {
        const {
            model = this.model,
            max_tokens = this.maxTokens,
            temperature = this.temperature,
            tools = null,
            tool_choice = 'auto'
        } = options;

        try {
            const requestConfig = {
                model,
                messages,
                max_tokens,
                temperature
            };

            if (tools) {
                requestConfig.tools = tools;
                requestConfig.tool_choice = tool_choice;
            }

            const response = await this.openai.chat.completions.create(requestConfig);

            return {
                success: true,
                response: response.choices[0]?.message,
                usage: response.usage,
                model: response.model
            };
        } catch (error) {
            console.error('❌ BaseAIService OpenAI request failed:', error);

            return {
                success: false,
                error: error.message,
                errorType: error.constructor.name
            };
        }
    }

    /**
     * Validate OpenAI response
     */
    validateResponse(response) {
        if (!response.success) {
            throw new Error(`OpenAI request failed: ${response.error}`);
        }

        if (!response.response) {
            throw new Error('No response from OpenAI');
        }

        return response.response;
    }

    /**
     * Get service information
     */
    getServiceInfo() {
        return {
            serviceName: this.constructor.name,
            model: this.model,
            maxTokens: this.maxTokens,
            temperature: this.temperature,
            hasOpenAI: !!this.openai
        };
    }
}
