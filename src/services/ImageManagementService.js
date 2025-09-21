import databaseClient from '../database/PrismaClient.js';

export class ImageManagementService {
    constructor() {
        this.prisma = databaseClient.getClient();
    }

    /**
     * Get image by ID with access control
     */
    async getImageById(imageId, userId) {
        const image = await this.prisma.image.findUnique({ where: { id: imageId } });

        if (!image) {
            return null;
        }

        // Check access permissions
        const canAccess = image.isPublic || (userId && image.userId === userId);

        if (!canAccess) {
            throw new Error('Access denied to this image');
        }

        return image;
    }

    /**
     * Update image rating
     */
    async updateRating(imageId, rating, userId) {
        if (!imageId || !rating) {
            throw new Error('Image ID and rating are required');
        }

        const image = await this.prisma.image.findUnique({ where: { id: imageId } });

        if (!image) {
            throw new Error('Image not found');
        }

        // Check permissions
        if (!userId && !image.isPublic) {
            throw new Error('Authentication required to rate private images');
        }

        const result = await this.prisma.image.update({
            where: { id: imageId },
            data: { rating }
        });

        if (result === 0) {
            throw new Error('Failed to update rating');
        }

        return result;
    }

    /**
     * Update image public status
     */
    async updatePublicStatus(imageId, isPublic, userId) {
        if (!imageId || typeof isPublic !== 'boolean') {
            throw new Error('Image ID and public status are required');
        }

        if (!userId) {
            throw new Error('Authentication required to change image visibility');
        }

        const image = await this.prisma.image.findUnique({ where: { id: imageId } });

        if (!image) {
            throw new Error('Image not found');
        }

        if (image.userId !== userId) {
            throw new Error('You can only change visibility of your own images');
        }

        const result = await this.prisma.image.update({
            where: { id: imageId },
            data: { isPublic }
        });

        if (!result) {
            throw new Error('Failed to update image visibility');
        }

        return result;
    }

    /**
     * Delete image
     */
    async deleteImage(imageId, userId) {
        if (!imageId) {
            throw new Error('Image ID is required');
        }

        if (!userId) {
            throw new Error('Authentication required to delete images');
        }

        const image = await this.prisma.image.findUnique({ where: { id: imageId } });

        if (!image) {
            throw new Error('Image not found');
        }

        if (image.userId !== userId) {
            throw new Error('You can only delete your own images');
        }

        return await this.prisma.image.delete({ where: { id: imageId } });
    }

    /**
     * Get image count for user
     */
    async getImageCount(userId) {
        if (!userId) {
            return 0;
        }

        return await this.prisma.image.count({
            where: { userId }
        });
    }
}
