/**
 * SimplifiedRouteSetup - Simplified route setup using RouteFactory
 *
 * This replaces the complex route setup in index.js with a cleaner,
 * more maintainable approach using the RouteFactory pattern.
 */

import { RouteFactory } from './RouteFactory.js';
import { authenticateTokenRequired } from '../../middleware/authMiddleware.js';
import { unifiedRateLimit } from '../../middleware/unifiedRateLimit.js';

export class SimplifiedRouteSetup {
    constructor() {
        this.routeFactory = new RouteFactory();
        this.setupMiddleware();
    }

    setupMiddleware() {
        // Register common middleware
        this.routeFactory.createMiddleware('auth', authenticateTokenRequired);
        this.routeFactory.createMiddleware('rateLimit', unifiedRateLimit.api);
    }

    async setupRoutes(app, controllers) {
        console.log('🔧 SIMPLIFIED ROUTES: Starting route setup...');

        try {
            // Create route groups
            this.createImageRoutes(controllers);
            this.createAIRoutes(controllers);
            this.createAuthRoutes(controllers);
            this.createAdminRoutes(controllers);

            // Register all route groups
            this.routeFactory.registerAllRouteGroups(app);

            // Log route statistics
            const stats = this.routeFactory.getRouteStats();
            console.log('📊 Route Statistics:', stats);

            console.log('✅ SIMPLIFIED ROUTES: All routes setup completed');
        } catch (error) {
            console.error('❌ SIMPLIFIED ROUTES: Route setup failed:', error.message);
            throw error;
        }
    }

    createImageRoutes(controllers) {
        const imageGroup = this.routeFactory.createRouteGroup(
            'images',
            '/api/images',
            [this.routeFactory.getMiddleware('auth')]
        );

        // Image generation routes
        this.routeFactory.addRoute('images', 'POST', '/generate',
            controllers.imageGeneration.generateImage,
            [this.routeFactory.getMiddleware('rateLimit')]
        );
        this.routeFactory.addRoute('images', 'GET', '/health',
            controllers.imageGeneration.getHealth
        );

        // Image management routes
        this.routeFactory.addRoute('images', 'GET', '/:id',
            controllers.imageManagement.getImageById
        );
        this.routeFactory.addRoute('images', 'PUT', '/:id/rating',
            controllers.imageManagement.updateRating
        );
        this.routeFactory.addRoute('images', 'PUT', '/:id/public',
            controllers.imageManagement.updatePublicStatus
        );
        this.routeFactory.addRoute('images', 'DELETE', '/:id',
            controllers.imageManagement.deleteImage
        );
        this.routeFactory.addRoute('images', 'GET', '/',
            controllers.imageManagement.getImages
        );
        this.routeFactory.addRoute('images', 'GET', '/user',
            controllers.imageManagement.getUserImages
        );
        this.routeFactory.addRoute('images', 'GET', '/count',
            controllers.imageManagement.getImageCount
        );

        // Feed routes
        this.routeFactory.addRoute('images', 'GET', '/feed',
            controllers.feed.getFeed
        );
        this.routeFactory.addRoute('images', 'GET', '/user/public',
            controllers.feed.getUserPublicImages
        );
        this.routeFactory.addRoute('images', 'GET', '/user/own',
            controllers.feed.getUserOwnImages
        );
        this.routeFactory.addRoute('images', 'GET', '/models',
            controllers.feed.getActiveModels
        );
    }

    createAIRoutes(controllers) {
        const aiGroup = this.routeFactory.createRouteGroup(
            'ai',
            '/api/ai',
            [this.routeFactory.getMiddleware('auth')]
        );

        // AI word type operations
        this.routeFactory.addRoute('ai', 'GET', '/word/type/:word',
            controllers.ai.getWordType
        );
        this.routeFactory.addRoute('ai', 'GET', '/word/examples/:word',
            controllers.ai.getWordExamples
        );
        this.routeFactory.addRoute('ai', 'GET', '/word/add/:word',
            controllers.ai.addWordType,
            [this.routeFactory.getMiddleware('rateLimit')]
        );
        this.routeFactory.addRoute('ai', 'POST', '/word/add',
            controllers.ai.addWordTypePost,
            [this.routeFactory.getMiddleware('rateLimit')]
        );
        this.routeFactory.addRoute('ai', 'DELETE', '/word/delete/:word',
            controllers.ai.deleteWordType,
            [this.routeFactory.getMiddleware('rateLimit')]
        );
        this.routeFactory.addRoute('ai', 'GET', '/word/stats',
            controllers.ai.getWordStats
        );

        // AI prompt processing
        this.routeFactory.addRoute('ai', 'GET', '/prompt/build',
            controllers.ai.processPrompt
        );
        this.routeFactory.addRoute('ai', 'GET', '/prompt/clauses',
            controllers.ai.getSampleClauses
        );
    }

    createAuthRoutes(controllers) {
        const authGroup = this.routeFactory.createRouteGroup(
            'auth',
            '/api/auth',
            [] // No auth middleware for auth routes
        );

        // Auth routes would be added here
        // This is a placeholder for the auth route setup
    }

    createAdminRoutes(controllers) {
        const adminGroup = this.routeFactory.createRouteGroup(
            'admin',
            '/api/admin',
            [this.routeFactory.getMiddleware('auth')]
        );

        // Admin routes would be added here
        // This is a placeholder for the admin route setup
    }
}
