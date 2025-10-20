/**
 * Service Registry
 * Configures all services with proper dependency injection
 */
import { ServiceFactory } from './ServiceFactory.js';
import databaseClient from '../database/PrismaClient.js';
import { TransactionService } from '../services/TransactionService.js';
import { CreditManagementService } from '../services/credit/CreditManagementService.js';
import { ImageManagementService } from '../services/ImageManagementService.js';
import AIEnhancementService from '../services/ai/features/AIEnhancementService.js';
import { EnhancedImageService } from '../services/EnhancedImageService.js';
import { circuitBreakerManager } from '../utils/CircuitBreaker.js';

/**
 * Register all application services
 * @param {ServiceFactory} factory - Service factory instance
 * @returns {ServiceFactory} The same factory for chaining
 */
export function registerServices(factory) {
    // ========== Core Infrastructure ==========

    // Prisma Client (singleton)
    factory.register('prismaClient', () => databaseClient.getClient(), { singleton: true });

    // Circuit Breaker Manager (singleton)
    factory.register('circuitBreakerManager', () => circuitBreakerManager, { singleton: true });

    // ========== Repositories ==========

    // Image Repository (singleton)
    // Note: This should be imported and registered when available
    factory.register('imageRepository', f => {
        // For now, return a placeholder that will be replaced with actual repository
        // In production, import and instantiate the actual ImageRepository
        throw new Error('imageRepository must be registered with actual implementation');
    }, { singleton: true });

    // ========== Services ==========

    // Transaction Service (singleton)
    factory.register('transactionService', f => new TransactionService(), { singleton: true });

    // Credit Management Service (singleton)
    factory.register('creditService', f => new CreditManagementService(), { singleton: true });

    // Image Management Service (singleton)
    factory.register('imageManagementService', f => new ImageManagementService(), { singleton: true });

    // AI Enhancement Service (singleton)
    factory.register('aiService', () => new AIEnhancementService(), { singleton: true });

    // ========== Main Application Services ==========

    // Enhanced Image Service (non-singleton by default, but can be made singleton)
    factory.register('enhancedImageService', f => new EnhancedImageService({
        imageRepository: f.get('imageRepository'),
        aiService: f.get('aiService'),
        prismaClient: f.get('prismaClient'),
        transactionService: f.get('transactionService'),
        creditService: f.get('creditService'),
        imageManagementService: f.get('imageManagementService'),
        circuitBreakerManager: f.get('circuitBreakerManager')
    }), { singleton: true });

    return factory;
}

/**
 * Create and configure a service factory with all services
 * @returns {ServiceFactory} Configured service factory
 */
export function createServiceFactory() {
    const factory = new ServiceFactory();

    return registerServices(factory);
}

/**
 * Singleton instance of the service factory
 * Use this for production code
 */
let factoryInstance = null;

/**
 * Get the global service factory instance
 * @returns {ServiceFactory}
 */
export function getServiceFactory() {
    if (!factoryInstance) {
        factoryInstance = createServiceFactory();
    }

    return factoryInstance;
}

/**
 * Reset the global service factory (for testing)
 */
export function resetServiceFactory() {
    factoryInstance = null;
}

