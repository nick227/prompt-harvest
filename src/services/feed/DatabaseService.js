/**
 * DatabaseService
 *
 * Handles all database operations for the image generation system including:
 * - Image saving and retrieval
 * - Prompt saving and retrieval
 * - User data management
 * - Database connection management
 *
 * This service centralizes all database operations and provides
 * a clean interface for data persistence.
 */

import databaseClient from '../../database/PrismaClient.js';
import { generateId } from '../../utils/FeedUtils.js';

// ============================================================================
// DATABASE CONNECTION
// ============================================================================


/**
 * Get Prisma client instance
 * @returns {Object} Prisma client
 */
const getPrismaClient = () => databaseClient.getClient();

// ============================================================================
// IMAGE OPERATIONS
// ============================================================================

/**
 * Save image data to database (database operations only)
 * @param {Object} imageData - Image data to save
 * @param {string} imageData.prompt - Image generation prompt
 * @param {string} imageData.original - Original prompt
 * @param {string} imageData.provider - Provider name
 * @param {string} imageData.imageUrl - Image URL/path (already saved to storage)
 * @param {string} imageData.promptId - Associated prompt ID
 * @param {string} imageData.userId - User ID (can be null for anonymous)
 * @param {number} imageData.guidance - Guidance value
 * @param {string} imageData.model - Model name
 * @returns {Promise<Object>} Saved image data
 */
const saveImageToDatabase = async imageData => {
    const prisma = getPrismaClient();

    try {
        // Input validation
        if (!imageData) {
            throw new Error('Image data is required');
        }
        if (!imageData.prompt || typeof imageData.prompt !== 'string') {
            throw new Error('Prompt is required and must be a string');
        }
        if (!imageData.provider || typeof imageData.provider !== 'string') {
            throw new Error('Provider is required and must be a string');
        }
        if (!imageData.imageUrl || typeof imageData.imageUrl !== 'string') {
            throw new Error('Image URL is required and must be a string');
        }

        console.log('💾 Saving image to database:', {
            prompt: imageData.prompt ? `${imageData.prompt.substring(0, 50)}...` : 'undefined',
            provider: imageData.provider,
            userId: imageData.userId || 'anonymous',
            promptId: imageData.promptId,
            imageUrl: imageData.imageUrl
        });

        const image = await prisma.image.create({
            data: {
                prompt: imageData.prompt,
                original: imageData.original,
                provider: imageData.provider,
                imageUrl: imageData.imageUrl, // Image already saved to storage
                userId: imageData.userId, // Can be null for anonymous users
                guidance: imageData.guidance || 10,
                model: imageData.model || null,
                isPublic: false // Default to private
            }
        });

        console.log('✅ Image saved to database successfully:', { id: image.id, imageUrl: imageData.imageUrl });

        return {
            _id: image.id,
            data: {
                ...imageData,
                imageId: image.id,
                imageUrl: imageData.imageUrl
            }
        };
    } catch (error) {
        console.error('❌ Error saving image to database:', {
            error: error.message,
            provider: imageData.provider,
            userId: imageData.userId || 'anonymous',
            imageUrl: imageData.imageUrl
        });
        throw new Error(`Database save failed: ${error.message}`);
    }
};

/**
 * Get image by ID
 * @param {string} imageId - Image ID
 * @returns {Promise<Object|null>} Image data or null if not found
 */
const getImageById = async imageId => {
    const prisma = getPrismaClient();

    try {
        const image = await prisma.image.findUnique({
            where: { id: imageId }
        });

        return image;
    } catch (error) {
        console.error('❌ Error retrieving image:', error);
        throw new Error(`Database retrieval failed: ${error.message}`);
    }
};

/**
 * Get images by user ID
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of images to return
 * @param {number} offset - Number of images to skip
 * @returns {Promise<Array>} Array of images
 */
const getImagesByUserId = async(userId, limit = 20, offset = 0) => {
    const prisma = getPrismaClient();

    try {
        const images = await prisma.image.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });

        return images;
    } catch (error) {
        console.error('❌ Error retrieving user images:', error);
        throw new Error(`Database retrieval failed: ${error.message}`);
    }
};

// ============================================================================
// PROMPT OPERATIONS
// ============================================================================

/**
 * Save prompt data to database
 * @param {Object} promptData - Prompt data to save
 * @param {string} promptData.original - Original prompt
 * @param {string} promptData.prompt - Processed prompt
 * @param {string} promptData.provider - Provider name
 * @param {string} promptData.userId - User ID (can be null for anonymous)
 * @returns {Promise<Object>} Saved prompt data
 */
const savePromptToDatabase = async promptData => {
    const prisma = getPrismaClient();

    try {
        // Handle anonymous users differently
        if (!promptData.userId) {
            console.log('⏭️ Anonymous user - saving prompt with temporary ID');

            // For anonymous users, we could save to a separate table or use a special userId
            // For now, we'll use a special anonymous userId
            const anonymousUserId = 'anonymous_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

            const prompt = await prisma.prompts.create({
                data: {
                    id: generateId(),
                    original: promptData.original || promptData.prompt,
                    prompt: promptData.prompt,
                    provider: promptData.provider || 'unknown',
                    userId: anonymousUserId
                }
            });

            console.log('✅ Anonymous prompt saved successfully:', { id: prompt.id });

            return {
                _id: prompt.id,
                data: {
                    ...promptData,
                    promptId: prompt.id,
                    userId: anonymousUserId
                }
            };
        }

        console.log('💾 Saving prompt to database:', {
            original: `${promptData.original?.substring(0, 50)}...`,
            prompt: `${promptData.prompt?.substring(0, 50)}...`,
            provider: promptData.provider,
            userId: promptData.userId,
            userIdType: typeof promptData.userId,
            userIdLength: promptData.userId?.length
        });

        // Validate required fields
        if (!promptData.prompt || !promptData.userId) {
            throw new Error('Missing required fields: prompt and userId are required');
        }

        const prompt = await prisma.prompts.create({
            data: {
                id: generateId(),
                original: promptData.original || promptData.prompt,
                prompt: promptData.prompt,
                provider: promptData.provider || 'unknown',
                userId: promptData.userId
            }
        });

        console.log('✅ Prompt saved successfully:', {
            id: prompt.id,
            userId: prompt.userId,
            provider: prompt.provider,
            promptLength: prompt.prompt.length
        });

        return {
            _id: prompt.id,
            data: {
                ...promptData,
                promptId: prompt.id
            }
        };
    } catch (error) {
        console.error('❌ Error saving prompt to database:', error);
        throw new Error(`Database save failed: ${error.message}`);
    }
};

