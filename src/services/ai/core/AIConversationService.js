/**
 * AI Conversation Service
 *
 * Handles all database operations for AI conversations and prompts.
 * Separates data layer from business logic.
 */

import databaseClient from '../../../database/PrismaClient.js';

export class AIConversationService {
    constructor() {
        this.prisma = databaseClient.getClient();

        console.log('🔧 AIConversationService constructor:', {
            hasPrisma: !!this.prisma,
            prismaType: typeof this.prisma
        });
    }

    /**
     * Save conversation to database
     */
    async saveConversation(prompt, response, userId, conversationId, type) {
        if (!this.prisma) {
            console.error('❌ Prisma client not available for saving conversation');

            return null;
        }

        try {
            const result = await this.prisma.aIPrompt.create({
                data: {
                    type,
                    prompt,
                    response,
                    userId,
                    conversationId: conversationId || this.generateConversationId(),
                    context: {
                        timestamp: new Date().toISOString(),
                        userAgent: navigator.userAgent
                    }
                }
            });

            console.log('✅ Conversation saved:', {
                id: result.id,
                type: result.type,
                userId: result.userId,
                conversationId: result.conversationId
            });

            return result;
        } catch (error) {
            console.error('❌ Error saving conversation:', error);

            return null;
        }
    }

    /**
     * Get conversation history with pagination
     */
    async getConversationHistory(conversationId, limit = 5, page = 0) {
        console.log('🔍 AIConversationService.getConversationHistory called:', {
            conversationId,
            limit,
            page,
            hasPrisma: !!this.prisma
        });

        if (!conversationId) {
            console.log('❌ No conversation ID provided');

            return [];
        }

        if (!this.prisma) {
            console.error('❌ Prisma client not available');

            return [];
        }

        try {
            const skip = page * limit;

            console.log('📊 Database query parameters:', { skip, limit, conversationId });

            const history = await this.prisma.aIPrompt.findMany({
                where: { conversationId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    type: true,
                    prompt: true,
                    response: true,
                    createdAt: true
                }
            });

            console.log('📋 Raw database results:', {
                count: history.length,
                records: history.map(r => ({
                    type: r.type,
                    hasPrompt: !!r.prompt,
                    hasResponse: !!r.response,
                    createdAt: r.createdAt
                }))
            });

            // Convert to chat format (not OpenAI format for display)
            const messages = [];

            for (const record of history.reverse()) {
                if (record.type === 'user') {
                    messages.push({
                        role: 'user',
                        content: record.prompt,
                        createdAt: record.createdAt
                    });
                } else {
                    messages.push({
                        role: 'assistant',
                        content: record.response,
                        createdAt: record.createdAt
                    });
                }
            }

            console.log('📚 Conversation history retrieved:', {
                conversationId,
                page,
                limit,
                messageCount: messages.length,
                historyLength: history.length,
                messages: messages.map(m => ({
                    role: m.role,
                    contentLength: m.content?.length || 0,
                    createdAt: m.createdAt
                }))
            });

            return messages;
        } catch (error) {
            console.error('❌ Error getting conversation history:', error);

            return [];
        }
    }

    /**
     * Get user prompts
     */
    async getUserPrompts(userId, limit = 10) {
        if (!this.prisma) {
            console.error('❌ Prisma client not available');

            return [];
        }

        try {
            const prompts = await this.prisma.aIPrompt.findMany({
                where: {
                    type: 'user',
                    userId
                },
                orderBy: { createdAt: 'desc' },
                take: limit
            });

            console.log('👤 User prompts retrieved:', {
                userId,
                count: prompts.length
            });

            return prompts;
        } catch (error) {
            console.error('❌ Error getting user prompts:', error);

            return [];
        }
    }

    /**
     * Get application prompts
     */
    async getApplicationPrompts(limit = 10) {
        if (!this.prisma) {
            console.error('❌ Prisma client not available');

            return [];
        }

        try {
            const prompts = await this.prisma.aIPrompt.findMany({
                where: { type: 'application' },
                orderBy: { createdAt: 'desc' },
                take: limit
            });

            console.log('🤖 Application prompts retrieved:', {
                count: prompts.length
            });

            return prompts;
        } catch (error) {
            console.error('❌ Error getting application prompts:', error);

            return [];
        }
    }

    /**
     * Generate conversation ID
     */
    generateConversationId() {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get conversation statistics
     */
    async getConversationStats(userId = null) {
        if (!this.prisma) {
            console.error('❌ Prisma client not available');

            return null;
        }

        try {
            const whereClause = userId ? { userId } : {};

            const [totalPrompts, userPrompts, applicationPrompts] = await Promise.all([
                this.prisma.aIPrompt.count({ where: whereClause }),
                this.prisma.aIPrompt.count({ where: { ...whereClause, type: 'user' } }),
                this.prisma.aIPrompt.count({ where: { ...whereClause, type: 'application' } })
            ]);

            return {
                totalPrompts,
                userPrompts,
                applicationPrompts,
                userId,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error getting conversation stats:', error);

            return null;
        }
    }
}
