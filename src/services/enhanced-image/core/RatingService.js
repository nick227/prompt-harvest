/**
 * Rating Service
 * Handles image rating operations
 */

import { ValidationError, NotFoundError, AuthorizationError } from '../../../errors/CustomErrors.js';

export class RatingService {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.imageRepository - Image repository instance
     */
    constructor(dependencies) {
        this.imageRepository = dependencies.imageRepository;
    }

    /**
     * Update the rating for an image
     * @param {string} imageId - The image ID
     * @param {number} rating - Rating value (0-5)
     * @param {string} userId - User ID (optional for public images)
     * @returns {Promise<Object>} Update result with new rating
     */
    async updateRating(imageId, rating, userId) {
        if (!imageId || typeof rating !== 'number') {
            throw new ValidationError('Image ID and rating are required');
        }

        // Explicitly validate rating range (0-5)
        if (rating < 0 || rating > 5) {
            throw new ValidationError('Rating must be between 0 and 5');
        }

        // First, verify the image exists and check permissions
        const image = await this.imageRepository.findById(imageId);

        if (!image) {
            throw new NotFoundError('Image');
        }

        // Check permissions without leaking private image existence
        const canRate = !userId
            ? image.isPublic  // Anonymous: only public images
            : image.isPublic || image.userId === userId;  // Authenticated: public or own

        if (!canRate) {
            throw new AuthorizationError('You do not have permission to rate this image');
        }

        const result = await this.imageRepository.updateRating(imageId, rating);

        if (result === 0) {
            throw new NotFoundError('Image');
        }

        return { result, id: imageId, rating };
    }
}

