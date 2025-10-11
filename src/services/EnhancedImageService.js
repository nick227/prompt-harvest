import { ValidationError, InsufficientCreditsError } from '../errors/CustomErrors.js';
import {
    ProviderUnavailableError,
    ImageGenerationTimeoutError,
    AllProvidersFailedError
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
import {
    applyMultiplierSafely,
    shufflePrompt,
    mashupPrompt,
    processCustomVariables
} from './generate/PromptProcessor.js';
import generate from '../generate.js';
import modelInterface from './ModelInterface.js';

// Import extracted utilities (used in this file)
import { createPaginationMetadata } from './enhanced-image/utils/PaginationHelper.js';
import {
    generateRequestId as createRequestId,
    generateId as createId
} from './enhanced-image/utils/IdGenerator.js';
import { normalizeProviders } from './enhanced-image/utils/ProviderNormalizer.js';

// Import configuration
import { SERVICE_CONFIG, PAGINATION } from './enhanced-image/config/ServiceConfig.js';

// Import core services
import { RatingService } from './enhanced-image/core/RatingService.js';
import { ImageOperationsService } from './enhanced-image/core/ImageOperationsService.js';
import { ImageQueryService } from './enhanced-image/core/ImageQueryService.js';

export class EnhancedImageService {
    // Configuration constants (use imported config)
    static CONFIG = SERVICE_CONFIG;
    static MAX_PROVIDERS = 10; // Prevent pathological inputs

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
    constructor(dependencies = {}) {
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
            },
            rateLimit: {
                windowMs: config.RATE_LIMITING.WINDOW_MS,
                maxRequests: config.RATE_LIMITING.MAX_REQUESTS,
                cleanupThreshold: config.RATE_LIMITING.CLEANUP_THRESHOLD
            }
        };

        // Initialize specialized services
        this.ratingService = new RatingService({
            imageRepository: this.imageRepository
        });

        this.operationsService = new ImageOperationsService({
            imageRepository: this.imageRepository,
            prismaClient: this.prisma
        });

        this.queryService = new ImageQueryService({
            imageRepository: this.imageRepository,
            prismaClient: this.prisma
        });
    }

    /**
     * Generate an image with the given parameters
     * @param {string} prompt - The prompt for image generation
     * @param {string[]} providers - Array of provider names to try
     * @param {number} guidance - Guidance scale (0-20)
     * @param {string} userId - User ID (can be null for anonymous)
     * @param {Object} options - Generation options
     * @param {boolean} options.autoPublic - Automatically make image public
     * @param {boolean} options.autoEnhance - Use AI to enhance the prompt
     * @param {string} options.multiplier - Word multiplier to apply
     * @param {boolean} options.mixup - Shuffle comma-separated parts
     * @param {boolean} options.mashup - Shuffle space-separated words
     * @param {string} options.customVariables - Custom variable definitions
     * @param {Object} options.promptHelpers - Prompt helper flags
     * @returns {Promise<Object>} Generation result with image data
     */
    async generateImage(prompt, providers, guidance, userId, options = {}) {
        const startTime = Date.now();
        const requestId = createRequestId(); // Use imported function with clear name
        let creditsDeducted = false;
        let creditCost = 0;
        let refundAttempted = false;

        // Normalize userId up front to prevent string "undefined" contaminating credit/logging systems
        const normalizedUserId = userId && userId !== 'undefined' ? userId : null;

        try {
            // Check rate limiting with normalized userId
            if (this.isRateLimited(normalizedUserId)) {
                const error = new ValidationError('Rate limit exceeded. Please wait before making another request.');

                error.status = 429;
                error.statusCode = 429;
                throw error;
            }

            // Validate providers is an array BEFORE normalization (prevent TypeError leaking as 500)
            if (!Array.isArray(providers) || providers.length === 0) {
                throw new ValidationError('At least one provider must be specified');
            }

            // Normalize providers AFTER validation (avoid overcharging on duplicates/mixed case)
            const normalizedProviders = normalizeProviders(providers);

            // Validate normalized provider list
            if (normalizedProviders.length === 0) {
                throw new ValidationError('No valid providers after normalization');
            }

            // Guard against pathological inputs (prevent long sequential retries)
            if (normalizedProviders.length > EnhancedImageService.MAX_PROVIDERS) {
                throw new ValidationError(
                    `Too many providers: ${normalizedProviders.length}. Maximum allowed: ${EnhancedImageService.MAX_PROVIDERS}`
                );
            }

            // Check and deduct credits using normalized userId & providers
            const creditResult = await this.validateAndDeductCredits(
                normalizedUserId, normalizedProviders, prompt, requestId
            );

            if (!creditResult.success) {
                // Use typed error for insufficient credits with robust metadata
                const currentBalance = await SimplifiedCreditService.getBalance(normalizedUserId);
                const error = new InsufficientCreditsError(
                    creditResult.error || 'Insufficient credits',
                    creditResult.cost,
                    currentBalance
                );

                // Ensure 402 metadata for pipelines that rely on status/statusCode/data
                error.status = 402;
                error.statusCode = 402;
                error.data = {
                    required: creditResult.cost,
                    available: currentBalance,
                    shortfall: Math.max(0, creditResult.cost - currentBalance)
                };
                throw error;
            }

            // Track that credits were deducted
            creditsDeducted = true;
            creditCost = creditResult.cost;

            // Pass normalized userId & providers - avoid re-normalization in validateInputs
            const result = await this.executeImageGeneration(
                prompt, normalizedProviders, guidance, normalizedUserId, options, requestId, true
            );

            // Check if generation was actually successful
            if (!result.success || !result.id || !result.imageUrl) {
                // Generation failed - throw error to trigger refund in catch block
                const error = new Error(result.error || 'Image generation failed');

                error.generationResult = result;
                throw error;
            }

            // Log transaction for successful generation using the actual provider used
            // Fallback to first normalized provider if result doesn't have provider
            const providerUsed = result?.provider || normalizedProviders[0] || 'unknown';

            await this.logTransactionIfNeeded(normalizedUserId, providerUsed);

            return result;

        } catch (error) {
            const duration = Date.now() - startTime;

            console.error(`❌ Image generation failed [${requestId}] after ${duration}ms:`, {
                error: error.message,
                type: error.name,
                userId: normalizedUserId || null
            });

            // Refund credits only if they were deducted and not already refunded (idempotent)
            if (creditsDeducted && creditCost > 0 && !refundAttempted) {
                try {
                    refundAttempted = true; // Mark before attempt to prevent double-refund
                    await this.refundCreditsForGeneration(normalizedUserId, creditCost, requestId);
                    creditsDeducted = false; // Mark as refunded
                    console.info(`✅ Refunded ${creditCost} credits [${requestId}]`);
                } catch (refundError) {
                    console.error(`❌ Failed to refund credits [${requestId}]:`, refundError);
                    // Don't throw - we still want to return the error response
                }
            }

            // Note: Additional cleanup (e.g., removing partial files) can be added here if needed

            return formatErrorResponse(error, requestId, Date.now() - startTime);
        }
    }

    /**
     * Execute the image generation workflow
     * @param {string} prompt - The prompt for image generation
     * @param {string[]} providers - Array of provider names to try
     * @param {number} guidance - Guidance scale
     * @param {string} userId - User ID
     * @param {Object} options - Generation options
     * @param {string} requestId - Request ID for tracking
     * @param {boolean} providersAlreadyNormalized - Skip normalization if already done
     * @returns {Promise<Object>} Image generation result
     * @private
     */
    // eslint-disable-next-line max-params, max-len
    async executeImageGeneration(prompt, providers, guidance, userId, options, requestId, providersAlreadyNormalized = false) {
        // Step 1: Validate inputs and get normalized providers (skip normalization if already done)
        const normalizedProviders = await this.validateInputs(
            prompt, providers, guidance, userId, providersAlreadyNormalized
        );

        // Step 2: Process prompt with circuit breaker
        const processedData = await this.processPromptWithBreaker(prompt, options);

        // Step 3: Use promptId from processing (or null if not saved)
        // Note: promptId is optional - image generation will work without it
        const savedPromptId = processedData.promptId || null;

        // Step 4: Generate image with circuit breaker using normalized providers
        const imageData = await this.generateImageWithBreaker(
            processedData.prompt,
            processedData.original,
            savedPromptId,
            normalizedProviders,
            guidance,
            userId,
            options,
            requestId // Pass requestId for cross-provider log correlation
        );

        return await this.extractImageResult(
            imageData,
            processedData.prompt,
            processedData.original,
            guidance,
            userId,
            normalizedProviders // Pass providers for result metadata
        );
    }

    // eslint-disable-next-line max-lines-per-function, max-statements, max-params
    async validateInputs(prompt, providers, guidance, _userId, providersAlreadyNormalized = false) {
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

        // Normalize providers if not already done (avoid double normalization)
        let uniqueProviders;

        if (providersAlreadyNormalized) {
            // Already normalized - just validate they're non-empty
            uniqueProviders = providers;
            if (uniqueProviders.length === 0) {
                throw new ValidationError('No valid providers after normalization');
            }
        } else {
            // Validate provider array elements are strings before normalization
            const invalidProvider = providers.find(p => typeof p !== 'string' || p.length === 0);

            if (invalidProvider !== undefined) {
                const msg = `Invalid provider: ${JSON.stringify(invalidProvider)}`;

                throw new ValidationError(`${msg} - all providers must be non-empty strings`);
            }

            // Normalize providers using utility (trim, lowercase, deduplicate)
            uniqueProviders = normalizeProviders(providers);

            // Check if normalization resulted in empty array (e.g., all whitespace)
            if (uniqueProviders.length === 0) {
                throw new ValidationError('No valid providers after normalization');
            }
        }

        // Guard against pathological inputs (prevent long sequential retries)
        if (uniqueProviders.length > EnhancedImageService.MAX_PROVIDERS) {
            throw new ValidationError(
                `Too many providers: ${uniqueProviders.length}. Maximum allowed: ${EnhancedImageService.MAX_PROVIDERS}`
            );
        }

        // Validate each provider exists and is available (parallelize for speed)
        const validationPromises = uniqueProviders.map(async provider => {
            try {
                const modelConfig = await this.getModelConfig(provider);

                if (!modelConfig) {
                    throw new ValidationError(`Provider '${provider}' is not available or inactive`);
                }

                return { provider, valid: true };
            } catch (error) {
                if (error instanceof ValidationError) {
                    throw error;
                }
                throw new ValidationError(`Provider '${provider}' validation failed: ${error.message}`);
            }
        });

        // Wait for all validations to complete
        await Promise.all(validationPromises);

        // Return normalized providers for use in generation
        return uniqueProviders;
    }

    /**
     * Get model configuration for a provider
     * @param {string} provider - Provider name
     * @returns {Promise<Object>} Model configuration
     */
    async getModelConfig(provider) {
        try {
            return await modelInterface.getImageGeneratorConfig(provider);
        } catch (error) {
            console.error(`❌ Failed to get model config for ${provider}:`, error);
            throw error;
        }
    }

    async processPromptWithBreaker(prompt, options) {
        return await this.circuitBreaker.execute('aiService', async () => {
            const { multiplier, mixup, mashup, customVariables, autoEnhance, promptHelpers } =
                this.extractPromptOptions(options);

            const needsProcessing = this.checkIfProcessingNeeded(
                prompt, multiplier, mixup, mashup, customVariables, promptHelpers
            );

            let processedPrompt = prompt;
            let promptId = null;

            // Step 1: Basic processing
            if (needsProcessing && this.aiService) {
                ({ processedPrompt, promptId } = await this.applyBasicPromptProcessing(
                    prompt, customVariables, promptHelpers
                ));
            }

            // Step 2: AI enhancement
            if (autoEnhance && processedPrompt) {
                processedPrompt = await this.applyAIEnhancement(processedPrompt);
            }

            // Step 3: Prompt modifications
            if (multiplier || mixup || mashup) {
                processedPrompt = await this.applyPromptModifications(
                    processedPrompt, multiplier, mixup, mashup, customVariables
                );
            }

            return { prompt: processedPrompt, original: prompt, promptId };
        }, this.breakerConfigs.aiService);
    }

    extractPromptOptions(options) {
        return {
            multiplier: options.multiplier || false,
            mixup: options.mixup || false,
            mashup: options.mashup || false,
            customVariables: options.customVariables || '',
            autoEnhance: options.autoEnhance || false,
            promptHelpers: options.promptHelpers || {}
        };
    }

    checkIfProcessingNeeded(prompt, multiplier, mixup, mashup, customVariables, promptHelpers) {
        const hasVariables = (/\$\{[^}]+\}/).test(prompt);
        const hasPromptHelpers = Object.values(promptHelpers).some(Boolean);

        return hasVariables || multiplier || mixup || mashup || customVariables || hasPromptHelpers;
    }

    async applyBasicPromptProcessing(prompt, customVariables, promptHelpers) {
        try {
            const result = await this.aiService.processPrompt(
                prompt, false, false, false, customVariables, promptHelpers
            );

            return { processedPrompt: result.prompt, promptId: result.promptId };
        } catch (error) {
            console.error('❌ Prompt processing failed, using original prompt:', {
                error: error.message,
                promptLength: prompt.length
            });

            return { processedPrompt: prompt, promptId: null };
        }
    }

    async applyAIEnhancement(prompt) {
        try {
            return await getAIEnhancementService().enhancePrompt(prompt);
        } catch (error) {
            console.error('❌ AI enhancement failed, using processed prompt:', {
                error: error.message,
                promptLength: prompt.length
            });

            return prompt;
        }
    }

    async applyPromptModifications(prompt, multiplier, mixup, mashup, customVariables) {
        try {
            let modifiedPrompt = prompt;
            const customDict = processCustomVariables(customVariables, {});

            if (multiplier) {
                modifiedPrompt = await applyMultiplierSafely(modifiedPrompt, multiplier, customDict);
            }
            if (mixup) {
                modifiedPrompt = shufflePrompt(modifiedPrompt);
            }
            if (mashup) {
                modifiedPrompt = mashupPrompt(modifiedPrompt);
            }

            return modifiedPrompt;
        } catch (error) {
            console.error('❌ Prompt modifications failed, using unmodified prompt:', {
                error: error.message,
                multiplier,
                mixup,
                mashup
            });

            return prompt;
        }
    }

    // eslint-disable-next-line max-params
    async generateImageWithBreaker(prompt, original, promptId, providers, guidance, userId, options, requestId) {
        const errors = [];

        for (let i = 0; i < providers.length; i++) {
            const provider = providers[i];
            const isLastProvider = i === providers.length - 1;

            try {
                return await this.tryProviderGeneration(
                    provider, prompt, original, promptId, guidance, userId, options, requestId
                );
            } catch (error) {
                errors.push({
                    provider,
                    error: error.message,
                    type: error.name,
                    statusCode: error.statusCode || 500
                });

                if (isLastProvider) {
                    console.error(`❌ All ${providers.length} providers failed:`, errors);
                    throw new AllProvidersFailedError(providers, errors);
                }

                console.warn(`⚠️ Provider ${provider} failed (${error.name}), trying next...`, error.message);
            }
        }

        throw new AllProvidersFailedError(providers, errors);
    }

    // eslint-disable-next-line max-params
    async tryProviderGeneration(provider, prompt, original, promptId, guidance, userId, options, requestId) {
        const breakerKey = `imageGeneration:${provider}`;

        return await this.circuitBreaker.execute(breakerKey, async () => {
            const validUserId = userId || null;
            const abortController = new AbortController();
            const { signal } = abortController;
            const { timeout } = this.breakerConfigs.imageGeneration;
            let timeoutHandle = null;

            try {
                const generationPromise = generate.generate({
                    prompt,
                    original,
                    promptId,
                    providers: [provider],
                    guidance,
                    req: { user: { id: validUserId } },
                    autoPublic: options?.autoPublic,
                    signal,
                    requestId
                });

                const timeoutPromise = new Promise((_, reject) => {
                    timeoutHandle = setTimeout(() => {
                        abortController.abort();
                        reject(new ImageGenerationTimeoutError(provider, timeout));
                    }, timeout);
                });

                const result = await Promise.race([generationPromise, timeoutPromise]);

                return this.validateGenerationResult(result, provider);
            } finally {
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                }
            }
        }, this.breakerConfigs.imageGeneration);
    }

    validateGenerationResult(result, provider) {
        if (!result || result.error) {
            if (result?.error && this.isResourceFailure(result.error)) {
                throw new ValidationError(`Resource failure: ${result.error}`);
            }

            throw new ProviderUnavailableError(provider, result?.error || 'Unknown error');
        }

        return result;
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

    async extractImageResult(imageData, prompt, original, guidance, userId, attemptedProviders = []) {
        this.validateImageData(imageData);
        const successfulResult = this.findSuccessfulResult(imageData.results);
        const username = await this.fetchUsername(successfulResult, userId);

        return this.buildImageResponse(
            successfulResult, prompt, original, guidance, userId, username,
            imageData.results, attemptedProviders
        );
    }

    validateImageData(imageData) {
        if (!imageData || typeof imageData !== 'object') {
            throw new Error('Invalid image data: expected object');
        }
        if (!Array.isArray(imageData.results) || imageData.results.length === 0) {
            throw new Error('Invalid image data: results array is missing or empty');
        }
    }

    findSuccessfulResult(results) {
        const successfulResults = results.filter(r => r &&
            typeof r === 'object' &&
            r.success === true &&
            typeof r.imageUrl === 'string' &&
            r.imageUrl.length > 0);

        if (successfulResults.length === 0) {
            throw new Error('Invalid image data: no successful results found');
        }

        return successfulResults.find(r => r.primary === true) ||
               successfulResults[successfulResults.length - 1];
    }

    async fetchUsername(successfulResult, userId) {
        if (successfulResult?.username) {
            return successfulResult.username;
        }

        if (userId) {
            try {
                const user = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { username: true }
                });

                return user?.username || 'User';
            } catch (error) {
                console.error('❌ Failed to fetch username for userId:', userId, error);

                return 'Unknown User';
            }
        }

        return 'Anonymous';
    }

    // eslint-disable-next-line max-params
    buildImageResponse(result, prompt, original, guidance, userId, username, results, attemptedProviders) {
        return {
            id: result.imageId,
            imageUrl: result.imageUrl,
            prompt,
            original,
            provider: result.provider,
            guidance,
            rating: 0,
            userId,
            username,
            createdAt: new Date().toISOString(),
            success: true,
            results,
            providerUsed: result.provider,
            providersAttempted: attemptedProviders,
            providerIndex: attemptedProviders.indexOf(result.provider)
        };
    }

    async logTransactionIfNeeded(userId, provider) {
        if (userId) { // Simplified: userId already handles null/undefined
            try {
                await this.transactionService.logTransaction(userId, provider, 1);
            } catch (transactionError) {
                console.error('❌ Failed to log transaction:', transactionError);
                // Don't fail the image generation for transaction logging errors
            }
        }
    }

    generateRequestId() {
        return createRequestId();
    }

    generateId() {
        return createId();
    }

    /**
     * Fire-and-forget prompt saving (non-blocking)
     * This method is synchronous and spawns async work without blocking the caller
     * @param {string} prompt - Prompt to save
     * @param {string} userId - User ID (can be null for anonymous)
     * @returns {void} - Returns immediately without waiting for save to complete
     */
    savePromptAsync(prompt, userId) {
        // Initialize circuit breaker state on first call
        if (this._savePromptAsyncFailures === undefined) {
            this._savePromptAsyncFailures = 0;
        }

        // Circuit breaker: Stop trying after multiple failures
        if (this._savePromptAsyncFailures >= 3) {
            return; // Silent fail to prevent log spam
        }

        // Spawn async work without returning the promise (fire-and-forget)
        (async () => {
            try {
                const req = { user: { id: userId } };

                await generate.buildPrompt(
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

                // Reset failure counter on success
                this._savePromptAsyncFailures = 0;
            } catch (error) {
                // Increment failure counter
                this._savePromptAsyncFailures = (this._savePromptAsyncFailures || 0) + 1;

                // Log only first few failures to avoid spam
                if (this._savePromptAsyncFailures < 3) {
                    console.error('❌ Background prompt save failed:', error);
                }
            }
        })();
        // Return immediately without waiting
    }

    isRateLimited(userId) {
        // Simple in-memory rate limiting
        const key = userId || 'anonymous';
        const now = Date.now();
        // Use instance config (already computed in constructor)
        const { windowMs, maxRequests, cleanupThreshold } = this.breakerConfigs.rateLimit;

        if (!this.rateLimitMap) {
            this.rateLimitMap = new Map();
        }

        const userRequests = this.rateLimitMap.get(key) || [];

        // Remove old requests outside the window
        const recentRequests = userRequests.filter(time => now - time < windowMs);

        if (recentRequests.length >= maxRequests) {
            // Improved logging for observability
            console.warn(`⚠️ Rate limit exceeded for ${key}:`, {
                requests: recentRequests.length,
                limit: maxRequests,
                windowMs,
                windowMinutes: Math.round(windowMs / 60000)
            });

            return true; // CRITICAL: Return immediately to enforce rate limit
        }

        // Add current request
        recentRequests.push(now);

        // Update the map with current requests
        this.rateLimitMap.set(key, recentRequests);

        // Periodically clean up the entire map
        if (!this.rateLimitCleanupCounter) {
            this.rateLimitCleanupCounter = 0;
        }

        this.rateLimitCleanupCounter++;

        if (this.rateLimitCleanupCounter >= cleanupThreshold) {
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

    /**
     * Update the rating for an image
     * Delegates to RatingService
     * @param {string} imageId - The image ID
     * @param {number} rating - Rating value (0-5)
     * @param {string} userId - User ID (optional for public images)
     * @returns {Promise<Object>} Update result with new rating
     */
    async updateRating(imageId, rating, userId) {
        return this.ratingService.updateRating(imageId, rating, userId);
    }

    /**
     * Get a single image by ID with permission checks
     * Delegates to ImageOperationsService
     * @param {string} imageId - The image ID
     * @param {string} userId - User ID (can be null)
     * @returns {Promise<Object>} Image data with username
     * @throws {NotFoundError} If image doesn't exist
     * @throws {AuthorizationError} If user lacks permission
     */
    async getImageById(imageId, userId) {
        return this.operationsService.getImageById(imageId, userId);
    }

    /**
     * Update the public/private status of an image
     * Delegates to ImageOperationsService
     * @param {string} imageId - The image ID
     * @param {boolean} isPublic - Whether image should be public
     * @param {string} userId - User ID (required)
     * @returns {Promise<Object>} Update result
     * @throws {ValidationError} If user doesn't own the image
     * @throws {NotFoundError} If image doesn't exist
     */
    async updatePublicStatus(imageId, isPublic, userId) {
        return this.operationsService.updatePublicStatus(imageId, isPublic, userId);
    }

    /**
     * Delete an image (user must own it)
     * Delegates to ImageOperationsService
     * @param {string} imageId - The image ID
     * @param {string} userId - User ID (required)
     * @returns {Promise<Object>} Status object
     * @throws {ValidationError} If required parameters missing
     * @throws {NotFoundError} If image doesn't exist
     * @throws {AuthorizationError} If user doesn't own the image
     */
    async deleteImage(imageId, userId) {
        return this.operationsService.deleteImage(imageId, userId);
    }

    /**
     * Get images with pagination (user-specific or public feed)
     * Delegates to ImageQueryService
     * @param {string} userId - User ID (null for public feed only)
     * @param {number} limit - Number of images per page
     * @param {number} page - Page number (1-based)
     * @returns {Promise<Object>} Images array and pagination metadata
     */
    async getImages(userId, limit = PAGINATION.DEFAULT_LIMIT, page = 1) {
        return this.queryService.getImages(userId, limit, page);
    }

    /**
     * Create pagination metadata
     * Delegates to PaginationHelper utility
     * @param {number} page - Current page (1-based)
     * @param {number} limit - Items per page
     * @param {number} totalCount - Total items available
     * @returns {Object} Pagination metadata
     */
    createPaginationMetadata(page, limit, totalCount) {
        return createPaginationMetadata(page, limit, totalCount);
    }

    /**
     * Get user's own images (both public and private)
     * Delegates to ImageQueryService
     * @param {string} userId - User ID
     * @param {number} limit - Number of images per page
     * @param {number} page - Page number (1-based)
     * @param {Array} tags - Optional tags filter
     * @returns {Object} Response with images and pagination
     */
    async getUserImages(userId, limit = PAGINATION.USER_IMAGES_LIMIT, page = 1, tags = []) {
        return this.queryService.getUserImages(userId, limit, page, tags);
    }

    /**
     * Get user's public images for profile display
     * Delegates to ImageQueryService
     * @param {string} userId - User ID
     * @param {number} limit - Number of images per page
     * @param {number} page - Page number (1-based)
     * @returns {Object} Response with images and pagination
     */
    async getUserPublicImages(userId, limit = PAGINATION.PROFILE_LIMIT, page = 1) {
        return this.queryService.getUserPublicImages(userId, limit, page);
    }

    /**
     * Get public feed images from all users
     * Delegates to ImageQueryService
     * @param {string} userId - Current user ID (for context)
     * @param {number} limit - Number of images per page
     * @param {number} page - Page number (1-based)
     * @param {Array} tags - Optional tags filter
     * @returns {Object} Response with images and pagination
     */
    async getFeed(userId, limit = PAGINATION.DEFAULT_LIMIT, page = 1, tags = []) {
        return this.queryService.getFeed(userId, limit, page, tags);
    }

    /**
     * Get all user's own images (both public and private)
     * Delegates to ImageQueryService
     * @param {string} userId - User ID (required)
     * @param {number} limit - Number of images per page
     * @param {number} page - Page number (1-based)
     * @param {Array} tags - Optional tags filter
     * @returns {Promise<Object>} Response with images and pagination
     */
    async getUserOwnImages(userId, limit = PAGINATION.DEFAULT_LIMIT, page = 1, tags = []) {
        return this.queryService.getUserOwnImages(userId, limit, page, tags);
    }

    /**
     * Get total image count for a user
     * Delegates to ImageQueryService
     * @param {string} userId - User ID (null for public count)
     * @returns {Promise<Object>} Object with count property
     */
    async getImageCount(userId) {
        return this.queryService.getImageCount(userId);
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
            circuitBreakers: this.circuitBreaker.getHealth(),
            database: 'connected',
            aiService: this.aiService ? 'available' : 'unavailable'
        };

        // Check database connection with timeout protection
        try {
            // Use Promise.race to enforce timeout (5 seconds for health check)
            await Promise.race([
                this.prisma.$queryRaw`SELECT 1`,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 5000))
            ]);
        } catch (error) {
            console.error('❌ Health check database connection failed:', error.message);
            health.database = 'disconnected';
            health.status = 'degraded';
        }

        return health;
    }
}

