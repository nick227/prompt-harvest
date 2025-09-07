import {
    apiRateLimit,
    sanitizeInput,
    authenticateToken
} from '../middleware/index.js';

export const setupFeedRoutes = (app, enhancedImageController) => {
    // Feed routes for getting images - only /api/feed/site since /api/feed is handled by enhanced routes
    app.get('/api/feed/site',
        apiRateLimit,
        authenticateToken, // Add authentication middleware
        sanitizeInput,
        enhancedImageController.getFeed.bind(enhancedImageController)
    );

    // Note: /api/feed, /api/images, and /api/images/count are handled by enhancedImageRoutes.js
    // with proper authentication middleware
};
