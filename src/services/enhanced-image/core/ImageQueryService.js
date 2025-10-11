/**
 * Image Query Service
 * Handles all image retrieval and query operations
 */

import { ValidationError } from '../../../errors/CustomErrors.js';
import { normalizeImage, normalizeImagesWithCosts } from '../utils/ImageNormalizer.js';
import { createPaginationMetadata, convertPageToOffset, normalizeTags } from '../utils/PaginationHelper.js';
import { PAGINATION } from '../config/ServiceConfig.js';

export class ImageQueryService {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.imageRepository - Image repository instance
     * @param {Object} dependencies.prismaClient - Prisma client instance
     */
    constructor(dependencies) {
        this.imageRepository = dependencies.imageRepository;
        this.prisma = dependencies.prismaClient;

        // Model cost cache (TTL: 5 minutes)
        this._modelCostCache = null;
        this._modelCostCacheExpiry = 0;
        this._modelCostCacheTTL = 300000; // 5 minutes
    }

    /**
     * Get images with pagination (user-specific or public feed)
     * @param {string} userId - User ID (null for public feed only)
     * @param {number} limit - Number of images per page
     * @param {number} page - Page number (1-based)
     * @returns {Promise<Object>} Images array and pagination metadata
     */
    async getImages(userId, limit = PAGINATION.DEFAULT_LIMIT, page = 1) {
        const zeroBasedPage = convertPageToOffset(page);

        const result = userId
            ? await this.imageRepository.findByUserId(userId, limit, zeroBasedPage)
            : await this.imageRepository.findPublicImages(limit, zeroBasedPage);

        const userIds = [...new Set(result.images.map(img => img.userId))];
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true }
        });
        const userMap = new Map(users.map(user => [user.id, user.username || 'User']));

        const normalizedImages = result.images.map(image => normalizeImage(image, userMap));

        return {
            images: normalizedImages,
            pagination: createPaginationMetadata(page, limit, result.totalCount)
        };
    }

    /**
     * Get user's images with cost information for billing page
     * @param {string} userId - User ID
     * @param {number} limit - Number of images to fetch
     * @param {number} page - Page number (1-based)
     * @param {Array} tags - Array of tags to filter by
     * @returns {Promise<Object>} User images with cost information
     */
    async getUserImages(userId, limit = PAGINATION.USER_IMAGES_LIMIT, page = 1, tags = []) {
        this.validateUserInput(userId);

        const zeroBasedPage = convertPageToOffset(page);
        const normalizedTags = normalizeTags(tags);

        const result = await this.imageRepository.findUserImages(userId, limit, zeroBasedPage, normalizedTags);

        const models = await this.getActiveModels();
        const modelCostMap = this.createModelCostMap(models);
        const normalizedImages = normalizeImagesWithCosts(result.images, modelCostMap);

        return {
            images: normalizedImages,
            pagination: createPaginationMetadata(page, limit, result.totalCount)
        };
    }

    /**
     * Get user's public images for profile display
     * @param {string} userId - User ID
     * @param {number} limit - Number of images per page
     * @param {number} page - Page number (1-based)
     * @returns {Object} Response with images and pagination
     */
    async getUserPublicImages(userId, limit = PAGINATION.PROFILE_LIMIT, page = 1) {
        this.validateUserInput(userId);

        const zeroBasedPage = convertPageToOffset(page);

        try {
            const result = await this.imageRepository.findUserPublicImages(userId, limit, zeroBasedPage);

            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, username: true }
            });

            const username = user?.username || 'User';
            const userMap = new Map([[userId, username]]);
            const normalizedImages = result.images.map(image => normalizeImage(image, userMap));

            return {
                success: true,
                images: normalizedImages,
                pagination: createPaginationMetadata(page, limit, result.totalCount)
            };

        } catch (error) {
            console.error('❌ Error getting user public images:', error);

            return {
                success: false,
                error: 'Failed to get user public images',
                images: [],
                pagination: {}
            };
        }
    }

    /**
     * Get public feed images from all users
     * @param {string} userId - Current user ID (for context)
     * @param {number} limit - Number of images per page
     * @param {number} page - Page number (1-based)
     * @param {Array} tags - Optional tags filter
     * @returns {Object} Response with images and pagination
     */
    async getFeed(userId, limit = PAGINATION.DEFAULT_LIMIT, page = 1, tags = []) {
        const zeroBasedPage = convertPageToOffset(page);
        const normalizedTags = normalizeTags(tags);

        const result = await this.imageRepository.findPublicImages(limit, zeroBasedPage, normalizedTags);

        this.assertPublicImages(result.images, 'feed');

        const userIds = [...new Set(result.images.map(img => img.userId))];
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true }
        });
        const userMap = new Map(users.map(user => [user.id, user.username || 'User']));

        const normalizedImages = result.images.map(image => normalizeImage(image, userMap));

        return {
            images: normalizedImages,
            pagination: createPaginationMetadata(page, limit, result.totalCount)
        };
    }

    /**
     * Get all user's own images (both public and private)
     * @param {string} userId - User ID (required)
     * @param {number} limit - Number of images per page
     * @param {number} page - Page number (1-based)
     * @param {Array} tags - Optional tags filter
     * @returns {Promise<Object>} Response with images and pagination
     */
    async getUserOwnImages(userId, limit = PAGINATION.DEFAULT_LIMIT, page = 1, tags = []) {
        if (!userId) {
            throw new ValidationError('User ID is required for getting user own images');
        }

        const zeroBasedPage = convertPageToOffset(page);
        const normalizedTags = normalizeTags(tags);

        const result = await this.imageRepository.findUserImages(userId, limit, zeroBasedPage, normalizedTags);

        const otherUserImages = result.images.filter(img => img.userId !== userId);

        if (otherUserImages.length > 0) {
            console.error('🚨 DATABASE INTEGRITY ERROR: Repository returned images from other users!', {
                requestedUserId: userId,
                count: otherUserImages.length,
                imageIds: otherUserImages.map(img => img.id)
            });
        }

        const userIds = [...new Set(result.images.map(img => img.userId))];
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true }
        });
        const userMap = new Map(users.map(user => [user.id, user.username || 'User']));

        const normalizedImages = result.images.map(image => normalizeImage(image, userMap));

        return {
            images: normalizedImages,
            pagination: createPaginationMetadata(page, limit, result.totalCount)
        };
    }

    /**
     * Get total image count for a user
     * @param {string} userId - User ID (null for public count)
     * @returns {Promise<Object>} Object with count property
     */
    async getImageCount(userId) {
        const count = await this.imageRepository.countByUserId(userId);

        return { count };
    }

    /**
     * Get active models with cost information (cached)
     * @returns {Promise<Array>} Active models with cost data
     */
    async getActiveModels() {
        const now = Date.now();

        if (this._modelCostCache && now < this._modelCostCacheExpiry) {
            return this._modelCostCache;
        }

        const models = await this.prisma.model.findMany({
            where: { isActive: true },
            select: {
                provider: true,
                name: true,
                costPerImage: true,
                displayName: true
            }
        });

        this._modelCostCache = models;
        this._modelCostCacheExpiry = now + this._modelCostCacheTTL;

        return models;
    }

    /**
     * Create model cost mapping
     * @param {Array} models - Array of model objects
     * @returns {Map} Map of model name to cost info
     */
    createModelCostMap(models) {
        const modelCostMap = new Map();

        models.forEach(model => {
            const key = model.name;

            modelCostMap.set(key, {
                costPerImage: model.costPerImage,
                displayName: model.displayName
            });
        });

        return modelCostMap;
    }

    /**
     * Validate user ID input
     * @param {string} userId - User ID
     * @throws {ValidationError} If userId is missing
     */
    validateUserInput(userId) {
        if (!userId) {
            throw new ValidationError('User ID is required');
        }
    }

    /**
     * Assert that all images are public (logging only)
     * @param {Array} images - Array of image objects
     * @param {string} context - Context for logging
     */
    assertPublicImages(images, context = 'unknown') {
        if (!images || !Array.isArray(images)) {
            return;
        }

        const privateImages = images.filter(img => img.isPublic !== true);

        if (privateImages.length > 0) {
            console.error(`🚨 DATABASE INTEGRITY ERROR: Non-public images in ${context}!`, {
                count: privateImages.length,
                imageIds: privateImages.map(img => img.id),
                context
            });
        }
    }
}

