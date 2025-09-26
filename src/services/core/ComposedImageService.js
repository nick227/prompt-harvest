/**
 * ComposedImageService - Composition of focused image services
 *
 * This service composes the focused services to provide the same interface
 * as the original EnhancedImageService, but with better separation of concerns.
 */

import { ImageGenerationService } from './ImageGenerationService.js';
import { ImageManagementService } from './ImageManagementService.js';
import { FeedService } from './FeedService.js';

export class ComposedImageService {
    constructor(imageRepository, aiService) {
        console.log('🔧 ComposedImageService constructor called');

        // Initialize focused services
        this.imageGenerationService = new ImageGenerationService();
        this.imageManagementService = new ImageManagementService();
        this.feedService = new FeedService();

        // Keep original dependencies for compatibility
        this.imageRepository = imageRepository;
        this.aiService = aiService;

        console.log('✅ ComposedImageService constructor completed');
    }

    // ============================================================================
    // IMAGE GENERATION - Delegated to ImageGenerationService
    // ============================================================================

    async generateImage(prompt, providers, guidance, userId, options = {}) {
        return await this.imageGenerationService.generateImage(
            prompt, providers, guidance, userId, options
        );
    }

    // ============================================================================
    // IMAGE MANAGEMENT - Delegated to ImageManagementService
    // ============================================================================

    async getImageById(imageId, userId) {
        return await this.imageManagementService.getImageById(imageId, userId);
    }

    async updateRating(imageId, rating, userId) {
        return await this.imageManagementService.updateRating(imageId, rating, userId);
    }

    async updatePublicStatus(imageId, isPublic, userId) {
        return await this.imageManagementService.updatePublicStatus(imageId, isPublic, userId);
    }

    async deleteImage(imageId, userId) {
        return await this.imageManagementService.deleteImage(imageId, userId);
    }

    async getImages(userId, limit = 8, page = 0) {
        return await this.imageManagementService.getImages(userId, limit, page);
    }

    async getUserImages(userId, limit = 50, page = 0, tags = []) {
        return await this.imageManagementService.getUserImages(userId, limit, page, tags);
    }

    async getImageCount(userId) {
        return await this.imageManagementService.getImageCount(userId);
    }

    // ============================================================================
    // FEED SERVICES - Delegated to FeedService
    // ============================================================================

    async getFeed(userId, limit = 8, page = 0, tags = []) {
        return await this.feedService.getFeed(userId, limit, page, tags);
    }

    async getUserPublicImages(userId, limit = 20, page = 1) {
        return await this.feedService.getUserPublicImages(userId, limit, page);
    }

    async getUserOwnImages(userId, limit = 8, page = 0, tags = []) {
        return await this.feedService.getUserOwnImages(userId, limit, page, tags);
    }

    async getActiveModels() {
        return await this.feedService.getActiveModels();
    }

    // ============================================================================
    // CREDIT SERVICES - Placeholder for MVP
    // ============================================================================

    async getModelCost(providerName) {
        // MVP placeholder - returns default cost
        return { cost: 0.01 };
    }

    async refundCreditsOnFailure(userId, providers, error, requestId) {
        // MVP placeholder - always succeeds
        return { success: true };
    }

    async validateAndDeductCredits(userId, providers, prompt, requestId) {
        // MVP placeholder - always succeeds with default credit usage
        return { success: true, creditsUsed: 1 };
    }

    async refundCreditsForGeneration(userId, amount, requestId) {
        // MVP placeholder - always succeeds
        return { success: true };
    }

    // ============================================================================
    // HEALTH CHECK - Composite health status
    // ============================================================================

    async getHealth() {
        const health = {
            service: 'ComposedImageService',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {}
        };

        try {
            health.services.imageGeneration = await this.imageGenerationService.getHealth();
            health.services.imageManagement = await this.imageManagementService.getHealth();
            health.services.feed = await this.feedService.getHealth();
        } catch (error) {
            health.status = 'degraded';
            health.error = error.message;
        }

        return health;
    }
}
