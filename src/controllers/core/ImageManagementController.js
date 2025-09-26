/**
 * ImageManagementController - Handles image CRUD operations
 *
 * Focused controller for image management functionality.
 * Extracted from EnhancedImageController.
 */

import { generateRequestId, logRequestStart, logRequestSuccess, logRequestError } from '../../utils/RequestLogger.js';
import { validateImageId, validateRating, validatePaginationParams } from '../../utils/ValidationService.js';
import { ValidationError } from '../../errors/CustomErrors.js';
import { formatErrorResponse, formatSuccessResponse } from '../../utils/ResponseFormatter.js';

export class ImageManagementController {
    constructor(imageService) {
        this.imageService = imageService;
    }

    async getImageById(req, res) {
        const requestId = req.id || generateRequestId();

        logRequestStart(requestId, 'getImageById', { imageId: req.params.id });

        try {
            const { id: imageId } = req.params;
            const userId = req.user?.id;

            // Validate image ID
            const validationResult = validateImageId({ id: imageId });

            if (!validationResult.isValid) {
                return res.status(400).json(formatErrorResponse(
                    'Invalid image ID',
                    validationResult.errors,
                    requestId
                ));
            }

            const image = await this.imageService.getImageById(imageId, userId);

            logRequestSuccess(requestId, 'getImageById', { imageId });
            res.json(formatSuccessResponse(image, requestId));

        } catch (error) {
            logRequestError(requestId, 'getImageById', error);

            if (error instanceof ValidationError) {
                return res.status(400).json(formatErrorResponse(
                    error.message,
                    { validation: error.details },
                    requestId
                ));
            }

            res.status(500).json(formatErrorResponse(
                'Failed to fetch image',
                { error: error.message },
                requestId
            ));
        }
    }

    async updateRating(req, res) {
        const requestId = req.id || generateRequestId();

        logRequestStart(requestId, 'updateRating', { imageId: req.params.id, rating: req.body.rating });

        try {
            const { id: imageId } = req.params;
            const { rating } = req.body;
            const userId = req.user?.id;

            // Validate inputs
            const validationResult = validateRating({ rating });

            if (!validationResult.isValid) {
                return res.status(400).json(formatErrorResponse(
                    'Invalid rating',
                    validationResult.errors,
                    requestId
                ));
            }

            const updatedImage = await this.imageService.updateRating(imageId, rating, userId);

            logRequestSuccess(requestId, 'updateRating', { imageId, rating });
            res.json(formatSuccessResponse(updatedImage, requestId));

        } catch (error) {
            logRequestError(requestId, 'updateRating', error);

            if (error instanceof ValidationError) {
                return res.status(400).json(formatErrorResponse(
                    error.message,
                    { validation: error.details },
                    requestId
                ));
            }

            res.status(500).json(formatErrorResponse(
                'Failed to update rating',
                { error: error.message },
                requestId
            ));
        }
    }

    async updatePublicStatus(req, res) {
        const requestId = req.id || generateRequestId();

        logRequestStart(requestId, 'updatePublicStatus', { imageId: req.params.id, isPublic: req.body.isPublic });

        try {
            const { id: imageId } = req.params;
            const { isPublic } = req.body;
            const userId = req.user?.id;

            // Validate inputs
            if (typeof isPublic !== 'boolean') {
                return res.status(400).json(formatErrorResponse(
                    'isPublic must be a boolean',
                    { validation: 'isPublic must be true or false' },
                    requestId
                ));
            }

            const updatedImage = await this.imageService.updatePublicStatus(imageId, isPublic, userId);

            logRequestSuccess(requestId, 'updatePublicStatus', { imageId, isPublic });
            res.json(formatSuccessResponse(updatedImage, requestId));

        } catch (error) {
            logRequestError(requestId, 'updatePublicStatus', error);

            if (error instanceof ValidationError) {
                return res.status(400).json(formatErrorResponse(
                    error.message,
                    { validation: error.details },
                    requestId
                ));
            }

            res.status(500).json(formatErrorResponse(
                'Failed to update public status',
                { error: error.message },
                requestId
            ));
        }
    }

