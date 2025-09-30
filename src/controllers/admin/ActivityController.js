/**
 * Admin Activity Controller
 * Handles site activity monitoring and system health
 */

import databaseClient from '../../database/PrismaClient.js';

const prisma = databaseClient.getClient();

class ActivityController {
    /**
     * Get site activity overview
     * GET /api/admin/activity
     */
    // eslint-disable-next-line max-lines-per-function
    static async getActivity(req, res) {
        try {
            const { range = '24h' } = req.query;

            // Calculate date range
            const timeRange = ActivityController.calculateTimeRange(range);

            // Get activity metrics
            const [
                imagesGeneratedToday,
                imagesInRange,
                activeUsers,
                totalUsers,
                errorCount,
                avgResponseTime
            ] = await Promise.all([
                // Images generated today
                prisma.image.count({
                    where: {
                        createdAt: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0))
                        }
                    }
                }),

                // Images in specified range
                prisma.image.count({
                    where: {
                        createdAt: {
                            gte: timeRange.start,
                            lte: timeRange.end
                        }
                    }
                }),

                // Active users (users who generated images in the last 24h)
                prisma.image.findMany({
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                    },
                    distinct: ['userId'],
                    select: { userId: true }
                }).then(result => result.length),

                // Total registered users
                prisma.user.count(),

                // Mock error count (in production, this would come from error logging)
                ActivityController.getErrorCount(timeRange),

