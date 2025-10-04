import { imageStorageService } from './ImageStorageService.js';
import DatabaseService from './generate/DatabaseService.js';
import { taggingService } from './TaggingService.js';

export class GenerationResultProcessor {
    /**
     * Process a single successful generation result
     */
    async processSuccessfulResult(result, context) {
        const { prompt, original, promptId, req, autoPublic } = context;

        // Debug promptId preservation
        console.log('🔍 PROMPTID DEBUG: promptId in context:', {
            promptId,
            promptIdType: typeof promptId,
            isNull: promptId === null,
            isUndefined: promptId === undefined,
            contextKeys: Object.keys(context)
        });

        // Log autoPublic value received in processor
        console.log('🔍 PROCESSOR DEBUG: autoPublic value received in processSuccessfulResult:', {
            autoPublic,
            autoPublicType: typeof autoPublic,
            contextKeys: Object.keys(context),
            fullContext: context
        });

        // Step 1: Save image to storage
        const imageUrl = await this.saveImageToStorage(result);

        try {
            // Step 2: Save image metadata to database
            const userId = DatabaseService.getUserId(req);
            // Map database fields: save model name to provider column, keep model column for future use
            const imageData = {
                prompt,
                original,
                provider: result.model || result.provider, // Save model name to database provider column
                imageUrl,
                promptId,
                userId,
                guidance: result.guidance || 10,
                model: null, // Database model column is for future use, keep as null for now
                autoPublic
            };

            // Log imageData being passed to database save
            console.log('🔍 PROCESSOR DEBUG: ImageData being passed to saveImageToDatabase:', {
                imageData,
                userId,
                autoPublicInImageData: imageData.autoPublic,
                autoPublicType: typeof imageData.autoPublic
            });

            // Critical check for userId
            if (!userId) {
                console.log('🚨 CRITICAL: req object:', {
                    hasReq: !!req,
                    hasUser: !!req?.user,
                    hasUserId: !!req?.user?.id,
                    userObject: req?.user
                });
            }

            const savedImage = await this.saveImageToDatabase(imageData);

            // Step 3: Fetch tags for the saved image
            const imageWithTags = await this.fetchImageWithTags(savedImage._id);

            // Step 4: Trigger async tagging (fire-and-forget)
            this.triggerAsyncTagging(savedImage._id, prompt, {
                provider: result.provider,
                userId: DatabaseService.getUserId(req),
                promptId,
                original
            });

            return {
                provider: result.provider,
                success: true,
                imageId: savedImage._id,
                imageUrl,
                imageData: result.data,
                tags: imageWithTags.tags || [],
                taggedAt: imageWithTags.taggedAt,
                taggingMetadata: imageWithTags.taggingMetadata
            };
        } catch (dbError) {
            // Rollback: Delete the stored image if database save fails
            await this.rollbackImageStorage(imageUrl, dbError);
            throw dbError;
        }
    }

    /**
     * Process a failed generation result
     */
    processFailedResult(result) {
        const errorMessage = result.error?.message || result.error || 'Generation failed';

        console.error(`❌ Generation failed for provider ${result.provider}:`, errorMessage);

        return {
            provider: result.provider,
            success: false,
            error: errorMessage
        };
    }

    /**
     * Process a generation result with error handling
     */
    async processResultWithErrorHandling(result, context) {
        try {
            if (result.success && result.data && typeof result.data === 'string') {
                return await this.processSuccessfulResult(result, context);
            } else {
                return this.processFailedResult(result);
            }
        } catch (error) {
            console.error(`❌ Failed to save image for provider ${result.provider}:`, {
                error: error.message,
                provider: result.provider,
                userId: DatabaseService.getUserId(context.req),
                prompt: context.prompt ? `${context.prompt.substring(0, 50)}...` : 'undefined'
            });

            return {
                provider: result.provider,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Save image to storage
     */
    async saveImageToStorage(result) {
        const buffer = Buffer.from(result.data, 'base64');
        const filename = imageStorageService.generateFilename(buffer, result.provider);

        return await imageStorageService.saveImage(buffer, filename);
    }

    /**
     * Save image metadata to database
     */
    async saveImageToDatabase(imageData) {
        const savedImage = await DatabaseService.saveImageToDatabase(imageData);

        if (!savedImage._id) {
            console.error('❌ CRITICAL: savedImage._id is undefined!', { savedImage });
            throw new Error('Database save failed - no ID returned');
        }

        return savedImage;
    }

    /**
     * Rollback image storage on database failure
     */
    async rollbackImageStorage(imageUrl, dbError) {
        console.error('❌ Database save failed, cleaning up stored image:', dbError.message);
        try {
            await imageStorageService.deleteImage(imageUrl);
        } catch (cleanupError) {
            console.error('❌ Failed to cleanup orphaned image file:', cleanupError.message);
        }
    }

    /**
     * Fetch image with tags
     */
    async fetchImageWithTags(imageId) {
        try {
            // Fetch the actual image data from database to ensure userId is included
            const image = await DatabaseService.getImageById(imageId);

            if (!image) {
                console.warn('⚠️ Image not found in database:', imageId);
                return {
                    tags: [],
                    taggedAt: null,
                    taggingMetadata: null
                };
            }

            return {
                id: image.id,
                userId: image.userId,
                isPublic: image.isPublic,
                tags: image.tags || [],
                taggedAt: image.taggedAt,
                taggingMetadata: image.taggingMetadata
            };
        } catch (error) {
            console.error('❌ Error fetching image with tags:', error);
            return {
                tags: [],
                taggedAt: null,
                taggingMetadata: null
            };
        }
    }

    /**
     * Trigger async tagging (fire-and-forget)
     */
    triggerAsyncTagging(imageId, prompt, metadata) {
        // Fire-and-forget tagging service call
        // This does NOT block the HTTP response
        // Only run auto-tagging in production
        if (process.env.NODE_ENV === 'production') {
            taggingService.tagImageAsync(imageId, prompt, metadata);
        }
    }

    /**
     * Process all generation results
     */
    async processAllResults(results, context) {
        const processedResults = [];

        for (const result of results) {
            const processedResult = await this.processResultWithErrorHandling(result, context);

            processedResults.push(processedResult);
        }

        return processedResults;
    }
}
