/**
 * RouteFactory - Centralized route setup and management
 *
 * Provides a factory pattern for creating and organizing routes.
 * Simplifies the complex route setup in index.js.
 */

import express from 'express';

export class RouteFactory {
    constructor() {
        this.routes = new Map();
        this.middleware = new Map();
    }

    /**
     * Create a new route group
     * @param {string} name - Route group name
     * @param {string} basePath - Base path for the route group
     * @param {Array} middleware - Middleware to apply to all routes in group
     * @returns {Object} Route group object
     */
    createRouteGroup(name, basePath, middleware = []) {
        const router = express.Router();

        // Apply middleware to the router
        middleware.forEach(middlewareFn => {
            router.use(middlewareFn);
        });

        const routeGroup = {
            name,
            basePath,
            router,
            middleware,
            routes: []
        };

        this.routes.set(name, routeGroup);
        return routeGroup;
    }

    /**
     * Add a route to a route group
     * @param {string} groupName - Name of the route group
     * @param {string} method - HTTP method (GET, POST, etc.)
     * @param {string} path - Route path
     * @param {Function} handler - Route handler function
     * @param {Array} middleware - Route-specific middleware
     */
    addRoute(groupName, method, path, handler, middleware = []) {
        const routeGroup = this.routes.get(groupName);
        if (!routeGroup) {
            throw new Error(`Route group '${groupName}' not found`);
        }

        // Apply route-specific middleware
        const routeMiddleware = [...routeGroup.middleware, ...middleware];

        // Add the route
        routeGroup.router[method.toLowerCase()](path, ...routeMiddleware, handler);

        // Track the route
        routeGroup.routes.push({
            method: method.toUpperCase(),
            path,
            handler: handler.name || 'anonymous',
            middleware: routeMiddleware.length
        });
    }

    /**
     * Register a route group with the main app
     * @param {Object} app - Express app instance
     * @param {string} groupName - Name of the route group
     */
    registerRouteGroup(app, groupName) {
        const routeGroup = this.routes.get(groupName);
        if (!routeGroup) {
            throw new Error(`Route group '${groupName}' not found`);
        }

        app.use(routeGroup.basePath, routeGroup.router);
        console.log(`✅ Route group '${groupName}' registered at ${routeGroup.basePath}`);
    }

    /**
     * Register all route groups with the main app
     * @param {Object} app - Express app instance
     */
    registerAllRouteGroups(app) {
        for (const [name, routeGroup] of this.routes) {
            this.registerRouteGroup(app, name);
        }
    }

    /**
     * Get route statistics
     * @returns {Object} Route statistics
     */
    getRouteStats() {
        const stats = {
            totalGroups: this.routes.size,
            totalRoutes: 0,
            groups: {}
        };

        for (const [name, routeGroup] of this.routes) {
            stats.groups[name] = {
                basePath: routeGroup.basePath,
                routeCount: routeGroup.routes.length,
                middlewareCount: routeGroup.middleware.length,
                routes: routeGroup.routes
            };
            stats.totalRoutes += routeGroup.routes.length;
        }

        return stats;
    }

    /**
     * Create a middleware factory
     * @param {string} name - Middleware name
     * @param {Function} middlewareFn - Middleware function
     */
    createMiddleware(name, middlewareFn) {
        this.middleware.set(name, middlewareFn);
    }

    /**
     * Get middleware by name
     * @param {string} name - Middleware name
     * @returns {Function} Middleware function
     */
    getMiddleware(name) {
        return this.middleware.get(name);
    }

    /**
     * Create a route group for image operations
     * @param {Object} controllers - Controllers object
     * @param {Array} middleware - Middleware array
     * @returns {Object} Image route group
     */
    createImageRoutes(controllers, middleware = []) {
        const imageGroup = this.createRouteGroup(
            'images',
            '/api/images',
            middleware
        );

        // Image generation routes
        this.addRoute('images', 'POST', '/generate', controllers.imageGeneration.generateImage);
        this.addRoute('images', 'GET', '/health', controllers.imageGeneration.getHealth);

        // Image management routes
        this.addRoute('images', 'GET', '/:id', controllers.imageManagement.getImageById);
        this.addRoute('images', 'PUT', '/:id/rating', controllers.imageManagement.updateRating);
        this.addRoute('images', 'PUT', '/:id/public', controllers.imageManagement.updatePublicStatus);
        this.addRoute('images', 'DELETE', '/:id', controllers.imageManagement.deleteImage);
        this.addRoute('images', 'GET', '/', controllers.imageManagement.getImages);
        this.addRoute('images', 'GET', '/user', controllers.imageManagement.getUserImages);
        this.addRoute('images', 'GET', '/count', controllers.imageManagement.getImageCount);

        // Feed routes
        this.addRoute('images', 'GET', '/feed', controllers.feed.getFeed);
        this.addRoute('images', 'GET', '/user/public', controllers.feed.getUserPublicImages);
        this.addRoute('images', 'GET', '/user/own', controllers.feed.getUserOwnImages);
        this.addRoute('images', 'GET', '/models', controllers.feed.getActiveModels);

        return imageGroup;
    }

    /**
     * Create a route group for AI operations
     * @param {Object} controllers - Controllers object
     * @param {Array} middleware - Middleware array
     * @returns {Object} AI route group
     */
    createAIRoutes(controllers, middleware = []) {
        const aiGroup = this.createRouteGroup(
            'ai',
            '/api/ai',
            middleware
        );

        // AI word type operations
        this.addRoute('ai', 'GET', '/word/type/:word', controllers.ai.getWordType);
        this.addRoute('ai', 'GET', '/word/examples/:word', controllers.ai.getWordExamples);
        this.addRoute('ai', 'GET', '/word/add/:word', controllers.ai.addWordType);
        this.addRoute('ai', 'POST', '/word/add', controllers.ai.addWordTypePost);
        this.addRoute('ai', 'DELETE', '/word/delete/:word', controllers.ai.deleteWordType);
        this.addRoute('ai', 'GET', '/word/stats', controllers.ai.getWordStats);

        // AI prompt processing
        this.addRoute('ai', 'GET', '/prompt/build', controllers.ai.processPrompt);
        this.addRoute('ai', 'GET', '/prompt/clauses', controllers.ai.getSampleClauses);

        return aiGroup;
    }
}
