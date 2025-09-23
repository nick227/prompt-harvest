import { PrismaClient } from '@prisma/client';
import { EnhancedImageService } from '../services/EnhancedImageService.js';
import { ImageRepository } from '../repositories/ImageRepository.js';
import { AIService } from '../services/AIService.js';
import { ImageStorageService } from '../services/ImageStorageService.js';
import { formatErrorResponse, formatSuccessResponse } from '../utils/ResponseFormatter.js';
import { generateRequestId, logRequestStart, logRequestSuccess, logRequestError } from '../utils/RequestLogger.js';
import crypto from 'crypto';

export class ProfileController {
    constructor() {
        this.prisma = new PrismaClient();
        this.imageRepository = new ImageRepository();
        this.aiService = new AIService();
        this.enhancedImageService = new EnhancedImageService(this.imageRepository, this.aiService);
        this.imageStorageService = new ImageStorageService('cdn'); // Use CDN storage for profile pictures
    }

    /**
     * Check username availability
     * POST /api/profile/check-username
     */
    async checkUsernameAvailability(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            const { username } = req.body;
            const userId = req.user?.id;

            if (!username || typeof username !== 'string' || username.trim().length === 0) {
                return res.status(400).json(formatErrorResponse('Username is required', requestId, Date.now() - startTime));
            }

            if (username.length < 3 || username.length > 50) {
                return res.status(400).json(formatErrorResponse('Username must be between 3 and 50 characters', requestId, Date.now() - startTime));
            }

            // Check if username contains only valid characters (alphanumeric, underscore, hyphen)
            if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
                return res.status(400).json(formatErrorResponse('Username can only contain letters, numbers, underscores, and hyphens', requestId, Date.now() - startTime));
            }

            // Check if username is already taken by another user
            const existingUser = await this.prisma.user.findFirst({
                where: {
                    username: username.trim(),
                    id: { not: userId } // Exclude current user
                }
            });

            const isAvailable = !existingUser;

            const response = formatSuccessResponse({
                username: username.trim(),
                available: isAvailable
            }, requestId, Date.now() - startTime);

            logRequestSuccess(requestId, 'Check Username Availability', Date.now() - startTime, {
                username: username.trim(),
                available: isAvailable
            });

            return res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse('Failed to check username availability', requestId, duration, error.message);

            logRequestError(requestId, 'Check Username Availability', duration, error);

