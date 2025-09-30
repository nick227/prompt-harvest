/**
 * ImageManagementService - Image CRUD operations
 *
 * Handles image storage, retrieval, updates, and deletion.
 * Extracted from EnhancedImageService.
 */

import { ValidationError, NotFoundError } from '../../errors/CustomErrors.js';
import databaseClient from '../../database/PrismaClient.js';

export class ImageManagementService {
    constructor() {
        this.prisma = databaseClient.getClient();
    }

    async getImageById(imageId, userId) {

        if (!imageId) {
            throw new ValidationError('Image ID is required');
        }

        try {
            const image = await this.prisma.image.findUnique({
                where: { id: imageId },
                include: {
                    tags: true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                            picture: true
                        }
                    }
                }
            });

            if (!image) {
                throw new NotFoundError('Image not found');
            }

            // Check if user has access to this image
            if (image.userId !== userId && !image.isPublic) {
                throw new ValidationError('Access denied to this image');
            }

            return image;
        } catch (error) {
            console.error('❌ Error fetching image:', error);
            throw error;
        }
    }

    async updateRating(imageId, rating, userId) {

        if (!imageId || !rating) {
            throw new ValidationError('Image ID and rating are required');
        }

        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
            throw new ValidationError('Rating must be a number between 1 and 5');
        }

        try {
            const updatedImage = await this.prisma.image.update({
                where: {
                    id: imageId,
                    userId // Ensure user owns the image
                },
                data: { rating },
                include: {
                    tags: true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                            picture: true
                        }
                    }
                }
            });


            return updatedImage;
        } catch (error) {
            console.error('❌ Error updating image rating:', error);
            throw error;
        }
    }

    async updatePublicStatus(imageId, isPublic, userId) {

        if (!imageId || typeof isPublic !== 'boolean') {
            throw new ValidationError('Image ID and public status are required');
        }

        try {
            const updatedImage = await this.prisma.image.update({
                where: {
                    id: imageId,
                    userId // Ensure user owns the image
                },
                data: { isPublic },
                include: {
                    tags: true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                            picture: true
                        }
                    }
                }
            });


            return updatedImage;
        } catch (error) {
            console.error('❌ Error updating image public status:', error);
            throw error;
        }
    }

    async deleteImage(imageId, userId) {

        if (!imageId) {
            throw new ValidationError('Image ID is required');
        }

        try {
            // First check if image exists and user owns it
            const image = await this.prisma.image.findUnique({
                where: { id: imageId }
            });

            if (!image) {
                throw new NotFoundError('Image not found');
            }

            if (image.userId !== userId) {
                throw new ValidationError('Access denied to this image');
            }

            // Delete the image
            await this.prisma.image.delete({
                where: { id: imageId }
            });


            return { success: true, message: 'Image deleted successfully' };
        } catch (error) {
            console.error('❌ Error deleting image:', error);
            throw error;
        }
    }

    async getImages(userId, limit = 8, page = 0) {

        try {
            const skip = page * limit;

            const images = await this.prisma.image.findMany({
                where: { isPublic: true },
                include: {
                    tags: true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                            picture: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            });

            const totalCount = await this.prisma.image.count({
                where: { isPublic: true }
            });

            return {
                images,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            };
        } catch (error) {
            console.error('❌ Error fetching images:', error);
            throw error;
        }
    }

    async getUserImages(userId, limit = 50, page = 0, tags = []) {

        if (!userId) {
            throw new ValidationError('User ID is required');
        }

        try {
            const skip = page * limit;
            const whereClause = { userId };

            // Add tag filtering if provided
            if (tags && tags.length > 0) {
                whereClause.tags = {
                    some: {
                        name: {
                            in: tags
                        }
                    }
                };
            }

            const images = await this.prisma.image.findMany({
                where: whereClause,
                include: {
                    tags: true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                            picture: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            });

            const totalCount = await this.prisma.image.count({
                where: whereClause
            });

            return {
                images,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            };
        } catch (error) {
            console.error('❌ Error fetching user images:', error);
            throw error;
        }
    }

    async getImageCount(userId) {

        try {
            if (userId) {
                // Return count for specific user
                return await this.prisma.image.count({
                    where: { userId }
                });
            } else {
                // Return total public count for anonymous users
                return await this.prisma.image.count({
                    where: { isPublic: true }
                });
            }
        } catch (error) {
            console.error('❌ Error getting image count:', error);
            throw error;
        }
    }

    async getHealth() {
        return {
            service: 'ImageManagementService',
            status: 'healthy',
            timestamp: new Date().toISOString()
        };
    }
}
