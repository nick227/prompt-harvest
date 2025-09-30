/**
 * Image Generation System - Main Orchestrator
 *
 * This is the main entry point for the image generation system.
 * It orchestrates the interaction between various services:
 * - PromptProcessor: Handles prompt manipulation and processing
 * - ImageGenerator: Manages image generation using randomly selected providers
 * - QueueManager: Handles request queuing and processing
 * - DatabaseService: Manages data persistence
 * - GenerateUtils: Provides utility functions
 *
 * The system follows a clean architecture pattern with clear separation
 * of concerns and dependency injection.
 */

// ============================================================================
// IMPORTS AND DEPENDENCIES
// ============================================================================

import dotenv from 'dotenv';

// Service imports
import PromptProcessor from './services/generate/PromptProcessor.js';
import ImageGenerator from './services/generate/ImageGenerator.js';
import getQueueManager from './services/generate/QueueManager.js';
import DatabaseService from './services/generate/DatabaseService.js';
import GenerateUtils from './utils/GenerateUtils.js';
import { GenerationResultProcessor } from './services/GenerationResultProcessor.js';

// Use the lazy getter (instance), not the function
const QueueManager = getQueueManager();

// Configuration
dotenv.config();


const DEFAULT_GUIDANCE_VALUE = 10;

// Prisma client removed - no longer needed for tag fetching

// ============================================================================
// MAIN generate ORCHESTRATION FUNCTIONS
// ============================================================================

/**
 * Main image generation function
 *
 * This is the core function that orchestrates the entire image generation process:
 * 1. Validates input parameters
 * 2. Processes the prompt (multiplier, mixup, mashup)
 * 3. Generates images from either a randomly selected provider or multiple providers (configurable)
 * 4. Saves results to database
 * 5. Returns formatted response
 *
 * @param {string} prompt - Image generation prompt
 * @param {string} original - Original prompt (for tracking)
 * @param {string} promptId - Associated prompt ID
 * @param {Array} providers - Array of provider names to choose from (one is randomly selected)
 * @param {number} guidance - Guidance value for generation
 * @param {Object} req - Express request object (for user context)
 * @returns {Promise<Object>} Generation result
 */
// eslint-disable-next-line max-params
const handleGenerationError = async (requestId, error, startTime) => {
    const duration = Date.now() - startTime;

    GenerateUtils.logRequestError(requestId, error, duration);
    console.error('GENERATE ERROR:', { name: error?.name, message: error?.message });

    await cleanupAfterFailure(requestId); // no logging here

    throw error;
};

// generate: pass signal into _executeGeneration
const generate = async options => {
    try {
        const queueOptions = {
            userId: DatabaseService.getUserId(options.req),
            priority: options.priority || 'normal',
            timeout: options.timeout || 300000
        };

        return await QueueManager.addToQueue(async signal => _executeGeneration(options, signal), queueOptions);
    } catch (error) {
        console.error('❌ Generate function error:', {
            error: error.message,
            stack: error.stack,
            userId: DatabaseService.getUserId(options.req)
        });

        // Return a structured error response instead of throwing
        return {
            success: false,
            error: error.message || 'Generation failed',
            requestId: GenerateUtils.generateRequestId()
        };
    }
};

/**
 * Core image generation function (called by queue)
 */
