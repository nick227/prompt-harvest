import databaseClient from '../database/PrismaClient.js';
import { ViolationStatsService } from './ViolationStatsService.js';

const prisma = databaseClient.getClient();

/**
 * Service for managing content policy violations
 */
class ViolationService {
    /**
     * Get violation statistics
     * @param {Object} options - Query options
     * @param {string} options.userId - Filter by user ID
     * @param {string} options.severity - Filter by severity
     * @param {Date} options.startDate - Start date filter
     * @param {Date} options.endDate - End date filter
     * @param {number} options.limit - Limit results
     * @param {number} options.offset - Offset for pagination
     * @returns {Object} - Violation statistics and data
     */
    async getViolationStats(options = {}) {
        const statsService = new ViolationStatsService();
        return await statsService.getViolationStats(options);
    }

    /**
     * Get violations for a specific user
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {Array} - User violations
     */
    async getUserViolations(userId, options = {}) {
        const { limit = 50, offset = 0 } = options;

        try {
            return await prisma.violations.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    violationType: true,
                    detectedWords: true,
                    severity: true,
                    endpoint: true,
                    isBlocked: true,
                    createdAt: true
                }
            });
        } catch (error) {
            console.error('❌ Error getting user violations:', error);
            throw error;
        }
    }

    /**
     * Get violation details by ID
     * @param {string} violationId - Violation ID
     * @returns {Object} - Violation details
     */
    async getViolationById(violationId) {
        try {
            return await prisma.violations.findUnique({
                where: { id: violationId },
                select: {
                    id: true,
                    userId: true,
                    userEmail: true,
                    username: true,
                    violationType: true,
                    detectedWords: true,
                    originalContent: true,
                    sanitizedContent: true,
                    severity: true,
                    ipAddress: true,
                    userAgent: true,
                    endpoint: true,
                    requestId: true,
                    isBlocked: true,
                    createdAt: true
                }
            });
        } catch (error) {
            console.error('❌ Error getting violation by ID:', error);
            throw error;
        }
    }

    /**
     * Delete old violations (cleanup)
     * @param {number} daysOld - Delete violations older than this many days
     * @returns {number} - Number of violations deleted
     */
    async cleanupOldViolations(daysOld = 90) {
        try {
            const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

            const result = await prisma.violations.deleteMany({
                where: {
                    createdAt: {
                        lt: cutoffDate
                    }
                }
            });

            console.log(`🧹 Cleaned up ${result.count} violations older than ${daysOld} days`);

            return result.count;
        } catch (error) {
            console.error('❌ Error cleaning up old violations:', error);
            throw error;
        }
    }

    /**
     * Get violation trends over time
     * @param {Object} options - Query options
     * @param {number} options.days - Number of days to analyze
     * @param {string} options.groupBy - Group by 'day', 'hour', or 'week'
     * @returns {Array} - Trend data
     */
    async getViolationTrends(options = {}) {
        const { days = 30, groupBy = 'day' } = options;

        try {
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            // This would require raw SQL for proper date grouping
            // For now, we'll get daily counts
            const violations = await prisma.violations.findMany({
                where: {
                    createdAt: {
                        gte: startDate
                    }
                },
                select: {
                    createdAt: true,
                    severity: true,
                    isBlocked: true
                },
                orderBy: { createdAt: 'asc' }
            });

            // Group by date
            const trends = {};

            violations.forEach(violation => {
                const date = violation.createdAt.toISOString().split('T')[0];

                if (!trends[date]) {
                    trends[date] = {
                        date,
                        total: 0,
                        blocked: 0,
                        severity: {}
                    };
                }

                trends[date].total++;
                if (violation.isBlocked) {
                    trends[date].blocked++;
                }

                if (!trends[date].severity[violation.severity]) {
                    trends[date].severity[violation.severity] = 0;
                }
                trends[date].severity[violation.severity]++;
            });

            return Object.values(trends);
        } catch (error) {
            console.error('❌ Error getting violation trends:', error);
            throw error;
        }
    }

    /**
     * Check if user should be temporarily banned
     * @param {string} userId - User ID
     * @param {Object} options - Ban criteria
     * @returns {Object} - Ban recommendation
     */
    async checkUserBanStatus(userId, options = {}) {
        const {
            criticalThreshold = 5, // 5 critical violations
            highThreshold = 10,    // 10 high severity violations
            timeWindow = 24 * 60 * 60 * 1000 // 24 hours
        } = options;

        try {
            const startDate = new Date(Date.now() - timeWindow);

            const violations = await prisma.violations.findMany({
                where: {
                    userId,
                    createdAt: {
                        gte: startDate
                    }
                },
                select: {
                    severity: true,
                    isBlocked: true
                }
            });

            const criticalCount = violations.filter(v => v.severity === 'critical').length;
            const highCount = violations.filter(v => v.severity === 'high').length;
            const totalCount = violations.length;

            const shouldBan = criticalCount >= criticalThreshold || highCount >= highThreshold;
            const banReason = shouldBan
                ? `User has ${criticalCount} critical and ${highCount} high severity violations in the last 24 hours`
                : null;

            return {
                shouldBan,
                banReason,
                stats: {
                    criticalCount,
                    highCount,
                    totalCount,
                    timeWindow: timeWindow / (24 * 60 * 60 * 1000) // Convert to days
                }
            };
        } catch (error) {
            console.error('❌ Error checking user ban status:', error);
            throw error;
        }
    }
}

export default ViolationService;
