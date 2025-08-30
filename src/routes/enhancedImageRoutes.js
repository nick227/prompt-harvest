import {
    validateImageGenerationEnhanced,
    enhancedRateLimit,
    validateAuthentication
} from '../middleware/enhancedValidation.js';
import { sanitizeInput } from '../middleware/validation.js';

export const setupEnhancedImageRoutes = (app, enhancedImageController) => {
    // Health check endpoint
    app.get('/api/health/image-service',
        enhancedImageController.getHealth.bind(enhancedImageController)
    );

    // Image generation with enhanced validation and rate limiting
    app.post('/api/image/generate',
        sanitizeInput,
        enhancedRateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            maxRequests: 50, // 50 requests per 15 minutes
            message: 'Image generation rate limit exceeded'
        }),
        validateImageGenerationEnhanced,
        enhancedImageController.generateImage.bind(enhancedImageController)
    );

    // Image management with authentication and validation
    app.put('/api/images/:id/rating',
        validateAuthentication,
        enhancedRateLimit({
            windowMs: 5 * 60 * 1000, // 5 minutes
            maxRequests: 100, // 100 rating updates per 5 minutes
            message: 'Rating update rate limit exceeded'
        }),
        sanitizeInput,
        enhancedImageController.updateRating.bind(enhancedImageController)
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
        enhancedRateLimit({
            windowMs: 1 * 60 * 1000, // 1 minute
            maxRequests: 200, // 200 requests per minute
            message: 'Image retrieval rate limit exceeded'
        }),
        sanitizeInput,
        enhancedImageController.getImages.bind(enhancedImageController)
    );

    app.get('/api/images/count',
        enhancedRateLimit({
            windowMs: 1 * 60 * 1000, // 1 minute
            maxRequests: 100, // 100 requests per minute
            message: 'Image count rate limit exceeded'
        }),
        sanitizeInput,
        enhancedImageController.getImageCount.bind(enhancedImageController)
    );

    // Feed endpoint with rate limiting
    app.get('/api/feed',
        enhancedRateLimit({
            windowMs: 1 * 60 * 1000, // 1 minute
            maxRequests: 300, // 300 requests per minute
            message: 'Feed retrieval rate limit exceeded'
        }),
        sanitizeInput,
        enhancedImageController.getFeed.bind(enhancedImageController)
    );

    // Circuit breaker status endpoint (admin only)
    app.get('/api/circuit-breakers/status',
        validateAuthentication,
        (req, res) => {
            // Check if user is admin
            if (!req.userInfo?.isAdmin) {
                return res.status(403).json({
                    error: 'ACCESS_DENIED',
                    message: 'Admin access required',
                    timestamp: new Date().toISOString()
                });
            }

            const { circuitBreakerManager } = require('../utils/CircuitBreaker.js');
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
        (req, res) => {
            // Check if user is admin
            if (!req.userInfo?.isAdmin) {
                return res.status(403).json({
                    error: 'ACCESS_DENIED',
                    message: 'Admin access required',
                    timestamp: new Date().toISOString()
                });
            }

            const { circuitBreakerManager } = require('../utils/CircuitBreaker.js');
            const { service } = req.body;

            if (service) {
                circuitBreakerManager.reset(service);
                console.log(`🔄 Circuit breaker reset for service: ${service}`);
            } else {
                circuitBreakerManager.resetAll();
                console.log('🔄 All circuit breakers reset');
            }

            res.json({
                success: true,
                message: service ? `Circuit breaker reset for ${service}` : 'All circuit breakers reset',
                timestamp: new Date().toISOString()
            });
        }
    );

    console.log('✅ Enhanced image routes configured with circuit breakers and validation');
};