/**
 * Get prompt by ID
 * @param {string} promptId - Prompt ID
 * @returns {Promise<Object|null>} Prompt data or null if not found
 */
const getPromptById = async promptId => {
    const prisma = getPrismaClient();

    try {
        const prompt = await prisma.prompts.findUnique({
            where: { id: promptId }
        });

        return prompt;
    } catch (error) {
        console.error('❌ Error retrieving prompt:', error);
        throw new Error(`Database retrieval failed: ${error.message}`);
    }
};

/**
 * Get prompts by user ID
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of prompts to return
 * @param {number} offset - Number of prompts to skip
 * @returns {Promise<Array>} Array of prompts
 */
const getPromptsByUserId = async(userId, limit = 20, offset = 0) => {
    const prisma = getPrismaClient();

    try {
        const prompts = await prisma.prompts.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });

        return prompts;
    } catch (error) {
        console.error('❌ Error retrieving user prompts:', error);
        throw new Error(`Database retrieval failed: ${error.message}`);
    }
};

// ============================================================================
// USER OPERATIONS
// ============================================================================

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User data or null if not found
 */
const getUserById = async userId => {
    const prisma = getPrismaClient();

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        return user;
    } catch (error) {
        console.error('❌ Error retrieving user:', error);
        throw new Error(`Database retrieval failed: ${error.message}`);
    }
};

/**
 * Get user ID from request (handles authentication)
 * @param {Object} req - Express request object
 * @returns {string|null} User ID or null if not authenticated
 */
const getUserId = req => {
    console.log('🔍 DATABASE SERVICE: getUserId called with:', {
        hasReq: !!req,
        hasUser: !!req?.user,
        hasUserId: !!req?.user?.id,
        userId: req?.user?.id,
        userEmail: req?.user?.email,
        userKeys: req?.user ? Object.keys(req.user) : 'no user'
    });

    if (!req || !req.user || !req.user.id) {
        console.log('🔍 DATABASE SERVICE: getUserId returning null');
        return null;
    }

    console.log('🔍 DATABASE SERVICE: getUserId returning:', req.user.id);
    return req.user.id;
};

// ============================================================================
// STATISTICS OPERATIONS
// ============================================================================

/**
 * Get database statistics
 * @returns {Promise<Object>} Database statistics
 */
const getDatabaseStats = async() => {
    const prisma = getPrismaClient();

    try {
        const [imageCount, userCount, promptCount] = await Promise.all([
            prisma.image.count(),
            prisma.user.count(),
            prisma.prompts.count()
        ]);

        return {
            images: imageCount,
            users: userCount,
            prompts: promptCount,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('❌ Error retrieving database stats:', error);
        throw new Error(`Database stats failed: ${error.message}`);
    }
};

/**
 * Get user statistics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User statistics
 */
const getUserStats = async userId => {
    const prisma = getPrismaClient();

    try {
        const [imageCount, promptCount] = await Promise.all([
            prisma.image.count({ where: { userId } }),
            prisma.prompts.count({ where: { userId } })
        ]);

        return {
            userId,
            images: imageCount,
            prompts: promptCount,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('❌ Error retrieving user stats:', error);
        throw new Error(`User stats failed: ${error.message}`);
    }
};

// ============================================================================
// FEED EVENT OPERATIONS
// ============================================================================

/**
 * Save feed event to database
 * @param {string} type - Event type ('prompt' or 'image')
 * @param {Object} data - Event data
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Saved event data
 */
const saveFeedEvent = async(type, data, req) => {
    try {
        const userId = getUserId(req);

        if (type === 'prompt') {
            return await savePromptToDatabase({
                ...data,
                userId
            });
        } else if (type === 'image') {
            return await saveImageToDatabase({
                ...data,
                userId
            });
        } else {
            throw new Error(`Unknown feed event type: ${type}`);
        }
    } catch (error) {
        console.error('❌ Error saving feed event:', error);
        throw error;
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
    // Image operations
    saveImageToDatabase,
    getImageById,
    getImagesByUserId,

    // Prompt operations
    savePromptToDatabase,
    getPromptById,
    getPromptsByUserId,

    // User operations
    getUserById,
    getUserId,

    // Statistics
    getDatabaseStats,
    getUserStats,

    // Feed events
    saveFeedEvent,

    // Database connection
    getPrismaClient
};

export default {
    saveImageToDatabase,
    getImageById,
    getImagesByUserId,
    savePromptToDatabase,
    getPromptById,
    getPromptsByUserId,
    getUserById,
    getUserId,
    getDatabaseStats,
    getUserStats,
    saveFeedEvent,
    getPrismaClient
};
