/**
 * AI Chat Routes
 * Handles AI chat widget functionality with intelligent AI agent
 */

import { getAIAgentService } from '../services/ai/features/AIAgentServiceSingleton.js';
import { getAIPromptService } from '../services/ai/features/AIPromptServiceSingleton.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const handleChatRequest = async(req, res) => {
    try {
        const { message, context, conversationId } = req.body;
        const userId = req.user?.id;

        console.log('🤖 AI Chat Request:', {
            message: `${message?.substring(0, 100)}...`,
            user: context?.user,
            formData: context?.formData,
            models: context?.models,
            images: context?.images?.length || 0,
            conversationId
        });

        const response = await getAIAgentService().processChatRequest(
            message,
            context,
            userId,
            conversationId
        );

        console.log('🤖 AI Chat Response:', {
            response: `${response?.response?.substring(0, 100)}...`,
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
};

const handleHistoryRequest = async(req, res) => {
    try {
        const { conversationId } = req.params;
        const { page = 0, limit = 5 } = req.query;
        const userId = req.user?.id;

        console.log('📚 [API] AI Chat History Request:', {
            conversationId,
            page: parseInt(page),
            limit: parseInt(limit),
            userId,
            hasUser: !!req.user,
            userAgent: req.get('User-Agent'),
            referer: req.get('Referer')
        });

        const history = await getAIAgentService().getConversationHistory(conversationId, parseInt(limit), parseInt(page));

        console.log('📊 [API] History retrieved:', {
            conversationId,
            historyLength: history.length,
            page: parseInt(page),
            limit: parseInt(limit),
            hasMore: history.length === parseInt(limit)
        });

        const response = {
            history,
            page: parseInt(page),
            limit: parseInt(limit),
            hasMore: history.length === parseInt(limit)
        };

        console.log('📤 [API] Sending response:', {
            historyCount: response.history.length,
            page: response.page,
            limit: response.limit,
            hasMore: response.hasMore
        });

        res.json(response);
    } catch (error) {
        console.error('❌ [API] AI Chat History Error:', error);
        console.error('❌ [API] Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            conversationId: req.params.conversationId
        });
        res.status(500).json({ error: 'Failed to get conversation history' });
    }
};

const handlePromptsRequest = async(req, res) => {
    try {
        const userId = req.user?.id;
        const { type = 'user', limit = 10 } = req.query;

        const prompts = type === 'user'
            ? await getAIAgentService().getUserPrompts(userId, parseInt(limit))
            : await getAIAgentService().getApplicationPrompts(parseInt(limit));

        res.json({ prompts });
    } catch (error) {
        console.error('❌ AI Chat Prompts Error:', error);
        res.status(500).json({ error: 'Failed to get prompts' });
    }
};

const handleOrganizePrompt = async(req, res) => {
    try {
        const { prompt, context } = req.body;
        const userId = req.user?.id;

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
            prompt: `${prompt?.substring(0, 100)}...`,
            userId,
            timestamp: context?.timestamp
        });

        const organizedPrompt = await getAIPromptService().organizePrompt(prompt, userId);

        if (!organizedPrompt || organizedPrompt.trim().length === 0) {
            return res.status(500).json({
                error: 'Failed to organize prompt. Please try again.'
            });
        }

        res.json({ organizedPrompt });
    } catch (error) {
        console.error('❌ Prompt Organization Error:', error);

        if (error.message.includes('OpenAI') || error.message.includes('API key')) {
            res.status(503).json({ error: 'AI service temporarily unavailable. Please try again later.' });
        } else if (error.message.includes('rate limit')) {
            res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
        } else if (error.message.includes('database') || error.message.includes('Prisma')) {
            res.status(500).json({ error: 'Database error. Please try again.' });
        } else if (error.message.includes('Invalid prompt')) {
            res.status(400).json({ error: 'Invalid prompt provided.' });
        } else {
            res.status(500).json({ error: 'Failed to organize prompt. Please try again.' });
        }
    }
};

export const setupAIChatRoutes = app => {
    app.post('/api/ai-chat', handleChatRequest);
    app.get('/api/ai-chat/history/:conversationId', handleHistoryRequest);
    app.get('/api/ai-chat/prompts', handlePromptsRequest);
    app.post('/api/organize-prompt', authenticateToken, handleOrganizePrompt);
};

