import { ValidationError, NotFoundError, DatabaseError } from '../errors/CustomErrors.js';

export class ImageController {
    constructor(imageService) {
        this.imageService = imageService;
    }

    async generateImage(req, res) {
        try {
            const prompt = decodeURIComponent(req.body.prompt);
            const providers = decodeURIComponent(req.body.providers).split(',');
            const guidance = isNaN(req.body.guidance) ? false : parseInt(req.body.guidance);
            const userId = req.user?._id;

            const options = {
                promptId: req.body.promptId,
                original: req.body.original,
                multiplier: req.body.multiplier,
                mixup: req.body.mixup,
                mashup: req.body.mashup,
                customVariables: req.body.customVariables
            };

            const response = await this.imageService.generateImage(
                prompt,
                providers,
                guidance,
                userId,
                options
            );

            res.send(response);
        } catch (error) {
            console.error('❌ Image generation error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async updateRating(req, res) {
        try {
            const { id } = req.params;
            const { rating } = req.body;

            const result = await this.imageService.updateRating(id, rating);

            res.json(result);
        } catch (error) {
            console.error('❌ Rating update error:', error);

            if (error.message === 'No image found to update') {
                throw new NotFoundError('Image');
            } else {
                throw new ValidationError(error.message, 'rating');
            }
        }
    }

    async deleteImage(req, res) {
        try {
            const { id } = req.params;
            const result = await this.imageService.deleteImage(id);

            res.send(result);
        } catch (error) {
            console.error('❌ Image deletion error:', error);
            throw new DatabaseError(error.message, 'delete');
        }
    }

    async getImages(req, res) {
        try {
            const { id: userId } = req.user || {}; // Use consistent field name
            const limit = parseInt(req.query.limit) || 8;
            const page = parseInt(req.query.page) || 0;

            const result = await this.imageService.getImages(userId, limit, page);

            res.json({
                success: true,
                images: result.images,
                hasMore: result.hasMore,
                totalCount: result.totalCount
            });
        } catch (error) {
            console.error('❌ Get images error:', error);
            throw new DatabaseError(error.message, 'find');
        }
    }

    async getImageCount(req, res) {
        try {
            const { id: userId } = req.user || {}; // Use consistent field name
            const result = await this.imageService.getImageCount(userId);

            res.send(result);
        } catch (error) {
            console.error('❌ Get image count error:', error);
            throw new DatabaseError(error.message, 'count');
        }
    }

    async getFeed(req, res) {
        try {
            // Support both authenticated user and explicit userId parameter
            let { id: userId } = req.user || {}; // Use consistent field name

            // If userId is provided in query params, use it (for owner filtering)
            if (req.query.userId) {
                const { userId: queryUserId } = req.query;

                userId = queryUserId;
                // eslint-disable-next-line no-console
                console.log('🔧 Feed request with explicit userId:', userId);
            } else {
                // eslint-disable-next-line no-console
                console.log('🔧 Feed request with authenticated user:', userId || 'anonymous');
            }

            const limit = parseInt(req.query.limit) || 8;
            const page = parseInt(req.query.page) || 0;

            const result = await this.imageService.getFeed(userId, limit, page);

            // eslint-disable-next-line no-console
            console.log(`✅ Feed returned ${result.images.length} images for userId: ${userId || 'all'}`);

            res.json({
                success: true,
                images: result.images,
                hasMore: result.hasMore,
                totalCount: result.totalCount
            });
        } catch (error) {
            console.error('❌ Get feed error:', error);
            throw new DatabaseError(error.message, 'feed');
        }
    }

    async getImagesCount(req, res) {
        try {
            const { id: userId } = req.user || {}; // Use consistent field name
            const result = await this.imageService.getImageCount(userId);

            res.send(result);
        } catch (error) {
            console.error('❌ Get images count error:', error);
            throw new DatabaseError(error.message, 'count');
        }
    }
}
