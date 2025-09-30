/**
 * ComposedImageController - Composition of focused image controllers
 *
 * This controller composes the focused controllers to provide the same interface
 * as the original EnhancedImageController, but with better separation of concerns.
 */

import { ImageGenerationController } from './ImageGenerationController.js';
import { ImageManagementController } from './ImageManagementController.js';
import { FeedController } from './FeedController.js';

export class ComposedImageController {
    constructor(imageService) {

        // Initialize focused controllers
        this.imageGenerationController = new ImageGenerationController(imageService);
        this.imageManagementController = new ImageManagementController(imageService);
        this.feedController = new FeedController(imageService);

        // Keep reference to service for compatibility
        this.imageService = imageService;

    }

    // ============================================================================
    // IMAGE GENERATION - Delegated to ImageGenerationController
    // ============================================================================

    async generateImage(req, res) {
        return await this.imageGenerationController.generateImage(req, res);
    }

    // ============================================================================
    // IMAGE MANAGEMENT - Delegated to ImageManagementController
    // ============================================================================

    async getImageById(req, res) {
        return await this.imageManagementController.getImageById(req, res);
    }

    async updateRating(req, res) {
        return await this.imageManagementController.updateRating(req, res);
    }

    async updatePublicStatus(req, res) {
        return await this.imageManagementController.updatePublicStatus(req, res);
    }

    async deleteImage(req, res) {
        return await this.imageManagementController.deleteImage(req, res);
    }

    async getImages(req, res) {
        return await this.imageManagementController.getImages(req, res);
    }

    async getUserImages(req, res) {
        return await this.imageManagementController.getUserImages(req, res);
    }

    async getImageCount(req, res) {
        return await this.imageManagementController.getImageCount(req, res);
    }

    // ============================================================================
    // FEED SERVICES - Delegated to FeedController
    // ============================================================================

    async getFeed(req, res) {
        return await this.feedController.getFeed(req, res);
    }

    async getUserPublicImages(req, res) {
        return await this.feedController.getUserPublicImages(req, res);
    }

    async getUserOwnImages(req, res) {
        return await this.feedController.getUserOwnImages(req, res);
    }

    async getActiveModels(req, res) {
        return await this.feedController.getActiveModels(req, res);
    }

    // ============================================================================
    // HEALTH CHECK - Delegated to ImageGenerationController
    // ============================================================================

    async getHealth(req, res) {
        return await this.imageGenerationController.getHealth(req, res);
    }

    // ============================================================================
    // LEGACY METHODS - For backward compatibility
    // ============================================================================

    async getSampleImage(req, res) {
        // This method was in the original controller but not critical
        // For now, return a simple response
        res.json({
            success: true,
            message: 'Sample image endpoint - functionality moved to feed controller'
        });
    }
}
