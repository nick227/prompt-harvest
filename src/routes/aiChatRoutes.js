/**
 * AI Chat Routes
 * Handles AI chat widget functionality with intelligent AI agent
 */

import { AIAgentService } from '../services/ai/features/AIAgentService.js';
import { AIPromptService } from '../services/ai/features/AIPromptService.js';

const aiAgentService = new AIAgentService();
const aiPromptService = new AIPromptService();

export const setupAIChatRoutes = app => {
    app.post('/api/ai-chat', async(req, res) => {
        try {
            const { message, context, conversationId } = req.body;
            const userId = req.user?.id;

            console.log('🤖 AI Chat Request:', {
                message: message?.substring(0, 100) + '...',
                user: context?.user,
                formData: context?.formData,
                models: context?.models,
                images: context?.images?.length || 0,
                conversationId
            });

            // Process with AI Agent service
            const response = await aiAgentService.processChatRequest(
                message,
                context,
                userId,
                conversationId
            );

            console.log('🤖 AI Chat Response:', {
                response: response?.response?.substring(0, 100) + '...',
                buttons: response?.buttons?.length || 0,
                newPrompt: response?.newPrompt ? 'Yes' : 'No',
                hasResponse: !!response?.response
            });

            res.json(response);
        } catch (error) {
            console.error('❌ AI Chat Error:', error);
            res.status(500).json({
                response: 'Sorry, I encountered an error. Please try again.',
                buttons: [],
                newPrompt: null
            });
        }
    });

    // Get conversation history with pagination
    app.get('/api/ai-chat/history/:conversationId', async(req, res) => {
        try {
            const { conversationId } = req.params;
            const { page = 0, limit = 5 } = req.query;
            const userId = req.user?.id;

            console.log('📚 AI Chat History Request:', {
                conversationId,
                page: parseInt(page),
                limit: parseInt(limit),
                userId
            });

            const history = await aiAgentService.getConversationHistory(conversationId, parseInt(limit), parseInt(page));

            res.json({
                history,
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: history.length === parseInt(limit)
            });
        } catch (error) {
            console.error('❌ AI Chat History Error:', error);
            res.status(500).json({ error: 'Failed to get conversation history' });
        }
    });

    // Get user prompts
    app.get('/api/ai-chat/prompts', async(req, res) => {
        try {
            const userId = req.user?.id;
            const { type = 'user', limit = 10 } = req.query;

            let prompts;
            if (type === 'user') {
                prompts = await aiAgentService.getUserPrompts(userId, parseInt(limit));
            } else {
                prompts = await aiAgentService.getApplicationPrompts(parseInt(limit));
            }

            res.json({ prompts });
        } catch (error) {
            console.error('❌ AI Chat Prompts Error:', error);
            res.status(500).json({ error: 'Failed to get prompts' });
        }
    });

    // Organize prompt endpoint
    app.post('/api/organize-prompt', async(req, res) => {
        try {
            const { prompt, context } = req.body;
            const userId = req.user?.id;

            // Validate input
            if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
                return res.status(400).json({
                    error: 'Invalid prompt. Please provide a non-empty string.'
                });
            }

            if (prompt.length > 2000) {
                return res.status(400).json({
                    error: 'Prompt too long. Please keep it under 2000 characters.'
                });
            }

            console.log('🔮 Prompt Organization Request:', {
                prompt: prompt?.substring(0, 100) + '...',
                userId,
                timestamp: context?.timestamp
            });

            // Process with AI Prompt service for prompt organization
            const organizedPrompt = await aiPromptService.organizePrompt(prompt, userId);

            if (!organizedPrompt || organizedPrompt.trim().length === 0) {
                return res.status(500).json({
                    error: 'Failed to organize prompt. Please try again.'
                });
            }

            res.json({ organizedPrompt });
        } catch (error) {
            console.error('❌ Prompt Organization Error:', error);

            // Provide specific error responses
            if (error.message.includes('OpenAI')) {
                res.status(503).json({ error: 'AI service temporarily unavailable. Please try again later.' });
            } else if (error.message.includes('database') || error.message.includes('Prisma')) {
                res.status(500).json({ error: 'Database error. Please try again.' });
            } else {
                res.status(500).json({ error: 'Failed to organize prompt. Please try again.' });
            }
        }
    });
};

