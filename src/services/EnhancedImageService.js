import { ValidationError, NotFoundError } from '../errors/CustomErrors.js';
import {
    ProviderUnavailableError,
    ImageGenerationTimeoutError,
    FileSystemError
} from '../errors/CircuitBreakerErrors.js';
import { circuitBreakerManager } from '../utils/CircuitBreaker.js';
import { TransactionService } from './TransactionService.js';
import { formatErrorResponse } from '../utils/ResponseFormatter.js';
import databaseClient from '../database/PrismaClient.js';
import { aiEnhancementService } from './AIEnhancementService.js';

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

    // eslint-disable-next-line max-params
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
            // Step 1: Validate inputs with circuit breaker
            await this.validateInputs(prompt, providers, guidance, userId);

            // Step 2: Process prompt with circuit breaker
            const processedData = await this.processPromptWithBreaker(prompt, options);

            // Step 3: Generate image with circuit breaker
            const imageData = await this.generateImageWithBreaker(
                processedData.prompt,
                processedData.original,
                processedData.promptId,
                providers,
                guidance,
                userId
            );

            // Step 4: Image is already saved by feed.js, just return the result
            console.log(`💾 Skipping database save - image already saved by feed.js [${requestId}]`);

            const duration = Date.now() - startTime;
            const result = this.extractImageResult(imageData, processedData.prompt, processedData.original, guidance, userId);

            console.log(`✅ Image generation completed [${requestId}] in ${duration}ms:`, {
                imageId: result.id,
                provider: result.provider,
                imageUrl: result.imageUrl,
                prompt: prompt ? `${prompt.substring(0, 30)}...` : 'undefined'
            });

            await this.logTransactionIfNeeded(userId, providers[0]);

            return result;

        } catch (error) {
            const duration = Date.now() - startTime;

            console.error(`❌ Image generation failed [${requestId}] after ${duration}ms:`, {
                error: error.message,
                type: error.name,
                userId: userId || null
            });

            // Clean up any partial resources
            await this.cleanupOnFailure(error, requestId);

            // Return appropriate error response
            return formatErrorResponse(error, requestId, Date.now() - startTime);
        }
    }

    // eslint-disable-next-line max-lines-per-function, max-statements
    async validateInputs(prompt, providers, guidance, userId) {
        // eslint-disable-next-line max-lines-per-function, max-statements
        return await circuitBreakerManager.execute('validation', async () => {
            const errors = [];
            const warnings = [];

            // Prompt validation
            if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
                errors.push('Prompt is required and must be a non-empty string');
            } else if (prompt.trim().length < 3) {
                errors.push('Prompt must be at least 3 characters long');
            } else if (prompt.trim().length > 1000) {
                errors.push('Prompt must be less than 1000 characters');
            }

            // Provider validation
            if (!providers || !Array.isArray(providers) || providers.length === 0) {
                errors.push('At least one provider must be specified');
            } else {
                // Validate each provider
                const validProviders = [
                    'flux', 'dalle', 'juggernaut', 'juggernautReborn', 'redshift',
                    'absolute', 'realisticvision', 'icbinp', 'icbinp_seco', 'hasdx',
                    'dreamshaper', 'nightmareshaper', 'openjourney', 'analogmadness',
                    'portraitplus', 'tshirt', 'abyssorange', 'cyber', 'disco',
                    'synthwave', 'lowpoly', 'bluepencil', 'ink'
                ];

                for (const provider of providers) {
                    if (!validProviders.includes(provider)) {
                        errors.push(`Invalid provider: ${provider}. Valid providers: ${validProviders.join(', ')}`);
                    }
                }
            }

            // Guidance validation
            if (guidance !== undefined && (isNaN(guidance) || guidance < 1 || guidance > 20)) {
                errors.push('Guidance must be a number between 1 and 20');
            }

            // UserId validation
            if (userId && userId !== 'undefined' && userId !== null && (typeof userId !== 'string' || userId.length < 3)) {
                warnings.push('UserId format appears invalid, using anonymous');
            }

            // Content policy validation
            const contentPolicyViolations = [
                'nude', 'naked', 'explicit', 'porn', 'sexual', 'violence', 'blood', 'gore',
                'hate', 'racist', 'discrimination', 'illegal', 'drugs', 'weapons'
            ];

            const promptLower = prompt.toLowerCase();

            for (const violation of contentPolicyViolations) {
                if (promptLower.includes(violation)) {
                    errors.push('Content policy violation: prompt contains inappropriate content');
                    break;
                }
            }

            // Rate limiting check (basic)
            if (this.isRateLimited(userId)) {
                errors.push('Rate limit exceeded. Please wait before generating another image.');
            }

            if (errors.length > 0) {
                console.log('❌ Validation failed:', { errors, warnings, prompt: prompt.substring(0, 50) });
                throw new ValidationError(errors.join('; '));
            }

            if (warnings.length > 0) {
                console.log('⚠️ Validation warnings:', warnings);
            }

            console.log('✅ Input validation passed:', {
                promptLength: prompt.length,
                providers,
                guidance,
                userId: userId || null
            });

            return true;
        }, this.breakerConfigs.aiService);
    }

    async processPromptWithBreaker(prompt, options) {
        return await circuitBreakerManager.execute('aiService', async () => {
            const {
                multiplier = false,
                mixup = false,
                mashup = false,
                customVariables = '',
                autoEnhance = false
            } = options;

            // Check if prompt needs processing
            const hasVariables = (/\$\{[^}]+\}/).test(prompt);
            const needsProcessing = hasVariables || multiplier || mixup || mashup || customVariables;

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
                        customVariables
                    );

                    processedPrompt = result.prompt;
                    promptId = result.promptId;
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

            const generationPromise = feed.default.generate(
                prompt,
                original,
                promptId,
                providers,
                guidance,
                req
            );

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

    async saveImageWithTransaction(imageData, userId) {
        return await circuitBreakerManager.execute('database', async () => {
            // Validate userId before database operation
            const validUserId = userId && userId !== 'undefined' ? userId : null;

            return await this.prisma.$transaction(async tx => {
                // Create image record with validated userId
                const image = await tx.image.create({
                    data: {
                        id: imageData.id || this.generateId(),
                        userId: validUserId,
                        prompt: imageData.prompt,
                        original: imageData.original,
                        imageUrl: imageData.image || imageData.url || `uploads/${imageData.imageName}`,
                        provider: imageData.provider || imageData.providerName,
                        guidance: imageData.guidance || 10,
                        model: imageData.model || null,
                        rating: imageData.rating || null
                    }
                });

                // Verify file exists
                const fs = await import('fs');
                const path = await import('path');
                const imagePath = path.join(process.cwd(), 'public', image.imageUrl);

                if (!fs.existsSync(imagePath)) {
                    throw new FileSystemError('verify', imagePath, 'Image file not found after save');
                }

                return image;
            });
        }, this.breakerConfigs.database);
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

    async updateRating(imageId, rating) {
        if (!imageId || !rating) {
            throw new ValidationError('Image ID and rating are required');
        }

        const result = await this.imageRepository.updateRating(imageId, rating);

        if (result === 0) {
            throw new NotFoundError('Image');
        }

        return { result, id: imageId, rating };
    }

    async deleteImage(imageId) {
        if (!imageId) {
            throw new ValidationError('Image ID is required');
        }

        await this.imageRepository.deleteById(imageId);

        return { status: 'ok' };
    }

    async getImages(userId, limit = 8, page = 0) {
        const result = await this.imageRepository.findByUserId(userId, limit, page);

        // Normalize image data
        const normalizedImages = result.images.map(image => ({
            id: image.id,
            userId: image.userId, // ✅ Added userId for client-side filtering
            prompt: image.prompt,
            original: image.original,
            imageUrl: image.imageUrl,
            provider: image.provider,
            guidance: image.guidance,
            model: image.model,
            rating: image.rating,
            createdAt: image.createdAt,
            updatedAt: image.updatedAt
        }));

        return {
            images: normalizedImages,
            hasMore: result.hasMore,
            totalCount: result.totalCount
        };
    }

    async getFeed(userId, limit = 8, page = 0) {
        // For now, feed is the same as images
        return await this.getImages(userId, limit, page);
    }

    async getImageCount(userId) {
        // Allow anonymous access - return total count for public feed
        const count = await this.imageRepository.countByUserId(userId);

        return { count };
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
