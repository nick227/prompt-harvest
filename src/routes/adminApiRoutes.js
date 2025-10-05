import { AdminApiController } from '../controllers/AdminApiController.js';
import { authenticateTokenRequired } from '../middleware/authMiddleware.js';
import { apiRateLimit } from '../middleware/index.js';
import { AdminApiService } from '../services/AdminApiService.js';

/**
 * Setup Admin API Routes
 * Refactored to use existing JWT authentication and service layer
 */
export const setupAdminApiRoutes = (app, enhancedImageService, blogService) => {
    const adminApiService = new AdminApiService(enhancedImageService, blogService);
    const controller = new AdminApiController(adminApiService);

    // Apply common middleware to all admin API routes
    const adminMiddleware = [authenticateTokenRequired, apiRateLimit];

    // Image Generation
    app.post('/api/admin/generate-image', ...adminMiddleware, controller.generateImage.bind(controller));

    // Blog Post Creation
    app.post('/api/admin/create-blog-post', ...adminMiddleware, controller.createBlogPost.bind(controller));

    // Usage Statistics
    app.get('/api/admin/usage-stats', ...adminMiddleware, controller.getUsageStats.bind(controller));

    // Health Check
    app.get('/api/admin/health', authenticateTokenRequired, (req, res) => {
        res.json({
            success: true,
            message: 'Admin API is healthy',
            user: {
                id: req.user.id,
                email: req.user.email,
                username: req.user.username
            }
        });
    });
};
