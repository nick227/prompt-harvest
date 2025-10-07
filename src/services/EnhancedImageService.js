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

export class EnhancedImageService {
    constructor(imageRepository, aiService) {
        this.imageRepository = imageRepository;
        this.aiService = aiService;
        this.prisma = databaseClient.getClient();
        this.transactionService = new TransactionService();
        this.creditService = new CreditManagementService();
        this.imageService = new ImageManagementService();

        // Circuit breaker configurations - more conservative
        this.breakerConfigs = {
            aiService: { failureThreshold: 2, timeout: 30000 }, // Reduced from 3 to 2
            imageGeneration: { failureThreshold: 3, timeout: 120000 }, // Reduced from 5 to 3
            database: { failureThreshold: 2, timeout: 10000 }, // Reduced from 3 to 2
            fileSystem: { failureThreshold: 1, timeout: 15000 } // Reduced from 2 to 1
        };
    }

    async generateImage(prompt, providers, guidance, userId, options = {}) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

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

            const result = await this.executeImageGeneration(prompt, providers, guidance, userId, options, requestId);
            const duration = Date.now() - startTime;

            // Log transaction for successful generation
            if (result.success && result.id && result.imageUrl) {
                await this.logTransactionIfNeeded(userId, providers[0]);
            } else {
                // Refund credits if generation failed
                await this.refundCreditsForGeneration(userId, creditResult.cost, requestId);
            }

