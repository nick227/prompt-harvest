/**
 * Optimized Query Service for Admin Controllers
 * Replaces complex raw SQL with optimized Prisma queries
 */

import databaseClient from '../../database/PrismaClient.js';

const prisma = databaseClient.getClient();

class OptimizedQueryService {
    /**
     * Get image generation metrics with optimized grouping
     */
    static async getImageMetrics(timeRange, groupBy = 'hour') {
        try {
            // Use Prisma's built-in date functions instead of raw SQL
            const images = await prisma.images.findMany({
                where: {
                    createdAt: {
                        gte: timeRange.start,
                        lte: timeRange.end
                    }
                },
                select: {
                    createdAt: true,
                    userId: true
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });

            // Group data in JavaScript (more portable than DB-specific SQL)
            return this.groupImagesByTime(images, groupBy);

        } catch (error) {
            console.error('❌ QUERY-SERVICE: Image metrics failed:', error);
            throw error;
        }
    }

    /**
     * Get user activity metrics
     */
    static async getUserMetrics(timeRange, groupBy = 'hour') {
        try {
            const images = await prisma.images.findMany({
                where: {
                    createdAt: {
                        gte: timeRange.start,
                        lte: timeRange.end
                    }
                },
                select: {
                    createdAt: true,
                    userId: true
                },
                distinct: ['userId', 'createdAt'],
                orderBy: {
                    createdAt: 'asc'
                }
            });

            return this.groupUsersByTime(images, groupBy);

        } catch (error) {
            console.error('❌ QUERY-SERVICE: User metrics failed:', error);
            throw error;
        }
    }

    /**
     * Get revenue metrics with proper aggregation
     */
    static async getRevenueMetrics(timeRange, groupBy = 'day') {
        try {
            const payments = await prisma.stripePayment.findMany({
                where: {
                    status: 'completed',
                    createdAt: {
                        gte: timeRange.start,
                        lte: timeRange.end
                    }
                },
                select: {
                    amount: true,
                    createdAt: true
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });

            return this.groupRevenueByTime(payments, groupBy);

        } catch (error) {
            console.error('❌ QUERY-SERVICE: Revenue metrics failed:', error);
            throw error;
        }
    }

    /**
     * Get payment analytics with aggregation
     */
    static async getPaymentAnalytics(dateRange) {
        try {
            const dateFilter = {
                createdAt: {
                    gte: new Date(dateRange.from),
                    lte: new Date(dateRange.to)
                }
            };

            // Use Promise.all for parallel queries
            const [totalRevenue, successfulPayments, failedPayments, refundedAmount] = await Promise.all([
                prisma.stripePayment.aggregate({
                    where: {
                        status: 'completed',
                        ...dateFilter
                    },
                    _sum: { amount: true }
                }),

                prisma.stripePayment.count({
                    where: {
                        status: 'completed',
                        ...dateFilter
                    }
                }),

                prisma.stripePayment.count({
                    where: {
                        status: 'failed',
                        ...dateFilter
                    }
                }),

                prisma.stripePayment.aggregate({
                    where: {
                        status: 'refunded',
                        ...dateFilter
                    },
                    _sum: { amount: true }
                })
            ]);

            return {
                totalRevenue: totalRevenue._sum.amount || 0,
                successfulPayments,
                failedPayments,
                refundedAmount: refundedAmount._sum.amount || 0
            };

        } catch (error) {
            console.error('❌ QUERY-SERVICE: Payment analytics failed:', error);
            throw error;
        }
    }

    /**
     * Get user activity summary with optimized queries
     */
    static async getUserActivitySummary(userId, timeRange) {
        try {
            const [imageActivity, creditActivity] = await Promise.all([
                // Get image generation data
                prisma.images.findMany({
                    where: {
                        userId,
                        createdAt: {
                            gte: timeRange.start,
                            lte: timeRange.end
                        }
                    },
                    select: {
                        createdAt: true,
                        provider: true
                    }
                }),

                // Get credit transactions
                prisma.creditLedger.findMany({
                    where: {
                        userId,
                        createdAt: {
                            gte: timeRange.start,
                            lte: timeRange.end
                        }
                    },
                    select: {
                        amount: true,
                        type: true,
                        createdAt: true
                    }
                })
            ]);

            return {
                imageActivity: this.groupImagesByDay(imageActivity),
                creditActivity: this.groupCreditsByType(creditActivity),
                summary: {
                    totalImages: imageActivity.length,
                    totalCreditsEarned: creditActivity
                        .filter(c => c.amount > 0)
                        .reduce((sum, c) => sum + c.amount, 0),
                    totalCreditsUsed: Math.abs(creditActivity
                        .filter(c => c.amount < 0)
                        .reduce((sum, c) => sum + c.amount, 0))
                }
            };

        } catch (error) {
            console.error('❌ QUERY-SERVICE: User activity summary failed:', error);
            throw error;
        }
    }

    // ===========================================
    // UTILITY METHODS FOR DATA GROUPING
    // ===========================================

    /**
     * Group images by time period
     */
    static groupImagesByTime(images, groupBy) {
        const groups = new Map();

        images.forEach(image => {
            const key = this.getTimeKey(image.createdAt, groupBy);

            if (!groups.has(key)) {
                groups.set(key, {
                    timestamp: key,
                    count: 0,
                    uniqueUsers: new Set()
                });
            }

            const group = groups.get(key);

            group.count++;
            group.uniqueUsers.add(image.userId);
        });

        return Array.from(groups.values()).map(group => ({
            timestamp: group.timestamp,
            value: group.count,
            uniqueUsers: group.uniqueUsers.size
        }));
    }

    /**
     * Group users by time period
     */
    static groupUsersByTime(images, groupBy) {
        const groups = new Map();

        images.forEach(image => {
            const key = this.getTimeKey(image.createdAt, groupBy);

            if (!groups.has(key)) {
                groups.set(key, new Set());
            }

            groups.get(key).add(image.userId);
        });

        return Array.from(groups.entries()).map(([timestamp, users]) => ({
            timestamp,
            value: users.size
        }));
    }

    /**
     * Group revenue by time period
     */
    static groupRevenueByTime(payments, groupBy) {
        const groups = new Map();

        payments.forEach(payment => {
            const key = this.getTimeKey(payment.createdAt, groupBy);

            if (!groups.has(key)) {
                groups.set(key, {
                    revenue: 0,
                    transactions: 0
                });
            }

            const group = groups.get(key);

            group.revenue += payment.amount;
            group.transactions++;
        });

        return Array.from(groups.entries()).map(([timestamp, data]) => ({
            timestamp,
            value: data.revenue / 100, // Convert to dollars
            transactions: data.transactions
        }));
    }

    /**
     * Group images by day
     */
    static groupImagesByDay(images) {
        const groups = new Map();

        images.forEach(image => {
            const [day] = image.createdAt.toISOString().split('T');

            if (!groups.has(day)) {
                groups.set(day, {
                    date: day,
                    count: 0,
                    providers: new Set()
                });
            }

            const group = groups.get(day);

            group.count++;
            group.providers.add(image.provider);
        });

        return Array.from(groups.values()).map(group => ({
            date: group.date,
            images_generated: group.count,
            providers_used: group.providers.size
        }));
    }

    /**
     * Group credits by type
     */
    static groupCreditsByType(credits) {
        const groups = new Map();

        credits.forEach(credit => {
            if (!groups.has(credit.type)) {
                groups.set(credit.type, {
                    type: credit.type,
                    total: 0,
                    count: 0
                });
            }

            const group = groups.get(credit.type);

            group.total += credit.amount;
            group.count++;
        });

        return Array.from(groups.values());
    }

    /**
     * Get time key for grouping
     */
    static getTimeKey(date, groupBy) {
        const d = new Date(date);

        switch (groupBy) {
            case 'hour':
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00:00`;
            case 'day':
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            case 'week': {
                const startOfWeek = new Date(d);

                startOfWeek.setDate(d.getDate() - d.getDay());

                const [day] = startOfWeek.toISOString().split('T');

                return day;
            }
            case 'month':
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            default:
                return d.toISOString();
        }
    }

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
}

export default OptimizedQueryService;
