import OpenAI from 'openai';
import wordTypeManager from '../../lib/word-type-manager.js';
import configManager from '../config/ConfigManager.js';

export class AIService {
    constructor() {
        const aiConfig = configManager.ai;

        if (!aiConfig.openaiApiKey) {
            throw new Error('OpenAI API key is required for AIService');
        }

        this.openai = new OpenAI({
            apiKey: aiConfig.openaiApiKey
        });
        this.maxTokens = aiConfig.maxTokens;
        this.openAiModel = aiConfig.openAiModel;
        this.maxTokens4 = aiConfig.maxTokens4 || 3600;
        this.openAiModel4 = aiConfig.openAiModel4 || 'gpt-4';
        this.temperature = aiConfig.temperature;
    }

    // Word Type Operations
    async getWordType(word, limit = 8) {
        const decodedWord = decodeURIComponent(word).toLowerCase();

        // Use the new wordTypeManager system instead of old database files
        try {
            const replacement = await wordTypeManager.getWordReplacement(`$${decodedWord}`);

            return [replacement]; // Return as array for compatibility
        } catch (error) {
            console.error('Error getting word type:', error);

            return [decodedWord]; // Return original word on error
        }
    }

    async getWordExamples(word, limit = 8) {
        const decodedWord = decodeURIComponent(word).toLowerCase();

        // Use wordTypeManager for examples - return empty array for now
        // This functionality can be enhanced later if needed
        console.log(`getWordExamples called for: ${decodedWord} (limit: ${limit})`);

        return [];
    }

    async getWordTypes(word, limit = 8) {
        const decodedWord = decodeURIComponent(word).toLowerCase();

        // Use wordTypeManager for word types
        try {
            const replacement = await wordTypeManager.getWordReplacement(`$${decodedWord}`);

            return [replacement]; // Return as array for compatibility
        } catch (error) {
            console.error('Error getting word types:', error);

            return [decodedWord]; // Return original word on error
        }
    }

    async addWordType(word) {
        const decodedWord = decodeURIComponent(word).toLowerCase();

        console.log('🔍 AI SERVICE: addWordType called with:', decodedWord);

        const result = await this._addAiWordType(decodedWord);

        console.log('✅ AI SERVICE: _addAiWordType result:', result);

        return result;
    }

    // Cache Management
    getCacheStats() {
        return wordTypeManager.getCacheStats();
    }

    clearCache() {
        wordTypeManager.clearCache();

        return { message: 'Cache cleared successfully' };
    }

    // Prompt Processing
    // eslint-disable-next-line max-params
    async processPrompt(prompt, multiplier = false, mixup = false, mashup = false, customVariables = '', photogenic = false, artistic = false, avatar = false, req = null) {
        // This will be implemented when we extract the prompt service
        // For now, we'll import the feed module directly
        const feed = await import('../feed.js');

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
    }


    async _addAiWordType(word) {
        try {
            const options = this._createAddWordAIOptions(word);
            const res = await this.openai.chat.completions.create(options);
            const resObj = this._extractOpenAiResponse(res);

            if (resObj && typeof resObj.types === 'object') {
                const { types } = resObj;

                // Save the word type to database
                const savedTerm = await wordTypeManager.addWordType(word, types);

                // Return the saved term data instead of raw AI response
                return {
                    success: true,
                    term: {
                        word,
                        types,
                        id: savedTerm._id || savedTerm.id,
                        createdAt: savedTerm.createdAt || new Date().toISOString()
                    }
                };
            }

            return { error: 'Failed to extract types from AI response' };
        } catch (error) {
            console.error(error);

            return { error: error.message };
        }
    }

    _extractOpenAiResponse(response) {
        if (!response || !response.choices || response.choices.length === 0) {
            return null;
        }

        const [firstChoice] = response.choices;

        if (!firstChoice.message || !firstChoice.message.tool_calls || firstChoice.message.tool_calls.length === 0) {
            return null;
        }

        const [firstToolCall] = firstChoice.message.tool_calls;

        if (firstToolCall.function && firstToolCall.function.arguments) {
            return typeof firstToolCall.function.arguments === 'object' ?
                firstToolCall.function.arguments :
                this._safeJsonParse(firstToolCall.function.arguments);
        }

        return null;
    }

    _safeJsonParse(str) {
        try {
            return JSON.parse(str);
        } catch (error) {
            return str;
        }
    }

    _createAddWordAIOptions(word) {
        return {
            model: this.openAiModel4,
            messages: [
                { role: 'user', content: `Attempt to generate at least 75 unique examples of "${word}".` }
            ],
            max_tokens: this.maxTokens4,
            tool_choice: { type: 'function', function: { name: 'get_word_types' } },
            tools: [{
                type: 'function',
                function: {
                    name: 'get_word_types',
                    description: `Gets types of "${word}"`,
                    parameters: {
                        type: 'object',
                        properties: {
                            types: {
                                type: 'array',
                                description: 'Examples or types of the user prompt, attempt 75 unique examples.',
                                items: {
                                    type: 'string',
                                    description: `A type of ${word}.`
                                }
                            }
                        },
                        required: ['types']
                    }
                }
            }]
        };
    }

    // Delete word type and associated data
    async deleteWordType(word) {
        try {
            if (!word || typeof word !== 'string') {
                throw new Error('Invalid word parameter');
            }

            // Delete from database
            const result = await wordTypeManager.deleteWordType(word);

            return {
                success: true,
                message: `Word "${word}" and its associated types have been deleted`,
                deletedWord: word,
                result
            };
        } catch (error) {
            console.error('❌ Delete word type error:', error);

            return {
                success: false,
                error: error.message || 'Failed to delete word type'
            };
        }
    }
}
