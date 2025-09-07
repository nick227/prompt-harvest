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
import { FileSystemManager } from '../../utils/FileSystemManager.js';

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

// Initialize file system manager
const fileSystemManager = new FileSystemManager();

/**
 * Get Prisma client instance
 * @returns {Object} Prisma client
 */
const getPrismaClient = () => databaseClient.getClient();

// ============================================================================
// IMAGE OPERATIONS
// ============================================================================

/**
 * Save image data to database
 * @param {Object} imageData - Image data to save
 * @param {string} imageData.prompt - Image generation prompt
 * @param {string} imageData.original - Original prompt
 * @param {string} imageData.provider - Provider name
 * @param {string} imageData.imageData - Base64 image data
 * @param {string} imageData.promptId - Associated prompt ID
 * @param {string} imageData.userId - User ID (can be null for anonymous)
 * @returns {Promise<Object>} Saved image data
 */
const saveImageToDatabase = async imageData => {
    const prisma = getPrismaClient();

    try {
        console.log('💾 Saving image to database:', {
            prompt: imageData.prompt ? `${imageData.prompt.substring(0, 50)}...` : 'undefined',
            provider: imageData.provider,
            userId: imageData.userId || 'anonymous',
            promptId: imageData.promptId
        });

        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const filename = `${imageData.provider}_${timestamp}_${randomId}.jpg`;

        // Save base64 data to file system
        const buffer = Buffer.from(imageData.imageData, 'base64');
        const savedFilename = await fileSystemManager.saveImageAtomic(buffer, filename);

        // Create file path for database
        const imageUrl = `uploads/${savedFilename}`;

        const image = await prisma.image.create({
            data: {
                prompt: imageData.prompt,
                original: imageData.original,
                provider: imageData.provider,
                imageUrl: imageUrl, // Store file path, not base64 data
                userId: imageData.userId // Can be null for anonymous users
            }
        });

        console.log('✅ Image saved successfully:', { id: image.id, filePath: imageUrl });

        return {
            _id: image.id,
            data: {
                ...imageData,
                imageId: image.id,
                imageUrl: imageUrl
            }
        };
    } catch (error) {
        console.error('❌ Error saving image to database:', error);
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
        // Skip saving prompts for anonymous users
        if (!promptData.userId) {
            console.log('⏭️ Skipping prompt save for anonymous user');

            return {
                _id: 'anonymous',
                data: {
                    ...promptData,
                    promptId: 'anonymous'
                }
            };
        }

        console.log('💾 Saving prompt to database:', {
            original: `${promptData.original?.substring(0, 50)}...`,
            prompt: `${promptData.prompt?.substring(0, 50)}...`,
            provider: promptData.provider,
            userId: promptData.userId
        });

        const prompt = await prisma.prompts.create({
            data: {
                original: promptData.original,
                prompt: promptData.prompt,
                provider: promptData.provider || 'unknown',
                userId: promptData.userId
            }
        });

        console.log('✅ Prompt saved successfully:', { id: prompt.id });

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
    if (!req || !req.user || !req.user.id) {
        return null;
    }

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