            return result;

        } catch (error) {
            const duration = Date.now() - startTime;

            console.error(`❌ Image generation failed [${requestId}] after ${duration}ms:`, {
                error: error.message,
                type: error.name,
                userId: userId || null
            });

            // If credits were already deducted, refund them
            await this.refundCreditsOnFailure(userId, providers, error, requestId);

            await this.cleanupOnFailure(error, requestId);

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
                    // Prompt processing failed, using original
                    processedPrompt = prompt;
                }
            }

            // Step 2: Apply AI enhancement if requested
            if (autoEnhance && processedPrompt) {
                try {
                    const enhancedPrompt = await getAIEnhancementService().enhancePrompt(processedPrompt);


                    processedPrompt = enhancedPrompt;
                } catch (error) {
                    // AI enhancement failed, using processed prompt
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
                    // Prompt modifications failed, using unmodified prompt
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
            const timeout = 120000; // 2 minutes
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


    async cleanupOnFailure(error, requestId) {
        try {

            // Add cleanup logic here (e.g., remove partial files)
            // This will be implemented based on the specific failure type

        } catch (cleanupError) {
            console.error(`❌ Cleanup failed [${requestId}]:`, cleanupError.message);
        }
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
                    select: { username: true, email: true }
                });
                username = user?.username || (user?.email ? user.email : 'Unknown User');
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
     * @param {string} prompt - Prompt to save
     * @param {string} userId - User ID (can be null for anonymous)
     */
    async savePromptAsync(prompt, userId) {
        try {

            const generate = await import('../generate.js');
            const req = { user: { id: userId } };

            const savedPrompt = await generate.default.buildPrompt(
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
    }

    isRateLimited(userId) {
        // Simple in-memory rate limiting
        const key = userId || 'anonymous';
        const now = Date.now();
        const windowMs = 60000; // 1 minute
        const maxRequests = 10; // 10 requests per minute

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
        this.rateLimitMap.set(key, recentRequests);

        return false;
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
                select: { id: true, username: true, email: true }
            });

            if (user) {
                username = user.username || user.email || 'Unknown User';
            } else {
                username = image.userId ? 'Unknown User' : 'Anonymous';
            }
        } else {
            username = 'Anonymous';
        }

        // Normalize image data
        return {
            id: image.id,
            userId: image.userId,
            username,
            prompt: image.prompt,
            original: image.original,
            imageUrl: image.imageUrl,
            provider: image.model || 'unknown', // Map database model column to frontend provider field (future use)
            guidance: image.guidance,
            model: image.provider || 'unknown', // Map database provider column to frontend model field
            rating: image.rating,
            isPublic: image.isPublic,
            createdAt: image.createdAt,
            updatedAt: image.updatedAt
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

    async getImages(userId, limit = 8, page = 0) {
        // Use optimized method for anonymous users
        const result = userId
            ? await this.imageRepository.findByUserId(userId, limit, page)
            : await this.imageRepository.findPublicImages(limit, page);

        // Get unique user IDs and fetch usernames
        const userIds = [...new Set(result.images.map(img => img.userId))];
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true, email: true }
        });
        const userMap = new Map(users.map(user => [user.id, user.username || (user.email ? user.email : 'Unknown User')]));

        // Debug user lookup

        // Normalize image data
        // Map database fields: provider column -> model field, model column -> provider field (future use)
        const normalizedImages = result.images.map(image => ({
            id: image.id,
            userId: image.userId, // ✅ Added userId for client-side filtering
            username: userMap.get(image.userId) || (image.userId ? 'Unknown User' : 'Anonymous'), // ✅ Added username from user map (fallback to email)
            prompt: image.prompt,
            original: image.original,
            imageUrl: image.imageUrl,
            provider: image.model || 'unknown', // Map database model column to frontend provider field (future use)
            guidance: image.guidance,
            model: image.provider || 'unknown', // Map database provider column to frontend model field
            rating: image.rating,
            isPublic: image.isPublic,
            tags: image.tags || [],
            taggedAt: image.taggedAt,
            taggingMetadata: image.taggingMetadata,
            createdAt: image.createdAt,
            updatedAt: image.updatedAt
        }));

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
     * SECURITY: Validate that images are public-only
     * @param {Array} images - Array of image objects
     * @param {string} context - Context for logging (e.g., 'profile', 'feed')
     */
    validatePublicImagesOnly(images, context = 'unknown') {
        if (!images || !Array.isArray(images)) {
            return images;
        }

        const privateImages = images.filter(img => img.isPublic !== true);

        if (privateImages.length > 0) {
            console.error(`🚨 PRIVACY VIOLATION: Non-public images found in ${context}!`, {
                privateImageIds: privateImages.map(img => img.id),
                totalImages: images.length,
                context
            });

            // Remove non-public images as safety measure
            return images.filter(img => img.isPublic === true);
        }

        console.log(`✅ SECURITY: All images are public in ${context}`);

        return images;
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
     * Normalize image data with cost information
     */
    normalizeImagesWithCosts(images, modelCostMap) {
        return images.map(image => {
            const modelKey = `${image.provider}-${image.model}`;
            const modelInfo = modelCostMap.get(modelKey);

            return {
                id: image.id,
                userId: image.userId,
                prompt: image.prompt,
                url: image.imageUrl,
                provider: image.provider,
                model: image.provider || 'unknown', // Map database provider column to frontend model field
                modelDisplayName: modelInfo?.displayName || image.model,
                costPerImage: modelInfo?.costPerImage || 1.0,
                rating: image.rating,
                isPublic: image.isPublic,
                tags: image.tags || [],
                createdAt: image.createdAt,
                updatedAt: image.updatedAt
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
    async getUserImages(userId, limit = 50, page = 0, tags = []) {
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
    async getUserPublicImages(userId, limit = 20, page = 1) {
        this.validateUserInput(userId);

        const offset = (page - 1) * limit;

        try {
            console.log(`🔒 PROFILE SECURITY: Fetching public images for user ${userId}, page ${page}, limit ${limit}`);

            // SECURITY: Get user's public images ONLY - never private images
            const images = await this.prisma.image.findMany({
                where: {
                    userId,
                    isPublic: true  // CRITICAL: Only public images for profile pages
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

            // DEBUG: Log the actual isPublic values from database
            console.log(`🔍 DEBUG: Raw database results for user ${userId}:`, images.map(img => ({
                id: img.id,
                isPublic: img.isPublic,
                isPublicType: typeof img.isPublic,
                prompt: img.prompt?.substring(0, 30) + '...'
            })));

            // DEBUG: Check if any images are not explicitly public
            const nonPublicImages = images.filter(img => img.isPublic !== true);
            if (nonPublicImages.length > 0) {
                console.error('🚨 DEBUG: Found non-public images in database query results!', nonPublicImages.map(img => ({
                    id: img.id,
                    isPublic: img.isPublic,
                    isPublicType: typeof img.isPublic
                })));
            }

            // SECURITY: Validate all images are public - CRITICAL SAFETY CHECK
            const validatedImages = this.validatePublicImagesOnly(images, 'profile');

            // DOUBLE-CHECK: Ensure no private images slipped through
            if (validatedImages.some(img => img.isPublic !== true)) {
                console.error('🚨 CRITICAL SECURITY VIOLATION: Private images in validated results!');
                // Filter out any remaining private images as absolute safety measure
                const safeImages = validatedImages.filter(img => img.isPublic === true);

                console.log(`🔒 EMERGENCY FILTER: Removed ${validatedImages.length - safeImages.length} private images`);

                validatedImages.length = 0;
                validatedImages.push(...safeImages);
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
                images: validatedImages,
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
    async getFeed(userId, limit = 8, page = 0, tags = []) {
        // Site feed should always show only public images from all users
        // regardless of authentication status
        const result = await this.imageRepository.findPublicImages(limit, page, tags);

        // SECURITY: Validate all images are public
        result.images = this.validatePublicImagesOnly(result.images, 'feed');

        // Get unique user IDs and fetch usernames
        const userIds = [...new Set(result.images.map(img => img.userId))];
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true, email: true }
        });
        const userMap = new Map(users.map(user => [user.id, user.username || (user.email ? user.email : 'Unknown User')]));

        // Normalize image data
        const normalizedImages = result.images.map(image => ({
            id: image.id,
            userId: image.userId,
            username: userMap.get(image.userId) || 'Unknown',
            prompt: image.prompt,
            original: image.original,
            imageUrl: image.imageUrl,
            provider: image.provider,
            guidance: image.guidance,
            model: image.model,
            rating: image.rating,
            isPublic: image.isPublic,
            tags: image.tags || [],
            taggedAt: image.taggedAt,
            taggingMetadata: image.taggingMetadata,
            createdAt: image.createdAt,
            updatedAt: image.updatedAt
        }));

        return {
            images: normalizedImages,
            hasMore: result.hasMore,
            totalCount: result.totalCount
        };
    }

    async getUserOwnImages(userId, limit = 8, page = 0, tags = []) {
        if (!userId) {
            throw new ValidationError('User ID is required for getting user own images');
        }


        // Get all images belonging to the user (both public and private for "mine" filter)
        const result = await this.imageRepository.findUserImages(userId, limit, page, tags);

        // Double-check that all returned images belong to the user
        const otherUserImages = result.images.filter(img => img.userId !== userId);

        if (otherUserImages.length > 0) {
            console.error('🚨 PRIVACY VIOLATION: Other users images found in user feed!', otherUserImages);
            // Remove other users' images as a safety measure
            result.images = result.images.filter(img => img.userId === userId);
            result.totalCount = result.images.length;
        }


        // Get unique user IDs and fetch usernames
        const userIds = [...new Set(result.images.map(img => img.userId))];

        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true, email: true }
        });

        const userMap = new Map(users.map(user => [user.id, user.username || (user.email ? user.email : 'Unknown User')]));


        // Normalize image data
        const normalizedImages = result.images.map(image => ({
            id: image.id,
            userId: image.userId,
            username: userMap.get(image.userId) || 'Unknown', // ✅ Added username from user map
            prompt: image.prompt,
            original: image.original,
            imageUrl: image.imageUrl,
            provider: image.provider,
            guidance: image.guidance,
            model: image.model,
            rating: image.rating,
            isPublic: image.isPublic,
            tags: image.tags || [],
            taggedAt: image.taggedAt,
            taggingMetadata: image.taggingMetadata,
            createdAt: image.createdAt,
            updatedAt: image.updatedAt
        }));

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
            health.database = 'disconnected';
            health.status = 'degraded';
        }

        return health;
    }
}
