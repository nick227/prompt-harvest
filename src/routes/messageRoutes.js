import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateTokenRequired } from '../middleware/authMiddleware.js';

const router = new express.Router();
const prisma = new PrismaClient();

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map();

// Rate limiting middleware
const rateLimit = (maxRequests = 10, windowMs = 60000) => (req, res, next) => {
    const userId = req.user?.id;
    const key = `messages_${userId}`;
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, { count: 0, resetTime: now + windowMs });
    }

    const userLimit = rateLimitStore.get(key);

    if (now > userLimit.resetTime) {
        userLimit.count = 0;
        userLimit.resetTime = now + windowMs;
    }

    if (userLimit.count >= maxRequests) {
        return res.status(429).json({
            error: 'Too many requests. Please wait before sending another message.',
            retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
        });
    }

    userLimit.count++;
    next();
};

// Middleware to verify admin access (using JWT authentication)
const verifyAdmin = async (req, res, next) => {
    try {
        // Use the existing JWT authentication middleware
        await authenticateTokenRequired(req, res, error => {
            if (error) {
                return res.status(401).json({ error: error.message || 'Authentication required' });
            }

            // Check if user is admin
            if (!req.user.isAdmin) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            // Set adminId for consistency with existing code
            req.adminId = req.user.id;
            next();
        });
    } catch (error) {
        console.error('Admin verification error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Middleware to verify user access (using JWT authentication)
const verifyUser = async (req, res, next) => {
    try {
        // Use the existing JWT authentication middleware
        await authenticateTokenRequired(req, res, error => {
            if (error) {
                return res.status(401).json({ error: error.message || 'Authentication required' });
            }

            // Set userId for consistency with existing code
            req.userId = req.user.id;
            next();
        });
    } catch (error) {
        console.error('User verification error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /api/messages/user - Get user's messages
router.get('/user', verifyUser, async (req, res) => {
    try {
        const { userId } = req;

        const messages = await prisma.message.findMany({
            where: { userId },
            include: {
                user: {
                    select: { username: true, email: true }
                },
                admin: {
                    select: { username: true, email: true }
                },
                replies: {
                    include: {
                        user: {
                            select: { username: true, email: true }
                        },
                        admin: {
                            select: { username: true, email: true }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Error fetching user messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// GET /api/messages/admin - Get all messages for admin
router.get('/admin', verifyAdmin, async (req, res) => {
    try {
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { isFromUser: true }, // User messages
                    { adminId: req.adminId } // Admin's own messages
                ]
            },
            include: {
                user: {
                    select: { username: true, email: true, id: true }
                },
                admin: {
                    select: { username: true, email: true }
                },
                replies: {
                    include: {
                        user: {
                            select: { username: true, email: true }
                        },
                        admin: {
                            select: { username: true, email: true }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Group messages by user for admin view
        const groupedMessages = messages.reduce((acc, message) => {
            const { userId } = message;

            if (!acc[userId]) {
                acc[userId] = {
                    user: message.user,
                    messages: [],
                    unreadCount: 0
                };
            }

            acc[userId].messages.push(message);
            if (!message.isRead && message.isFromUser) {
                acc[userId].unreadCount++;
            }

            return acc;
        }, {});

        res.json({
            success: true,
            messages: Object.values(groupedMessages),
            totalUnread: Object.values(groupedMessages).reduce((sum, group) => sum + group.unreadCount, 0)
        });
    } catch (error) {
        console.error('Error fetching admin messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /api/messages/admin-reply - Create admin reply
router.post('/admin-reply', verifyAdmin, rateLimit(5, 60000), async (req, res) => {
    try {
        const { message, userId } = req.body;
        const { adminId } = req;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message content cannot be empty' });
        }

        if (message.length > 5000) {
            return res.status(400).json({ error: 'Message too long (max 5000 characters)' });
        }

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required for admin replies' });
        }

        // Verify the user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, email: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const newMessage = await prisma.message.create({
            data: {
                userId, // Use the original user's ID so it appears in their conversation
                message: message.trim(),
                isFromUser: false, // This is an admin message
                adminId, // Set the admin ID
                isRead: true // Admin messages are read by default for the user
            },
            include: {
                user: {
                    select: { username: true, email: true }
                },
                admin: {
                    select: { username: true, email: true }
                }
            }
        });

        res.status(201).json({ success: true, message: newMessage });
    } catch (error) {
        console.error('Error creating admin reply:', error);
        res.status(500).json({ error: 'Failed to send admin reply' });
    }
});

// POST /api/messages - Create new message
router.post('/', verifyUser, rateLimit(5, 60000), async (req, res) => {
    try {
        const { message, parentId, isFromUser = true } = req.body;
        const { userId } = req;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        if (message.length > 5000) {
            return res.status(400).json({ error: 'Message too long (max 5000 characters)' });
        }

        const newMessage = await prisma.message.create({
            data: {
                userId,
                message: message.trim(),
                isFromUser,
                parentId: parentId || null,
                adminId: isFromUser ? null : req.adminId
            },
            include: {
                user: {
                    select: { username: true, email: true }
                },
                admin: {
                    select: { username: true, email: true }
                }
            }
        });

        res.status(201).json({ success: true, message: newMessage });
    } catch (error) {
        console.error('Error creating message:', error);
        res.status(500).json({ error: 'Failed to create message' });
    }
});

// PUT /api/messages/:id/read - Mark message as read
router.put('/:id/read', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { isRead = true } = req.body;

        const message = await prisma.message.update({
            where: { id },
            data: { isRead },
            include: {
                user: {
                    select: { username: true, email: true }
                },
                admin: {
                    select: { username: true, email: true }
                }
            }
        });

        res.json({ success: true, message });
    } catch (error) {
        console.error('Error updating message read status:', error);
        res.status(500).json({ error: 'Failed to update message' });
    }
});

// PUT /api/messages/:id - Update message
router.put('/:id', verifyUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        const { userId } = req;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        if (message.length > 5000) {
            return res.status(400).json({ error: 'Message too long (max 5000 characters)' });
        }

        // Check if user owns this message
        const existingMessage = await prisma.message.findUnique({
            where: { id },
            select: { userId: true, isFromUser: true }
        });

        if (!existingMessage) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Users can only edit their own messages, admins can edit any message
        if (existingMessage.userId !== userId && req.adminId) {
            // Admin can edit any message
        } else if (existingMessage.userId !== userId) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        const updatedMessage = await prisma.message.update({
            where: { id },
            data: {
                message: message.trim(),
                updatedAt: new Date()
            },
            include: {
                user: {
                    select: { username: true, email: true }
                },
                admin: {
                    select: { username: true, email: true }
                }
            }
        });

        res.json({ success: true, message: updatedMessage });
    } catch (error) {
        console.error('Error updating message:', error);
        res.status(500).json({ error: 'Failed to update message' });
    }
});

// DELETE /api/messages/:id - Delete message
router.delete('/:id', verifyUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req;

        // Check if user owns this message
        const existingMessage = await prisma.message.findUnique({
            where: { id },
            select: { userId: true, isFromUser: true }
        });

        if (!existingMessage) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Users can only delete their own messages, admins can delete any message
        if (existingMessage.userId !== userId && !req.adminId) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        await prisma.message.delete({
            where: { id }
        });

        res.json({ success: true, message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

// GET /api/messages/stats - Get message statistics for admin
router.get('/stats', verifyAdmin, async (req, res) => {
    try {
        const totalMessages = await prisma.message.count();
        const unreadMessages = await prisma.message.count({
            where: { isRead: false, isFromUser: true }
        });
        const todayMessages = await prisma.message.count({
            where: {
                createdAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            }
        });

        res.json({
            success: true,
            stats: {
                totalMessages,
                unreadMessages,
                todayMessages
            }
        });
    } catch (error) {
        console.error('Error fetching message stats:', error);
        res.status(500).json({ error: 'Failed to fetch message statistics' });
    }
});

export default router;
