import {
    apiRateLimit,
    sanitizeInput,
    authenticateToken
} from '../middleware/index.js';

export const setupFeedRoutes = (app, enhancedImageController) => {
    // Site feed route - public images from all users
    app.get('/api/feed/site',
        apiRateLimit,
        authenticateToken, // Add authentication middleware
        sanitizeInput,
        enhancedImageController.getFeed.bind(enhancedImageController)
    );

    // User feed route - user's own images (both public and private)
    app.get('/api/feed/user',
        apiRateLimit,
        authenticateToken, // Authentication required for user feed
        sanitizeInput,
        enhancedImageController.getUserOwnImages.bind(enhancedImageController)
    );

    // Note: Additional routes are handled by enhancedImageRoutes.js
    // with proper authentication middleware
};
