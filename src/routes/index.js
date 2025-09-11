import { setupEnhancedImageRoutes } from './enhancedImageRoutes.js';
import { setupAIRoutes } from './aiRoutes.js';
import { setupConfigRoutes } from './configRoutes.js';
import { setupLikeRoutes } from './likeRoutes.js';
import { setupTagRoutes } from './tagRoutes.js';
import { setupPageRoutes } from './pageRoutes.js';
import { setupFeedRoutes } from './feedRoutes.js';
import { setupMonitoringRoutes } from './monitoringRoutes.js';
import { setupAuthRoutes } from './authRoutes.js';
// import { setupImageRatingRoutes } from './imageRatingRoutes.js'; // Removed - redundant with enhancedImageRoutes.js
import { setupTransactionRoutes } from './transactionRoutes.js';
import { setupWordRoutes } from './wordRoutes.js';
import { setupPromptRoutes } from './promptRoutes.js';
import stripeModule from '../stripe.js';
import express from 'express';
import { EnhancedImageController } from '../controllers/EnhancedImageController.js';
import { AIController } from '../controllers/AIController.js';
import { ConfigController } from '../controllers/ConfigController.js';
import { LikeController } from '../controllers/LikeController.js';
import { TagController } from '../controllers/TagController.js';
import { TransactionController } from '../controllers/TransactionController.js';
import { PromptController } from '../controllers/PromptController.js';
import { EnhancedImageService } from '../services/EnhancedImageService.js';
import { AIService } from '../services/AIService.js';
import { LikeService } from '../services/LikeService.js';
import { TagService } from '../services/TagService.js';
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
        console.log('✅ Configuration validated successfully');
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

    try {
        aiService = new AIService();
        enhancedImageService = new EnhancedImageService(imageRepository, aiService);
        likeService = new LikeService();
        tagService = new TagService();
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
    let transactionController;
    let promptController;

    try {
        aiController = new AIController(aiService);
        enhancedImageController = new EnhancedImageController(enhancedImageService);
        configController = new ConfigController();
        likeController = new LikeController(likeService);
        tagController = new TagController(tagService);
        transactionController = new TransactionController();
        promptController = new PromptController();
    } catch (error) {
        console.error('❌ Failed to initialize controllers:', error.message);
        process.exit(1);
    }

    // Setup routes
    setupPageRoutes(app); // Must be first to handle frontend pages
    setupAuthRoutes(app); // Authentication routes (no middleware needed)
    setupEnhancedImageRoutes(app, enhancedImageController); // Enhanced routes with circuit breakers
    setupFeedRoutes(app, enhancedImageController);
    setupAIRoutes(app, aiController);
    setupConfigRoutes(app, configController);
    setupLikeRoutes(app, likeController);
    setupTagRoutes(app, tagController);
    // setupImageRatingRoutes(app); // Removed - redundant with enhancedImageRoutes.js
    setupMonitoringRoutes(app); // System monitoring routes
    setupTransactionRoutes(app, transactionController); // Transaction accounting routes
    setupWordRoutes(app); // Word types and examples routes
    setupPromptRoutes(app, promptController); // User prompts routes
    stripeModule.init(app, express); // Stripe payment routes

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
            console.log('✅ System monitoring started');
        } catch (error) {
            console.error('❌ Failed to start system monitoring:', error.message);
        }
    } else {
        console.log('🔍 System monitoring disabled in development mode');
    }

    // Error handling middleware (must be last)
    app.use(notFoundHandler);
    app.use(errorHandler);
};
