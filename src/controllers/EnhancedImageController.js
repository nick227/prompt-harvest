import { ValidationError } from '../errors/CustomErrors.js';

export class EnhancedImageController {
    constructor(enhancedImageService) {
        this.imageService = enhancedImageService;
    }

    // eslint-disable-next-line max-lines-per-function
    async generateImage(req, res) {
        const startTime = Date.now();
        const requestId = req.id || this.generateRequestId();

        // eslint-disable-next-line no-console
        console.log(`🚀 Image generation request [${requestId}]:`, {
            method: req.method,
            url: req.originalUrl,
            userId: req.user?.id || 'anonymous',
            ip: req.ip
        });

        try {
            // Use validated data from middleware
            const {
                prompt,
                providers,
                guidance,
                multiplier,
                mixup,
                mashup,
                customVariables,
                promptId,
                original
            } = req.validatedData || req.body;

            const userId = req.user?.id;

            const options = {
                promptId,
                original,
                multiplier,
                mixup,
                mashup,
                customVariables
            };

            // Generate image with enhanced service
            const result = await this.imageService.generateImage(
                prompt,
                providers,
                guidance,
                userId,
                options
            );

            // Check if result is an error response
            if (result.error) {
                const statusCode = result.statusCode || 500;
                const response = {
                    ...result,
                    requestId,
                    duration: Date.now() - startTime
                };

                console.error(`❌ Image generation failed [${requestId}]:`, response);

                return res.status(statusCode).json(response);
            }

            // Success response
            const response = {
                success: true,
                requestId,
                data: result,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };

            // eslint-disable-next-line no-console
            console.log(`✅ Image generation successful [${requestId}]:`, {
                imageId: result.imageId,
                provider: result.providerName,
                duration: response.duration
            });

            res.status(200).json(response);

        } catch (error) {
            const duration = Date.now() - startTime;

            console.error(`❌ Image generation controller error [${requestId}]:`, {
                error: error.message,
                stack: error.stack,
                duration
            });

            // Format error response
            const errorResponse = this.formatErrorResponse(error, requestId, duration);

            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    async updateRating(req, res) {
        const startTime = Date.now();
        const requestId = req.id || this.generateRequestId();

        try {
            const { id } = req.params;
            const { rating } = req.body;

            if (!id) {
                throw new ValidationError('Image ID is required');
            }

            if (rating === undefined || rating === null) {
                throw new ValidationError('Rating value is required');
            }

            const ratingNum = parseInt(rating);

            if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
                throw new ValidationError('Rating must be a number between 1 and 5');
            }

            const result = await this.imageService.updateRating(id, ratingNum);

            const response = {
                success: true,
                requestId,
                data: result,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };

            // eslint-disable-next-line no-console
            console.log(`✅ Rating updated [${requestId}]:`, {
                imageId: id,
                rating: ratingNum,
                duration: response.duration
            });

            res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;

            console.error(`❌ Rating update error [${requestId}]:`, error.message);

            const errorResponse = this.formatErrorResponse(error, requestId, duration);

            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    async deleteImage(req, res) {
        const startTime = Date.now();
        const requestId = req.id || this.generateRequestId();

        try {
            const { id } = req.params;

            if (!id) {
                throw new ValidationError('Image ID is required');
            }

            const result = await this.imageService.deleteImage(id);

            const response = {
                success: true,
                requestId,
                data: result,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };

            // eslint-disable-next-line no-console
            console.log(`✅ Image deleted [${requestId}]:`, {
                imageId: id,
                duration: response.duration
            });

            res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;

            console.error(`❌ Image deletion error [${requestId}]:`, error.message);

            const errorResponse = this.formatErrorResponse(error, requestId, duration);

            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    async getImages(req, res) {
        const startTime = Date.now();
        const requestId = req.id || this.generateRequestId();

        try {
            const userId = req.user?._id;
            const limit = parseInt(req.query.limit) || 8;
            const page = parseInt(req.query.page) || 0;

            // Validate pagination parameters
            if (limit < 1 || limit > 100) {
                throw new ValidationError('Limit must be between 1 and 100');
            }

            if (page < 0) {
                throw new ValidationError('Page must be 0 or greater');
            }

            const images = await this.imageService.getImages(userId, limit, page);

            const response = {
                success: true,
                requestId,
                data: {
                    images,
                    pagination: {
                        limit,
                        page,
                        count: images.length
                    }
                },
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };

            // eslint-disable-next-line no-console
            console.log(`✅ Images retrieved [${requestId}]:`, {
                count: images.length,
                userId: userId || 'anonymous',
                duration: response.duration
            });

            res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;

            console.error(`❌ Get images error [${requestId}]:`, error.message);

            const errorResponse = this.formatErrorResponse(error, requestId, duration);

            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    async getImageCount(req, res) {
        const startTime = Date.now();
        const requestId = req.id || this.generateRequestId();

        try {
            const userId = req.user?._id;
            const result = await this.imageService.getImageCount(userId);

            const response = {
                success: true,
                requestId,
                data: result,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };

            // eslint-disable-next-line no-console
            console.log(`✅ Image count retrieved [${requestId}]:`, {
                count: result.count,
                userId: userId || 'anonymous',
                duration: response.duration
            });

            res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;

            console.error(`❌ Get image count error [${requestId}]:`, error.message);

            const errorResponse = this.formatErrorResponse(error, requestId, duration);

            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    async getFeed(req, res) {
        const startTime = Date.now();
        const requestId = req.id || this.generateRequestId();

        try {
            const userId = req.user?._id;
            const limit = parseInt(req.query.limit) || 8;
            const page = parseInt(req.query.page) || 0;

            const images = await this.imageService.getFeed(userId, limit, page);

            const response = {
                success: true,
                requestId,
                data: {
                    images,
                    pagination: {
                        limit,
                        page,
                        count: images.length
                    }
                },
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };

            // eslint-disable-next-line no-console
            console.log(`✅ Feed retrieved [${requestId}]:`, {
                count: images.length,
                userId: userId || 'anonymous',
                duration: response.duration
            });

            res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;

            console.error(`❌ Get feed error [${requestId}]:`, error.message);

            const errorResponse = this.formatErrorResponse(error, requestId, duration);

            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    async getHealth(req, res) {
        try {
            const health = await this.imageService.getHealth();

            const response = {
                success: true,
                data: health,
                timestamp: new Date().toISOString()
            };

            res.json(response);

        } catch (error) {
            console.error('❌ Health check error:', error.message);

            const errorResponse = this.formatErrorResponse(error, 'health_check', 0);

            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    // eslint-disable-next-line max-lines-per-function
    formatErrorResponse(error, requestId, duration = 0) {
        const baseResponse = {
            success: false,
            requestId,
            duration,
            timestamp: new Date().toISOString()
        };

        switch (error.name) {
            case 'ValidationError':
                return {
                    ...baseResponse,
                    error: {
                        type: 'VALIDATION_ERROR',
                        message: error.message,
                        details: error.details || null
                    },
                    statusCode: 400
                };

            case 'NotFoundError':
                return {
                    ...baseResponse,
                    error: {
                        type: 'NOT_FOUND',
                        message: error.message,
                        resource: error.resource || 'unknown'
                    },
                    statusCode: 404
                };

            case 'DatabaseError':
                return {
                    ...baseResponse,
                    error: {
                        type: 'DATABASE_ERROR',
                        message: error.message,
                        operation: error.operation || 'unknown'
                    },
                    statusCode: 500
                };

            case 'CircuitBreakerOpenError':
                return {
                    ...baseResponse,
                    error: {
                        type: 'SERVICE_UNAVAILABLE',
                        message: error.message,
                        service: error.service,
                        retryAfter: error.retryAfter
                    },
                    statusCode: 503
                };

            case 'ProviderUnavailableError':
                return {
                    ...baseResponse,
                    error: {
                        type: 'PROVIDER_ERROR',
                        message: error.message,
                        provider: error.provider,
                        reason: error.reason
                    },
                    statusCode: 503
                };

            case 'ImageGenerationTimeoutError':
                return {
                    ...baseResponse,
                    error: {
                        type: 'TIMEOUT_ERROR',
                        message: error.message,
                        provider: error.provider,
                        timeout: error.timeout
                    },
                    statusCode: 408
                };

            default:
                return {
                    ...baseResponse,
                    error: {
                        type: 'UNKNOWN_ERROR',
                        message: error.message || 'An unexpected error occurred'
                    },
                    statusCode: 500
                };
        }
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
