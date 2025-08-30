import {
    apiRateLimit,
    sanitizeInput
} from '../middleware/index.js';

export const setupFeedRoutes = (app, imageController) => {
    // Feed routes for getting images
    app.get('/feed',
        apiRateLimit,
        sanitizeInput,
        imageController.getFeed.bind(imageController)
    );

    app.get('/images',
        apiRateLimit,
        sanitizeInput,
        imageController.getImages.bind(imageController)
    );

    app.get('/images/count',
        apiRateLimit,
        imageController.getImagesCount.bind(imageController)
    );
};
