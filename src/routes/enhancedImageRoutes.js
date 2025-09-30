import {
    validateImageGenerationEnhanced,
    enhancedRateLimit,
    validateAuthentication
} from '../middleware/enhancedValidation.js';
import { sanitizeInput } from '../middleware/validation.js';
import { authenticateToken, authenticateTokenRequired } from '../middleware/authMiddleware.js';
import { requireImageGenerationCredits } from '../middleware/creditValidation.js';
import { userImageGenerationRateLimit, noRateLimit } from '../middleware/userRateLimit.js';

// eslint-disable-next-line max-lines-per-function
export const setupEnhancedImageRoutes = (app, enhancedImageController) => {
    // Health check endpoint
    app.get('/api/health/image-service',
        enhancedImageController.getHealth.bind(enhancedImageController)
    );

    // Image generation with enhanced validation and rate limiting
    app.post('/api/image/generate',
        authenticateTokenRequired, // Require authentication - no anonymous access
        sanitizeInput,
        // userImageGenerationRateLimit, // Per-user rate limiting (120 requests/minute)
        noRateLimit, // No rate limiting - users can request sequentially
        validateImageGenerationEnhanced,
        requireImageGenerationCredits, // Validate user has sufficient credits
        enhancedImageController.generateImage.bind(enhancedImageController)
    );

    // Image management with authentication and validation
    app.put('/api/images/:id/rating',
        authenticateToken, // Use authenticateToken to set req.user
        enhancedRateLimit({
            windowMs: 5 * 60 * 1000, // 5 minutes
            maxRequests: 100, // 100 rating updates per 5 minutes
            message: 'Rating update rate limit exceeded'
        }),
        sanitizeInput,
        enhancedImageController.updateRating.bind(enhancedImageController)
    );

    app.put('/api/images/:id/public-status',
        authenticateToken, // Use authenticateToken to set req.user
        enhancedRateLimit({
            windowMs: 5 * 60 * 1000, // 5 minutes
            maxRequests: 50, // 50 public status updates per 5 minutes
            message: 'Public status update rate limit exceeded'
        }),
        sanitizeInput,
        enhancedImageController.updatePublicStatus.bind(enhancedImageController)
    );

    app.delete('/api/images/:id',
        validateAuthentication,
        enhancedRateLimit({
            windowMs: 5 * 60 * 1000, // 5 minutes
            maxRequests: 20, // 20 deletions per 5 minutes
            message: 'Image deletion rate limit exceeded'
        }),
        sanitizeInput,
        enhancedImageController.deleteImage.bind(enhancedImageController)
    );

    // Image retrieval with pagination validation
    app.get('/api/images',
        authenticateToken, // Add authentication middleware
        enhancedRateLimit({
            windowMs: 1 * 60 * 1000, // 1 minute
            maxRequests: 200, // 200 requests per minute
            message: 'Image retrieval rate limit exceeded'
        }),
        sanitizeInput,
        enhancedImageController.getImages.bind(enhancedImageController)
    );

    // User image history for billing page
    app.get('/api/images/user',
        authenticateTokenRequired, // Require authentication for user images
        enhancedRateLimit({
            windowMs: 1 * 60 * 1000, // 1 minute
            maxRequests: 50, // 50 requests per minute for user history
            message: 'User image history rate limit exceeded'
        }),
        sanitizeInput,
        enhancedImageController.getUserImages.bind(enhancedImageController)
    );

    // Get sample image for credits modal
    app.get('/api/images/sample',
        enhancedRateLimit({
            windowMs: 1 * 60 * 1000, // 1 minute
            maxRequests: 50, // 50 requests per minute
            message: 'Sample image rate limit exceeded'
        }),
        sanitizeInput,
        enhancedImageController.getSampleImage.bind(enhancedImageController)
    );

    // Get image count - MUST be before /api/images/:id route
    app.get('/api/images/count',
        authenticateToken, // Add authentication middleware
        enhancedRateLimit({
            windowMs: 1 * 60 * 1000, // 1 minute
            maxRequests: 100, // 100 requests per minute
            message: 'Image count rate limit exceeded'
        }),
        sanitizeInput,
        enhancedImageController.getImageCount.bind(enhancedImageController)
    );

    // Get single image by ID - MUST be after specific routes like /count
    app.get('/api/images/:id',
        authenticateToken, // Add authentication middleware
        enhancedRateLimit({
            windowMs: 1 * 60 * 1000, // 1 minute
            maxRequests: 100, // 100 requests per minute
            message: 'Single image retrieval rate limit exceeded'
        }),
        sanitizeInput,
        enhancedImageController.getImageById.bind(enhancedImageController)
    );

    // Feed endpoint with rate limiting
    app.get('/api/feed',
        authenticateToken, // Add authentication middleware
        enhancedRateLimit({
            windowMs: 1 * 60 * 1000, // 1 minute
            maxRequests: 300, // 300 requests per minute
            message: 'Feed retrieval rate limit exceeded'
        }),
        sanitizeInput,
        enhancedImageController.getFeed.bind(enhancedImageController)
    );

    // Site feed endpoint (alias for /api/feed - public images only)
    app.get('/api/feed/site',
        authenticateToken, // Add authentication middleware
        enhancedRateLimit({
            windowMs: 1 * 60 * 1000, // 1 minute
            maxRequests: 300, // 300 requests per minute
            message: 'Site feed rate limit exceeded'
        }),
        sanitizeInput,
        enhancedImageController.getFeed.bind(enhancedImageController)
    );

    // User's own images endpoint - get only user's own images
    app.get('/api/feed/user',
        authenticateToken, // Add authentication middleware
        enhancedRateLimit({
            windowMs: 1 * 60 * 1000, // 1 minute
            maxRequests: 300, // 300 requests per minute
            message: 'User feed rate limit exceeded'
        }),
        sanitizeInput,
        enhancedImageController.getUserOwnImages.bind(enhancedImageController)
    );

    // Circuit breaker status endpoint (admin only)
    app.get('/api/circuit-breakers/status',
        validateAuthentication,
        async (req, res) => {
            // Check if user is admin
            if (!req.userInfo?.isAdmin) {
                return res.status(403).json({
                    error: 'ACCESS_DENIED',
                    message: 'Admin access required',
                    timestamp: new Date().toISOString()
                });
            }

            const { circuitBreakerManager } = await import('../utils/CircuitBreaker.js');
            const health = circuitBreakerManager.getHealth();

            res.json({
                success: true,
                data: health,
                timestamp: new Date().toISOString()
            });
        }
    );

    // Circuit breaker reset endpoint (admin only)
    app.post('/api/circuit-breakers/reset',
        validateAuthentication,
        async (req, res) => {
            // Check if user is admin
            if (!req.userInfo?.isAdmin) {
                return res.status(403).json({
                    error: 'ACCESS_DENIED',
                    message: 'Admin access required',
                    timestamp: new Date().toISOString()
                });
            }

            const { circuitBreakerManager } = await import('../utils/CircuitBreaker.js');
            const { service } = req.body;

            if (service) {
                circuitBreakerManager.reset(service);
                // eslint-disable-next-line no-console
            } else {
                circuitBreakerManager.resetAll();
                // eslint-disable-next-line no-console
            }

            res.json({
                success: true,
                message: service ? `Circuit breaker reset for ${service}` : 'All circuit breakers reset',
                timestamp: new Date().toISOString()
            });
        }
    );

    // eslint-disable-next-line no-console
    // Enhanced image routes configured
};