            return res.status(500).json(errorResponse);
        }
    }

    /**
     * Update user profile (username and/or avatar)
     * PUT /api/profile/update
     */
    async updateProfile(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            const { username, avatarUrl } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json(formatErrorResponse('Authentication required', requestId, Date.now() - startTime));
            }

            const updateData = {};

            // Update username if provided
            if (username !== undefined) {
                if (typeof username !== 'string' || username.trim().length === 0) {
                    return res.status(400).json(formatErrorResponse('Username is required', requestId, Date.now() - startTime));
                }

                if (username.length < 3 || username.length > 50) {
                    return res.status(400).json(formatErrorResponse('Username must be between 3 and 50 characters', requestId, Date.now() - startTime));
                }

                if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
                    return res.status(400).json(formatErrorResponse('Username can only contain letters, numbers, underscores, and hyphens', requestId, Date.now() - startTime));
                }

                // Check if username is already taken by another user
                const existingUser = await this.prisma.user.findFirst({
                    where: {
                        username: username.trim(),
                        id: { not: userId }
                    }
                });

                if (existingUser) {
                    return res.status(400).json(formatErrorResponse('Username is already taken', requestId, Date.now() - startTime));
                }

                updateData.username = username.trim();
            }

            // Update avatar if provided
            if (avatarUrl !== undefined) {
                if (typeof avatarUrl !== 'string' || avatarUrl.trim().length === 0) {
                    return res.status(400).json(formatErrorResponse('Avatar URL is required', requestId, Date.now() - startTime));
                }

                updateData.picture = avatarUrl.trim();
            }

            // Update user profile
            const updatedUser = await this.prisma.user.update({
                where: { id: userId },
                data: updateData,
                select: {
                    id: true,
                    username: true,
                    email: true,
                    picture: true,
                    updatedAt: true
                }
            });

            const response = formatSuccessResponse({
                user: updatedUser,
                message: 'Profile updated successfully'
            }, requestId, Date.now() - startTime);

            logRequestSuccess(requestId, 'Update Profile', Date.now() - startTime, {
                userId,
                updatedFields: Object.keys(updateData)
            });

            return res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse('Failed to update profile', requestId, duration, error.message);

            logRequestError(requestId, 'Update Profile', duration, error);

            return res.status(500).json(errorResponse);
        }
    }

    /**
     * Generate avatar using AI
     * POST /api/profile/generate-avatar
     */
    async generateAvatar(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            const { prompt, provider = 'dalle3' } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json(formatErrorResponse('Authentication required', requestId, Date.now() - startTime));
            }

            if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
                return res.status(400).json(formatErrorResponse('Avatar description is required', requestId, Date.now() - startTime));
            }

            if (prompt.length > 500) {
                return res.status(400).json(formatErrorResponse('Avatar description must be 500 characters or less', requestId, Date.now() - startTime));
            }

            // Map provider names to the format expected by the image generation service
            const providerMap = {
                'dalle3': ['dalle3'],
                'dalle2': ['dalle2']
            };

            const providers = providerMap[provider] || ['dalle3'];

            // Generate avatar using the existing image generation pipeline
            const result = await this.enhancedImageService.generateImage(
                prompt.trim(),
                providers,
                10, // guidance
                userId,
                {
                    avatar: true, // Use avatar prompt helper
                    autoPublic: false // Keep avatar private
                }
            );

            // Handle error response from service
            if (result.error || result.success === false) {
                const duration = Date.now() - startTime;
                const errorResponse = formatErrorResponse(result.error || 'Failed to generate avatar', requestId, duration);

                logRequestError(requestId, 'Generate Avatar', duration, result);

                return res.status(errorResponse.statusCode || 500).json(errorResponse);
            }

            // Update user's profile picture with the generated avatar
            if (result.results && result.results.length > 0 && result.results[0].success) {
                const avatarUrl = result.results[0].imageUrl;

                await this.prisma.user.update({
                    where: { id: userId },
                    data: { picture: avatarUrl }
                });

                // Update the result to include the updated user info
                result.userUpdated = true;
                result.avatarUrl = avatarUrl;
            }

            console.log('🔍 PROFILE CONTROLLER: Result data before formatting:', {
                hasResults: !!result.results,
                resultsLength: result.results?.length || 0,
                hasAvatarUrl: !!result.avatarUrl,
                avatarUrl: result.avatarUrl
            });

            const response = formatSuccessResponse(result, requestId, Date.now() - startTime);

            console.log('🔍 PROFILE CONTROLLER: Final response structure:', {
                hasData: !!response.data,
                dataKeys: response.data ? Object.keys(response.data) : 'no data',
                hasAvatarUrl: !!(response.data && response.data.avatarUrl),
                avatarUrl: response.data?.avatarUrl
            });

            logRequestSuccess(requestId, 'Generate Avatar', Date.now() - startTime, {
                userId,
                prompt: prompt.trim(),
                provider
            });

            return res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse('Failed to generate avatar', requestId, duration, error.message);

            logRequestError(requestId, 'Generate Avatar', duration, error);

            return res.status(500).json(errorResponse);
        }
    }

    /**
     * Get user's existing images for avatar selection
     * GET /api/profile/user-images
     */
    async getUserImages(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            const userId = req.user?.id;
            const { page = 1, limit = 20 } = req.query;

            if (!userId) {
                return res.status(401).json(formatErrorResponse('Authentication required', requestId, Date.now() - startTime));
            }

            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));

            // Get user's images
            const result = await this.enhancedImageService.getUserImages(userId, limitNum, pageNum);

            if (result.error || result.success === false) {
                const duration = Date.now() - startTime;
                const errorResponse = formatErrorResponse(result.error || 'Failed to get user images', requestId, duration);

                logRequestError(requestId, 'Get User Images', duration, result);

                return res.status(errorResponse.statusCode || 500).json(errorResponse);
            }

            const response = formatSuccessResponse(result, requestId, Date.now() - startTime);

            logRequestSuccess(requestId, 'Get User Images', Date.now() - startTime, {
                userId,
                page: pageNum,
                limit: limitNum,
                imageCount: result?.images?.length || 0
            });

            return res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse('Failed to get user images', requestId, duration, error.message);

            logRequestError(requestId, 'Get User Images', duration, error);

            return res.status(500).json(errorResponse);
        }
    }

    /**
     * Set avatar from existing image
     * POST /api/profile/set-avatar
     */
    async setAvatarFromImage(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            const { imageId } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json(formatErrorResponse('Authentication required', requestId, Date.now() - startTime));
            }

            if (!imageId || typeof imageId !== 'string') {
                return res.status(400).json(formatErrorResponse('Image ID is required', requestId, Date.now() - startTime));
            }

            // Get the image to verify ownership and get URL
            const image = await this.enhancedImageService.getImageById(imageId, userId);

            if (image.error || image.success === false) {
                const duration = Date.now() - startTime;
                const errorResponse = formatErrorResponse(image.error || 'Image not found', requestId, duration);

                logRequestError(requestId, 'Set Avatar From Image', duration, image);

                return res.status(errorResponse.statusCode || 404).json(errorResponse);
            }

            // Update user's profile picture
            await this.prisma.user.update({
                where: { id: userId },
                data: { picture: image.imageUrl }
            });

            const response = formatSuccessResponse({
                message: 'Avatar updated successfully',
                avatarUrl: image.imageUrl,
                imageId
            }, requestId, Date.now() - startTime);

            logRequestSuccess(requestId, 'Set Avatar From Image', Date.now() - startTime, {
                userId,
                imageId
            });

            return res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse('Failed to set avatar', requestId, duration, error.message);

            logRequestError(requestId, 'Set Avatar From Image', duration, error);

            return res.status(500).json(errorResponse);
        }
    }

    /**
     * Upload profile picture file
     * POST /api/profile/upload-avatar
     * Body: { fileData: "data:image/jpeg;base64,...", filename: "image.jpg", mimeType: "image/jpeg" }
     */
    async uploadAvatar(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            const userId = req.user?.id;
            const { fileData, filename, mimeType } = req.body;

            if (!userId) {
                return res.status(401).json(formatErrorResponse('Authentication required', requestId, Date.now() - startTime));
            }

            if (!fileData || !filename || !mimeType) {
                return res.status(400).json(formatErrorResponse('File data, filename, and mimeType are required', requestId, Date.now() - startTime));
            }

            // Validate file type
            if (!mimeType.startsWith('image/')) {
                return res.status(400).json(formatErrorResponse('File must be an image', requestId, Date.now() - startTime));
            }

            // Parse base64 data
            const base64Data = fileData.replace(/^data:image\/[a-z]+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');

            // Validate file size (max 5MB)
            if (imageBuffer.length > 5 * 1024 * 1024) {
                return res.status(400).json(formatErrorResponse('File must be smaller than 5MB', requestId, Date.now() - startTime));
            }

            // Generate unique filename
            const fileExtension = filename.split('.').pop() || 'jpg';
            const uniqueFilename = `profile-${userId}-${crypto.randomUUID()}.${fileExtension}`;

            // Upload to R2 storage
            const imageUrl = await this.imageStorageService.saveImage(imageBuffer, uniqueFilename, {
                contentType: mimeType,
                metadata: {
                    userId: userId,
                    type: 'profile-picture',
                    uploadedAt: new Date().toISOString()
                }
            });

            // Start database transaction
            const result = await this.prisma.$transaction(async (tx) => {
                // Deactivate previous profile pictures
                await tx.userMedia.updateMany({
                    where: {
                        userId: userId,
                        purpose: 'profile-picture',
                        isActive: true
                    },
                    data: { isActive: false }
                });

                // Create new user media record
                const userMedia = await tx.userMedia.create({
                    data: {
                        userId: userId,
                        filename: uniqueFilename,
                        originalName: filename,
                        url: imageUrl,
                        mimeType: mimeType,
                        size: imageBuffer.length,
                        mediaType: 'image',
                        purpose: 'profile-picture',
                        isActive: true,
                        metadata: {
                            uploadedVia: 'profile-upload',
                            originalFilename: filename
                        }
                    }
                });

                // Update user's profile picture
                const updatedUser = await tx.user.update({
                    where: { id: userId },
                    data: { picture: imageUrl },
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        picture: true,
                        updatedAt: true
                    }
                });

                return { userMedia, updatedUser };
            });

            const response = formatSuccessResponse({
                user: result.updatedUser,
                avatarUrl: imageUrl,
                userMediaId: result.userMedia.id,
                message: 'Profile picture uploaded successfully'
            }, requestId, Date.now() - startTime);

            logRequestSuccess(requestId, 'Upload Avatar', Date.now() - startTime, {
                userId,
                filename: uniqueFilename,
                userMediaId: result.userMedia.id
            });

            return res.json(response);

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorResponse = formatErrorResponse('Failed to upload profile picture', requestId, duration, error.message);
            logRequestError(requestId, 'Upload Avatar', duration, error);

            return res.status(500).json(errorResponse);
        }
    }
}
