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
import { ValidationError } from '../errors/CustomErrors.js';
import { taggingService } from '../services/TaggingService.js';
import { PrismaClient } from '@prisma/client';

export class EnhancedImageController {
    constructor(enhancedImageService) {
        this.imageService = enhancedImageService;
        this.prisma = new PrismaClient();
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
                'auto-enhance': autoEnhance,
                photogenic,
                artistic
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
                autoEnhance,
                photogenic,
                artistic
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

            // Fetch the generated image with tags (if any exist)
            const imageWithTags = await this._fetchImageWithTags(result.id);

            // Format success response with tags included
            const duration = Date.now() - startTime;
            const response = formatSuccessResponse(imageWithTags, requestId, duration, 'Image generated successfully');

            logRequestSuccess(requestId, 'Image Generation', duration, {
                imageId: result.id,
                provider: result.provider
            });

            // Fire-and-forget tagging service call
            // This does NOT block the HTTP response
            if (process.env.NODE_ENV === 'production') {
                taggingService.tagImageAsync(result.id, prompt, {
                    provider: result.provider,
                    userId,
                    requestId,
                    duration
                });
            }

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
            const userId = req.user?.id;

            // Validate parameters
            validateImageId(id);
            validateRating(rating);

            // Allow anonymous users to rate public images
            // Only require authentication for private images (handled in service)

            // Call service to update rating
            const result = await this.imageService.updateRating(id, parseInt(rating), userId);

            // Format success response
            const duration = Date.now() - startTime;
            const response = formatSuccessResponse(result, requestId, duration, 'Rating updated successfully');

            logRequestSuccess(requestId, 'Rating Update', duration, {
                imageId: id,
                rating: parseInt(rating),
                userId
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
            const userId = req.user?.id;

            validateImageId(id);

            if (!userId) {
                throw new ValidationError('Authentication required to delete images');
            }

            // Call service to delete image
            const result = await this.imageService.deleteImage(id, userId);

            // Format success response
            const duration = Date.now() - startTime;
            const response = formatSuccessResponse(result, requestId, duration, 'Image deleted successfully');

            logRequestSuccess(requestId, 'Image Deletion', duration, {
                imageId: id,
                userId
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
     * Get user's image history for billing page
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getUserImages(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            // Extract and validate parameters
            const userId = req.user?.id;

            console.log('🔄 ENHANCED-IMAGE-CONTROLLER: getUserImages called with userId:', userId);

            if (!userId) {
                throw new Error('Authentication required to access user images');
            }

            const pagination = validatePaginationParams(req.query, 50); // Max 50 images per request

            console.log('🔄 ENHANCED-IMAGE-CONTROLLER: Pagination params:', pagination);

            // Call service to get user's images with cost information
            console.log('🔄 ENHANCED-IMAGE-CONTROLLER: Calling imageService.getUserImages...');
            const result = await this.imageService.getUserImages(userId, pagination.limit, pagination.page);

            console.log('✅ ENHANCED-IMAGE-CONTROLLER: Service result:', {
                imagesCount: result.images?.length || 0,
                totalCount: result.totalCount,
                hasMore: result.hasMore
            });

            // Format response with cost information
            const duration = Date.now() - startTime;
            const responseData = { images: result.images || [] };

            console.log('🔄 ENHANCED-IMAGE-CONTROLLER: Response data:', {
                imagesCount: responseData.images.length,
                firstImage: responseData.images[0]
                    ? {
                        id: responseData.images[0].id,
                        provider: responseData.images[0].provider,
                        model: responseData.images[0].model
                    }
                    : null
            });

            const response = formatSuccessResponse(
                responseData,
                requestId,
                duration,
                'User images retrieved successfully'
            );

            logRequestSuccess(requestId, 'Get User Images', duration, {
                userId,
                imageCount: result.images?.length || 0,
                pagination
            });

            console.log('✅ ENHANCED-IMAGE-CONTROLLER: Sending response with', responseData.images.length, 'images');
            res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse(error, requestId, duration);

            logRequestError(requestId, 'Get User Images', duration, error);
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
     * Get feed endpoint - returns only public images from all users
     * Used by the "site" filter to show public images only
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

            // Extract and validate tag filters
            const tagsParam = req.query.tags;
            let tags = [];
            if (tagsParam && typeof tagsParam === 'string') {
                tags = tagsParam.split(',')
                    .map(tag => tag.trim().toLowerCase())
                    .filter(tag => tag.length > 0 && tag.length <= 50)
                    .slice(0, 10); // Limit to 10 tags max
            }

            console.log('🔍 BACKEND: getFeed called with:', {
                requestId,
                userId,
                query: req.query,
                pagination,
                tags: tags.length > 0 ? tags : 'none',
                userAgent: req.get('User-Agent')
            });

            // Call service to get feed with tag filters
            const result = await this.imageService.getFeed(userId, pagination.limit, pagination.page, tags);

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

    /**
     * Get user's own images (for "mine" filter)
     * Returns all images (both public and private) that belong to the authenticated user
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getUserOwnImages(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            const userId = req.user?.id;
            const { page = 0, limit = 20 } = req.query;

            // Extract and validate tag filters
            const tagsParam = req.query.tags;
            let tags = [];
            if (tagsParam && typeof tagsParam === 'string') {
                tags = tagsParam.split(',')
                    .map(tag => tag.trim().toLowerCase())
                    .filter(tag => tag.length > 0 && tag.length <= 50)
                    .slice(0, 10); // Limit to 10 tags max
            }

            console.log('🔍 BACKEND: getUserOwnImages called with:', {
                requestId,
                userId,
                query: req.query,
                pagination: { limit: parseInt(limit), page: parseInt(page) },
                tags: tags.length > 0 ? tags : 'none',
                userAgent: req.get('User-Agent')
            });

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    statusCode: 401
                });
            }

            const result = await this.imageService.getUserOwnImages(userId, parseInt(limit), parseInt(page), tags);

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

    // ============================================================================
    // PRIVATE HELPER METHODS
    // ============================================================================

    /**
     * Fetch image with tags from database
     * @private
     */
    async _fetchImageWithTags(imageId) {
        try {
            const image = await this.prisma.image.findUnique({
                where: { id: imageId },
                select: {
                    id: true,
                    prompt: true,
                    original: true,
                    imageUrl: true,
                    provider: true,
                    guidance: true,
                    model: true,
                    rating: true,
                    isPublic: true,
                    tags: true,
                    taggedAt: true,
                    taggingMetadata: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            if (!image) {
                throw new Error('Image not found');
            }

            return {
                id: image.id,
                prompt: image.prompt,
                original: image.original,
                imageUrl: image.imageUrl,
                provider: image.provider,
                guidance: image.guidance,
                model: image.model,
                rating: image.rating,
                isPublic: image.isPublic,
                tags: image.tags || [],
                taggedAt: image.taggedAt,
                taggingMetadata: image.taggingMetadata,
                createdAt: image.createdAt,
                updatedAt: image.updatedAt
            };

        } catch (error) {
            console.error('Error fetching image with tags:', error);

            return {
                id: imageId,
                tags: [],
                taggedAt: null,
                taggingMetadata: null
            };
        }
    }
}
