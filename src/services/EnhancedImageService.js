import { ValidationError, NotFoundError } from '../errors/CustomErrors.js';
import {
    ProviderUnavailableError,
    ImageGenerationTimeoutError
} from '../errors/CircuitBreakerErrors.js';
import { circuitBreakerManager } from '../utils/CircuitBreaker.js';
import { TransactionService } from './TransactionService.js';
import { formatErrorResponse } from '../utils/ResponseFormatter.js';
import databaseClient from '../database/PrismaClient.js';
import AIEnhancementService from './ai/features/AIEnhancementService.js';

// Lazy singleton for AIEnhancementService
let aiEnhancementServiceInstance = null;
const getAIEnhancementService = () => {
    if (!aiEnhancementServiceInstance) {
        aiEnhancementServiceInstance = new AIEnhancementService();
    }

    return aiEnhancementServiceInstance;
};

import SimplifiedCreditService from './credit/SimplifiedCreditService.js';
import { CreditManagementService } from './credit/CreditManagementService.js';
import { ImageManagementService } from './ImageManagementService.js';
import {
    applyMultiplierSafely,
    shufflePrompt,
    mashupPrompt,
    processCustomVariables
} from './generate/PromptProcessor.js';

/**
 * Centralized database-to-frontend field mapping
 * DATABASE SCHEMA:
 * - image.provider: The actual model provider (e.g., 'flux-pro', 'flux-dev')
 * - image.model: Legacy field, contains provider name for backward compatibility
 *
 * FRONTEND EXPECTED FORMAT:
 * - provider: The model provider name
 * - model: The model provider name (duplicate for backward compatibility)
 *
 * @param {Object} dbImage - Raw image object from database
 * @returns {Object} Mapped fields for frontend consumption
 */
const mapImageFields = dbImage => ({
    provider: dbImage.provider || dbImage.model || 'unknown',
    model: dbImage.provider || dbImage.model || 'unknown'
});

/**
 * Normalize a single image object for frontend consumption
 * @param {Object} image - Raw image from database
 * @param {Map} userMap - Map of userId to username (optional)
 * @returns {Object} Normalized image object
 */
const normalizeImage = (image, userMap = null) => {
    const mappedFields = mapImageFields(image);
    const username = userMap
        ? userMap.get(image.userId) || (image.userId ? 'User' : 'Anonymous')
        : null;

    const normalized = {
        id: image.id,
        userId: image.userId,
        prompt: image.prompt,
        original: image.original,
        imageUrl: image.imageUrl,
        ...mappedFields,
        guidance: image.guidance,
        rating: image.rating,
        isPublic: image.isPublic,
        createdAt: image.createdAt,
        updatedAt: image.updatedAt
    };

    // Add optional fields if they exist
    if (image.tags) {
        normalized.tags = image.tags;
    }
    if (image.taggedAt) {
        normalized.taggedAt = image.taggedAt;
    }
    if (image.taggingMetadata) {
        normalized.taggingMetadata = image.taggingMetadata;
    }
    if (username !== null) {
        normalized.username = username;
    }

    return normalized;
};

// Extract config for shorter access
const { CIRCUIT_BREAKERS, RATE_LIMITING, PAGINATION } = {
    CIRCUIT_BREAKERS: {
        AI_SERVICE_THRESHOLD: 2,
        AI_SERVICE_TIMEOUT_MS: 30000, // 30 seconds
        IMAGE_GENERATION_THRESHOLD: 3,
        IMAGE_GENERATION_TIMEOUT_MS: 120000, // 2 minutes
        DATABASE_THRESHOLD: 2,
        DATABASE_TIMEOUT_MS: 10000, // 10 seconds
        FILE_SYSTEM_THRESHOLD: 1,
        FILE_SYSTEM_TIMEOUT_MS: 15000 // 15 seconds
    },
    RATE_LIMITING: {
        WINDOW_MS: 60000, // 1 minute
        MAX_REQUESTS: 10,
        CLEANUP_THRESHOLD: 100 // Cleanup every N requests
    },
    PAGINATION: {
        DEFAULT_LIMIT: 8,
        PROFILE_LIMIT: 20,
        USER_IMAGES_LIMIT: 50,
        DEFAULT_PAGE: 0
    }
};

export class EnhancedImageService {
    // Configuration constants
    static CONFIG = {
        CIRCUIT_BREAKERS,
        RATE_LIMITING,
        PAGINATION
    };

