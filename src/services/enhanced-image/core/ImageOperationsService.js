/**
 * Image Operations Service
 * Handles CRUD operations on images (get, update, delete)
 */

import { ValidationError, NotFoundError, AuthorizationError } from '../../../errors/CustomErrors.js';
import { normalizeImage } from '../utils/ImageNormalizer.js';

export class ImageOperationsService {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.imageRepository - Image repository instance
     * @param {Object} dependencies.prismaClient - Prisma client instance
     */
    constructor(dependencies) {
        this.imageRepository = dependencies.imageRepository;
        this.prisma = dependencies.prismaClient;
    }

    /**
     * Get a single image by ID with permission checks
     * @param {string} imageId - The image ID
     * @param {string} userId - User ID (can be null)
     * @returns {Promise<Object>} Image data with username
     * @throws {NotFoundError} If image doesn't exist
     * @throws {AuthorizationError} If user lacks permission
     */
    async getImageById(imageId, userId) {
        const image = await this.imageRepository.findById(imageId);

        if (!image) {
            throw new NotFoundError('Image');
        }

        const canAccess = image.userId === userId || image.isPublic;

        if (!canAccess) {
            throw new AuthorizationError('You do not have permission to access this image');
        }

        let username = 'Anonymous';

        if (image.userId) {
            const user = await this.prisma.user.findUnique({
                where: { id: image.userId },
                select: { id: true, username: true }
            });

            username = user?.username || 'User';
        }

        return {
            ...normalizeImage(image),
            username
        };
    }

    /**
     * Update the public/private status of an image
     * @param {string} imageId - The image ID
     * @param {boolean} isPublic - Whether image should be public
     * @param {string} userId - User ID (required)
     * @returns {Promise<Object>} Update result
     * @throws {ValidationError} If inputs invalid
     * @throws {NotFoundError} If image doesn't exist
     * @throws {AuthorizationError} If user doesn't own image
     */
    async updatePublicStatus(imageId, isPublic, userId) {
        if (!imageId || typeof isPublic !== 'boolean') {
            throw new ValidationError('Image ID and isPublic boolean are required');
        }

        if (!userId) {
            throw new ValidationError('User ID is required to update public status');
        }

        const image = await this.imageRepository.findById(imageId);

        if (!image) {
            throw new NotFoundError('Image');
        }

        if (image.userId !== userId) {
            throw new AuthorizationError('You can only update the public status of your own images');
        }

        // Skip database update if status is already the same
        if (image.isPublic === isPublic) {
            return { result: image, id: imageId, isPublic, skipped: true };
        }

        const result = await this.imageRepository.updatePublicStatus(imageId, isPublic);

        if (!result) {
            throw new NotFoundError('Image');
        }

        return { result, id: imageId, isPublic };
    }

    /**
     * Delete an image (user must own it)
     * @param {string} imageId - The image ID
     * @param {string} userId - User ID (required)
     * @returns {Promise<Object>} Status object
     * @throws {ValidationError} If required parameters missing
     * @throws {NotFoundError} If image doesn't exist
     * @throws {AuthorizationError} If user doesn't own the image
     */
    async deleteImage(imageId, userId) {
        if (!imageId) {
            throw new ValidationError('Image ID is required');
        }

        if (!userId) {
            throw new ValidationError('User ID is required to delete image');
        }

        const image = await this.imageRepository.findById(imageId);

        if (!image) {
            throw new NotFoundError('Image');
        }

        if (image.userId !== userId) {
            throw new AuthorizationError('You can only delete your own images');
        }

        await this.imageRepository.deleteById(imageId);

        return { status: 'ok' };
    }

    /**
     * Validate user ID input
     * @param {string} userId - User ID to validate
     * @throws {ValidationError} If user ID is missing
     */
    validateUserInput(userId) {
        if (!userId) {
            throw new ValidationError('User ID is required');
        }
    }

    /**
     * Assert that all images are public (logging only, not filtering)
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

