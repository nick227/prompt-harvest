/**
 * EnhancedImageController - Pure Controller
 *
 * This controller handles HTTP requests and responses for image operations.
 * It delegates all business logic to services and focuses solely on:
 * - HTTP request/response handling
 * - Parameter extraction and validation
 * - Service method calls
 * - Response formatting
 *
 * All business logic, validation, and utility functions have been moved
 * to dedicated services for better separation of concerns.
 */

// ValidationError is used by ValidationService
import { formatSuccessResponse, formatErrorResponse, formatPaginatedResponse, formatHealthResponse } from '../utils/ResponseFormatter.js';
import { generateRequestId, logRequestStart, logRequestSuccess, logRequestError } from '../utils/RequestLogger.js';
import { validateImageGenerationParams, validateImageId, validateRating, validatePaginationParams } from '../utils/ValidationService.js';

export class EnhancedImageController {
    constructor(enhancedImageService) {
        this.imageService = enhancedImageService;
    }

    // ============================================================================
    // IMAGE GENERATION
    // ============================================================================

    /**
     * Generate image endpoint
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    // eslint-disable-next-line max-lines-per-function, max-statements
    async generateImage(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            // Log request start
            logRequestStart(requestId, req, 'Image Generation', {
                prompt: `${req.body.prompt?.substring(0, 50)}...`,
                providers: req.body.providers
            });

            // Extract and validate request data
            const {
                prompt,
                providers,
                guidance,
                multiplier,
                mixup,
                mashup,
                customVariables,
                promptId,
                original,
                'auto-enhance': autoEnhance
            } = req.validatedData || req.body;

            const userId = req.user?.id;

            // Validate image generation parameters
            validateImageGenerationParams({ prompt, providers, guidance });

            // Prepare options for service
            const options = {
                promptId,
                original,
                multiplier,
                mixup,
                mashup,
                customVariables,
                autoEnhance
            };

            // Call service to generate image
            const result = await this.imageService.generateImage(
                prompt,
                providers,
                guidance,
                userId,
                options
            );


            // Handle error response from service
            if (result.error || result.success === false) {
                const duration = Date.now() - startTime;
                const errorResponse = formatErrorResponse(result, requestId, duration);

                logRequestError(requestId, 'Image Generation', duration, result);

                return res.status(errorResponse.statusCode || 500).json(errorResponse);
            }

            // Format success response
            const duration = Date.now() - startTime;
            const response = formatSuccessResponse(result, requestId, duration, 'Image generated successfully');

            logRequestSuccess(requestId, 'Image Generation', duration, {
                imageId: result.id,
                provider: result.provider
            });

            res.status(200).json(response);

        } catch (error) {
            const duration = Date.now() - startTime;

            // Debug logging for image generation errors
            console.error('🔍 IMAGE GENERATION ERROR DEBUG:', {
                error,
                errorType: typeof error,
                errorMessage: error?.message,
                errorName: error?.name,
                errorStack: error?.stack?.substring(0, 500)
            });

            const errorResponse = formatErrorResponse(error, requestId, duration);

            logRequestError(requestId, 'Image Generation', duration, error);
            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    // ============================================================================
    // IMAGE RATING
    // ============================================================================

    /**
     * Update image rating endpoint
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async updateRating(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            // Extract parameters
            const { id } = req.params;
            const { rating } = req.body;

            // Validate parameters
            validateImageId(id);
            validateRating(rating);

            // Call service to update rating
            const result = await this.imageService.updateRating(id, parseInt(rating));

            // Format success response
            const duration = Date.now() - startTime;
            const response = formatSuccessResponse(result, requestId, duration, 'Rating updated successfully');

            logRequestSuccess(requestId, 'Rating Update', duration, {
                imageId: id,
                rating: parseInt(rating)
            });

            res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse(error, requestId, duration);

            logRequestError(requestId, 'Rating Update', duration, error);
            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    /**
     * Update public status endpoint
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async updatePublicStatus(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            // Extract parameters
            const { id } = req.params;
            const { isPublic } = req.body;

            // Validate parameters
            validateImageId(id);

            if (typeof isPublic !== 'boolean') {
                throw new Error('isPublic must be a boolean value');
            }

            // Get user ID from request
            const userId = req.user?.id;

            if (!userId) {
                throw new Error('Authentication required to update public status');
            }

            // Call service to update public status (service will verify ownership)
            const result = await this.imageService.updatePublicStatus(id, isPublic, userId);

            // Format success response
            const duration = Date.now() - startTime;
            const response = formatSuccessResponse(result, requestId, duration, 'Public status updated successfully');

            logRequestSuccess(requestId, 'Public Status Update', duration, {
                imageId: id,
                isPublic
            });

            res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse(error, requestId, duration);

            logRequestError(requestId, 'Public Status Update', duration, error);
            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    // ============================================================================
    // IMAGE DELETION
    // ============================================================================

    /**
     * Delete image endpoint
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async deleteImage(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            // Extract and validate parameters
            const { id } = req.params;

            validateImageId(id);

            // Call service to delete image
            const result = await this.imageService.deleteImage(id);

            // Format success response
            const duration = Date.now() - startTime;
            const response = formatSuccessResponse(result, requestId, duration, 'Image deleted successfully');

            logRequestSuccess(requestId, 'Image Deletion', duration, {
                imageId: id
            });

            res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse(error, requestId, duration);

            logRequestError(requestId, 'Image Deletion', duration, error);
            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    // ============================================================================
    // IMAGE RETRIEVAL
    // ============================================================================

    /**
     * Get images endpoint
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getImages(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            // Extract and validate parameters
            const userId = req.user?.id;
            const pagination = validatePaginationParams(req.query);

            // Call service to get images
            const result = await this.imageService.getImages(userId, pagination.limit, pagination.page);

            // Format paginated response
            const duration = Date.now() - startTime;
            const response = formatPaginatedResponse(
                result.images || [],
                { ...pagination, total: result.totalCount || 0 },
                requestId,
                duration
            );

            logRequestSuccess(requestId, 'Get Images', duration, {
                count: result.images?.length || 0,
                userId: userId || 'anonymous'
            });

            res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse(error, requestId, duration);

            logRequestError(requestId, 'Get Images', duration, error);
            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    /**
     * Get single image by ID endpoint
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getImageById(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            // Extract and validate parameters
            console.log('🔍 DEBUG: req.params:', req.params);
            console.log('🔍 DEBUG: req.params.id:', req.params.id);
            const imageId = validateImageId(req.params.id);

            console.log('🔍 DEBUG: validated imageId:', imageId);
            const userId = req.user?.id;

            // Call service to get image
            const image = await this.imageService.getImageById(imageId, userId);

            // Format response
            const duration = Date.now() - startTime;
            const response = formatSuccessResponse(image, requestId, duration);

            logRequestSuccess(requestId, 'Get Image By ID', duration, {
                imageId,
                userId: userId || 'anonymous'
            });

            res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse(error, requestId, duration);

            logRequestError(requestId, 'Get Image By ID', duration, error);
            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    /**
     * Get image count endpoint
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getImageCount(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            // Extract parameters
            const userId = req.user?.id;

            // Call service to get image count
            const result = await this.imageService.getImageCount(userId);

            // Format success response
            const duration = Date.now() - startTime;
            const response = formatSuccessResponse(result, requestId, duration, 'Image count retrieved successfully');

            logRequestSuccess(requestId, 'Get Image Count', duration, {
                count: result.count,
                userId: userId || 'anonymous'
            });

            res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse(error, requestId, duration);

            logRequestError(requestId, 'Get Image Count', duration, error);
            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    // ============================================================================
    // FEED OPERATIONS
    // ============================================================================

    /**
     * Get feed endpoint
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getFeed(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            // Extract and validate parameters
            const userId = req.user?.id;
            const pagination = validatePaginationParams(req.query, 50); // Max 50 items for feed

            console.log('🔍 BACKEND: getFeed called with:', {
                requestId,
                userId,
                query: req.query,
                pagination,
                userAgent: req.get('User-Agent')
            });

            // Call service to get feed
            const result = await this.imageService.getFeed(userId, pagination.limit, pagination.page);

            // Format paginated response
            const duration = Date.now() - startTime;
            const response = formatPaginatedResponse(
                result.images || [],
                { ...pagination, total: result.totalCount || 0 },
                requestId,
                duration
            );

            logRequestSuccess(requestId, 'Get Feed', duration, {
                count: result.images?.length || 0,
                userId: userId || 'anonymous'
            });

            res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse(error, requestId, duration);

            logRequestError(requestId, 'Get Feed', duration, error);
            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    // ============================================================================
    // HEALTH CHECK
    // ============================================================================

    /**
     * Health check endpoint
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getHealth(req, res) {
        try {
            // Call service to get health status
            const health = await this.imageService.getHealth();

            // Format health response
            const response = formatHealthResponse(health);

            res.json(response);

        } catch (error) {
            const errorResponse = formatErrorResponse(error, 'health_check', 0);

            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    async getUserOwnImages(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            const userId = req.user?.id;
            const { page = 0, limit = 20 } = req.query;

            console.log('🔍 BACKEND: getUserOwnImages called with:', {
                requestId,
                userId,
                query: req.query,
                pagination: { limit: parseInt(limit), page: parseInt(page) },
                userAgent: req.get('User-Agent')
            });

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    statusCode: 401
                });
            }

            const result = await this.imageService.getUserOwnImages(userId, parseInt(limit), parseInt(page));

            const response = formatSuccessResponse({
                items: result.images,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: result.totalCount,
                    count: result.images.length
                }
            }, requestId, Date.now() - startTime);

            logRequestSuccess(requestId, 'Get User Own Images', Date.now() - startTime, {
                userId,
                count: result.images.length,
                totalCount: result.totalCount
            });

            res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse(error, requestId, duration);

            logRequestError(requestId, 'Get User Own Images', duration, error);
            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }
}
