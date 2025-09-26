/**
 * Admin Image Management Routes
 * Handles admin-level image visibility and moderation
 */

import express from 'express';
import databaseClient from '../database/PrismaClient.js';

const router = new express.Router();
const prisma = databaseClient.getClient();

/**
 * Toggle user-level visibility (isPublic)
 */
router.post('/:id/toggle-visibility', async (req, res) => {
    try {
        const { id } = req.params;

        // Get current image
        const image = await prisma.image.findUnique({
            where: { id }
        });

        if (!image) {
            return res.status(404).json({
                success: false,
                error: 'Image not found'
            });
        }

        // Toggle isPublic
        const updatedImage = await prisma.image.update({
            where: { id },
            data: {
                isPublic: !image.isPublic,
                updatedAt: new Date()
            }
        });

        res.json({
            success: true,
            data: {
                id: updatedImage.id,
                isPublic: updatedImage.isPublic
            }
        });

    } catch (error) {
        console.error('❌ ADMIN-IMAGES: Error toggling visibility:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle image visibility'
        });
    }
});

/**
 * Admin hide image from everyone (isHidden = true)
 */
router.post('/:id/admin-hide', async (req, res) => {
    try {
        const { id } = req.params;

        // Get current image
        const image = await prisma.image.findUnique({
            where: { id }
        });

        if (!image) {
            return res.status(404).json({
                success: false,
                error: 'Image not found'
            });
        }

        // Set isHidden to true
        const updatedImage = await prisma.image.update({
            where: { id },
            data: {
                isHidden: true,
                updatedAt: new Date()
            }
        });

        res.json({
            success: true,
            data: {
                id: updatedImage.id,
                isHidden: updatedImage.isHidden
            }
        });

    } catch (error) {
        console.error('❌ ADMIN-IMAGES: Error hiding image:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to hide image'
        });
    }
});

/**
 * Admin show image to everyone (isHidden = false)
 */
router.post('/:id/admin-show', async (req, res) => {
    try {
        const { id } = req.params;

        // Get current image
        const image = await prisma.image.findUnique({
            where: { id }
        });

        if (!image) {
            return res.status(404).json({
                success: false,
                error: 'Image not found'
            });
        }

        // Set isHidden to false
        const updatedImage = await prisma.image.update({
            where: { id },
            data: {
                isHidden: false,
                updatedAt: new Date()
            }
        });

        res.json({
            success: true,
            data: {
                id: updatedImage.id,
                isHidden: updatedImage.isHidden
            }
        });

    } catch (error) {
        console.error('❌ ADMIN-IMAGES: Error showing image:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to show image'
        });
    }
});

/**
 * Delete image (admin only)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if image exists
        const image = await prisma.image.findUnique({
            where: { id }
        });

        if (!image) {
            return res.status(404).json({
                success: false,
                error: 'Image not found'
            });
        }

        // Delete the image
        await prisma.image.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Image deleted successfully'
        });

    } catch (error) {
        console.error('❌ ADMIN-IMAGES: Error deleting image:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete image'
        });
    }
});

/**
 * Get image details for admin
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const image = await prisma.image.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true
                    }
                }
            }
        });

        if (!image) {
            return res.status(404).json({
                success: false,
                error: 'Image not found'
            });
        }

        res.json({
            success: true,
            data: image
        });

    } catch (error) {
        console.error('❌ ADMIN-IMAGES: Error getting image:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get image details'
        });
    }
});

export default router;