                // Mock response time (in production, this would come from performance monitoring)
                ActivityController.getAverageResponseTime(timeRange)
            ]);

            // Calculate error rate
            const totalRequests = imagesInRange + Math.floor(imagesInRange * 0.1); // Estimate total requests
            const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

            const activityData = {
                imagesGeneratedToday,
                imagesInRange,
                activeUsers,
                totalUsers,
                errorCount,
                errorRate,
                avgResponseTime,
                timeRange: {
                    start: timeRange.start,
                    end: timeRange.end,
                    range
                }
            };

            res.json({
                success: true,
                data: activityData
            });

        } catch (error) {
            console.error('❌ ADMIN-ACTIVITY: Get activity failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get activity data',
                message: error.message
            });
        }
    }

    /**
     * Get activity metrics for charts
     * GET /api/admin/activity/metrics/:metric
     */
    static async getMetrics(req, res) {
        try {
            const { metric } = req.params;
            const { range = '24h' } = req.query;

            const timeRange = ActivityController.calculateTimeRange(range);
            let data;

            switch (metric) {
                case 'images':
                    data = await ActivityController.getImageMetrics(timeRange);
                    break;
                case 'users':
                    data = await ActivityController.getUserMetrics(timeRange);
                    break;
                case 'revenue':
                    data = await ActivityController.getRevenueMetrics(timeRange);
                    break;
                case 'errors':
                    data = await ActivityController.getErrorMetrics(timeRange);
                    break;
                default:
                    throw new Error(`Unknown metric: ${metric}`);
            }

            // eslint-disable-next-line no-console

            res.json({
                success: true,
                data: {
                    metric,
                    timeRange: range,
                    chartData: data
                }
            });

        } catch (error) {
            console.error('❌ ADMIN-ACTIVITY: Get metrics failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get activity metrics',
                message: error.message
            });
        }
    }

    /**
     * Get system health status
     * GET /api/admin/activity/health
     */
    static async getSystemHealth(req, res) {
        try {
            const healthChecks = await Promise.allSettled([
                ActivityController.checkDatabaseHealth(),
                ActivityController.checkRedisHealth(),
                ActivityController.checkStripeHealth(),
                ActivityController.checkOpenAIHealth(),
                ActivityController.checkStabilityHealth()
            ]);

            const healthStatus = {
                database: ActivityController.getHealthResult(healthChecks[0]),
                redis: ActivityController.getHealthResult(healthChecks[1]),
                stripe: ActivityController.getHealthResult(healthChecks[2]),
                openai: ActivityController.getHealthResult(healthChecks[3]),
                stability: ActivityController.getHealthResult(healthChecks[4]),
                overall: 'healthy',
                timestamp: new Date().toISOString()
            };

            // Determine overall health
            const healthValues = Object.values(healthStatus).filter(v => typeof v === 'string' && v !== healthStatus.overall && v !== healthStatus.timestamp);

            if (healthValues.some(status => status === 'error')) {
                healthStatus.overall = 'error';
            } else if (healthValues.some(status => status === 'warning')) {
                healthStatus.overall = 'warning';
            }

            // eslint-disable-next-line no-console

            res.json({
                success: true,
                data: healthStatus
            });

        } catch (error) {
            console.error('❌ ADMIN-ACTIVITY: Health check failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to check system health',
                message: error.message
            });
        }
    }

    /**
     * Get error logs
     * GET /api/admin/activity/errors
     */
    static async getErrorLogs(req, res) {
        try {
            const {
                page = 1,
                limit = 50,
                level = 'all',
                dateFrom,
                dateTo
            } = req.query;

            // Get mock error logs
            const errorLogs = ActivityController.generateMockErrorLogs();

            // Filter and paginate logs
            const filteredLogs = ActivityController.filterErrorLogs(errorLogs, { level, dateFrom, dateTo });
            const paginatedLogs = ActivityController.paginateLogs(filteredLogs, page, limit);

            // eslint-disable-next-line no-console

            return res.json({
                success: true,
                data: paginatedLogs
            });

        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('❌ ADMIN-ACTIVITY: Get error logs failed:', error);

            return res.status(500).json({
                success: false,
                error: 'Failed to get error logs',
                message: error.message
            });
        }
    }

    /**
     * Filter error logs by level and date range
     */
    static filterErrorLogs(logs, { level, dateFrom, dateTo }) {
        let filteredLogs = logs;

        // Filter by date if provided
        if (dateFrom || dateTo) {
            filteredLogs = logs.filter(log => {
                const logDate = new Date(log.timestamp);

                if (dateFrom && logDate < new Date(dateFrom)) {
                    return false;
                }
                if (dateTo && logDate > new Date(dateTo)) {
                    return false;
                }

                return true;
            });
        }

        // Filter by level
        if (level !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.level === level);
        }

        return filteredLogs;
    }

    /**
     * Paginate logs with metadata
     */
    static paginateLogs(logs, page, limit) {
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const items = logs.slice(offset, offset + parseInt(limit));
        const totalPages = Math.ceil(logs.length / parseInt(limit));

        return {
            items,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: logs.length,
                totalPages,
                offset
            }
        };
    }

    // ===========================================
    // UTILITY METHODS
    // ===========================================

    /**
     * Calculate time range from string
     */
    static calculateTimeRange(range) {
        const end = new Date();
        let start;

        switch (range) {
            case '1h':
                start = new Date(end.getTime() - 60 * 60 * 1000);
                break;
            case '6h':
                start = new Date(end.getTime() - 6 * 60 * 60 * 1000);
                break;
            case '24h':
                start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        }

        return { start, end };
    }

    /**
     * Get image generation metrics
     */
    static async getImageMetrics(timeRange) {
        try {
            // Get hourly image generation counts
            const result = await prisma.$queryRaw`
                SELECT
                    DATE_FORMAT(createdAt, '%Y-%m-%d %H:00:00') as hour,
                    COUNT(*) as count,
                    COUNT(DISTINCT userId) as unique_users
                FROM images
                WHERE createdAt >= ${timeRange.start}
                    AND createdAt <= ${timeRange.end}
                GROUP BY DATE_FORMAT(createdAt, '%Y-%m-%d %H:00:00')
                ORDER BY hour ASC
            `;

            return result.map(row => ({
                timestamp: row.hour,
                value: Number(row.count),
                uniqueUsers: Number(row.unique_users)
            }));

        } catch (error) {
            console.error('Error getting image metrics:', error);

            return ActivityController.generateMockTimeSeriesData(timeRange, 'images');
        }
    }

    /**
     * Get user activity metrics
     */
    static async getUserMetrics(timeRange) {
        try {
            // Get hourly active user counts
            const result = await prisma.$queryRaw`
                SELECT
                    DATE_FORMAT(createdAt, '%Y-%m-%d %H:00:00') as hour,
                    COUNT(DISTINCT userId) as active_users
                FROM images
                WHERE createdAt >= ${timeRange.start}
                    AND createdAt <= ${timeRange.end}
                GROUP BY DATE_FORMAT(createdAt, '%Y-%m-%d %H:00:00')
                ORDER BY hour ASC
            `;

            return result.map(row => ({
                timestamp: row.hour,
                value: Number(row.active_users)
            }));

        } catch (error) {
            console.error('Error getting user metrics:', error);

            return ActivityController.generateMockTimeSeriesData(timeRange, 'users');
        }
    }

    /**
     * Get revenue metrics
     */
    static async getRevenueMetrics(timeRange) {
        try {
            // Get daily revenue
            const result = await prisma.$queryRaw`
                SELECT
                    DATE(createdAt) as date,
                    SUM(amount) as revenue,
                    COUNT(*) as transactions
                FROM stripe_payments
                WHERE status = 'completed'
                    AND createdAt >= ${timeRange.start}
                    AND createdAt <= ${timeRange.end}
                GROUP BY DATE(createdAt)
                ORDER BY date ASC
            `;

            return result.map(row => ({
                timestamp: row.date,
                value: Number(row.revenue) / 100, // Convert cents to dollars
                transactions: Number(row.transactions)
            }));

        } catch (error) {
            console.error('Error getting revenue metrics:', error);

            return ActivityController.generateMockTimeSeriesData(timeRange, 'revenue');
        }
    }

    /**
     * Get error metrics
     */
    static async getErrorMetrics(timeRange) {
        // Mock error data since we don't have error logging yet
        return ActivityController.generateMockTimeSeriesData(timeRange, 'errors');
    }

    /**
     * Generate mock time series data
     */
    static generateMockTimeSeriesData(timeRange, type) {
        const data = [];
        const duration = timeRange.end.getTime() - timeRange.start.getTime();
        const intervals = Math.min(24, Math.max(12, duration / (60 * 60 * 1000))); // 12-24 data points
        const intervalSize = duration / intervals;

        for (let i = 0; i < intervals; i++) {
            const timestamp = new Date(timeRange.start.getTime() + i * intervalSize);
            let value;

            switch (type) {
                case 'images':
                    value = Math.floor(Math.random() * 50) + 10;
                    break;
                case 'users':
                    value = Math.floor(Math.random() * 20) + 5;
                    break;
                case 'revenue':
                    value = Math.floor(Math.random() * 500) + 100;
                    break;
                case 'errors':
                    value = Math.floor(Math.random() * 5);
                    break;
                default:
                    value = Math.floor(Math.random() * 100);
            }

            data.push({
                timestamp: timestamp.toISOString(),
                value
            });
        }

        return data;
    }

    /**
     * Health check methods
     */
    static async checkDatabaseHealth() {
        try {
            await prisma.$queryRaw`SELECT 1`;

            return 'healthy';
        } catch (error) {
            return 'error';
        }
    }

    static async checkRedisHealth() {
        // Mock Redis health check
        // In production, you would check actual Redis connection
        return Math.random() > 0.1 ? 'healthy' : 'warning';
    }

    static async checkStripeHealth() {
        // Mock Stripe health check
        // In production, you would ping Stripe API
        return Math.random() > 0.05 ? 'healthy' : 'warning';
    }

    static async checkOpenAIHealth() {
        // Mock OpenAI health check
        // In production, you would check OpenAI API status
        return Math.random() > 0.08 ? 'healthy' : 'warning';
    }

    static async checkStabilityHealth() {
        // Mock Stability AI health check
        // In production, you would check Stability AI API status
        return Math.random() > 0.08 ? 'healthy' : 'warning';
    }

    static getHealthResult(promiseResult) {
        if (promiseResult.status === 'fulfilled') {
            return promiseResult.value;
        } else {
            return 'error';
        }
    }

    /**
     * Get error count for time range
     */
    static async getErrorCount(_timeRange) {
        // Mock error count - in production this would query error logs
        return Math.floor(Math.random() * 10);
    }

    /**
     * Get average response time
     */
    static async getAverageResponseTime(_timeRange) {
        // Mock response time - in production this would come from performance monitoring
        return Math.floor(Math.random() * 200) + 100; // 100-300ms
    }

    /**
     * Generate mock error logs
     */
    static generateMockErrorLogs() {
        const levels = ['error', 'warning', 'info'];
        const messages = [
            'Database connection timeout',
            'OpenAI API rate limit exceeded',
            'Image generation failed',
            'User authentication error',
            'Payment processing failed',
            'File upload error',
            'Cache miss - performance warning',
            'High memory usage detected'
        ];

        const logs = [];

        for (let i = 0; i < 100; i++) {
            logs.push({
                id: `log_${i}`,
                timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                level: levels[Math.floor(Math.random() * levels.length)],
                message: messages[Math.floor(Math.random() * messages.length)],
                source: 'image-harvest-api',
                userId: Math.random() > 0.5 ? `user_${Math.floor(Math.random() * 100)}` : null
            });
        }

        return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
}

export default ActivityController;