    /**
     * Constructor with Dependency Injection
     * @param {Object} dependencies - Injected dependencies
     * @param {Object} dependencies.imageRepository - Image repository instance (required)
     * @param {Object} dependencies.aiService - AI service instance (required)
     * @param {Object} dependencies.prismaClient - Prisma client instance (optional)
     * @param {Object} dependencies.transactionService - Transaction service instance (optional)
     * @param {Object} dependencies.creditService - Credit management service instance (optional)
     * @param {Object} dependencies.imageManagementService - Image management service instance (optional)
     * @param {Object} dependencies.circuitBreakerManager - Circuit breaker manager instance (optional)
     * @param {Object} dependencies.config - Configuration overrides (optional)
     */
    constructor(...args) {
        // Support both old and new constructor signatures for backward compatibility
        let dependencies;

        if (args.length === 2 && !args[0]?.imageRepository) {
            // Old signature: constructor(imageRepository, aiService)
            // Check if first arg looks like a repository (not a dependencies object)
            console.warn('⚠️ DEPRECATED: EnhancedImageService constructor with positional args. Use dependency object instead.');
            dependencies = {
                imageRepository: args[0],
                aiService: args[1]
            };
        } else if (args.length === 1 && typeof args[0] === 'object') {
            // New signature: constructor({ ...dependencies })
            [dependencies] = args;
        } else if (args.length === 0) {
            // No arguments provided
            dependencies = {};
        } else {
            // Unclear pattern, default to object
            [dependencies = {}] = args;
        }

        // Validate required dependencies
        if (!dependencies.imageRepository) {
            throw new Error('EnhancedImageService requires imageRepository');
        }
        if (!dependencies.aiService) {
            throw new Error('EnhancedImageService requires aiService');
        }

        // Assign required dependencies
        this.imageRepository = dependencies.imageRepository;
        this.aiService = dependencies.aiService;

        // Assign optional dependencies with fallbacks
        this.prisma = dependencies.prismaClient || databaseClient.getClient();
        this.transactionService = dependencies.transactionService || new TransactionService();
        this.creditService = dependencies.creditService || new CreditManagementService();
        this.imageService = dependencies.imageManagementService || new ImageManagementService();

        // Optional circuit breaker manager
        this.circuitBreaker = dependencies.circuitBreakerManager || circuitBreakerManager;

        // Merge configuration with defaults
        const config = { ...EnhancedImageService.CONFIG, ...dependencies.config };

        // Circuit breaker configurations
        this.breakerConfigs = {
            aiService: {
                failureThreshold: config.CIRCUIT_BREAKERS.AI_SERVICE_THRESHOLD,
                timeout: config.CIRCUIT_BREAKERS.AI_SERVICE_TIMEOUT_MS
            },
            imageGeneration: {
                failureThreshold: config.CIRCUIT_BREAKERS.IMAGE_GENERATION_THRESHOLD,
                timeout: config.CIRCUIT_BREAKERS.IMAGE_GENERATION_TIMEOUT_MS
            },
            database: {
                failureThreshold: config.CIRCUIT_BREAKERS.DATABASE_THRESHOLD,
                timeout: config.CIRCUIT_BREAKERS.DATABASE_TIMEOUT_MS
            },
            fileSystem: {
                failureThreshold: config.CIRCUIT_BREAKERS.FILE_SYSTEM_THRESHOLD,
                timeout: config.CIRCUIT_BREAKERS.FILE_SYSTEM_TIMEOUT_MS
            }
        };
    }

    async generateImage(prompt, providers, guidance, userId, options = {}) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        let creditsDeducted = false;
        let creditCost = 0;

