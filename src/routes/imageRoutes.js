import {
    requireAuth,
    validateImageGeneration,
    validateRating,
    validatePagination,
    imageGenerationRateLimit,
    sanitizeInput
} from '../middleware/index.js';

export const setupImageRoutes = (app, imageController) => {
    // Image generation with rate limiting and validation
    app.post('/image/generate',
        sanitizeInput,
        imageGenerationRateLimit,
        validateImageGeneration,
        imageController.generateImage.bind(imageController)
    );

    // Image management with authentication and validation
    app.put('/api/images/:id/rating',
        requireAuth,
        validateRating,
        imageController.updateRating.bind(imageController)
    );

    app.delete('/api/images/:id',
        requireAuth,
        imageController.deleteImage.bind(imageController)
    );

    // Image retrieval with pagination validation
    app.get('/api/images',
        validatePagination,
        imageController.getImages.bind(imageController)
    );

    app.get('/images/count',
        imageController.getImageCount.bind(imageController)
    );
};
