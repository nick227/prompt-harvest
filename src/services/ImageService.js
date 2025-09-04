import { ValidationError, NotFoundError } from '../errors/CustomErrors.js';

export class ImageService {
    constructor(imageRepository, aiService) {
        this.imageRepository = imageRepository;
        this.aiService = aiService;
    }

    // eslint-disable-next-line max-params
    async generateImage(prompt, providers, guidance, userId, options = {}) {
        const {
            promptId,
            original,
            multiplier,
            mixup,
            mashup,
            customVariables
        } = options;

        // Check if prompt needs processing
        const hasVariables = (/\$\{[^}]+\}/).test(prompt);
        const needsProcessing = hasVariables || multiplier || mixup || mashup || customVariables;

        let processedPrompt = prompt;
        let processedPromptId = promptId;

        if (needsProcessing && this.aiService) {
            try {
                const processedResult = await this.aiService.processPrompt(
                    prompt,
                    multiplier || false,
                    mixup || false,
                    mashup || false,
                    customVariables || ''
                );

                processedPrompt = processedResult.prompt;
                processedPromptId = processedResult.promptId;
            } catch (error) {
                console.error('❌ Error processing prompt:', error);
                // Continue with original prompt if processing fails
            }
        }

        // Delegate to feed service for actual image generation
        // This will be implemented when we extract the feed service
        const response = await this._generateImageWithFeed(
            processedPrompt,
            original,
            processedPromptId,
            providers,
            guidance,
            userId
        );

        return response;
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
        // Get all images (public) if no userId, or user-specific images if authenticated
        const result = userId
            ? await this.imageRepository.findByUserId(userId, limit, page)
            : await this.imageRepository.findAll(limit, page);

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
        // This can be enhanced later to include different logic
        return await this.getImages(userId, limit, page);
    }

    async getImageCount(userId) {
        if (!userId) {
            // Return total count of all images for site-wide view
            const count = await this.imageRepository.countAll();

            return { count };
        }

        const count = await this.imageRepository.countByUserId(userId);

        return { count };
    }

    // eslint-disable-next-line max-params
    async _generateImageWithFeed(prompt, original, promptId, providers, guidance, userId) {
        // Temporary implementation - will be replaced when feed service is extracted
        // For now, we'll import the feed module directly
        const feed = await import('../../src/feed.js');

        return await feed.default.image.generate(
            prompt,
            original,
            promptId,
            providers,
            guidance, { user: { _id: userId } }
        );
    }
}