        try {
            // Check and deduct credits BEFORE generation starts
            const creditResult = await this.validateAndDeductCredits(userId, providers, prompt, requestId);

            if (!creditResult.success) {
                // Create proper HTTP error with 402 status for insufficient credits
                const error = new Error(creditResult.error);

                error.status = 402;
                error.statusCode = 402;
                error.data = {
                    required: creditResult.cost,
                    current: await SimplifiedCreditService.getBalance(userId),
                    shortfall: creditResult.cost - (await SimplifiedCreditService.getBalance(userId))
                };
                throw error;
            }

            // Track that credits were deducted
            creditsDeducted = true;
            creditCost = creditResult.cost;

            const result = await this.executeImageGeneration(prompt, providers, guidance, userId, options, requestId);

            // Check if generation was actually successful
            if (!result.success || !result.id || !result.imageUrl) {
                // Generation failed - throw error to trigger refund in catch block
                const error = new Error(result.error || 'Image generation failed');

                error.generationResult = result;
                throw error;
            }

            // Log transaction for successful generation
            await this.logTransactionIfNeeded(userId, providers[0]);

            return result;

        } catch (error) {
            const duration = Date.now() - startTime;

            console.error(`❌ Image generation failed [${requestId}] after ${duration}ms:`, {
                error: error.message,
                type: error.name,
                userId: userId || null
            });

            // Refund credits only if they were deducted and haven't been refunded yet
            if (creditsDeducted && creditCost > 0) {
                try {
                    await this.refundCreditsForGeneration(userId, creditCost, requestId);
                    creditsDeducted = false; // Mark as refunded
                } catch (refundError) {
                    console.error(`❌ Failed to refund credits [${requestId}]:`, refundError);
                    // Don't throw - we still want to return the error response
                }
            }

            // Note: Additional cleanup (e.g., removing partial files) can be added here if needed

            return formatErrorResponse(error, requestId, Date.now() - startTime);
        }
    }

    async executeImageGeneration(prompt, providers, guidance, userId, options, requestId) {
        // Step 1: Validate inputs with circuit breaker
        await this.validateInputs(prompt, providers, guidance, userId);

        // Step 2: Process prompt with circuit breaker
        const processedData = await this.processPromptWithBreaker(prompt, options);

        // Step 3: Ensure prompt is saved and get promptId
        let savedPromptId = processedData.promptId;

        if (!savedPromptId) {
            // Save prompt synchronously to get promptId for image generation
            try {
                const generate = await import('../generate.js');
                const req = { user: { id: userId } };

                const savedPrompt = await generate.default.buildPrompt(
                    processedData.prompt,
                    {
                        multiplier: '',
                        mixup: false,
                        mashup: false,
                        customVariables: '',
                        promptHelpers: { photogenic: false, artistic: false, avatar: false }
                    },
                    req
                );

                savedPromptId = savedPrompt?.promptId || null;

                // Prompt saved synchronously
            } catch (error) {
                console.error('❌ Synchronous prompt save failed:', error);
                // Continue with null promptId - this is non-critical
            }
        }

        // Step 4: Generate image with circuit breaker
        const imageData = await this.generateImageWithBreaker(
            processedData.prompt,
            processedData.original,
            savedPromptId,
            providers,
            guidance,
            userId,
            options
        );


        return await this.extractImageResult(imageData, processedData.prompt, processedData.original, guidance, userId);
    }

    // eslint-disable-next-line max-lines-per-function, max-statements
    async validateInputs(prompt, providers, guidance, userId) {
        // Basic input validation
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            throw new ValidationError('Prompt is required and must be a non-empty string');
        }

        if (!providers || !Array.isArray(providers) || providers.length === 0) {
            throw new ValidationError('At least one provider must be specified');
        }

        if (typeof guidance !== 'number' || guidance < 0 || guidance > 20) {
            throw new ValidationError('Guidance must be a number between 0 and 20');
        }

        // Validate each provider exists and is available
        for (const provider of providers) {
            try {
                const modelConfig = await this.getModelConfig(provider);

                if (!modelConfig) {
                    throw new ValidationError(`Provider '${provider}' is not available or inactive`);
                }
            } catch (error) {
                if (error instanceof ValidationError) {
                    throw error;
                }
                throw new ValidationError(`Provider '${provider}' validation failed: ${error.message}`);
            }
        }


        return true;
    }

    /**
     * Get model configuration for a provider
     * @param {string} provider - Provider name
     * @returns {Promise<Object>} Model configuration
     */
    async getModelConfig(provider) {
        try {
            const modelInterface = await import('./ModelInterface.js');

            return await modelInterface.default.getImageGeneratorConfig(provider);
        } catch (error) {
            console.error(`❌ Failed to get model config for ${provider}:`, error);
            throw error;
        }
    }

    async processPromptWithBreaker(prompt, options) {
        return await circuitBreakerManager.execute('aiService', async () => {
            const {
                multiplier = false,
                mixup = false,
                mashup = false,
                customVariables = '',
                autoEnhance = false,
                promptHelpers = {}
            } = options;

            // Check if prompt needs processing
            const hasVariables = (/\$\{[^}]+\}/).test(prompt);
            const hasPromptHelpers = Object.values(promptHelpers).some(Boolean);
            const needsProcessing = hasVariables || multiplier || mixup || mashup || customVariables || hasPromptHelpers;

            let processedPrompt = prompt;
            let promptId = null;

            // Step 1: Process prompt with basic logic (custom variables, word types, stock text)
            // Note: multiplier, mixup, mashup are now handled after AI enhancement
            if (needsProcessing && this.aiService) {
                try {
                    const result = await this.aiService.processPrompt(
                        prompt,
                        false, // multiplier - now handled after AI enhancement
                        false, // mixup - now handled after AI enhancement
                        false, // mashup - now handled after AI enhancement
                        customVariables,
                        promptHelpers
                    );

                    ({ prompt: processedPrompt, promptId } = result);
                } catch (error) {
                    console.error('❌ Prompt processing failed, using original prompt:', {
                        error: error.message,
                        originalPrompt: prompt.substring(0, 100),
                        hasVariables,
                        hasPromptHelpers
                    });
                    processedPrompt = prompt;
                }
            }

            // Step 2: Apply AI enhancement if requested
            if (autoEnhance && processedPrompt) {
                try {
                    const enhancedPrompt = await getAIEnhancementService().enhancePrompt(processedPrompt);


                    processedPrompt = enhancedPrompt;
                } catch (error) {
                    console.error('❌ AI enhancement failed, using processed prompt:', {
                        error: error.message,
                        processedPrompt: processedPrompt.substring(0, 100)
                    });
                    // Keep the processed prompt if enhancement fails
                }
            }

            // Step 3: Apply prompt modifications after AI enhancement
            // Multiplier → Mixup → Mashup (in that order)
            if (multiplier || mixup || mashup) {
                try {

                    // Process custom variables for multiplier
                    const customDict = processCustomVariables(customVariables, {});

                    // Apply multiplier first (inserts between every word)
                    if (multiplier) {
                        processedPrompt = await applyMultiplierSafely(processedPrompt, multiplier, customDict);
                    }

                    // Apply mixup (shuffle comma-separated parts)
                    if (mixup) {
                        const beforeMixup = processedPrompt;

                        processedPrompt = shufflePrompt(processedPrompt);
                    }

                    // Apply mashup (shuffle space-separated words)
                    if (mashup) {
                        processedPrompt = mashupPrompt(processedPrompt);
                    }

                } catch (error) {
                    console.error('❌ Prompt modifications failed, using unmodified prompt:', {
                        error: error.message,
                        multiplier,
                        mixup,
                        mashup,
                        prompt: processedPrompt.substring(0, 100)
                    });
                    // Keep the prompt without modifications if they fail
                }
            }

            return {
                prompt: processedPrompt,
                original: prompt,
                promptId
            };
        }, this.breakerConfigs.aiService);
    }

    // eslint-disable-next-line max-params
    async generateImageWithBreaker(prompt, original, promptId, providers, guidance, userId, options) {
        return await circuitBreakerManager.execute('imageGeneration', async () => {
            // Validate userId before proceeding
            const validUserId = userId && userId !== 'undefined' ? userId : null;

            // Import generate module dynamically
            const generate = await import('../generate.js');

            // Set timeout for image generation
            const timeout = EnhancedImageService.CONFIG.CIRCUIT_BREAKERS.IMAGE_GENERATION_TIMEOUT_MS;
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new ImageGenerationTimeoutError(providers[0], timeout));
                }, timeout);
            });

            // Create proper req object with validated userId
            const req = {
                user: { id: validUserId }
            };


            const generationPromise = generate.default.generate({
                prompt,
                original,
                promptId,
                providers,
                guidance,
                req,
                autoPublic: options?.autoPublic
            });

            // Race between generation and timeout
            const result = await Promise.race([generationPromise, timeoutPromise]);

            // Validate result - if there's an error, don't retry, just fail fast
            if (!result || result.error) {
                // Check if it's a resource failure (should not retry)
                if (result?.error && this.isResourceFailure(result.error)) {
                    throw new Error(`Resource failure: ${result.error}`);
                }

                // For other errors, throw provider unavailable
                throw new ProviderUnavailableError(providers[0], result?.error || 'Unknown error');
            }

            return result;
        }, this.breakerConfigs.imageGeneration);
    }

    isResourceFailure(error) {
        // Resource failures that should NOT be retried
        const resourceFailurePatterns = [
            'content_policy_violation',
            'invalid_prompt',
            'billing_quota_exceeded',
            'model_not_found',
            'invalid_parameters',
            'file_system_error',
            'database_error',
            'authentication_failed'
        ];

        const errorString = error.toString().toLowerCase();

        return resourceFailurePatterns.some(pattern => errorString.includes(pattern));
    }

    async extractImageResult(imageData, prompt, original, guidance, userId) {
        const firstResult = imageData.results && imageData.results.length > 0 ? imageData.results[0] : null;
        const actualImageId = firstResult?.imageId;
        const actualProvider = firstResult?.provider;
        const actualImageUrl = firstResult?.imageUrl;

        // Check if the generation was actually successful
        const generationSuccessful = firstResult && firstResult.success && actualImageUrl;

        // Use username from processed result if available, otherwise fetch it
        let username = 'Anonymous';

        if (firstResult?.username) {
            // Username already included from GenerationResultProcessor
            username = firstResult.username;
        } else if (userId) {
            // Fallback: fetch username from database
            try {
                const user = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { username: true }
                });

                username = user?.username || 'User';
            } catch (error) {
                console.error('❌ Failed to fetch username for userId:', userId, error);
                username = 'Unknown User';
            }
        }

        const response = {
            id: actualImageId,
            imageUrl: actualImageUrl,
            prompt,
            original,
            provider: actualProvider,
            guidance,
            rating: 0,
            userId,
            username, // ✅ Include username in response
            createdAt: new Date().toISOString(),
            success: generationSuccessful,
            results: imageData.results
        };


        return response;
    }

    async logTransactionIfNeeded(userId, provider) {
        if (userId && userId !== null) {
            try {
                await this.transactionService.logTransaction(userId, provider, 1);
            } catch (transactionError) {
                console.error('❌ Failed to log transaction:', transactionError);
                // Don't fail the image generation for transaction logging errors
            }
        }
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    /**
     * Fire-and-forget prompt saving (non-blocking)
     * This method is synchronous and spawns async work without blocking the caller
     * @param {string} prompt - Prompt to save
     * @param {string} userId - User ID (can be null for anonymous)
     * @returns {void} - Returns immediately without waiting for save to complete
     */
    savePromptAsync(prompt, userId) {
        // Spawn async work without returning the promise (fire-and-forget)
        (async () => {
            try {
                const generate = await import('../generate.js');
                const req = { user: { id: userId } };

                await generate.default.buildPrompt(
                    prompt,
                    {
                        multiplier: '',
                        mixup: false,
                        mashup: false,
                        customVariables: '',
                        promptHelpers: { photogenic: false, artistic: false, avatar: false }
                    },
                    req
                );

                // Background prompt save completed
            } catch (error) {
                // Log error but don't throw - this is fire-and-forget
                console.error('❌ Background prompt save failed:', error);
            }
        })();
        // Return immediately without waiting
    }

    isRateLimited(userId) {
        // Simple in-memory rate limiting
        const key = userId || 'anonymous';
        const now = Date.now();
        const windowMs = EnhancedImageService.CONFIG.RATE_LIMITING.WINDOW_MS;
        const maxRequests = EnhancedImageService.CONFIG.RATE_LIMITING.MAX_REQUESTS;

        if (!this.rateLimitMap) {
            this.rateLimitMap = new Map();
        }

        const userRequests = this.rateLimitMap.get(key) || [];

        // Remove old requests outside the window
        const recentRequests = userRequests.filter(time => now - time < windowMs);

        if (recentRequests.length >= maxRequests) {
            return true;
        }

        // Add current request
        recentRequests.push(now);

        // Clean up: Remove stale entries to prevent memory leak
        if (recentRequests.length === 0) {
            this.rateLimitMap.delete(key);
        } else {
            this.rateLimitMap.set(key, recentRequests);
        }

        // Periodically clean up the entire map
        if (!this.rateLimitCleanupCounter) {
            this.rateLimitCleanupCounter = 0;
        }

        this.rateLimitCleanupCounter++;

        if (this.rateLimitCleanupCounter >= EnhancedImageService.CONFIG.RATE_LIMITING.CLEANUP_THRESHOLD) {
            this.cleanupRateLimitMap(now, windowMs);
            this.rateLimitCleanupCounter = 0;
        }

        return false;
    }

    cleanupRateLimitMap(now, windowMs) {
        // Remove all stale entries from the map
        for (const [key, requests] of this.rateLimitMap.entries()) {
            const recentRequests = requests.filter(time => now - time < windowMs);

            if (recentRequests.length === 0) {
                this.rateLimitMap.delete(key);
            } else if (recentRequests.length !== requests.length) {
                this.rateLimitMap.set(key, recentRequests);
            }
        }
    }

    async updateRating(imageId, rating, userId) {
        if (!imageId || !rating) {
            throw new ValidationError('Image ID and rating are required');
        }

        // First, verify the image exists and check permissions
        const image = await this.imageRepository.findById(imageId);

        if (!image) {
            throw new Error('Image not found');
        }

        // If no userId (anonymous user), only allow rating public images
        if (!userId && !image.isPublic) {
            throw new ValidationError('Authentication required to rate private images');
        } else if (userId && !image.isPublic && image.userId !== userId) {
            // For authenticated users, allow rating public images OR their own private images
            throw new ValidationError('You can only rate your own private images');
        }

        const result = await this.imageRepository.updateRating(imageId, rating);

        if (result === 0) {
            throw new NotFoundError('Image');
        }

        return { result, id: imageId, rating };
    }

    async getImageById(imageId, userId) {
        // Get the image from repository
        const image = await this.imageRepository.findById(imageId);

        if (!image) {
            throw new Error('Image not found');
        }

        // Check if user can access this image
        // - User can access their own images
        // - Anyone can access public images
        const canAccess = image.userId === userId || image.isPublic;

        if (!canAccess) {
            throw new Error('Access denied');
        }

        // Get username for this image
        let username = null;

        if (image.userId) {
            const user = await this.prisma.user.findUnique({
                where: { id: image.userId },
                select: { id: true, username: true }
            });

            if (user) {
                username = user.username || 'User';
            } else {
                username = 'Unknown User';
            }
        } else {
            username = 'Anonymous';
        }

        // Normalize image data using shared helper and add username
        return {
            ...normalizeImage(image),
            username
        };
    }

    async updatePublicStatus(imageId, isPublic, userId) {
        if (!imageId || typeof isPublic !== 'boolean') {
            throw new ValidationError('Image ID and isPublic boolean are required');
        }

        if (!userId) {
            throw new ValidationError('User ID is required to update public status');
        }

        // First, verify the user owns the image and get current status
        const image = await this.imageRepository.findById(imageId);

        if (!image) {
            throw new NotFoundError('Image');
        }

        if (image.userId !== userId) {
            throw new ValidationError('You can only update the public status of your own images');
        }

        // Skip database update if status is already the same
        if (image.isPublic === isPublic) {

            return { result: image, id: imageId, isPublic, skipped: true };
        }

        const result = await this.imageRepository.updatePublicStatus(imageId, isPublic);

        if (!result) {
            throw new NotFoundError('Image');
        }

        return { result, id: imageId, isPublic };
    }

    async deleteImage(imageId, userId) {
        if (!imageId) {
            throw new ValidationError('Image ID is required');
        }

        if (!userId) {
            throw new ValidationError('User ID is required to delete image');
        }

        // First, verify the user owns the image
        const image = await this.imageRepository.findById(imageId);

        if (!image) {
            throw new Error('Image not found');
        }

        if (image.userId !== userId) {
            throw new ValidationError('You can only delete your own images');
        }

        await this.imageRepository.deleteById(imageId);

        return { status: 'ok' };
    }

    async getImages(userId, limit = PAGINATION.DEFAULT_LIMIT, page = PAGINATION.DEFAULT_PAGE) {
        // Use optimized method for anonymous users
        const result = userId
            ? await this.imageRepository.findByUserId(userId, limit, page)
            : await this.imageRepository.findPublicImages(limit, page);

        // Get unique user IDs and fetch usernames
        const userIds = [...new Set(result.images.map(img => img.userId))];
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true }
        });
        const userMap = new Map(users.map(user => [user.id, user.username || 'User']));

        // Debug user lookup

        // Normalize image data using shared helper
        const normalizedImages = result.images.map(image => normalizeImage(image, userMap));

        return {
            images: normalizedImages,
            hasMore: result.hasMore,
            totalCount: result.totalCount
        };
    }

    /**
     * Get user's images with cost information for billing page
     * @param {string} userId - User ID
     * @param {number} limit - Number of images to fetch
     * @param {number} page - Page number (0-based)
     * @param {Array} tags - Array of tags to filter by
     * @returns {Promise<Object>} User images with cost information
     */
    /**
     * Validate user ID input
     */
    validateUserInput(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }
    }

    /**
     * Log user images fetch results
     */
    logUserImagesResults(result) {
        // Implementation can be added later if needed
    }

    /**
     * Assert that all images are public (does not filter, only logs)
     * Use this to detect database integrity issues, not to enforce security
     * @param {Array} images - Array of image objects
     * @param {string} context - Context for logging (e.g., 'profile', 'feed')
     */
    assertPublicImages(images, context = 'unknown') {
        if (!images || !Array.isArray(images)) {
            return;
        }

        const privateImages = images.filter(img => img.isPublic !== true);

        if (privateImages.length > 0) {
            console.error(`🚨 DATABASE INTEGRITY ERROR: Non-public images in ${context}!`, {
                count: privateImages.length,
                imageIds: privateImages.map(img => img.id),
                context
            });
        }
    }

    /**
     * Create pagination metadata
     * @param {number} page - Current page
     * @param {number} limit - Items per page
     * @param {number} totalCount - Total items available
     * @returns {Object} Pagination metadata
     */
    createPaginationMetadata(page, limit, totalCount) {
        const offset = (page - 1) * limit;
        const hasMore = (offset + limit) < totalCount;

        return {
            page,
            limit,
            totalCount,
            hasMore,
            totalPages: Math.ceil(totalCount / limit)
        };
    }

    /**
     * Get active models with cost information
     */
    async getActiveModels() {
        return await this.prisma.model.findMany({
            where: { isActive: true },
            select: {
                provider: true,
                name: true,
                costPerImage: true,
                displayName: true
            }
        });
    }

    /**
     * Create model cost mapping
     */
    createModelCostMap(models) {
        const modelCostMap = new Map();

        models.forEach(model => {
            const key = `${model.provider}-${model.name}`;

            modelCostMap.set(key, {
                costPerImage: model.costPerImage,
                displayName: model.displayName
            });
        });

        return modelCostMap;
    }

    /**
     * Normalize image data with cost information for billing pages
     */
    normalizeImagesWithCosts(images, modelCostMap) {
        return images.map(image => {
            const normalized = normalizeImage(image);
            const modelKey = `${normalized.provider}-${normalized.model}`;
            const modelInfo = modelCostMap.get(modelKey);

            return {
                ...normalized,
                url: normalized.imageUrl, // Alias for backward compatibility
                modelDisplayName: modelInfo?.displayName || normalized.model,
                costPerImage: modelInfo?.costPerImage || 1.0
            };
        });
    }

    /**
     * Get user's own images (both public and private)
     * @param {string} userId - User ID
     * @param {number} limit - Number of images per page
     * @param {number} page - Page number (0-based)
     * @param {Array} tags - Optional tags filter
     * @returns {Object} Response with images and pagination
     */
    async getUserImages(userId, limit = PAGINATION.USER_IMAGES_LIMIT, page = PAGINATION.DEFAULT_PAGE, tags = []) {
        this.validateUserInput(userId);

        const result = await this.imageRepository.findUserImages(userId, limit, page, tags);

        this.logUserImagesResults(result);

        const models = await this.getActiveModels();
        const modelCostMap = this.createModelCostMap(models);
        const normalizedImages = this.normalizeImagesWithCosts(result.images, modelCostMap);

        return {
            images: normalizedImages,
            totalCount: result.totalCount,
            hasMore: result.hasMore
        };
    }

    /**
     * Get user's public images for profile display
     * @param {string} userId - User ID
     * @param {number} limit - Number of images per page
     * @param {number} page - Page number (1-based)
     * @returns {Object} Response with images and pagination
     */
    async getUserPublicImages(userId, limit = PAGINATION.PROFILE_LIMIT, page = 1) {
        this.validateUserInput(userId);

        const offset = (page - 1) * limit;

        try {
            // Get user's public images - trust database constraints
            const images = await this.prisma.image.findMany({
                where: {
                    userId,
                    isPublic: true
                },
                select: {
                    id: true,
                    prompt: true,
                    original: true,
                    imageUrl: true,
                    provider: true,
                    rating: true,
                    isPublic: true,
                    userId: true,
                    createdAt: true,
                    updatedAt: true
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip: offset,
                take: limit
            });

            // Single assertion: Log if database returns unexpected data
            const nonPublicImages = images.filter(img => img.isPublic !== true);

            if (nonPublicImages.length > 0) {
                console.error('🚨 DATABASE INTEGRITY ERROR: Query with isPublic=true returned non-public images!', {
                    userId,
                    count: nonPublicImages.length,
                    imageIds: nonPublicImages.map(img => img.id)
                });
            }

            // Get total count for pagination
            const totalCount = await this.prisma.image.count({
                where: {
                    userId,
                    isPublic: true
                }
            });

            return {
                success: true,
                images,
                pagination: this.createPaginationMetadata(page, limit, totalCount)
            };

        } catch (error) {
            console.error('❌ ENHANCED-IMAGE-SERVICE: Error getting user public images:', error);

            return {
                success: false,
                error: 'Failed to get user public images',
                images: [],
                pagination: {}
            };
        }
    }

    /**
     * Get public feed images from all users
     * @param {string} userId - Current user ID (for context)
     * @param {number} limit - Number of images per page
     * @param {number} page - Page number (0-based)
     * @param {Array} tags - Optional tags filter
     * @returns {Object} Response with images and pagination
     */
    async getFeed(userId, limit = PAGINATION.DEFAULT_LIMIT, page = PAGINATION.DEFAULT_PAGE, tags = []) {
        // Site feed should always show only public images from all users
        // regardless of authentication status
        const result = await this.imageRepository.findPublicImages(limit, page, tags);

        // Assert: Log if repository returns non-public images (database integrity issue)
        this.assertPublicImages(result.images, 'feed');

        // Get unique user IDs and fetch usernames
        const userIds = [...new Set(result.images.map(img => img.userId))];
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true }
        });
        const userMap = new Map(users.map(user => [user.id, user.username || 'User']));

        // Normalize image data using shared helper
        const normalizedImages = result.images.map(image => normalizeImage(image, userMap));

        return {
            images: normalizedImages,
            hasMore: result.hasMore,
            totalCount: result.totalCount
        };
    }

    async getUserOwnImages(userId, limit = PAGINATION.DEFAULT_LIMIT, page = PAGINATION.DEFAULT_PAGE, tags = []) {
        if (!userId) {
            throw new ValidationError('User ID is required for getting user own images');
        }


        // Get all images belonging to the user (both public and private for "private" filter)
        const result = await this.imageRepository.findUserImages(userId, limit, page, tags);

        // Assert: Log if repository returns other users' images (database integrity issue)
        const otherUserImages = result.images.filter(img => img.userId !== userId);

        if (otherUserImages.length > 0) {
            console.error('🚨 DATABASE INTEGRITY ERROR: Repository returned images from other users!', {
                requestedUserId: userId,
                count: otherUserImages.length,
                imageIds: otherUserImages.map(img => img.id)
            });
        }


        // Get unique user IDs and fetch usernames
        const userIds = [...new Set(result.images.map(img => img.userId))];

        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true }
        });

        const userMap = new Map(users.map(user => [user.id, user.username || 'User']));


        // Normalize image data using shared helper
        const normalizedImages = result.images.map(image => normalizeImage(image, userMap));

        return {
            images: normalizedImages,
            totalCount: result.totalCount,
            hasMore: (page + 1) * limit < result.totalCount
        };
    }

    async getImageCount(userId) {
        // Allow anonymous access - return total count for public feed
        const count = await this.imageRepository.countByUserId(userId);

        return { count };
    }

    /**
     * Get model cost from database
     * @param {string} providerName - Provider/model name
     * @returns {Promise<number>} Cost in credits
     */
    async getModelCost(providerName) {
        return await this.creditService.getModelCost(providerName);
    }

    /**
     * Refund credits if generation fails after deduction
     * @param {string} userId - User ID
     * @param {Array} providers - Array of providers used
     * @param {Error} error - The error that occurred
     * @param {string} requestId - Request ID for tracking
     */
    async refundCreditsOnFailure(userId, providers, error, requestId) {
        return await this.creditService.refundCreditsOnFailure(userId, providers, error, requestId);
    }

    /**
     * Validate and deduct credits before generation
     * @param {string} userId - User ID
     * @param {Array} providers - Array of providers used
     * @param {string} prompt - Generation prompt
     * @param {string} requestId - Request ID for tracking
     */
    async validateAndDeductCredits(userId, providers, prompt, requestId) {
        return await this.creditService.validateAndDeductCredits(userId, providers, prompt, requestId);
    }

    /**
     * Refund credits for failed generation
     * @param {string} userId - User ID
     * @param {number} amount - Amount to refund
     * @param {string} requestId - Request ID for tracking
     */
    async refundCreditsForGeneration(userId, amount, requestId) {
        return await this.creditService.refundCreditsForGeneration(userId, amount, requestId);
    }

    // Health check method
    async getHealth() {
        const health = {
            service: 'EnhancedImageService',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            circuitBreakers: circuitBreakerManager.getHealth(),
            database: 'connected',
            aiService: this.aiService ? 'available' : 'unavailable'
        };

        // Check database connection
        try {
            await this.prisma.$queryRaw`SELECT 1`;
        } catch (error) {
            console.error('❌ Health check database connection failed:', error.message);
            health.database = 'disconnected';
            health.status = 'degraded';
        }

        return health;
    }
}
