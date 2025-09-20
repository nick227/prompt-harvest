import { ValidationError, NotFoundError } from '../errors/CustomErrors.js';
import {
    ProviderUnavailableError,
    ImageGenerationTimeoutError
} from '../errors/CircuitBreakerErrors.js';
import { circuitBreakerManager } from '../utils/CircuitBreaker.js';
import { TransactionService } from './TransactionService.js';
import { formatErrorResponse } from '../utils/ResponseFormatter.js';
import databaseClient from '../database/PrismaClient.js';
import { aiEnhancementService } from './AIEnhancementService.js';
import SimplifiedCreditService from './credit/SimplifiedCreditService.js';

export class EnhancedImageService {
    constructor(imageRepository, aiService) {
        console.log('🔧 EnhancedImageService constructor called');
        this.imageRepository = imageRepository;
        this.aiService = aiService;
        this.prisma = databaseClient.getClient();
        this.transactionService = new TransactionService();

        // Circuit breaker configurations - more conservative
        this.breakerConfigs = {
            aiService: { failureThreshold: 2, timeout: 30000 }, // Reduced from 3 to 2
            imageGeneration: { failureThreshold: 3, timeout: 120000 }, // Reduced from 5 to 3
            database: { failureThreshold: 2, timeout: 10000 }, // Reduced from 3 to 2
            fileSystem: { failureThreshold: 1, timeout: 15000 } // Reduced from 2 to 1
        };
        console.log('✅ EnhancedImageService constructor completed');
    }

