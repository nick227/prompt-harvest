/**
 * Admin Images Controller
 * Handles image management operations for admin
 */

import databaseClient from '../../database/PrismaClient.js';
import { safeParseInt } from '../../utils/safeParseInt.js';

const prisma = databaseClient.getClient();

// Validation helpers
const VALID_STATUSES = ['pending', 'processing', 'completed', 'failed'];
const VALID_PROVIDERS = ['dezgo', 'openai', 'google-imagen'];
const VALID_SORT_FIELDS = ['createdAt', 'updatedAt', 'cost', 'status', 'provider', 'isPublic', 'isHidden'];

const parseBooleanParam = value => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const lower = value.toLowerCase();

        return lower === 'true' || lower === '1' || lower === 'yes';
    }

    return false;
};

const parseISODate = dateString => {
    // Accept YYYY-MM-DD format only for predictability
    const isoMatch = (/^(\d{4})-(\d{2})-(\d{2})$/).exec(dateString);

    if (!isoMatch) {
        return null;
    }

    const date = new Date(`${dateString}T00:00:00.000Z`);

    return isNaN(date.getTime()) ? null : date;
};

const isValidUUID = str => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).test(str);

// Shared user hydration helper
const hydrateImagesWithUsers = async(images, prismaClient) => {
    if (images.length === 0) {
        return [];
    }

    const userIds = [...new Set(images.map(img => img.userId).filter(Boolean))];
    const users = userIds.length > 0
        ? await prismaClient.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, username: true }
        })
        : [];

    const userMap = new Map(users.map(user => [user.id, user]));

    return images.map(image => ({
        ...image,
        user: userMap.get(image.userId) || { id: image.userId, email: 'Unknown User', username: 'Unknown' }
    }));
};

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

            // Validate enum params
            if (status && !VALID_STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
                });
            }

            if (provider && !VALID_PROVIDERS.includes(provider)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`
                });
            }

            if (userId && !isValidUUID(userId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid userId format'
                });
            }

            // Harden query params
            const validSortBy = VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
            const validSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
            const validPage = Math.max(1, Math.min(10000, safeParseInt(page, 1)));
            const validLimit = Math.max(1, Math.min(100, safeParseInt(limit, 20)));
            const shouldIncludeDeleted = parseBooleanParam(includeDeleted);

            // Build where conditions
            const where = {};

            // Filter out soft-deleted images by default
            if (!shouldIncludeDeleted) {
                where.isDeleted = false;
            }

            if (status) {
                where.status = status;
            }

            if (provider) {
                where.provider = provider;
            }

            if (userId) {
                where.userId = userId;
            }

            // Date range validation with UTC normalization
            if (dateFrom || dateTo) {
                where.createdAt = {};

                if (dateFrom) {
                    const fromDate = parseISODate(dateFrom);

                    if (!fromDate) {
                        return res.status(400).json({
                            success: false,
                            error: 'Invalid dateFrom. Use YYYY-MM-DD format'
                        });
                    }
                    where.createdAt.gte = fromDate;
                }

                if (dateTo) {
                    const toDate = parseISODate(dateTo);

                    if (!toDate) {
                        return res.status(400).json({
                            success: false,
                            error: 'Invalid dateTo. Use YYYY-MM-DD format'
                        });
                    }
                    // Set to end of day UTC
                    toDate.setUTCHours(23, 59, 59, 999);
                    where.createdAt.lte = toDate;
                }

                // Validate date range
                if (where.createdAt.gte && where.createdAt.lte && where.createdAt.gte > where.createdAt.lte) {
                    return res.status(400).json({
                        success: false,
                        error: 'dateFrom cannot be after dateTo'
                    });
                }
            }

            if (search) {
                where.OR = [
                    {
                        AND: [
                            { prompt: { not: null } },
                            {
                                prompt: {
                                    contains: search,
                                    mode: 'insensitive'
                                }
                            }
                        ]
                    },
                    {
                        user: {
                            is: {
                                email: {
                                    contains: search,
                                    mode: 'insensitive'
                                }
                            }
                        }
                    }
                ];
            }

            // Build order by
            const orderBy = { [validSortBy]: validSortOrder };

            // Calculate pagination
            const skip = (validPage - 1) * validLimit;
            const take = validLimit;

            // Run count & list concurrently for better performance
            const [total, images] = await Promise.all([
                prisma.image.count({ where }),
                prisma.image.findMany({
                    where,
                    skip,
                    take,
                    orderBy
                })
            ]);

            // Hydrate users
            const imagesWithUsers = await hydrateImagesWithUsers(images, prisma);

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
            const start = total > 0 ? skip + 1 : 0;
            const end = Math.min(skip + take, total);

            res.json({
                success: true,
                data: {
                    items: transformedImages,
                    pagination: {
                        page: validPage,
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
                error: 'Failed to fetch images'
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
                where: { id: imageId }
            });

            if (!image) {
                return res.status(404).json({
                    success: false,
                    error: 'Image not found'
                });
            }

            // Get user data separately
            const user = await prisma.user.findUnique({
                where: { id: image.userId },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    createdAt: true
                }
            });

            // Attach user data to image
            const imageWithUser = {
                ...image,
                user: user || null
            };

            // Transform data for frontend
            const transformedImage = {
                id: imageWithUser.id,
                user: imageWithUser.user
                    ? {
                        id: imageWithUser.user.id,
                        email: imageWithUser.user.email,
                        username: imageWithUser.user.username,
                        created_at: imageWithUser.user.createdAt
                    }
                    : null,
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
                error: 'Failed to fetch image details'
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

            // Check if image exists
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

            if (permanent === 'true') {
                // Permanent delete - remove from R2 and database (even if already soft-deleted)
                await this.permanentDeleteImage(imageId, existingImage);

                res.json({
                    success: true,
                    message: 'Image permanently deleted successfully',
                    data: { id: imageId, permanent: true }
                });
            } else {
                // Soft delete - mark as deleted but keep record
                // Use 409 Conflict if already soft-deleted
                if (existingImage.isDeleted) {
                    return res.status(409).json({
                        success: false,
                        error: 'Image already deleted',
                        message: 'This image has already been soft-deleted'
                    });
                }

                await prisma.image.update({
                    where: { id: imageId },
                    data: {
                        isDeleted: true,
                        deletedAt: new Date(),
                        deletedBy: req.adminUser?.id || null
                    }
                });


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
                error: 'Failed to delete image'
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
                        await cloudflareR2Service.deleteImage(key);
                    }
                } catch (r2Error) {
                    console.error('❌ R2: Failed to delete image:', r2Error.message);
                    // Continue with database deletion even if R2 deletion fails
                }
            } else if (!imageRecord.imageUrl) {
                console.warn(`⚠️ ADMIN-IMAGES: Image ${imageId} has no imageUrl, skipping R2 deletion`);
            }

            // Delete from database - separate try/catch for precise error reporting
            try {
                await prisma.image.delete({
                    where: { id: imageId }
                });
            } catch (dbError) {
                console.error('❌ ADMIN-IMAGES: Database deletion failed for image:', imageId, dbError);
                throw dbError;
            }

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
                where: { id: imageId }
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
                where: { id: imageId },
                data: {
                    moderationStatus: action,
                    moderationReason: reason,
                    moderatedAt: new Date(),
                    moderatedBy: req.adminUser?.id || null
                }
            });

            // Proper past tense for action
            const actionPastTense = {
                approve: 'approved',
                reject: 'rejected',
                flag: 'flagged'
            }[action];

            res.json({
                success: true,
                message: `Image ${actionPastTense} successfully`,
                data: {
                    id: imageId,
                    moderationStatus: action,
                    moderationReason: reason,
                    moderatedAt: updatedImage.moderatedAt
                }
            });

        } catch (error) {
            console.error('❌ ADMIN-IMAGES: Error moderating image:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to moderate image'
            });
        }
    }

    /**
     * Export images data
     * GET /api/admin/images/export
     */
    static async exportImages(req, res) {
        try {
            const { status, provider, dateFrom, dateTo, includeDeleted = false } = req.query;

            // Validate enum params
            if (status && !VALID_STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
                });
            }

            if (provider && !VALID_PROVIDERS.includes(provider)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`
                });
            }

            // Build where conditions
            const where = {};

            // Filter out soft-deleted images by default
            const shouldIncludeDeleted = parseBooleanParam(includeDeleted);

            if (!shouldIncludeDeleted) {
                where.isDeleted = false;
            }

            if (status) {
                where.status = status;
            }

            if (provider) {
                where.provider = provider;
            }

            // Date range validation with UTC normalization
            if (dateFrom || dateTo) {
                where.createdAt = {};

                if (dateFrom) {
                    const fromDate = parseISODate(dateFrom);

                    if (!fromDate) {
                        return res.status(400).json({
                            success: false,
                            error: 'Invalid dateFrom. Use YYYY-MM-DD format'
                        });
                    }
                    where.createdAt.gte = fromDate;
                }

                if (dateTo) {
                    const toDate = parseISODate(dateTo);

                    if (!toDate) {
                        return res.status(400).json({
                            success: false,
                            error: 'Invalid dateTo. Use YYYY-MM-DD format'
                        });
                    }
                    // Set to end of day UTC
                    toDate.setUTCHours(23, 59, 59, 999);
                    where.createdAt.lte = toDate;
                }

                // Validate date range
                if (where.createdAt.gte && where.createdAt.lte && where.createdAt.gte > where.createdAt.lte) {
                    return res.status(400).json({
                        success: false,
                        error: 'dateFrom cannot be after dateTo'
                    });
                }
            }

            // Get images for export (limit to prevent OOM/timeout)
            // TODO: Replace with cursor-based streaming for very large datasets
            // See docs/NICE_TO_HAVE_IMPROVEMENTS.md for implementation
            const images = await prisma.image.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: 50000 // Safety limit - prevents OOM but caps at 50k records
            });

            // Hydrate users using shared helper
            const imagesWithUsers = await hydrateImagesWithUsers(images, prisma);

            // Helper function for CSV escaping - prevents injection and handles all special chars
            const escapeCsvField = field => {
                const str = String(field ?? '');
                // Normalize newlines and escape quotes
                const normalized = str
                    .replace(/\r\n/g, ' ')
                    .replace(/\n/g, ' ')
                    .replace(/"/g, '""');

                // Always quote fields to prevent formula injection (=, +, -, @)
                return `"${normalized}"`;
            };

            // BOM for Excel UTF-8 compatibility
            const BOM = '\uFEFF';

            // Convert to CSV format - with robust escaping for all fields
            const csvHeader = 'Image ID,User Email,User Username,Prompt,Provider,Status,Cost,Created At,Image URL\n';
            const csvRows = imagesWithUsers.map(image => {
                const row = [
                    escapeCsvField(image.id),
                    escapeCsvField(image.user.email),
                    escapeCsvField(image.user.username),
                    escapeCsvField(image.prompt || ''),
                    escapeCsvField(image.provider || ''),
                    escapeCsvField(image.status || 'unknown'),
                    escapeCsvField(image.cost || 0),
                    escapeCsvField(image.createdAt.toISOString()),
                    escapeCsvField(image.imageUrl || '')
                ];

                return row.join(',');
            });

            const csvContent = BOM + csvHeader + csvRows.join('\n');

            // Set response headers for CSV download with charset and no-store
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="images-export-${new Date().toISOString().split('T')[0]}.csv"`);
            res.setHeader('Cache-Control', 'no-store');

            res.send(csvContent);

        } catch (error) {
            console.error('❌ ADMIN-IMAGES: Error exporting images:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to export images'
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


            res.json({
                success: true,
                data: {
                    id: updatedImage.id,
                    isPublic: updatedImage.isPublic,
                    updated_at: updatedImage.updatedAt
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

            // Skip if already hidden
            if (image.isHidden) {
                return res.json({
                    success: true,
                    data: {
                        id: image.id,
                        isHidden: image.isHidden
                    }
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

            // Skip if already visible
            if (!image.isHidden) {
                return res.json({
                    success: true,
                    data: {
                        id: image.id,
                        isHidden: image.isHidden
                    }
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

            // Store taggingRequestedAt timestamp for progress tracking
            const requestedAt = new Date();

            await prisma.image.update({
                where: { id: imageId },
                data: {
                    taggingMetadata: {
                        ...image.taggingMetadata,
                        requestedAt: requestedAt.toISOString(),
                        requestedBy: req.adminUser?.email || 'unknown',
                        status: 'pending'
                    }
                }
            });

            // Import tagging service
            const { taggingService } = await import('../../services/TaggingService.js');

            // Trigger fire-and-forget tagging
            taggingService.tagImageAsync(imageId, image.prompt, {
                provider: image.provider,
                userId: image.userId,
                adminTriggered: true,
                adminUser: req.adminUser?.email || 'unknown'
            });

            res.json({
                success: true,
                message: 'AI tag generation started. Tags will be updated when ready.',
                data: {
                    requestedAt
                }
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
                        adminUser: req.adminUser?.email || 'unknown',
                        timestamp: new Date().toISOString(),
                        tagCount: cleanTags.length
                    }
                }
            });

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
