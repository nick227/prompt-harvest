import { ValidationError, NotFoundError } from '../errors/CustomErrors.js';
import { createErrorResponse } from '../utils/errorResponse.js';

export class BlogController {
    constructor(blogService) {
        console.log('🔍 BLOG-CONTROLLER: Controller initialized');
        this.blogService = blogService;
    }

    async createPost(req, res) {
        try {
            console.log('🔍 BLOG-CONTROLLER: Create post request received - DEBUGGING ACTIVE');
            console.log('🔍 BLOG-CONTROLLER: User data:', {
                userId: req.user?.id || req.user?._id,
                isAdmin: req.user?.isAdmin,
                user: req.user
            });
            console.log('🔍 BLOG-CONTROLLER: Post data:', req.body);

            const userId = req.user?.id || req.user?._id;
            const isAdmin = req.user?.isAdmin || false;

            if (!userId) {
                console.log('🔍 BLOG-CONTROLLER: No user ID found');
                return res.status(401).json(createErrorResponse('Authentication required'));
            }

            console.log('🔍 BLOG-CONTROLLER: Calling blog service with:', { userId, isAdmin });
            const postData = req.body;
            const newPost = await this.blogService.createPost(userId, postData, isAdmin);

            console.log('🔍 BLOG-CONTROLLER: Post created successfully:', newPost);
            res.status(201).json({ success: true, data: newPost });
        } catch (error) {
            console.error('🔍 BLOG-CONTROLLER: Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                isValidationError: error instanceof ValidationError
            });

            if (error instanceof ValidationError) {
                return res.status(400).json(createErrorResponse(error.message));
            }
            console.error('Blog post creation error:', error);
            res.status(500).json(createErrorResponse('Failed to create blog post'));
        }
    }

    async getPostById(req, res) {
        try {
            const { id } = req.params;
            const post = await this.blogService.getPostById(id);

            res.json({ success: true, data: post });
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json(createErrorResponse(error.message));
            }
            if (error instanceof NotFoundError) {
                return res.status(404).json(createErrorResponse(error.message));
            }
            console.error('Get blog post error:', error);
            res.status(500).json(createErrorResponse('Failed to get blog post'));
        }
    }

    async getPostBySlug(req, res) {
        try {
            const { slug } = req.params;
            const userId = req.user?.id || req.user?._id;
            const post = await this.blogService.getPostBySlug(slug, userId);

            res.json({ success: true, data: post });
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json(createErrorResponse(error.message));
            }
            if (error instanceof NotFoundError) {
                return res.status(404).json(createErrorResponse(error.message));
            }
            console.error('Get blog post by slug error:', error);
            res.status(500).json(createErrorResponse('Failed to get blog post'));
        }
    }

    async getPublishedPosts(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const featured = req.query.featured === 'true';

            const result = await this.blogService.getPublishedPosts(page, limit, featured);

            res.json({ success: true, data: result });
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json(createErrorResponse(error.message));
            }
            console.error('Get published posts error:', error);
            res.status(500).json(createErrorResponse('Failed to get published posts'));
        }
    }

    async getUserPosts(req, res) {
        try {
            const userId = req.user?.id || req.user?._id;

            if (!userId) {
                return res.status(401).json(createErrorResponse('Authentication required'));
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            const result = await this.blogService.getUserPosts(userId, page, limit);

            res.json({ success: true, data: result });
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json(createErrorResponse(error.message));
            }
            console.error('Get user posts error:', error);
            res.status(500).json(createErrorResponse('Failed to get user posts'));
        }
    }

    async getDraftPosts(req, res) {
        try {
            const userId = req.user?.id || req.user?._id;

            if (!userId) {
                return res.status(401).json(createErrorResponse('Authentication required'));
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            const result = await this.blogService.getDraftPosts(userId, page, limit);

            res.json({ success: true, data: result });
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json(createErrorResponse(error.message));
            }
            console.error('Get draft posts error:', error);
            res.status(500).json(createErrorResponse('Failed to get draft posts'));
        }
    }

    async updatePost(req, res) {
        try {
            const userId = req.user?.id || req.user?._id;
            const isAdmin = req.user?.isAdmin || false;

            if (!userId) {
                return res.status(401).json(createErrorResponse('Authentication required'));
            }

            const { id } = req.params;
            const updateData = req.body;

            const updatedPost = await this.blogService.updatePost(userId, id, updateData, isAdmin);

            res.json({ success: true, data: updatedPost });
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json(createErrorResponse(error.message));
            }
            if (error instanceof NotFoundError) {
                return res.status(404).json(createErrorResponse(error.message));
            }
            console.error('Update blog post error:', error);
            res.status(500).json(createErrorResponse('Failed to update blog post'));
        }
    }

    async deletePost(req, res) {
        try {
            const userId = req.user?.id || req.user?._id;
            const isAdmin = req.user?.isAdmin || false;

            if (!userId) {
                return res.status(401).json(createErrorResponse('Authentication required'));
            }

            const { id } = req.params;

            const result = await this.blogService.deletePost(userId, id, isAdmin);

            res.json({ success: true, data: result });
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json(createErrorResponse(error.message));
            }
            if (error instanceof NotFoundError) {
                return res.status(404).json(createErrorResponse(error.message));
            }
            console.error('Delete blog post error:', error);
            res.status(500).json(createErrorResponse('Failed to delete blog post'));
        }
    }

    // Thumbnail upload is handled by existing ProfileController.uploadAvatar method
}
