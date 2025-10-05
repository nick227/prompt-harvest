import {
    authenticateToken,
    requireAuth,
    apiRateLimit,
    sanitizeInput
} from '../middleware/index.js';

export const setupBlogRoutes = (app, blogController) => {
    // Public blog routes (no authentication required)
    app.get('/api/blog/posts',
        apiRateLimit,
        blogController.getPublishedPosts.bind(blogController)
    );

    app.get('/api/blog/posts/featured',
        apiRateLimit,
        blogController.getPublishedPosts.bind(blogController)
    );

    app.get('/api/blog/posts/:slug',
        authenticateToken,
        apiRateLimit,
        blogController.getPostBySlug.bind(blogController)
    );

    app.get('/api/blog/posts/id/:id',
        apiRateLimit,
        blogController.getPostById.bind(blogController)
    );

    // Protected blog routes (authentication required)
    app.post('/api/blog/posts',
        authenticateToken,
        requireAuth,
        apiRateLimit,
        sanitizeInput,
        blogController.createPost.bind(blogController)
    );

    // Admin-only routes for blog management
    app.get('/api/blog/admin/posts',
        authenticateToken,
        requireAuth,
        apiRateLimit,
        blogController.getUserPosts.bind(blogController)
    );

    app.get('/api/blog/admin/posts/drafts',
        authenticateToken,
        requireAuth,
        apiRateLimit,
        blogController.getDraftPosts.bind(blogController)
    );

    app.put('/api/blog/posts/:id',
        authenticateToken,
        requireAuth,
        apiRateLimit,
        sanitizeInput,
        blogController.updatePost.bind(blogController)
    );

    app.delete('/api/blog/posts/:id',
        authenticateToken,
        requireAuth,
        apiRateLimit,
        sanitizeInput,
        blogController.deletePost.bind(blogController)
    );

    // Thumbnail upload is handled by existing /api/profile/upload-avatar endpoint
};
