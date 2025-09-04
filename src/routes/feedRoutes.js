import {
    apiRateLimit,
    sanitizeInput
} from '../middleware/index.js';

export const setupFeedRoutes = (app, imageController) => {
    // Feed routes for getting images
    app.get('/api/feed/site',
        apiRateLimit,
        sanitizeInput,
        imageController.getFeed.bind(imageController)
    );

    app.get('/api/feed',
        apiRateLimit,
        sanitizeInput,
        imageController.getFeed.bind(imageController)
    );

    app.get('/api/images',
        apiRateLimit,
        sanitizeInput,
        imageController.getImages.bind(imageController)
    );

    app.get('/api/images/count',
        apiRateLimit,
        imageController.getImagesCount.bind(imageController)
    );
};
