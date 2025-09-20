import { ValidationError, NotFoundError } from '../errors/CustomErrors.js';
import { createErrorResponse } from '../utils/errorResponse.js';

export class TagController {
    constructor(tagService) {
        this.tagService = tagService;
    }

    async createTag(req, res) {
        try {
            const { imageId, tag } = req.body;
            const userId = req.user?.id || req.user?._id;

            if (!userId) {
                return res.status(401).json(createErrorResponse('Authentication required'));
            }

            const newTag = await this.tagService.createTag(userId, imageId, tag);

            res.status(201).json({ success: true, data: newTag });
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json(createErrorResponse(error.message));
            }
            console.error('Tag creation error:', error);
            res.status(500).json(createErrorResponse('Failed to create tag'));
        }
    }

    async deleteTag(req, res) {
        try {
            const { imageId, tag } = req.body;
            const userId = req.user?.id || req.user?._id;

            if (!userId) {
                return res.status(401).json(createErrorResponse('Authentication required'));
            }

            await this.tagService.deleteTag(userId, imageId, tag);
            res.json({ success: true, message: 'Tag removed successfully' });
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json(createErrorResponse(error.message));
            }
            if (error instanceof NotFoundError) {
                return res.status(404).json(createErrorResponse(error.message));
            }
            console.error('Tag deletion error:', error);
            res.status(500).json(createErrorResponse('Failed to delete tag'));
        }
    }

    async getTagsByImageId(req, res) {
        try {
            const { imageId } = req.params;
            const tags = await this.tagService.getTagsByImageId(imageId);

            res.json({ success: true, data: tags });
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json(createErrorResponse(error.message));
            }
            console.error('Get tags error:', error);
            res.status(500).json(createErrorResponse('Failed to get tags'));
        }
    }

    async getTagsByUserId(req, res) {
        try {
            const userId = req.user?.id || req.user?._id;

            if (!userId) {
                return res.status(401).json(createErrorResponse('Authentication required'));
            }

            const tags = await this.tagService.getTagsByUserId(userId);

            res.json({ success: true, data: tags });
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json(createErrorResponse(error.message));
            }
            console.error('Get user tags error:', error);
            res.status(500).json(createErrorResponse('Failed to get user tags'));
        }
    }
}
