import databaseClient from '../../../database/PrismaClient.js';

export class ConversationService {
    constructor() {
        this.prisma = databaseClient.getClient();
        console.log('🔧 ConversationService constructor:', {
            hasPrisma: !!this.prisma,
            prismaType: typeof this.prisma
        });
    }

    /**
     * Create a new conversation
     */
    async createConversation(userId, title = null) {
        if (!this.prisma) {
            console.error('❌ Prisma client not available');
            return null;
        }

        try {
            const conversation = await this.prisma.conversation.create({
                data: {
                    userId,
                    title
                }
            });

            console.log('✅ Conversation created:', {
                id: conversation.id,
                userId,
                title
            });

            return conversation;
        } catch (error) {
            console.error('❌ Error creating conversation:', error);
            return null;
        }
    }

    /**
     * Get or create conversation for user
     */
    async getOrCreateConversation(userId, conversationId = null) {
        if (!this.prisma) {
            console.error('❌ Prisma client not available');
            return null;
        }

        try {
            // If conversationId provided, try to get existing conversation
            if (conversationId) {
                const conversation = await this.prisma.conversation.findFirst({
                    where: {
                        id: conversationId,
                        userId
                    }
                });

                if (conversation) {
                    return conversation;
                }
            }

            // Create new conversation
            return await this.createConversation(userId);
        } catch (error) {
            console.error('❌ Error getting/creating conversation:', error);
            return null;
        }
    }

    /**
     * Add a message to a conversation
     */
    async addMessage(conversationId, role, content, metadata = null) {
        if (!this.prisma) {
            console.error('❌ Prisma client not available');
            return null;
        }

        try {
            const message = await this.prisma.chatMessage.create({
                data: {
                    conversationId,
                    role,
                    content,
                    metadata
                }
            });

            console.log('✅ Message added:', {
                id: message.id,
                conversationId,
                role,
                contentLength: content.length
            });

            return message;
        } catch (error) {
            console.error('❌ Error adding message:', error);
            return null;
        }
    }

    /**
     * Get conversation history with pagination
     */
    async getConversationHistory(conversationId, limit = 5, page = 0) {
        console.log('🔍 ConversationService.getConversationHistory called:', {
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

            const messages = await this.prisma.chatMessage.findMany({
                where: { conversationId },
                orderBy: { createdAt: 'desc' },
                skip: skip,
                take: limit,
                select: {
                    role: true,
                    content: true,
                    metadata: true,
                    createdAt: true
                }
            });

            console.log('📋 Raw database results:', {
                count: messages.length,
                records: messages.map(m => ({
                    role: m.role,
                    contentLength: m.content?.length || 0,
                    hasMetadata: !!m.metadata,
                    createdAt: m.createdAt
                }))
            });

            // Convert to chat format (reverse to show oldest first)
            const chatMessages = messages.reverse().map(message => ({
                role: message.role,
                content: message.content,
                metadata: message.metadata,
                createdAt: message.createdAt
            }));

            console.log('📚 Conversation history retrieved:', {
                conversationId,
                page,
                limit,
                messageCount: chatMessages.length
            });

            return chatMessages;
        } catch (error) {
            console.error('❌ Error getting conversation history:', error);
            return [];
        }
    }

    /**
     * Get user's recent conversations
     */
    async getUserConversations(userId, limit = 10) {
        if (!this.prisma) {
            console.error('❌ Prisma client not available');
            return [];
        }

        try {
            const conversations = await this.prisma.conversation.findMany({
                where: { userId },
                orderBy: { updatedAt: 'desc' },
                take: limit,
                select: {
                    id: true,
                    title: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            messages: true
                        }
                    }
                }
            });

            return conversations;
        } catch (error) {
            console.error('❌ Error getting user conversations:', error);
            return [];
        }
    }
}
