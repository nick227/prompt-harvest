import {
    requireAuth,
    apiRateLimit,
    sanitizeInput
} from '../middleware/index.js';

export const setupTagRoutes = (app, tagController) => {
    // Tag management with authentication and rate limiting
    app.post('/tags/add',
        requireAuth,
        apiRateLimit,
        sanitizeInput,
        tagController.createTag.bind(tagController)
    );

    app.delete('/tags/remove',
        requireAuth,
        apiRateLimit,
        sanitizeInput,
        tagController.deleteTag.bind(tagController)
    );

    app.get('/api/images/:imageId/tags',
        apiRateLimit,
        tagController.getTagsByImageId.bind(tagController)
    );

    app.get('/api/tags/user',
        requireAuth,
        apiRateLimit,
        tagController.getTagsByUserId.bind(tagController)
    );
};
