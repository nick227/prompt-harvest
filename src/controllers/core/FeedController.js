/**
 * FeedController - Handles image feed and discovery endpoints
 *
 * Focused controller for feed functionality.
 * Extracted from EnhancedImageController.
 */

import { generateRequestId, logRequestStart, logRequestSuccess, logRequestError } from '../../utils/RequestLogger.js';
import { validatePaginationParams } from '../../utils/ValidationService.js';
import { ValidationError } from '../../errors/CustomErrors.js';
import { formatErrorResponse, formatSuccessResponse } from '../../utils/ResponseFormatter.js';

export class FeedController {
    constructor(imageService) {
        this.imageService = imageService;
    }

    async getFeed(req, res) {
        const requestId = req.id || generateRequestId();

        logRequestStart(requestId, 'getFeed', req.query);

        try {
            const { limit = 8, page = 0, tags } = req.query;
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

            const tagArray = tags ? tags.split(',') : [];
            const result = await this.imageService.getFeed(userId, parseInt(limit), parseInt(page), tagArray);

            logRequestSuccess(requestId, 'getFeed', { limit, page, tags: tagArray });
            res.json(formatSuccessResponse(result, requestId));

        } catch (error) {
            logRequestError(requestId, 'getFeed', error);

            if (error instanceof ValidationError) {
                return res.status(400).json(formatErrorResponse(
                    error.message,
                    { validation: error.details },
                    requestId
                ));
            }

            res.status(500).json(formatErrorResponse(
                'Failed to fetch feed',
                { error: error.message },
                requestId
            ));
        }
    }

    async getUserPublicImages(req, res) {
        const requestId = req.id || generateRequestId();

        logRequestStart(requestId, 'getUserPublicImages', req.query);

        try {
            const { limit = 20, page = 1 } = req.query;
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

            const result = await this.imageService.getUserPublicImages(userId, parseInt(limit), parseInt(page));

            logRequestSuccess(requestId, 'getUserPublicImages', { limit, page });
            res.json(formatSuccessResponse(result, requestId));

        } catch (error) {
            logRequestError(requestId, 'getUserPublicImages', error);

            if (error instanceof ValidationError) {
                return res.status(400).json(formatErrorResponse(
                    error.message,
                    { validation: error.details },
                    requestId
                ));
            }

            res.status(500).json(formatErrorResponse(
                'Failed to fetch user public images',
                { error: error.message },
                requestId
            ));
        }
    }

    async getUserOwnImages(req, res) {
        const requestId = req.id || generateRequestId();

        logRequestStart(requestId, 'getUserOwnImages', req.query);

        try {
            const { limit = 8, page = 0, tags } = req.query;
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
            const result = await this.imageService.getUserOwnImages(userId, parseInt(limit), parseInt(page), tagArray);

            logRequestSuccess(requestId, 'getUserOwnImages', { limit, page, tags: tagArray });
            res.json(formatSuccessResponse(result, requestId));

        } catch (error) {
            logRequestError(requestId, 'getUserOwnImages', error);

            if (error instanceof ValidationError) {
                return res.status(400).json(formatErrorResponse(
                    error.message,
                    { validation: error.details },
                    requestId
                ));
            }

            res.status(500).json(formatErrorResponse(
                'Failed to fetch user own images',
                { error: error.message },
                requestId
            ));
        }
    }

    async getActiveModels(req, res) {
        const requestId = req.id || generateRequestId();

        logRequestStart(requestId, 'getActiveModels');

        try {
            const models = await this.imageService.getActiveModels();

            logRequestSuccess(requestId, 'getActiveModels', { count: models.length });
            res.json(formatSuccessResponse(models, requestId));

        } catch (error) {
            logRequestError(requestId, 'getActiveModels', error);
            res.status(500).json(formatErrorResponse(
                'Failed to fetch active models',
                { error: error.message },
                requestId
            ));
        }
    }
}
