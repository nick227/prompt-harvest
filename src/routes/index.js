import { setupEnhancedImageRoutes } from './enhancedImageRoutes.js';
import { setupAIRoutes } from './aiRoutes.js';
import { setupConfigRoutes } from './configRoutes.js';
import { setupLikeRoutes } from './likeRoutes.js';
import { setupTagRoutes } from './tagRoutes.js';
import { setupBlogRoutes } from './blogRoutes.js';
import { setupPageRoutes } from './pageRoutes.js';
// Removed feedRoutes.js - functionality covered by enhancedImageRoutes.js
import { setupMonitoringRoutes } from './monitoringRoutes.js';
import { setupAuthRoutes } from './authRoutes.js';
// import { setupImageRatingRoutes } from './imageRatingRoutes.js'; // Removed - redundant with enhancedImageRoutes.js
import { setupTransactionRoutes } from './transactionRoutes.js';
import { setupWordRoutes } from './wordRoutes.js';
import { setupPromptRoutes } from './promptRoutes.js';
import { setupAIChatRoutes } from './aiChatRoutes.js';
import setupViolationRoutes from './violationRoutes.js';
import { setupAdminPromoRoutes } from './adminPromoRoutes.js';
import { setupProfileRoutes } from './profileRoutes.js';
import { setupAdminApiRoutes } from './adminApiRoutes.js';
import creditsRouter from './credits.js';
import packagesRouter from './packages.js';
import providersRouter from './providers.js';
import stripeCheckoutRoutes from './stripeCheckoutRoutes.js';
import stripeWebhookRoutes from './stripeWebhookRoutes.js';
import adminRouter from './admin.js';
import messageRouter from './messageRoutes.js';
import searchRouter from './search.js';
import express from 'express';
import { EnhancedImageController } from '../controllers/EnhancedImageController.js';
import { AIController } from '../controllers/AIController.js';
import { ConfigController } from '../controllers/ConfigController.js';
import { LikeController } from '../controllers/LikeController.js';
import { TagController } from '../controllers/TagController.js';
import { BlogController } from '../controllers/BlogController.js';
import { TransactionController } from '../controllers/TransactionController.js';
import { PromptController } from '../controllers/PromptController.js';
import { ProfileController } from '../controllers/ProfileController.js';
import { EnhancedImageService } from '../services/EnhancedImageService.js';
import { getAIPromptService } from '../services/ai/features/AIPromptServiceSingleton.js';
import { LikeService } from '../services/LikeService.js';
import { TagService } from '../services/TagService.js';
import { BlogService } from '../services/BlogService.js';
import { ImageRepository } from '../repositories/ImageRepository.js';
import { errorHandler, notFoundHandler } from '../middleware/index.js';
import configManager from '../config/ConfigManager.js';
import { authenticateTokenRequired } from '../middleware/authMiddleware.js';

