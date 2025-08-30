import { ExternalServiceError } from '../errors/CustomErrors.js';

export class AIController {
    constructor(aiService) {
        this.aiService = aiService;
    }

    // Word Type Operations
    async getWordType(req, res) {
        try {
            const { word } = req.params;
            const limit = req.query.limit || 8;
            const response = await this.aiService.getWordType(word, limit);

            res.send(response);
        } catch (error) {
            console.error('❌ Get word type error:', error);
            throw new ExternalServiceError('Word Type Service', error.message);
        }
    }

    async getWordExamples(req, res) {
        try {
            const { word } = req.params;
            const limit = req.query.limit || 8;
            const response = await this.aiService.getWordExamples(word, limit);

            res.send(response);
        } catch (error) {
            console.error('❌ Get word examples error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getWordTypes(req, res) {
        try {
            const { word } = req.params;
            const limit = req.query.limit || 8;
            const response = await this.aiService.getWordTypes(word, limit);

            res.send(response);
        } catch (error) {
            console.error('❌ Get word types error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async addWordType(req, res) {
        try {
            const { word } = req.params;
            const response = await this.aiService.addWordType(word);

            res.send(response);
        } catch (error) {
            console.error('❌ Add word type error:', error);
            throw new ExternalServiceError('AI Service', error.message);
        }
    }

    // Cache Management
    async getCacheStats(req, res) {
        try {
            const stats = this.aiService.getCacheStats();

            res.json(stats);
        } catch (error) {
            console.error('❌ Get cache stats error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async clearCache(req, res) {
        try {
            const result = this.aiService.clearCache();

            res.json(result);
        } catch (error) {
            console.error('❌ Clear cache error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // Prompt Processing
    async processPrompt(req, res) {
        try {
            const prompt = decodeURIComponent(req.query.prompt);
            const multiplier = req.query.multiplier ? decodeURIComponent(req.query.multiplier) : false;
            const mixup = req.query.mixup ? decodeURIComponent(req.query.mixup) : false;
            const mashup = req.query.mashup ? decodeURIComponent(req.query.mashup) : false;
            const customVariables = decodeURIComponent(req.query.customVariables);

            const response = await this.aiService.processPrompt(
                prompt,
                multiplier,
                mixup,
                mashup,
                customVariables,
                req
            );

            res.send(response);
        } catch (error) {
            console.error('❌ Process prompt error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
