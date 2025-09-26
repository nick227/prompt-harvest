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
import { sampleImageService } from '../services/SampleImageService.js';
import databaseClient from '../database/PrismaClient.js';

export class EnhancedImageController {
    constructor(enhancedImageService) {
        this.imageService = enhancedImageService;
        // Removed: this.prisma = new PrismaClient();
        // Use databaseClient.getClient() when database access is needed
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
                artistic,
                avatar,
                autoPublic
            } = req.validatedData || req.body;

            // Log autoPublic value for debugging
            console.log('🔍 CONTROLLER DEBUG: autoPublic value received:', {
                autoPublic,
                type: typeof autoPublic,
                fromValidatedData: !!req.validatedData,
                fromBody: !!req.body,
                bodyKeys: Object.keys(req.body || {}),
                validatedDataKeys: Object.keys(req.validatedData || {})
            });

            // Log artistic, photogenic, and avatar values for debugging
            console.log('🔍 CONTROLLER DEBUG: artistic, photogenic, and avatar values received:', {
                artistic,
                artisticType: typeof artistic,
                photogenic,
                photogenicType: typeof photogenic,
                avatar,
                avatarType: typeof avatar,
                fullBody: req.body
            });

            const userId = req.user?.id;

            // Debug authentication status
            console.log('🔍 CONTROLLER DEBUG: Authentication status:', {
                hasReq: !!req,
                hasUser: !!req.user,
                hasUserId: !!req.user?.id,
                userId,
                userEmail: req.user?.email,
                userObject: req.user
            });

            if (!userId) {
                console.log('🚨 CONTROLLER CRITICAL: No userId found - this will result in userId: null in database');
                console.log('🚨 CONTROLLER CRITICAL: req object keys:', Object.keys(req));
                console.log('🚨 CONTROLLER CRITICAL: req.user:', req.user);
            }

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
                artistic,
                avatar,
                autoPublic
            };

            // Log options being passed to service
            console.log('🔍 CONTROLLER DEBUG: Options being passed to service:', {
                options,
                autoPublicInOptions: options.autoPublic,
                autoPublicType: typeof options.autoPublic
            });

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
            const userId = req.user?.id;

            if (!userId) {
                throw new Error('Authentication required to access user images');
            }

            const pagination = validatePaginationParams(req.query, 50);

            this.logGetUserImagesRequest(userId, pagination);

            const result = await this.imageService.getUserImages(userId, pagination.limit, pagination.page);

            this.logGetUserImagesResult(result);

            const duration = Date.now() - startTime;
            const responseData = { images: result.images || [] };

            this.logGetUserImagesResponse(responseData);

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
     * Get sample image for credits modal
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getSampleImage(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            // Get random sample image from cache - no database query needed
            const sampleImage = sampleImageService.getRandomSampleImage();

            const duration = Date.now() - startTime;
            const response = formatSuccessResponse({
                image: sampleImage
            }, requestId, duration);

            logRequestSuccess(requestId, 'Get Sample Image', duration, {
                imageId: sampleImage.id
            });

            res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse(error, requestId, duration);

            logRequestError(requestId, 'Get Sample Image', duration, error);
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
            const tags = this.extractTagFilters(req.query.tags);
            const pagination = { limit: parseInt(limit), page: parseInt(page) };

            this.logGetUserOwnImagesRequest(requestId, userId, req.query, pagination, tags, req);

            if (!this.validateUserAuthentication(userId, res)) {
                return;
            }

            const result = await this.imageService.getUserOwnImages(userId, pagination.limit, pagination.page, tags);
            const response = this.formatGetUserOwnImagesResponse(result, page, limit, requestId, startTime);

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

    /**
     * Extract and validate tag filters from query parameters
     */
    extractTagFilters(tagsParam) {
        if (!tagsParam || typeof tagsParam !== 'string') {
            return [];
        }

        return tagsParam.split(',')
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length > 0 && tag.length <= 50)
            .slice(0, 10); // Limit to 10 tags max
    }

    /**
     * Log request details for getUserOwnImages
     */
    logGetUserOwnImagesRequest(requestId, userId, query, pagination, tags, req) {
        console.log('🔍 BACKEND: getUserOwnImages called with:', {
            requestId,
            userId,
            query,
            pagination,
            tags: tags.length > 0 ? tags : 'none',
            userAgent: req.get('User-Agent')
        });
    }

    /**
     * Validate authentication for getUserOwnImages
     */
    validateUserAuthentication(userId, res) {
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                statusCode: 401
            });

            return false;
        }

        return true;
    }

    /**
     * Format getUserOwnImages response
     */
    formatGetUserOwnImagesResponse(result, page, limit, requestId, startTime) {
        return formatSuccessResponse({
            items: result.images,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.totalCount,
                count: result.images.length
            }
        }, requestId, Date.now() - startTime);
    }

    /**
     * Log getUserImages request details
     */
    logGetUserImagesRequest(userId, pagination) {
        console.log('🔄 ENHANCED-IMAGE-CONTROLLER: getUserImages called with userId:', userId);
        console.log('🔄 ENHANCED-IMAGE-CONTROLLER: Pagination params:', pagination);
        console.log('🔄 ENHANCED-IMAGE-CONTROLLER: Calling imageService.getUserImages...');
    }

    /**
     * Log getUserImages service result
     */
    logGetUserImagesResult(result) {
        console.log('✅ ENHANCED-IMAGE-CONTROLLER: Service result:', {
            imagesCount: result.images?.length || 0,
            totalCount: result.totalCount,
            hasMore: result.hasMore
        });
    }

    /**
     * Log getUserImages response data
     */
    logGetUserImagesResponse(responseData) {
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
        console.log('✅ ENHANCED-IMAGE-CONTROLLER: Sending response with', responseData.images.length, 'images');
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
            const image = await databaseClient.getClient().image.findUnique({
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