    async deleteImage(req, res) {
        const requestId = req.id || generateRequestId();

        logRequestStart(requestId, 'deleteImage', { imageId: req.params.id });

        try {
            const { id: imageId } = req.params;
            const userId = req.user?.id;

            // Validate image ID
            const validationResult = validateImageId({ id: imageId });

            if (!validationResult.isValid) {
                return res.status(400).json(formatErrorResponse(
                    'Invalid image ID',
                    validationResult.errors,
                    requestId
                ));
            }

            const result = await this.imageService.deleteImage(imageId, userId);

            logRequestSuccess(requestId, 'deleteImage', { imageId });
            res.json(formatSuccessResponse(result, requestId));

        } catch (error) {
            logRequestError(requestId, 'deleteImage', error);

            if (error instanceof ValidationError) {
                return res.status(400).json(formatErrorResponse(
                    error.message,
                    { validation: error.details },
                    requestId
                ));
            }

            res.status(500).json(formatErrorResponse(
                'Failed to delete image',
                { error: error.message },
                requestId
            ));
        }
    }

    async getImages(req, res) {
        const requestId = req.id || generateRequestId();

        logRequestStart(requestId, 'getImages', req.query);

        try {
            const { limit = 8, page = 0 } = req.query;
            const userId = req.user?.id;

            // Validate pagination parameters
            const validationResult = validatePaginationParams({ limit, page });

            if (!validationResult.isValid) {
                return res.status(400).json(formatErrorResponse(
                    'Invalid pagination parameters',
                    validationResult.errors,
                    requestId
                ));
            }

            const result = await this.imageService.getImages(userId, parseInt(limit), parseInt(page));

            logRequestSuccess(requestId, 'getImages', { limit, page });
            res.json(formatSuccessResponse(result, requestId));

        } catch (error) {
            logRequestError(requestId, 'getImages', error);

            if (error instanceof ValidationError) {
                return res.status(400).json(formatErrorResponse(
                    error.message,
                    { validation: error.details },
                    requestId
                ));
            }

            res.status(500).json(formatErrorResponse(
                'Failed to fetch images',
                { error: error.message },
                requestId
            ));
        }
    }

    async getUserImages(req, res) {
        const requestId = req.id || generateRequestId();

        logRequestStart(requestId, 'getUserImages', req.query);

        try {
            const { limit = 50, page = 0, tags } = req.query;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json(formatErrorResponse(
                    'Authentication required',
                    { error: 'User must be logged in' },
                    requestId
                ));
            }

            // Validate pagination parameters
            const validationResult = validatePaginationParams({ limit, page });

            if (!validationResult.isValid) {
                return res.status(400).json(formatErrorResponse(
                    'Invalid pagination parameters',
                    validationResult.errors,
                    requestId
                ));
            }

            const tagArray = tags ? tags.split(',') : [];
            const result = await this.imageService.getUserImages(userId, parseInt(limit), parseInt(page), tagArray);

            logRequestSuccess(requestId, 'getUserImages', { limit, page, tags: tagArray });
            res.json(formatSuccessResponse(result, requestId));

        } catch (error) {
            logRequestError(requestId, 'getUserImages', error);

            if (error instanceof ValidationError) {
                return res.status(400).json(formatErrorResponse(
                    error.message,
                    { validation: error.details },
                    requestId
                ));
            }

            res.status(500).json(formatErrorResponse(
                'Failed to fetch user images',
                { error: error.message },
                requestId
            ));
        }
    }

    async getImageCount(req, res) {
        const requestId = req.id || generateRequestId();

        logRequestStart(requestId, 'getImageCount', { userId: req.user?.id });

        try {
            const userId = req.user?.id;
            const count = await this.imageService.getImageCount(userId);

            logRequestSuccess(requestId, 'getImageCount', { count });
            res.json(formatSuccessResponse({ count }, requestId));

        } catch (error) {
            logRequestError(requestId, 'getImageCount', error);
            res.status(500).json(formatErrorResponse(
                'Failed to get image count',
                { error: error.message },
                requestId
            ));
        }
    }
}
