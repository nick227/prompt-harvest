import { ValidationError, NotFoundError } from '../errors/CustomErrors.js';
import { createErrorResponse } from '../utils/errorResponse.js';

export class LikeController {
    constructor(likeService) {
        this.likeService = likeService;
    }

    async createLike(req, res) {
        try {
            const { id: imageId } = req.params;
            const userId = req.user?.id || req.user?._id;

            if (!userId) {
                return res.status(401).json(createErrorResponse('Authentication required'));
            }

            const like = await this.likeService.createLike(userId, imageId);

            res.status(201).json({ success: true, data: like });
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json(createErrorResponse(error.message));
            }
            if (error instanceof NotFoundError) {
                return res.status(404).json(createErrorResponse(error.message));
            }
            console.error('Like creation error:', error);
            res.status(500).json(createErrorResponse('Failed to create like'));
        }
    }

    async deleteLike(req, res) {
        try {
            const { id: imageId } = req.params;
            const userId = req.user?.id || req.user?._id;

            if (!userId) {
                return res.status(401).json(createErrorResponse('Authentication required'));
            }

            await this.likeService.deleteLike(userId, imageId);
            res.json({ success: true, message: 'Like removed successfully' });
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json(createErrorResponse(error.message));
            }
            if (error instanceof NotFoundError) {
                return res.status(404).json(createErrorResponse(error.message));
            }
            console.error('Like deletion error:', error);
            res.status(500).json(createErrorResponse('Failed to delete like'));
        }
    }

    async checkIfLiked(req, res) {
        try {
            const { id: imageId } = req.params;
            const userId = req.user?.id || req.user?._id;

            const isLiked = await this.likeService.checkIfLiked(userId, imageId);

            res.json({ liked: isLiked });
        } catch (error) {
            console.error('Like check error:', error);
            res.status(500).json(createErrorResponse('Failed to check like status'));
        }
    }

    async getLikesByImageId(req, res) {
        try {
            const { imageId } = req.params;
            const likes = await this.likeService.getLikesByImageId(imageId);

            res.json({ success: true, data: likes });
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json(createErrorResponse(error.message));
            }
            console.error('Get likes error:', error);
            res.status(500).json(createErrorResponse('Failed to get likes'));
        }
    }
}
