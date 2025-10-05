import { formatSuccessResponse, formatErrorResponse } from '../utils/ResponseFormatter.js';
import { generateRequestId, logRequestStart, logRequestSuccess, logRequestError } from '../utils/RequestLogger.js';
import { validateRequiredFields, validateImageGenerationParams, validateBlogPostData } from '../utils/ValidationService.js';
import { ValidationError } from '../errors/CustomErrors.js';
import { AdminApiService } from '../services/AdminApiService.js';

/**
 * Admin API Controller
 * Refactored to use existing utilities and service layer
 */
export class AdminApiController {
    constructor(adminApiService) {
        this.adminApiService = adminApiService;
    }

    /**
     * Generate image via API
     * POST /api/admin/generate-image
     */
    async generateImage(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            // Log request start
            logRequestStart(requestId, req, 'Admin API Image Generation', {
                prompt: `${req.body.prompt?.substring(0, 50)}...`,
                providers: req.body.providers
            });

            // Validate input
            validateRequiredFields(req.body, ['prompt', 'providers']);
            validateImageGenerationParams({
                prompt: req.body.prompt,
                providers: req.body.providers,
                guidance: req.body.guidance
            });

            // Generate image via service
            const result = await this.adminApiService.generateImage(req.body, req.user);

            // Handle service errors
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

            res.json(response);
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse(error, requestId, duration);
            logRequestError(requestId, 'Image Generation', duration, error);
            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    /**
     * Create blog post via API
     * POST /api/admin/create-blog-post
     */
    async createBlogPost(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            // Log request start
            logRequestStart(requestId, req, 'Admin API Blog Creation', {
                title: req.body.title?.substring(0, 50)
            });

            // Validate input
            validateRequiredFields(req.body, ['title', 'content']);
            validateBlogPostData(req.body);

            // Create blog post via service
            const result = await this.adminApiService.createBlogPost(req.body, req.user);

            // Format success response
            const duration = Date.now() - startTime;
            const response = formatSuccessResponse(result, requestId, duration, 'Blog post created successfully');

            logRequestSuccess(requestId, 'Blog Creation', duration, {
                postId: result.id,
                title: result.title
            });

            res.status(201).json(response);
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse(error, requestId, duration);
            logRequestError(requestId, 'Blog Creation', duration, error);
            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }

    /**
     * Get API usage statistics
     * GET /api/admin/usage-stats
     */
    async getUsageStats(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            // Log request start
            logRequestStart(requestId, req, 'Admin API Usage Stats', {});

            // Get usage stats via service
            const result = await this.adminApiService.getUsageStats(req.user, {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                limit: req.query.limit
            });

            // Format success response
            const duration = Date.now() - startTime;
            const response = formatSuccessResponse(result, requestId, duration, 'Usage stats retrieved successfully');

            logRequestSuccess(requestId, 'Usage Stats', duration, {
                totalRequests: result.total
            });

            res.json(response);
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse(error, requestId, duration);
            logRequestError(requestId, 'Usage Stats', duration, error);
            res.status(errorResponse.statusCode || 500).json(errorResponse);
        }
    }
}
