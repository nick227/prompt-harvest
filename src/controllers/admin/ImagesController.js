/**
 * Admin Images Controller
 * Handles image management operations for admin
 */

import databaseClient from '../../database/PrismaClient.js';
import { AdminImageManagementService } from '../../services/admin/AdminImageManagementService.js';

const prisma = databaseClient.getClient();

class ImagesController {
    /**
     * Get images with filtering and pagination
     * GET /api/admin/images
     */
    static async getImages(req, res) {
        try {
            const {
                page = 1,
                limit = 25,
                status,
                provider,
                userId,
                dateFrom,
                dateTo,
                search,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                includeDeleted = false
            } = req.query;

            // Build where conditions
            const where = {};

            // Filter out soft-deleted images by default
            if (includeDeleted !== 'true') {
                where.isDeleted = false;
            }

            if (status) {
                where.status = status;
            }

            if (provider) {
                where.provider = provider;
            }

            if (userId) {
                where.userId = userId; // Keep as string since IDs are CUIDs
            }

            if (dateFrom || dateTo) {
                where.createdAt = {};
                if (dateFrom) {
                    where.createdAt.gte = new Date(dateFrom);
                }
                if (dateTo) {
                    where.createdAt.lte = new Date(dateTo);
                }
            }

            if (search) {
                where.OR = [
                    {
                        prompt: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    },
                    {
                        user: {
                            email: {
                                contains: search,
                                mode: 'insensitive'
                            }
                        }
                    }
                ];
            }

            // Build order by
            const orderBy = {};

            orderBy[sortBy] = sortOrder;

            // Calculate pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const take = parseInt(limit);

            // Get total count
            const total = await prisma.image.count({ where });

            // Get images without relations (to avoid orphaned data issues)
            const images = await prisma.image.findMany({
                where,
                skip,
                take,
                orderBy
            });

            // Get user data for images manually
            const userIds = [...new Set(images.map(img => img.userId))];
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, email: true, username: true }
            });

            // Map users to images
            const userMap = new Map(users.map(user => [user.id, user]));
            const imagesWithUsers = images.map(image => ({
                ...image,
                user: userMap.get(image.userId) || { id: image.userId, email: 'Unknown User', username: 'Unknown' }
            }));

            // Transform data for frontend
            const transformedImages = imagesWithUsers.map(image => ({
                id: image.id,
                user_email: image.user.email,
                user_username: image.user.username,
                prompt: image.prompt,
                provider: image.provider,
                status: image.status,
                isPublic: image.isPublic,
                isHidden: image.isHidden,
                isDeleted: image.isDeleted,
                deleted_at: image.deletedAt,
                deleted_by: image.deletedBy,
                cost: image.cost || 0,
                created_at: image.createdAt,
                updated_at: image.updatedAt,
                image_url: image.imageUrl,
                tags: image.tags || [],
                tagged_at: image.taggedAt,
                tagging_metadata: image.taggingMetadata,
                metadata: image.metadata
            }));

            const totalPages = Math.ceil(total / take);
            const start = skip + 1;
            const end = Math.min(skip + take, total);

            res.json({
                success: true,
                data: {
                    items: transformedImages,
                    pagination: {
                        page: parseInt(page),
                        limit: take,
                        total,
                        totalPages,
                        start,
                        end
                    }
                }
            });

        } catch (error) {
            console.error('❌ ADMIN-IMAGES: Error getting images:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch images',
                message: error.message
            });
        }
    }

    /**
     * Get specific image details
     * GET /api/admin/images/:imageId
     */
    static async getImageDetails(req, res) {
        try {
            const { imageId } = req.params;

            const image = await prisma.image.findUnique({
                where: { id: parseInt(imageId) },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            username: true,
                            createdAt: true
                        }
                    }
                }
            });

            if (!image) {
                return res.status(404).json({
                    success: false,
                    error: 'Image not found',
                    message: 'The requested image does not exist'
                });
            }

            // Transform data for frontend
            const transformedImage = {
                id: image.id,
                user: {
                    id: image.user.id,
                    email: image.user.email,
                    username: image.user.username,
                    created_at: image.user.createdAt
                },
                prompt: image.prompt,
                provider: image.provider,
                status: image.status,
                cost: image.cost || 0,
                created_at: image.createdAt,
                updated_at: image.updatedAt,
                image_url: image.imageUrl,
                metadata: image.metadata,
                error_message: image.errorMessage
            };

            res.json({
                success: true,
                data: transformedImage
            });

        } catch (error) {
            console.error('❌ ADMIN-IMAGES: Error getting image details:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch image details',
                message: error.message
            });
        }
    }

    /**
     * Soft delete an image (mark as deleted but keep record)
     * DELETE /api/admin/images/:imageId
     */
    static async deleteImage(req, res) {
        try {
            const { imageId } = req.params;
            const { permanent = false } = req.query; // Optional permanent delete flag

            // Check if image exists and is not already deleted
            const existingImage = await prisma.image.findUnique({
                where: { id: imageId }
            });

            if (!existingImage) {
                return res.status(404).json({
                    success: false,
                    error: 'Image not found',
                    message: 'The requested image does not exist'
                });
            }

            if (existingImage.isDeleted) {
                return res.status(400).json({
                    success: false,
                    error: 'Image already deleted',
                    message: 'This image has already been deleted'
                });
            }

            if (permanent === 'true') {
                // Permanent delete - remove from R2 and database
                await this.permanentDeleteImage(imageId, existingImage);

                console.log(`🗑️ ADMIN-IMAGES: Image ${imageId} permanently deleted by admin ${req.adminUser.email}`);

                res.json({
                    success: true,
                    message: 'Image permanently deleted successfully',
                    data: { id: imageId, permanent: true }
                });
            } else {
                // Soft delete - mark as deleted but keep record
                await prisma.image.update({
                    where: { id: imageId },
                    data: {
                        isDeleted: true,
                        deletedAt: new Date(),
                        deletedBy: req.adminUser.id
                    }
                });

                console.log(`🗑️ ADMIN-IMAGES: Image ${imageId} soft deleted by admin ${req.adminUser.email}`);

                res.json({
                    success: true,
                    message: 'Image deleted successfully (soft delete)',
                    data: { id: imageId, permanent: false }
                });
            }

        } catch (error) {
            console.error('❌ ADMIN-IMAGES: Error deleting image:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete image',
                message: error.message
            });
        }
    }

    /**
     * Permanently delete an image from R2 and database
     * @private
     */
    static async permanentDeleteImage(imageId, imageRecord) {
        try {
            // Import CloudflareR2Service dynamically to avoid circular dependencies
            const { CloudflareR2Service } = await import('../../services/CloudflareR2Service.js');
            const cloudflareR2Service = new CloudflareR2Service();

            // Delete from R2 if imageUrl exists
            if (imageRecord.imageUrl && cloudflareR2Service.isInitialized()) {
                try {
                    // Extract key from URL
                    const key = cloudflareR2Service.extractKeyFromUrl(imageRecord.imageUrl);
                    if (key) {
                        const deleted = await cloudflareR2Service.deleteImage(key);
                        console.log(`🗑️ R2: Image ${key} deleted: ${deleted ? 'success' : 'failed'}`);
                    }
                } catch (r2Error) {
                    console.error('❌ R2: Failed to delete image:', r2Error.message);
                    // Continue with database deletion even if R2 deletion fails
                }
            }

            // Delete from database
            await prisma.image.delete({
                where: { id: imageId }
            });

        } catch (error) {
            console.error('❌ ADMIN-IMAGES: Error in permanent delete:', error);
            throw error;
        }
    }

    /**
     * Moderate an image
     * POST /api/admin/images/:imageId/moderate
     */
    static async moderateImage(req, res) {
        try {
            const { imageId } = req.params;
            const { action, reason } = req.body; // action: 'approve', 'reject', 'flag'

            if (!action || !['approve', 'reject', 'flag'].includes(action)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid moderation action',
                    message: 'Action must be one of: approve, reject, flag'
                });
            }

            // Check if image exists
            const existingImage = await prisma.image.findUnique({
                where: { id: parseInt(imageId) }
            });

            if (!existingImage) {
                return res.status(404).json({
                    success: false,
                    error: 'Image not found',
                    message: 'The requested image does not exist'
                });
            }

            // Update image moderation status
            const updatedImage = await prisma.image.update({
                where: { id: parseInt(imageId) },
                data: {
                    moderationStatus: action,
                    moderationReason: reason,
                    moderatedAt: new Date(),
                    moderatedBy: req.adminUser.id
                }
            });

            console.log(`🛡️ ADMIN-IMAGES: Image ${imageId} moderated as ${action} by admin ${req.adminUser.email}`);

            res.json({
                success: true,
                message: `Image ${action}d successfully`,
                data: {
                    id: parseInt(imageId),
                    moderationStatus: action,
                    moderationReason: reason,
                    moderatedAt: updatedImage.moderatedAt
                }
            });

        } catch (error) {
            console.error('❌ ADMIN-IMAGES: Error moderating image:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to moderate image',
                message: error.message
            });
        }
    }

    /**
     * Export images data
     * GET /api/admin/images/export
     */
    static async exportImages(req, res) {
        try {
            const { status, provider, dateFrom, dateTo } = req.query;

            // Build where conditions
            const where = {};

            if (status) {
                where.status = status;
            }

            if (provider) {
                where.provider = provider;
            }

            if (dateFrom || dateTo) {
                where.createdAt = {};
                if (dateFrom) {
                    where.createdAt.gte = new Date(dateFrom);
                }
                if (dateTo) {
                    where.createdAt.lte = new Date(dateTo);
                }
            }

            // Get images for export
            const images = await prisma.image.findMany({
                where,
                include: {
                    user: {
                        select: {
                            email: true,
                            username: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Convert to CSV format
            const csvHeader = 'Image ID,User Email,User Username,Prompt,Provider,Status,Cost,Created At,Image URL\n';
            const csvRows = images.map(image => {
                const row = [
                    image.id,
                    image.user.email,
                    image.user.username,
                    `"${image.prompt.replace(/"/g, '""')}"`, // Escape quotes in prompt
                    image.provider,
                    image.status,
                    image.cost || 0,
                    image.createdAt.toISOString(),
                    image.imageUrl || ''
                ];

                return row.join(',');
            });

            const csvContent = csvHeader + csvRows.join('\n');

            // Set response headers for CSV download
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="images-export-${new Date().toISOString().split('T')[0]}.csv"`);

            console.log(`📊 ADMIN-IMAGES: Images exported by admin ${req.adminUser.email} (${images.length} records)`);

            res.send(csvContent);

        } catch (error) {
            console.error('❌ ADMIN-IMAGES: Error exporting images:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to export images',
                message: error.message
            });
        }
    }

    /**
     * Toggle image user visibility (isPublic)
     * POST /api/admin/images/:imageId/toggle-visibility
     */
    static async toggleVisibility(req, res) {
        try {
            const { imageId } = req.params;

            // Get current image
            const image = await prisma.image.findUnique({
                where: { id: imageId }
            });

            if (!image) {
                return res.status(404).json({
                    success: false,
                    error: 'Image not found'
                });
            }

            // Toggle isPublic
            const updatedImage = await prisma.image.update({
                where: { id: imageId },
                data: {
                    isPublic: !image.isPublic,
                    updatedAt: new Date()
                }
            });

            console.log(`👁️ ADMIN-IMAGES: Image ${imageId} visibility toggled to ${updatedImage.isPublic} by admin ${req.adminUser.email}`);

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
    }

    /**
     * Admin hide image from everyone (isHidden = true)
     * POST /api/admin/images/:imageId/admin-hide
     */
    static async adminHideImage(req, res) {
        try {
            const { imageId } = req.params;

            // Get current image
            const image = await prisma.image.findUnique({
                where: { id: imageId }
            });

            if (!image) {
                return res.status(404).json({
                    success: false,
                    error: 'Image not found'
                });
            }

            // Set isHidden to true
            const updatedImage = await prisma.image.update({
                where: { id: imageId },
                data: {
                    isHidden: true,
                    updatedAt: new Date()
                }
            });

            console.log(`🚫 ADMIN-IMAGES: Image ${imageId} hidden by admin ${req.adminUser.email}`);

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
    }

    /**
     * Admin show image to everyone (isHidden = false)
     * POST /api/admin/images/:imageId/admin-show
     */
    static async adminShowImage(req, res) {
        try {
            const { imageId } = req.params;

            // Get current image
            const image = await prisma.image.findUnique({
                where: { id: imageId }
            });

            if (!image) {
                return res.status(404).json({
                    success: false,
                    error: 'Image not found'
                });
            }

            // Set isHidden to false
            const updatedImage = await prisma.image.update({
                where: { id: imageId },
                data: {
                    isHidden: false,
                    updatedAt: new Date()
                }
            });

            console.log(`✅ ADMIN-IMAGES: Image ${imageId} shown by admin ${req.adminUser.email}`);

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
    }

    /**
     * Generate AI tags for image
     * POST /api/admin/images/:imageId/generate-tags
     */
    static async generateTags(req, res) {
        try {
            const { imageId } = req.params;

            // Get current image
            const image = await prisma.image.findUnique({
                where: { id: imageId }
            });

            if (!image) {
                return res.status(404).json({
                    success: false,
                    error: 'Image not found'
                });
            }

            // Import tagging service
            const { taggingService } = await import('../../services/TaggingService.js');

            // Trigger fire-and-forget tagging
            taggingService.tagImageAsync(imageId, image.prompt, {
                provider: image.provider,
                userId: image.userId,
                adminTriggered: true,
                adminUser: req.adminUser.email
            });

            console.log(`🤖 ADMIN-IMAGES: AI tag generation triggered for image ${imageId} by admin ${req.adminUser.email}`);

            res.json({
                success: true,
                message: 'AI tag generation started. Tags will be updated when ready.'
            });

        } catch (error) {
            console.error('❌ ADMIN-IMAGES: Error generating tags:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate tags'
            });
        }
    }

    /**
     * Update image tags manually
     * POST /api/admin/images/:imageId/update-tags
     */
    static async updateTags(req, res) {
        try {
            const { imageId } = req.params;
            const { tags } = req.body;

            if (!Array.isArray(tags)) {
                return res.status(400).json({
                    success: false,
                    error: 'Tags must be an array'
                });
            }

            // Get current image
            const image = await prisma.image.findUnique({
                where: { id: imageId }
            });

            if (!image) {
                return res.status(404).json({
                    success: false,
                    error: 'Image not found'
                });
            }

            // Clean and validate tags
            const cleanTags = tags
                .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
                .map(tag => tag.trim().toLowerCase())
                .filter(tag => tag.length <= 50)
                .slice(0, 20); // Limit to 20 tags

            // Update image with new tags
            const updatedImage = await prisma.image.update({
                where: { id: imageId },
                data: {
                    tags: cleanTags,
                    taggedAt: new Date(),
                    taggingMetadata: {
                        method: 'manual_admin',
                        adminUser: req.adminUser.email,
                        timestamp: new Date().toISOString(),
                        tagCount: cleanTags.length
                    }
                }
            });

            console.log(`✏️ ADMIN-IMAGES: Tags updated manually for image ${imageId} by admin ${req.adminUser.email}:`, cleanTags);

            res.json({
                success: true,
                data: {
                    id: updatedImage.id,
                    tags: updatedImage.tags,
                    taggedAt: updatedImage.taggedAt
                }
            });

        } catch (error) {
            console.error('❌ ADMIN-IMAGES: Error updating tags:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update tags'
            });
        }
    }
}

export default ImagesController;