// eslint-disable-next-line max-lines-per-function, max-statements
export const setupRoutes = async app => {
    // Validate configuration on startup
    try {
        configManager.validate();
        // eslint-disable-next-line no-console
    } catch (error) {
        console.error('❌ Configuration validation failed:', error.message);
        process.exit(1);
    }

    let imageRepository;

    try {
        imageRepository = new ImageRepository();
    } catch (error) {
        console.error('❌ Failed to initialize ImageRepository:', error.message);
        process.exit(1);
    }

    // Initialize services
    let aiService;
    let enhancedImageService;
    let likeService;
    let tagService;
    let blogService;

    try {
        aiService = getAIPromptService();
        enhancedImageService = new EnhancedImageService({
            imageRepository,
            aiService
        });
        likeService = new LikeService();
        tagService = new TagService();
        blogService = new BlogService();
    } catch (error) {
        console.error('❌ Failed to initialize services:', error.message);
        process.exit(1);
    }

    // Initialize controllers
    let aiController;
    let enhancedImageController;
    let configController;
    let likeController;
    let tagController;
    let blogController;
    let transactionController;
    let promptController;
    let profileController;

    try {
        aiController = new AIController(aiService);
        enhancedImageController = new EnhancedImageController(enhancedImageService);
        configController = new ConfigController();
        likeController = new LikeController(likeService);
        tagController = new TagController(tagService);
        blogController = new BlogController(blogService);
        transactionController = new TransactionController();
        promptController = new PromptController();
        profileController = new ProfileController();
    } catch (error) {
        console.error('❌ Failed to initialize controllers:', error.message);
        process.exit(1);
    }

    // Setup routes
    setupPageRoutes(app); // Must be first to handle frontend pages
    setupAuthRoutes(app); // Authentication routes (no middleware needed)
    setupEnhancedImageRoutes(app, enhancedImageController); // Enhanced routes with circuit breakers
    setupProfileRoutes(app, profileController); // Profile management routes
    // Removed setupFeedRoutes - functionality covered by enhancedImageRoutes.js
    setupAIRoutes(app, aiController);
    setupConfigRoutes(app, configController);
    setupLikeRoutes(app, likeController);
    setupTagRoutes(app, tagController);
    setupBlogRoutes(app, blogController);
    // setupImageRatingRoutes(app); // Removed - redundant with enhancedImageRoutes.js
    setupMonitoringRoutes(app); // System monitoring routes
    setupTransactionRoutes(app, transactionController); // Transaction accounting routes
    setupWordRoutes(app); // Word types and examples routes
    setupPromptRoutes(app, promptController); // User prompts routes
    setupAIChatRoutes(app); // AI Chat widget routes
    app.use('/api/violations', setupViolationRoutes); // Violation tracking routes
    setupAdminPromoRoutes(app); // Admin promo code management routes
    setupAdminApiRoutes(app, enhancedImageService, blogService); // Admin API routes (email/password auth)
    app.use('/api/credits', creditsRouter); // Credits and payment routes
    app.use('/api/packages', packagesRouter); // Package management routes
    app.use('/api/providers', providersRouter); // Provider and model management routes
    app.use('/api/admin', adminRouter); // Admin dashboard routes
    app.use('/api/messages', messageRouter); // User-admin messaging routes
    app.use('/api/search', searchRouter); // Image search routes

    // Note: /webhooks routes are mounted in server.js BEFORE express.json() middleware
    app.use('/', stripeCheckoutRoutes); // Stripe checkout routes
    app.use('/', stripeWebhookRoutes); // Stripe webhook routes

    // Apply JWT authentication middleware to protected routes only
    // Note: Auth routes (/api/auth/*) are handled separately and don't need this middleware
    // Note: /api/images, /api/image, and /api/feed are handled by enhancedImageRoutes.js with their own auth middleware
    app.use('/api/ai', authenticateTokenRequired);
    app.use('/api/config', authenticateTokenRequired);
    app.use('/api/likes', authenticateTokenRequired);
    app.use('/api/tags', authenticateTokenRequired);
    app.use('/api/rating', authenticateTokenRequired);
    app.use('/api/transactions', authenticateTokenRequired);
    app.use('/api/prompts', authenticateTokenRequired);
    // app.use('/api/credits', authenticateTokenRequired); // Moved to credits router
    app.use('/api/stripe', authenticateTokenRequired);

    // Additional route setups will be added here as we refactor other domains
    // setupWordRoutes(app, wordController);
    // setupFeedRoutes(app, feedController);

    // Start system monitoring (disabled in development to reduce database queries)
    if (process.env.NODE_ENV === 'production') {
        try {
            const { systemMonitor } = await
            import('../monitoring/SystemMonitor.js');

            systemMonitor.start();
            // eslint-disable-next-line no-console
        } catch (error) {
            console.error('❌ Failed to start system monitoring:', error.message);
        }
    }

    // Error handling middleware (must be last)
    app.use(notFoundHandler);
    app.use(errorHandler);
};
