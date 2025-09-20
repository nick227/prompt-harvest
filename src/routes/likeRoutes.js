import {
    requireAuth,
    apiRateLimit,
    sanitizeInput
} from '../middleware/index.js';

export const setupLikeRoutes = (app, likeController) => {
    // Like management with authentication and rate limiting
    app.post('/like/image/:id',
        requireAuth,
        apiRateLimit,
        sanitizeInput,
        likeController.createLike.bind(likeController)
    );

    app.delete('/like/image/:id',
        requireAuth,
        apiRateLimit,
        likeController.deleteLike.bind(likeController)
    );

    app.get('/image/:id/liked',
        requireAuth,
        apiRateLimit,
        likeController.checkIfLiked.bind(likeController)
    );

    app.get('/api/images/:imageId/likes',
        apiRateLimit,
        likeController.getLikesByImageId.bind(likeController)
    );
};
