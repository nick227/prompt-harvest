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

    async addWordTypePost(req, res) {
        try {
            const { word } = req.body;

            console.log('🔍 AI CONTROLLER: addWordTypePost called with word:', word);

            if (!word) {
                return res.status(400).json({ error: 'Word is required' });
            }

            const response = await this.aiService.addWordType(word);

            console.log('✅ AI CONTROLLER: Service response:', response);

            res.json(response);
        } catch (error) {
            console.error('❌ Add word type POST error:', error);
            res.status(500).json({ error: error.message || 'Failed to add word type' });
        }
    }

    async deleteWordType(req, res) {
        try {
            const { word } = req.params;

            if (!word) {
                return res.status(400).json({ error: 'Word is required' });
            }

            const response = await this.aiService.deleteWordType(word);

            res.json(response);
        } catch (error) {
            console.error('❌ Delete word type error:', error);
            res.status(500).json({ error: error.message || 'Failed to delete word type' });
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

    // Sample Clauses for Textarea Autocomplete
    async getSampleClauses(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 14;

            // Sample clauses for image generation prompts
            const sampleClauses = [
                'beautiful', 'detailed', 'high quality', 'professional',
                'artistic', 'creative', 'stunning', 'amazing',
                'photorealistic', 'cinematic', 'dramatic', 'vibrant',
                'masterpiece', 'award winning', 'trending', 'popular',
                'realistic', 'hyperrealistic', '8k', '4k',
                'sharp focus', 'soft lighting', 'studio lighting',
                'natural lighting', 'dramatic lighting', 'golden hour',
                'sunset', 'sunrise', 'night', 'day',
                'indoor', 'outdoor', 'landscape', 'portrait',
                'close up', 'wide shot', 'medium shot', 'full body',
                'head shot', 'profile', 'three quarter view',
                'front view', 'side view', 'back view', 'top view',
                'bottom view', 'aerial view', 'bird eye view',
                'worm eye view', 'macro', 'microscopic', 'telescopic'
            ];

            // Return limited number of clauses
            const limitedClauses = sampleClauses.slice(0, limit);

            res.json(limitedClauses);
        } catch (error) {
            console.error('❌ Get sample clauses error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
