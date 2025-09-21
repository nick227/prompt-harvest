/**
 * Admin Payments Controller
 * Handles all payment-related admin operations
 */

import databaseClient from '../../database/PrismaClient.js';
import StripeService from '../../services/StripeService.js';

const prisma = databaseClient.getClient();

class PaymentsController {
    /**
     * Get payments with filtering and pagination
     * GET /api/admin/payments
     */
    // eslint-disable-next-line max-lines-per-function, max-statements
    static async getPayments(req, res) {
        try {
            const {
                page = 1,
                limit = 50,
                status,
                dateFrom,
                dateTo,
                minAmount,
                maxAmount,
                userEmail,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = req.query;

            // Build where conditions
            const where = {};

            if (status) {
                where.status = status;
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

            if (minAmount) {
                where.amount = { ...where.amount, gte: parseInt(minAmount * 100) }; // Convert to cents
            }

            if (maxAmount) {
                where.amount = { ...where.amount, lte: parseInt(maxAmount * 100) }; // Convert to cents
            }

            if (userEmail) {
                where.user = {
                    email: {
                        contains: userEmail,
                        mode: 'insensitive'
                    }
                };
            }

            // Calculate pagination
            const offset = (parseInt(page) - 1) * parseInt(limit);

            // Get payments with user info
            const [payments, totalCount] = await Promise.all([
                prisma.stripePayment.findMany({
                    where,
                    orderBy: {
                        [sortBy]: sortOrder
                    },
                    take: parseInt(limit),
                    skip: offset
                }),
                prisma.stripePayment.count({ where })
            ]);

            // Get user data for payments
            const userIds = [...new Set(payments.map(p => p.userId))];
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, email: true, username: true }
            });

            const userMap = new Map(users.map(user => [user.id, user]));

            // Format response data
            const formattedPayments = payments.map(payment => {
                const user = userMap.get(payment.userId);

                return {
                    id: payment.stripeSessionId,
                    userId: payment.userId,
                    userEmail: user?.email || 'Unknown',
                    username: user?.username || 'Unknown',
                    amount: payment.amount,
                    currency: payment.currency,
                    credits: payment.credits,
                    status: payment.status,
                    stripePaymentIntentId: payment.stripePaymentIntentId,
                    createdAt: payment.createdAt,
                    updatedAt: payment.updatedAt
                };
            });

            const totalPages = Math.ceil(totalCount / parseInt(limit));

            // eslint-disable-next-line no-console
            console.log(`✅ ADMIN-PAYMENTS: Retrieved ${payments.length} payments (page ${page}/${totalPages})`);

            res.json({
                success: true,
                data: {
                    items: formattedPayments,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: totalCount,
                        totalPages,
                        offset
                    }
                }
            });

        } catch (error) {
            console.error('❌ ADMIN-PAYMENTS: Get payments failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get payments',
                message: error.message
            });
        }
    }

    /**
     * Get payment analytics
     * GET /api/admin/payments/analytics
     */
    // eslint-disable-next-line max-lines-per-function
    static async getAnalytics(req, res) {
        try {
            const {
                dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
                dateTo = new Date()
            } = req.query;

            const dateFilter = {
                createdAt: {
                    gte: new Date(dateFrom),
                    lte: new Date(dateTo)
                }
            };

            // Get aggregated payment data
            const [
                totalRevenue,
                successfulPayments,
                failedPayments,
                refundedPayments,
                dailyRevenue
            ] = await Promise.all([
                // Total revenue from completed payments
                prisma.stripePayment.aggregate({
                    where: {
                        status: 'completed',
                        ...dateFilter
                    },
                    _sum: { amount: true }
                }),

                // Count of successful payments
                prisma.stripePayment.count({
                    where: {
                        status: 'completed',
                        ...dateFilter
                    }
                }),

                // Count of failed payments
                prisma.stripePayment.count({
                    where: {
                        status: 'failed',
                        ...dateFilter
                    }
                }),

                // Total refunded amount
                prisma.stripePayment.aggregate({
                    where: {
                        status: 'refunded',
                        ...dateFilter
                    },
                    _sum: { amount: true }
                }),

                // Daily revenue for charts
                prisma.$queryRaw`
                    SELECT
                        DATE(createdAt) as date,
                        SUM(amount) as revenue,
                        COUNT(*) as transactions
                    FROM stripe_payments
                    WHERE status = 'completed'
                        AND createdAt >= ${new Date(dateFrom)}
                        AND createdAt <= ${new Date(dateTo)}
                    GROUP BY DATE(createdAt)
                    ORDER BY date DESC
                    LIMIT 30
                `
            ]);

            const analytics = {
                totalRevenue: totalRevenue._sum.amount || 0,
                successfulPayments,
                failedPayments,
                refundedAmount: refundedPayments._sum.amount || 0,
                dailyRevenue,
                dateRange: {
                    from: dateFrom,
                    to: dateTo
                }
            };

            // eslint-disable-next-line no-console
            console.log(`✅ ADMIN-PAYMENTS: Analytics retrieved for ${dateFrom} to ${dateTo}`);

            res.json({
                success: true,
                data: analytics
            });

        } catch (error) {
            console.error('❌ ADMIN-PAYMENTS: Analytics failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get payment analytics',
                message: error.message
            });
        }
    }

    /**
     * Export payments data
     * GET /api/admin/payments/export
     */
    // eslint-disable-next-line max-lines-per-function, max-statements
    static async exportPayments(req, res) {
        try {
            const {
                format = 'csv',
                status,
                dateFrom,
                dateTo
            } = req.query;

            // Build where conditions (similar to getPayments)
            const where = {};

            if (status) {
                where.status = status;
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

            // Get all matching payments
            const payments = await prisma.stripePayment.findMany({
                where,
                include: {
                    user: {
                        select: {
                            email: true,
                            username: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            if (format === 'csv') {
                // Generate CSV
                const csvHeaders = [
                    'Payment ID',
                    'User Email',
                    'Username',
                    'Amount (USD)',
                    'Credits',
                    'Status',
                    'Date Created'
                ];

                const csvRows = payments.map(payment => [
                    payment.stripeSessionId,
                    payment.user.email,
                    payment.user.username || '',
                    (payment.amount / 100).toFixed(2),
                    payment.credits,
                    payment.status,
                    payment.createdAt.toISOString()
                ]);

                const csvContent = [
                    csvHeaders.join(','),
                    ...csvRows.map(row => row.map(field => (typeof field === 'string' && field.includes(',')
                        ? `"${field}"`
                        : field)
                    ).join(','))
                ].join('\n');

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=payments-export-${new Date().toISOString().split('T')[0]}.csv`);
                res.send(csvContent);

            } else if (format === 'json') {
                // Generate JSON
                const jsonData = payments.map(payment => ({
                    paymentId: payment.stripeSessionId,
                    userEmail: payment.user.email,
                    username: payment.user.username,
                    amount: payment.amount / 100,
                    credits: payment.credits,
                    status: payment.status,
                    createdAt: payment.createdAt,
                    updatedAt: payment.updatedAt
                }));

                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename=payments-export-${new Date().toISOString().split('T')[0]}.json`);
                res.json(jsonData);

            } else {
                throw new Error(`Unsupported export format: ${format}`);
            }

            // eslint-disable-next-line no-console
            console.log(`✅ ADMIN-PAYMENTS: Exported ${payments.length} payments as ${format}`);

        } catch (error) {
            console.error('❌ ADMIN-PAYMENTS: Export failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to export payments',
                message: error.message
            });
        }
    }

    /**
     * Get specific payment details
     * GET /api/admin/payments/:paymentId
     */
    static async getPaymentDetails(req, res) {
        try {
            const { paymentId } = req.params;

            const payment = await prisma.stripePayment.findUnique({
                where: { stripeSessionId: paymentId },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            username: true,
                            createdAt: true
                        }
                    },
                    creditLedger: {
                        where: {
                            type: 'purchase'
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                }
            });

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    error: 'Payment not found',
                    message: `Payment with ID ${paymentId} not found`
                });
            }

            // eslint-disable-next-line no-console
            console.log(`✅ ADMIN-PAYMENTS: Retrieved payment details for ${paymentId}`);

            return res.json({
                success: true,
                data: payment
            });

        } catch (error) {
            console.error('❌ ADMIN-PAYMENTS: Get payment details failed:', error);

            return res.status(500).json({
                success: false,
                error: 'Failed to get payment details',
                message: error.message
            });
        }
    }

    /**
     * Refund a payment
     * POST /api/admin/payments/:paymentId/refund
     */
    // eslint-disable-next-line max-lines-per-function
    static async refundPayment(req, res) {
        try {
            const { paymentId } = req.params;
            const { reason = 'Admin refund' } = req.body;

            // Get payment details
            const payment = await prisma.stripePayment.findUnique({
                where: { stripeSessionId: paymentId },
                include: {
                    user: true
                }
            });

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    error: 'Payment not found',
                    message: `Payment with ID ${paymentId} not found`
                });
            }

            if (payment.status !== 'completed') {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot refund payment',
                    message: 'Only completed payments can be refunded'
                });
            }

            // Process refund through Stripe
            const _refundResult = await StripeService.refundPayment(paymentId, reason);

            // Update payment status in database
            await prisma.stripePayment.update({
                where: { stripeSessionId: paymentId },
                data: {
                    status: 'refunded',
                    updatedAt: new Date()
                }
            });

            // Remove credits from user account
            await prisma.creditLedger.create({
                data: {
                    userId: payment.userId,
                    amount: -payment.credits, // Negative amount to remove credits
                    type: 'refund',
                    description: `Refund for payment ${paymentId}: ${reason}`,
                    metadata: {
                        originalPaymentId: paymentId,
                        refundReason: reason,
                        adminUserId: req.adminUser.id
                    }
                }
            });

            // eslint-disable-next-line no-console
            console.log(`✅ ADMIN-PAYMENTS: Refunded payment ${paymentId} for ${payment.user.email}`);

            return res.json({
                success: true,
                message: 'Payment refunded successfully',
                data: {
                    paymentId,
                    refundAmount: payment.amount,
                    creditsRemoved: payment.credits,
                    reason
                }
            });

        } catch (error) {
            console.error('❌ ADMIN-PAYMENTS: Refund failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to refund payment',
                message: error.message
            });
        }
    }
}

export default PaymentsController;
