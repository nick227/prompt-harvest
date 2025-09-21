/**
 * Feed System - Main Orchestrator
 *
 * This is the main entry point for the image generation feed system.
 * It orchestrates the interaction between various services:
 * - PromptProcessor: Handles prompt manipulation and processing
 * - ImageGenerator: Manages image generation across multiple providers
 * - QueueManager: Handles request queuing and processing
 * - DatabaseService: Manages data persistence
 * - FeedUtils: Provides utility functions
 *
 * The system follows a clean architecture pattern with clear separation
 * of concerns and dependency injection.
 */

// ============================================================================
// IMPORTS AND DEPENDENCIES
// ============================================================================

import dotenv from 'dotenv';

// Service imports
import PromptProcessor from './services/feed/PromptProcessor.js';
import ImageGenerator from './services/feed/ImageGenerator.js';
import QueueManager from './services/feed/QueueManager.js';
import DatabaseService from './services/feed/DatabaseService.js';
import FeedUtils from './utils/FeedUtils.js';
import { GenerationResultProcessor } from './services/GenerationResultProcessor.js';
import { PrismaClient } from '@prisma/client';

// Configuration
dotenv.config();


const DEFAULT_GUIDANCE_VALUE = 10;

// Initialize Prisma client for tag fetching
const prisma = new PrismaClient();

// ============================================================================
// MAIN FEED ORCHESTRATION FUNCTIONS
// ============================================================================

/**
 * Main image generation function
 *
 * This is the core function that orchestrates the entire image generation process:
 * 1. Validates input parameters
 * 2. Processes the prompt (multiplier, mixup, mashup)
 * 3. Generates images from multiple providers
 * 4. Saves results to database
 * 5. Returns formatted response
 *
 * @param {string} prompt - Image generation prompt
 * @param {string} original - Original prompt (for tracking)
 * @param {string} promptId - Associated prompt ID
 * @param {Array} providers - Array of provider names to use
 * @param {number} guidance - Guidance value for generation
 * @param {Object} req - Express request object (for user context)
 * @returns {Promise<Object>} Generation result
 */
// eslint-disable-next-line max-params
const handleGenerationError = async(requestId, error, startTime) => {
    const duration = Date.now() - startTime;

    // Debug logging for feed errors
    console.error('🔍 FEED GENERATE ERROR DEBUG:', {
        error,
        errorType: typeof error,
        errorMessage: error?.message,
        errorName: error?.name,
        errorStack: error?.stack?.substring(0, 500)
    });

    FeedUtils.logRequestError(requestId, error, duration);

    // Cleanup on failure
    await cleanupAfterFailure(requestId, error);

    throw error;
};

const generate = async options => {
    const { prompt, original, promptId, providers, guidance, req } = options;
    const requestId = FeedUtils.generateRequestId();
    const startTime = Date.now();

    try {
        // Log request start
        FeedUtils.logRequestStart(requestId, {
            prompt,
            providers,
            guidance,
            userId: DatabaseService.getUserId(req)
        });

        // Validate input parameters
        const validation = FeedUtils.validateImageGenerationParams({
            prompt,
            providers,
            guidance
        });

        if (!validation.isValid) {
            throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`);
        }

        // Generate image from a randomly selected provider
        const result = await ImageGenerator.generateRandomProviderImage(
            providers,
            prompt,
            guidance,
            DatabaseService.getUserId(req)
        );

        // Wrap single result in array format to maintain compatibility
        const results = [result];

        // Process results and save to database
        const processedResults = await processGenerationResults(results, {
            prompt,
            original,
            promptId,
            requestId,
            req
        });

        // Log successful completion
        const duration = Date.now() - startTime;

        FeedUtils.logRequestCompletion(requestId, duration, true);

        return {
            success: true,
            requestId,
            results: processedResults,
            duration
        };

    } catch (error) {
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
const cleanupAfterFailure = async(requestId, error) => {
    // Log cleanup operation
    FeedUtils.logRequestError(requestId, error, 0);

    // Add any cleanup logic here (e.g., remove temporary files, reset state)
    // For now, we just log the cleanup
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
 * @param {string} multiplier - Multiplier to apply
 * @param {boolean} mixup - Whether to shuffle parts
 * @param {boolean} mashup - Whether to shuffle words
 * @param {string} customVariables - Custom variables string
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Processed prompt data
 */
// eslint-disable-next-line max-params
const buildPrompt = async(prompt, multiplier, mixup, mashup, customVariables, photogenic = false, artistic = false, req) => {
    try {
        // Validate prompt processing parameters
        const validation = FeedUtils.validatePromptProcessingParams({
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
            multiplier,
            mixup,
            mashup,
            customVariables,
            photogenic,
            artistic
        );

        if (processedPrompt.error) {
            throw new Error(processedPrompt.error);
        }

        // Save prompt to database
        try {
            const savedPrompt = await DatabaseService.saveFeedEvent('prompt', {
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
// QUEUE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Add image generation request to queue
 *
 * @param {string} prompt - Image generation prompt
 * @param {string} original - Original prompt
 * @param {string} promptId - Associated prompt ID
 * @param {Array} providers - Provider names
 * @param {number} guidance - Guidance value
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Generation result
 */
// eslint-disable-next-line max-params
const generateImage = async(prompt, original, promptId, providers, guidance, req) => QueueManager.addToQueue({
    prompt,
    original,
    promptId,
    providers,
    guidance,
    req
});

/**
 * Process the generation queue
 *
 * @param {Object} req - Express request object
 */
const processQueue = async req => {
    await QueueManager.processQueue(async requestData => await generate(
        requestData.prompt,
        requestData.original,
        requestData.promptId,
        requestData.providers,
        requestData.guidance,
        req
    ));
};

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
const generateId = () => FeedUtils.generateId();

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Save feed event to database
 *
 * @param {string} type - Event type ('prompt' or 'image')
 * @param {Object} data - Event data
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Saved event data
 */
const saveFeedEvent = async(type, data, req) => DatabaseService.saveFeedEvent(type, data, req);

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

/**
 * Fetch image with tags from database
 * @private
 */
const _fetchImageWithTags = async imageId => {
    try {
        const image = await prisma.image.findUnique({
            where: { id: imageId },
            select: {
                id: true,
                tags: true,
                taggedAt: true,
                taggingMetadata: true
            }
        });

        if (!image) {
            return {
                id: imageId,
                tags: [],
                taggedAt: null,
                taggingMetadata: null
            };
        }

        return {
            id: image.id,
            tags: image.tags || [],
            taggedAt: image.taggedAt,
            taggingMetadata: image.taggingMetadata
        };

    } catch (error) {
        console.error('Error fetching image with tags:', error);

        return {
            id: imageId,
            tags: [],
            taggedAt: null,
            taggingMetadata: null
        };
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
    // Main functions
    generate,
    generateImage,
    buildPrompt,
    processQueue,

    // Utility functions
    getUserId,
    generateId,

    // Database functions
    saveFeedEvent,
    saveImageToDatabase,
    savePromptToDatabase,

    // Configuration
    DEFAULT_GUIDANCE_VALUE
};

export default {
    generate,
    generateImage,
    buildPrompt,
    processQueue,
    getUserId,
    generateId,
    saveFeedEvent,
    saveImageToDatabase,
    savePromptToDatabase,
    DEFAULT_GUIDANCE_VALUE
};