const _executeGeneration = async (options, signal) => {
    const {
        prompt,
        original,
        promptId,
        providers,
        guidance,
        req,
        autoPublic
    } = options;

    const effectiveGuidance = guidance ?? DEFAULT_GUIDANCE_VALUE;

    const requestId = GenerateUtils.generateRequestId();
    const startTime = Date.now();

    try {
        GenerateUtils.logRequestStart(requestId, {
            prompt,
            providers,
            guidance: effectiveGuidance,
            userId: DatabaseService.getUserId(req)
        });

        const validation = GenerateUtils.validateImageGenerationParams({
            prompt,
            providers,
            guidance: effectiveGuidance
        });

        if (!validation.isValid) {
            throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`);
        }

        // Generate images using either single random provider or multi-provider fanout
        const useMultiProvider = process.env.ENABLE_MULTI_PROVIDER_FANOUT === 'true';

        let results;

        if (useMultiProvider) {

            const multiResults = await ImageGenerator.generateMultipleProviderImages(
                providers,
                prompt,
                effectiveGuidance,
                DatabaseService.getUserId(req),
                { signal } // <-- pass through
            );

            // Convert multi-provider results to single result format for compatibility
            const successfulResults = multiResults.filter(r => r.success);

            if (successfulResults.length === 0) {
                throw new Error('All providers failed to generate images');
            }

            // Use the first successful result for now (could be enhanced to return all)
            results = successfulResults.map(r => ({
                provider: r.provider,
                ...r.data
            }));
        } else {

            const singleResult = await ImageGenerator.generateRandomProviderImage(
                providers,
                prompt,
                effectiveGuidance,
                DatabaseService.getUserId(req),
                { signal } // <-- pass through
            );

            results = [singleResult];
        }

        // Process results and save to database
        const context = {
            prompt,
            original,
            promptId,
            requestId,
            req,
            autoPublic
        };

        const processedResults = await processGenerationResults(results, context);

        // Log successful completion
        const duration = Date.now() - startTime;

        GenerateUtils.logRequestCompletion(requestId, duration, true);

        return {
            success: true,
            requestId,
            results: processedResults,
            duration
        };

    } catch (error) {
        // Log the error but don't let it crash the application
        console.error('❌ Generation error caught:', {
            requestId,
            error: error.message,
            stack: error.stack,
            userId: DatabaseService.getUserId(req)
        });

        return await handleGenerationError(requestId, error, startTime);
    }
};

/**
 * Process generation results and save to database
 *
 * @param {Array} results - Array of generation results
 * @param {Object} context - Generation context
 * @returns {Promise<Array>} Processed results
 */
const processGenerationResults = async(results, context) => {
    const processor = new GenerationResultProcessor();

    return await processor.processAllResults(results, context);
};

/**
 * Cleanup after generation failure
 *
 * @param {string} requestId - Request ID
 * @param {Error} error - Error that occurred
 */
const cleanupAfterFailure = async _requestId => {
    // optional temp-file cleanup; no logs (already recorded)
};

// ============================================================================
// PROMPT PROCESSING FUNCTIONS
// ============================================================================

/**
 * Build and process prompt with all modifications
 *
 * This function handles the complete prompt processing pipeline:
 * 1. Custom variable processing
 * 2. Text processing with word type manager
 * 3. Multiplier application
 * 4. Mixup (shuffle parts)
 * 5. Mashup (shuffle words)
 * 6. Save to database
 *
 * @param {string} prompt - Original prompt
 * @param {Object} options - Processing options
 * @param {string} options.multiplier - Multiplier to apply
 * @param {boolean} options.mixup - Whether to shuffle parts
 * @param {boolean} options.mashup - Whether to shuffle words
 * @param {string} options.customVariables - Custom variables string
 * @param {Object} options.promptHelpers - Object with helper keys as properties and boolean values
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Processed prompt data
 */
const buildPrompt = async (
    prompt,
    options = {},
    req
) => {
    const { multiplier, mixup, mashup, customVariables, promptHelpers = {} } = options;

    try {
        // Validate prompt processing parameters
        const validation = GenerateUtils.validatePromptProcessingParams({
            prompt,
            multiplier,
            mixup,
            mashup
        });

        if (!validation.isValid) {
            throw new Error(`Invalid prompt parameters: ${validation.errors.join(', ')}`);
        }

        // Process prompt using PromptProcessor service
        const processedPrompt = await PromptProcessor.buildPrompt(
            prompt,
            {
                multiplier,
                mixup,
                mashup,
                customVariables,
                promptHelpers
            }
        );

        if (processedPrompt.error) {
            throw new Error(processedPrompt.error);
        }

        // Save prompt to database
        try {
            const savedPrompt = await DatabaseService.saveGenerateEvent('prompt', {
                original: processedPrompt.original,
                prompt: processedPrompt.prompt,
                provider: 'prompt-builder'
            }, req);

            if (!savedPrompt || !savedPrompt._id) {
                console.warn('⚠️ Prompt save returned no ID:', savedPrompt);

                return {
                    original: processedPrompt.original,
                    prompt: processedPrompt.prompt,
                    promptId: null
                };
            }

            return {
                original: processedPrompt.original,
                prompt: processedPrompt.prompt,
                promptId: savedPrompt._id
            };
        } catch (error) {
            console.error('❌ Failed to save prompt to database:', error);

            // Return prompt data even if save failed
            return {
                original: processedPrompt.original,
                prompt: processedPrompt.prompt,
                promptId: null
            };
        }

    } catch (error) {
        console.error('❌ Error building prompt:', error);

        return { error: 'Error generating image' };
    }
};

// ============================================================================
// QUEUE INTEGRATION
// ============================================================================

// generate() function now automatically routes through queue for volume monitoring

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get user ID from request
 *
 * @param {Object} req - Express request object
 * @returns {string|null} User ID or null if not authenticated
 */
const getUserId = req => DatabaseService.getUserId(req);

/**
 * Generate a unique ID
 *
 * @returns {string} Unique ID
 */
const generateId = () => GenerateUtils.generateId();

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Save generate event to database
 *
 * @param {string} type - Event type ('prompt' or 'image')
 * @param {Object} data - Event data
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Saved event data
 */
const saveGenerateEvent = async(type, data, req) => DatabaseService.saveGenerateEvent(type, data, req);

/**
 * Save image to database
 *
 * @param {Object} imageData - Image data
 * @returns {Promise<Object>} Saved image data
 */
const saveImageToDatabase = async imageData => DatabaseService.saveImageToDatabase(imageData);

/**
 * Save prompt to database
 *
 * @param {Object} promptData - Prompt data
 * @returns {Promise<Object>} Saved prompt data
 */
const savePromptToDatabase = async promptData => DatabaseService.savePromptToDatabase(promptData);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Unused _fetchImageWithTags method removed - TagController handles tag fetching

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    // Main functions
    generate,
    buildPrompt,

    // Internal functions (for queue processing)
    _executeGeneration,

    // Utility functions
    getUserId,
    generateId,

    // Database functions
    saveGenerateEvent,
    saveImageToDatabase,
    savePromptToDatabase,

    // Configuration
    DEFAULT_GUIDANCE_VALUE
};