    async generateImage(prompt, providers, guidance, userId, options = {}) {
        console.log('🔧 EnhancedImageService.generateImage called');
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        console.log(`🚀 Starting image generation [${requestId}]:`, {
            prompt: prompt ? `${prompt.substring(0, 50)}...` : 'undefined',
            providers,
            guidance,
            userId: userId || null
        });

        try {
            const result = await this.executeImageGeneration(prompt, providers, guidance, userId, options, requestId);
            const duration = Date.now() - startTime;

            console.log(`✅ Image generation completed [${requestId}] in ${duration}ms:`, {
                imageId: result.id,
                provider: result.provider,
                imageUrl: result.imageUrl,
                prompt: prompt ? `${prompt.substring(0, 30)}...` : 'undefined'
            });

            // Only deduct credits if image generation was completely successful
            // (including successful save to storage and database)
            if (result.success && result.id && result.imageUrl) {
                await this.logTransactionIfNeeded(userId, providers[0]);
                await this.deductCreditsForGeneration(userId, providers, prompt, requestId);
            } else {
                console.warn(`⚠️ CREDITS: Skipping credit deduction - generation not fully successful [${requestId}]`);
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

        // Step 3: Fire-and-forget prompt saving (non-blocking side effect)
        let savedPromptId = processedData.promptId;

        if (!savedPromptId) {
            // Fire-and-forget prompt saving - intentionally non-blocking
            // This is a side effect that should not impact image generation performance
            this.savePromptAsync(processedData.prompt, userId).catch(error => {
                console.error('❌ Background prompt save failed (non-critical):', error);
            });
        }

        // Step 4: Generate image with circuit breaker
        const imageData = await this.generateImageWithBreaker(
            processedData.prompt,
            processedData.original,
            savedPromptId,
            providers,
            guidance,
            userId
        );

        console.log(`💾 Skipping database save - image already saved by feed.js [${requestId}]`);

        return this.extractImageResult(imageData, processedData.prompt, processedData.original, guidance, userId);
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

        console.log(`✅ Input validation passed for providers: ${providers.join(', ')}`);

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
                photogenic = false,
                artistic = false
            } = options;

            // Check if prompt needs processing
            const hasVariables = (/\$\{[^}]+\}/).test(prompt);
            const needsProcessing = hasVariables || multiplier || mixup || mashup || customVariables || photogenic || artistic;

            let processedPrompt = prompt;
            let promptId = null;

            // Step 1: Process prompt with existing logic (multiplier, mixup, mashup)
            if (needsProcessing && this.aiService) {
                try {
                    const result = await this.aiService.processPrompt(
                        prompt,
                        multiplier,
                        mixup,
                        mashup,
                        customVariables,
                        photogenic,
                        artistic
                    );

                    ({ prompt: processedPrompt, promptId } = result);
                } catch (error) {
                    console.warn('⚠️ Prompt processing failed, using original:', error.message);
                    processedPrompt = prompt;
                }
            }

            // Step 2: Apply AI enhancement if requested
            if (autoEnhance && processedPrompt) {
                try {
                    console.log('🤖 AI ENHANCEMENT: Applying AI enhancement to processed prompt');
                    const enhancedPrompt = await aiEnhancementService.enhancePrompt(processedPrompt);

                    processedPrompt = enhancedPrompt;
                } catch (error) {
                    console.warn('⚠️ AI enhancement failed, using processed prompt:', error.message);
                    // Keep the processed prompt if enhancement fails
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
    async generateImageWithBreaker(prompt, original, promptId, providers, guidance, userId) {
        return await circuitBreakerManager.execute('imageGeneration', async () => {
            // Validate userId before proceeding
            const validUserId = userId && userId !== 'undefined' ? userId : null;

            // Import feed module dynamically
            const feed = await import('../feed.js');

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

            const generationPromise = feed.default.generate({
                prompt,
                original,
                promptId,
                providers,
                guidance,
                req
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
            console.log(`🧹 Cleaning up after failure [${requestId}]:`, error.message);

            // Add cleanup logic here (e.g., remove partial files)
            // This will be implemented based on the specific failure type

        } catch (cleanupError) {
            console.error(`❌ Cleanup failed [${requestId}]:`, cleanupError.message);
        }
    }


    extractImageResult(imageData, prompt, original, guidance, userId) {
        const firstResult = imageData.results && imageData.results.length > 0 ? imageData.results[0] : null;
        const actualImageId = firstResult?.imageId;
        const actualProvider = firstResult?.provider;
        const actualImageUrl = firstResult?.imageUrl;

        // Check if the generation was actually successful
        const generationSuccessful = firstResult && firstResult.success && actualImageUrl;

        return {
            id: actualImageId,
            imageUrl: actualImageUrl,
            prompt,
            original,
            provider: actualProvider,
            guidance,
            rating: 0,
            userId,
            createdAt: new Date().toISOString(),
            success: generationSuccessful,
            results: imageData.results
        };
    }

    async logTransactionIfNeeded(userId, provider) {
        if (userId && userId !== null) {
            try {
                await this.transactionService.logTransaction(userId, provider, 1);
                console.log(`💰 Transaction logged for user ${userId}: ${provider}`);
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
            console.log('💾 Background prompt save started for user:', userId || 'anonymous');

            const feed = await import('../feed.js');
            const req = { user: { id: userId } };

            const savedPrompt = await feed.default.buildPrompt(
                prompt,
                false, // multiplier
                false, // mixup
                false, // mashup
                '', // customVariables
                false, // photogenic
                false, // artistic
                req
            );

            if (savedPrompt && savedPrompt.promptId) {
                console.log('✅ Background prompt saved with ID:', savedPrompt.promptId);
            } else {
                console.warn('⚠️ Background prompt save returned no ID:', savedPrompt);
            }
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
        if (!userId) {
            if (!image.isPublic) {
                throw new ValidationError('Authentication required to rate private images');
            }
        } else {
            // For authenticated users, allow rating public images OR their own private images
            if (!image.isPublic && image.userId !== userId) {
                throw new ValidationError('You can only rate your own private images');
            }
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

        // Normalize image data
        return {
            id: image.id,
            userId: image.userId,
            prompt: image.prompt,
            original: image.original,
            imageUrl: image.imageUrl,
            provider: image.provider,
            guidance: image.guidance,
            model: image.model,
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

        // First, verify the user owns the image
        const image = await this.imageRepository.findById(imageId);

        if (!image) {
            throw new NotFoundError('Image');
        }

        if (image.userId !== userId) {
            throw new ValidationError('You can only update the public status of your own images');
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
            select: { id: true, username: true }
        });
        const userMap = new Map(users.map(user => [user.id, user.username]));

        // Normalize image data
        const normalizedImages = result.images.map(image => ({
            id: image.id,
            userId: image.userId, // ✅ Added userId for client-side filtering
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
            hasMore: result.hasMore,
            totalCount: result.totalCount
        };
    }

    /**
     * Get user's images with cost information for billing page
     * @param {string} userId - User ID
     * @param {number} limit - Number of images to fetch
     * @param {number} page - Page number (0-based)
     * @returns {Promise<Object>} User images with cost information
     */
    async getUserImages(userId, limit = 50, page = 0) {
        console.log('🔄 ENHANCED-IMAGE-SERVICE: getUserImages called with:', { userId, limit, page });

        if (!userId) {
            throw new Error('User ID is required');
        }

        // Get user's images only (not including other users' public images)
        console.log('🔄 ENHANCED-IMAGE-SERVICE: Calling findUserImages...');
        const result = await this.imageRepository.findUserImages(userId, limit, page);

        console.log('✅ ENHANCED-IMAGE-SERVICE: findUserImages result:', {
            imagesCount: result.images?.length || 0,
            totalCount: result.totalCount,
            hasMore: result.hasMore,
            firstImage: result.images?.[0]
                ? {
                    id: result.images[0].id,
                    userId: result.images[0].userId,
                    provider: result.images[0].provider,
                    model: result.images[0].model,
                    createdAt: result.images[0].createdAt
                }
                : null
        });

        // Get model cost information
        const models = await this.prisma.model.findMany({
            where: { isActive: true },
            select: {
                provider: true,
                name: true,
                costPerImage: true,
                displayName: true
            }
        });

        // Create model cost map
        const modelCostMap = new Map();

        models.forEach(model => {
            const key = `${model.provider}-${model.name}`;

            modelCostMap.set(key, {
                costPerImage: model.costPerImage,
                displayName: model.displayName
            });
        });

        // Normalize image data with cost information
        const normalizedImages = result.images.map(image => {
            const modelKey = `${image.provider}-${image.model}`;
            const modelInfo = modelCostMap.get(modelKey);

            return {
                id: image.id,
                userId: image.userId,
                prompt: image.prompt,
                url: image.imageUrl,
                provider: image.provider,
                model: image.model,
                modelDisplayName: modelInfo?.displayName || image.model,
                costPerImage: modelInfo?.costPerImage || 1.0,
                rating: image.rating,
                isPublic: image.isPublic,
                tags: image.tags || [],
                createdAt: image.createdAt,
                updatedAt: image.updatedAt
            };
        });

        return {
            images: normalizedImages,
            totalCount: result.totalCount,
            hasMore: result.hasMore
        };
    }

    async getFeed(userId, limit = 8, page = 0) {
        // Site feed should always show only public images from all users
        // regardless of authentication status
        console.log('🔍 FEED SERVICE: getFeed called - ensuring only public images');
        const result = await this.imageRepository.findPublicImages(limit, page);

        // Double-check that all returned images are public
        const nonPublicImages = result.images.filter(img => !img.isPublic);
        if (nonPublicImages.length > 0) {
            console.error('🚨 PRIVACY VIOLATION: Non-public images found in site feed!', nonPublicImages);
            // Remove non-public images as a safety measure
            result.images = result.images.filter(img => img.isPublic);
            result.totalCount = result.images.length;
        }

        console.log(`✅ FEED SERVICE: Site feed returning ${result.images.length} public images`);

        // Get unique user IDs and fetch usernames
        const userIds = [...new Set(result.images.map(img => img.userId))];
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true }
        });
        const userMap = new Map(users.map(user => [user.id, user.username]));

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

    async getUserOwnImages(userId, limit = 8, page = 0) {
        if (!userId) {
            throw new ValidationError('User ID is required for getting user own images');
        }

        console.log('🔍 USER IMAGES SERVICE: getUserOwnImages called for userId:', userId);

        // Get all images belonging to the user (both public and private for "mine" filter)
        const result = await this.imageRepository.findUserImages(userId, limit, page);

        // Double-check that all returned images belong to the user
        const otherUserImages = result.images.filter(img => img.userId !== userId);
        if (otherUserImages.length > 0) {
            console.error('🚨 PRIVACY VIOLATION: Other users images found in user feed!', otherUserImages);
            // Remove other users' images as a safety measure
            result.images = result.images.filter(img => img.userId === userId);
            result.totalCount = result.images.length;
        }

        console.log(`✅ USER IMAGES SERVICE: User feed returning ${result.images.length} images for user ${userId}`);

        // Get unique user IDs and fetch usernames
        const userIds = [...new Set(result.images.map(img => img.userId))];
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true }
        });
        const userMap = new Map(users.map(user => [user.id, user.username]));

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
        try {
            // Try to find by exact model name
            const model = await this.prisma.model.findFirst({
                where: {
                    name: providerName,
                    isActive: true
                }
            });

            if (model) {
                console.log(`💰 COST: Using database cost for ${model.name}: ${model.costPerImage} credits`);

                return model.costPerImage;
            }

            // If not found, try to find by provider name and get the cheapest model
            const models = await this.prisma.model.findMany({
                where: {
                    provider: providerName,
                    isActive: true
                },
                orderBy: { costPerImage: 'asc' }
            });

            if (models.length > 0) {
                const cheapestModel = models[0];

                console.log(`💰 COST: Using cheapest model from ${providerName}: ${cheapestModel.name} (${cheapestModel.costPerImage} credits)`);

                return cheapestModel.costPerImage;
            }

            // Fallback to hardcoded costs if not found in database
            console.warn(`⚠️ COST: Model ${providerName} not found in database, using fallback cost`);

            return SimplifiedCreditService.getCreditCost(providerName);

        } catch (error) {
            console.error(`❌ COST: Error getting model cost for ${providerName}:`, error);

            // Fallback to hardcoded costs
            return SimplifiedCreditService.getCreditCost(providerName);
        }
    }

    /**
     * Refund credits if generation fails after deduction
     * @param {string} userId - User ID
     * @param {Array} providers - Array of providers used
     * @param {Error} error - The error that occurred
     * @param {string} requestId - Request ID for tracking
     */
    async refundCreditsOnFailure(userId, providers, error, requestId) {
        if (!userId) {
            console.log(`⚠️ CREDITS: No user ID provided, skipping refund [${requestId}]`);

            return;
        }

        try {
            const [primaryProvider] = providers;
            const cost = await this.getModelCost(primaryProvider);

            if (cost <= 0) {
                console.log(`⚠️ CREDITS: No cost to refund for provider ${primaryProvider} [${requestId}]`);

                return;
            }

            // Refund credits
            await SimplifiedCreditService.refundCredits(
                userId,
                cost,
                `Image generation failed - Refund for ${primaryProvider}`,
                {
                    providers,
                    error: error.message,
                    requestId,
                    timestamp: new Date().toISOString()
                }
            );

            console.log(`💳 CREDITS: Refunded ${cost} credits to user ${userId} due to generation failure [${requestId}]`);

        } catch (refundError) {
            console.error(`❌ CREDITS: Error refunding credits for user ${userId} [${requestId}]:`, refundError);
            // Don't throw - this is a cleanup operation
        }
    }

    /**
     * Deduct credits for successful image generation
     * @param {string} userId - User ID
     * @param {Array} providers - Array of providers used
     * @param {string} prompt - Generation prompt
     * @param {string} requestId - Request ID for tracking
     */
    async deductCreditsForGeneration(userId, providers, prompt, requestId) {
        try {
            // Calculate cost based on primary provider using database model costs
            const [primaryProvider] = providers;
            const cost = await this.getModelCost(primaryProvider);

            if (cost <= 0) {
                console.warn(`⚠️ CREDITS: Invalid cost calculation for provider ${primaryProvider} [${requestId}]`);

                return;
            }

            // Deduct credits
            await SimplifiedCreditService.debitCredits(
                userId,
                cost,
                `Image generation - ${primaryProvider}`,
                {
                    providers,
                    prompt: prompt ? prompt.substring(0, 100) : '',
                    requestId,
                    timestamp: new Date().toISOString()
                }
            );

            const creditMessage = `💳 CREDITS: Deducted ${cost} credits from user ${userId} for ${primaryProvider} generation [${requestId}]`;

            console.log(creditMessage);

        } catch (error) {
            console.error(`❌ CREDITS: Error deducting credits for user ${userId} [${requestId}]:`, error);
            // Don't throw error - generation was successful, credit deduction failure shouldn't break the flow
        }
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
