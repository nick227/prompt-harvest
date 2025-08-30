import { setupImageRoutes } from './imageRoutes.js';
import { setupEnhancedImageRoutes } from './enhancedImageRoutes.js';
import { setupAIRoutes } from './aiRoutes.js';
import { setupConfigRoutes } from './configRoutes.js';
import { setupLikeRoutes } from './likeRoutes.js';
import { setupTagRoutes } from './tagRoutes.js';
import { setupPageRoutes } from './pageRoutes.js';
import { setupFeedRoutes } from './feedRoutes.js';
import { setupMonitoringRoutes } from './monitoringRoutes.js';
import { setupAuthRoutes } from './authRoutes.js';
import { setupImageRatingRoutes } from './imageRatingRoutes.js';
import { ImageController } from '../controllers/ImageController.js';
import { EnhancedImageController } from '../controllers/EnhancedImageController.js';
import { AIController } from '../controllers/AIController.js';
import { ConfigController } from '../controllers/ConfigController.js';
import { LikeController } from '../controllers/LikeController.js';
import { TagController } from '../controllers/TagController.js';
import { ImageService } from '../services/ImageService.js';
import { EnhancedImageService } from '../services/EnhancedImageService.js';
import { AIService } from '../services/AIService.js';
import { LikeService } from '../services/LikeService.js';
import { TagService } from '../services/TagService.js';
import { ImageRepository } from '../repositories/ImageRepository.js';
import { errorHandler, notFoundHandler } from '../middleware/index.js';
import configManager from '../config/ConfigManager.js';

// eslint-disable-next-line max-statements
export const setupRoutes = async app => {
    // Validate configuration on startup
    try {
        configManager.validate();
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
    let imageService;
    let enhancedImageService;
    let likeService;
    let tagService;

    try {
        aiService = new AIService();
        imageService = new ImageService(imageRepository, aiService);
        enhancedImageService = new EnhancedImageService(imageRepository, aiService);
        likeService = new LikeService();
        tagService = new TagService();
    } catch (error) {
        console.error('❌ Failed to initialize services:', error.message);
        process.exit(1);
    }

    // Initialize controllers
    let aiController;
    let imageController;
    let enhancedImageController;
    let configController;
    let likeController;
    let tagController;

    try {
        aiController = new AIController(aiService);
        imageController = new ImageController(imageService);
        enhancedImageController = new EnhancedImageController(enhancedImageService);
        configController = new ConfigController();
        likeController = new LikeController(likeService);
        tagController = new TagController(tagService);
    } catch (error) {
        console.error('❌ Failed to initialize controllers:', error.message);
        process.exit(1);
    }

    // Setup routes
    setupPageRoutes(app); // Must be first to handle frontend pages
    setupImageRoutes(app, imageController);
    setupEnhancedImageRoutes(app, enhancedImageController); // Enhanced routes with circuit breakers
    setupFeedRoutes(app, imageController);
    setupAIRoutes(app, aiController);
    setupConfigRoutes(app, configController);
    setupLikeRoutes(app, likeController);
    setupTagRoutes(app, tagController);
    setupAuthRoutes(app); // Authentication routes
    setupImageRatingRoutes(app); // Image rating routes
    setupMonitoringRoutes(app); // System monitoring routes

    // Additional route setups will be added here as we refactor other domains
    // setupPromptRoutes(app, promptController);
    // setupWordRoutes(app, wordController);
    // setupFeedRoutes(app, feedController);

    // Start system monitoring
    try {
        const { systemMonitor } = await import('../monitoring/SystemMonitor.js');

        systemMonitor.start();
        console.log('✅ System monitoring started');
    } catch (error) {
        console.error('❌ Failed to start system monitoring:', error.message);
    }

    // Error handling middleware (must be last)
    app.use(notFoundHandler);
    app.use(errorHandler);
};
