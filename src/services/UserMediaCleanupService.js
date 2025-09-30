/**
 * UserMediaCleanupService
 * Handles cleanup of orphaned user media files
 */

import databaseClient from '../database/PrismaClient.js';
import { ImageStorageService } from './ImageStorageService.js';

export class UserMediaCleanupService {
    constructor() {
        this.prisma = databaseClient.getClient();
        this.imageStorageService = new ImageStorageService('cdn');
    }

    /**
     * Clean up orphaned profile pictures
     * Removes inactive profile pictures that are no longer referenced
     */
    async cleanupOrphanedProfilePictures() {

        try {
            // Find inactive profile pictures older than 30 days
            const orphanedMedia = await this.prisma.userMedia.findMany({
                where: {
                    purpose: 'profile-picture',
                    isActive: false,
                    createdAt: {
                        lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
                    }
                },
                select: {
                    id: true,
                    filename: true,
                    url: true,
                    userId: true
                }
            });


            let deletedCount = 0;
            let errorCount = 0;

            for (const media of orphanedMedia) {
                try {
                    // Delete from R2 storage
                    await this.imageStorageService.deleteImage(media.url);

                    // Delete from database
                    await this.prisma.userMedia.delete({
                        where: { id: media.id }
                    });

                    deletedCount++;
                } catch (error) {
                    errorCount++;
                    console.error(`❌ USER-MEDIA-CLEANUP: Failed to delete media ${media.id}:`, error.message);
                }
            }


            return {
                total: orphanedMedia.length,
                deleted: deletedCount,
                errors: errorCount
            };

        } catch (error) {
            console.error('❌ USER-MEDIA-CLEANUP: Cleanup failed:', error);
            throw error;
        }
    }

    /**
     * Clean up orphaned user media by type
     */
    async cleanupOrphanedMedia(mediaType, purpose, daysOld = 30) {

        try {
            const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

            const orphanedMedia = await this.prisma.userMedia.findMany({
                where: {
                    mediaType,
                    purpose,
                    isActive: false,
                    createdAt: {
                        lt: cutoffDate
                    }
                },
                select: {
                    id: true,
                    filename: true,
                    url: true,
                    userId: true
                }
            });


            let deletedCount = 0;
            let errorCount = 0;

            for (const media of orphanedMedia) {
                try {
                    // Delete from R2 storage
                    await this.imageStorageService.deleteImage(media.url);

                    // Delete from database
                    await this.prisma.userMedia.delete({
                        where: { id: media.id }
                    });

                    deletedCount++;
                } catch (error) {
                    errorCount++;
                    console.error(`❌ USER-MEDIA-CLEANUP: Failed to delete media ${media.id}:`, error.message);
                }
            }


            return {
                total: orphanedMedia.length,
                deleted: deletedCount,
                errors: errorCount
            };

        } catch (error) {
            console.error(`❌ USER-MEDIA-CLEANUP: ${mediaType}/${purpose} cleanup failed:`, error);
            throw error;
        }
    }

    /**
     * Get cleanup statistics
     */
    async getCleanupStats() {
        try {
            const stats = await this.prisma.userMedia.groupBy({
                by: ['mediaType', 'purpose', 'isActive'],
                _count: {
                    id: true
                },
                _sum: {
                    size: true
                }
            });

            return stats.map(stat => ({
                mediaType: stat.mediaType,
                purpose: stat.purpose,
                isActive: stat.isActive,
                count: stat._count.id,
                totalSize: stat._sum.size || 0
            }));

        } catch (error) {
            console.error('❌ USER-MEDIA-CLEANUP: Failed to get stats:', error);
            throw error;
        }
    }

    /**
     * Run full cleanup
     */
    async runFullCleanup() {

        const results = {
            profilePictures: await this.cleanupOrphanedProfilePictures(),
            stats: await this.getCleanupStats()
        };


        return results;
    }
}

// Export singleton instance
export const userMediaCleanupService = new UserMediaCleanupService();
