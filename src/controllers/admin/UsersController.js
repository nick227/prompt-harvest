/**
 * Admin Users Controller
 * Handles user management operations
 */
// eslint-disable-next-line max-lines

import databaseClient from '../../database/PrismaClient.js';
import { UserManagementService } from '../../services/admin/UserManagementService.js';

const prisma = databaseClient.getClient();

class UsersController {
    /**
     * Get order by clause for Prisma queries
     * @param {string} sortBy - Field to sort by
     * @param {string} sortOrder - Sort order (asc/desc)
     * @returns {Object} Order by clause for Prisma
     */
    static getOrderByClause(sortBy, sortOrder) {
        const validSortFields = {
            email: 'email',
            username: 'username',
            createdAt: 'createdAt',
            created_at: 'createdAt', // Frontend sends created_at
            updatedAt: 'updatedAt',
            updated_at: 'updatedAt', // Frontend might send updated_at
            creditBalance: 'creditBalance',
            isAdmin: 'isAdmin'
        };

        const field = validSortFields[sortBy] || 'createdAt';
        const order = sortOrder === 'asc' ? 'asc' : 'desc';

        return { [field]: order };
    }

    /**
     * Get users with filtering and pagination
     * GET /api/admin/users
     */
    // eslint-disable-next-line max-lines-per-function, max-statements
    static async getUsers(req, res) {
        try {
            const {
                page = 1,
                limit = 25,
                status,
                isAdmin,
                search,
                minCredits,
                joinedAfter,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = req.query;

            // Build where conditions
            const where = {};

            if (status && status === 'suspended') {
                // For now, we'll assume all users are 'active' unless suspended
                // You might want to add a status field to the User model
                // This would require a status or isSuspended field
                // For now, we'll skip this filter
            }

            if (isAdmin !== undefined) {
                where.isAdmin = isAdmin === 'true';
            }

            if (search) {
                where.OR = [
                    {
                        email: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    },
                    {
                        username: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    }
                ];
            }

            if (minCredits) {
                where.creditBalance = {
                    gte: parseInt(minCredits)
                };
            }

            if (joinedAfter) {
                where.createdAt = {
                    gte: new Date(joinedAfter)
                };
            }

            // Calculate pagination
            const offset = (parseInt(page) - 1) * parseInt(limit);

            // Sorting parameters processed

            // Get users with aggregated data
            const [users, totalCount] = await Promise.all([
                prisma.user.findMany({
                    where,
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        isAdmin: true,
                        isSuspended: true,
                        creditBalance: true,
                        createdAt: true,
                        updatedAt: true
                    },
                    orderBy: UsersController.getOrderByClause(sortBy, sortOrder),
                    take: parseInt(limit),
                    skip: offset
                }),
                prisma.user.count({ where })
            ]);

            // Get image counts for each user
            const userIds = users.map(user => user.id);
            const imageCounts = await prisma.image.groupBy({
                by: ['userId'],
                where: {
                    userId: {
                        in: userIds
                    },
                    isDeleted: false
                },
                _count: {
                    id: true
                }
            });

            // Create a map of userId -> image count
            const imageCountMap = {};
            imageCounts.forEach(count => {
                imageCountMap[count.userId] = count._count.id;
            });

            // Format response data
            const formattedUsers = users.map(user => ({
                id: user.id,
                email: user.email,
                username: user.username,
                isAdmin: user.isAdmin,
                isSuspended: user.isSuspended,
                creditBalance: user.creditBalance || 0,
                totalGenerated: imageCountMap[user.id] || 0, // Use actual image count
                totalPayments: 0, // Will be calculated separately if needed
                totalTransactions: 0, // Will be calculated separately if needed
                status: user.isSuspended ? 'suspended' : 'active',
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }));

            const totalPages = Math.ceil(totalCount / parseInt(limit));

            // eslint-disable-next-line no-console

            res.json({
                success: true,
                data: {
                    items: formattedUsers,
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
            console.error('❌ ADMIN-USERS: Get users failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get users',
                message: error.message
            });
        }
    }

    /**
     * Get specific user details and activity
     * GET /api/admin/users/:userId
     */
    static async getUserDetails(req, res) {
        try {
            const { userId } = req.params;

            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Get related data separately
            const [images, stripePayments, creditLedger, promoRedemptions] = await Promise.all([
                prisma.image.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    select: {
                        id: true,
                        prompt: true,
                        provider: true,
                        model: true,
                        createdAt: true
                    }
                }),
                prisma.stripePayment.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    select: {
                        stripeSessionId: true,
                        amount: true,
                        credits: true,
                        status: true,
                        createdAt: true
                    }
                }),
                prisma.creditLedger.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    select: {
                        id: true,
                        amount: true,
                        type: true,
                        description: true,
                        createdAt: true
                    }
                }),
                prisma.promoRedemption.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    select: {
                        id: true,
                        credits: true,
                        createdAt: true,
                        promoCodeId: true
                    }
                })
            ]);

            // Get promo codes for redemptions
            const promoCodeIds = [...new Set(promoRedemptions.map(r => r.promoCodeId))];
            const promoCodes = await prisma.promoCode.findMany({
                where: { id: { in: promoCodeIds } },
                select: {
                    id: true,
                    code: true,
                    credits: true,
                    createdAt: true
                }
            });

            const promoCodeMap = new Map(promoCodes.map(pc => [pc.id, pc]));

            // Combine user data with related data
            const userWithDetails = {
                ...user,
                images,
                stripePayments,
                creditLedger,
                promoRedemptions: promoRedemptions.map(redemption => ({
                    ...redemption,
                    promoCode: promoCodeMap.get(redemption.promoCodeId) || null
                }))
            };

            // Calculate user statistics
            const [totalSpent, totalCreditsEarned, totalCreditsUsed] = await Promise.all([
                prisma.stripePayment.aggregate({
                    where: {
                        userId,
                        status: 'completed'
                    },
                    _sum: { amount: true }
                }),
                prisma.creditLedger.aggregate({
                    where: {
                        userId,
                        amount: { gt: 0 }
                    },
                    _sum: { amount: true }
                }),
                prisma.creditLedger.aggregate({
                    where: {
                        userId,
                        amount: { lt: 0 }
                    },
                    _sum: { amount: true }
                })
            ]);

            const userDetails = {
                ...userWithDetails,
                password: undefined, // Remove password from response
                resetToken: undefined, // Remove reset token from response
                statistics: {
                    totalImagesGenerated: images.length,
                    totalSpent: (totalSpent._sum.amount || 0) / 100, // Convert to dollars
                    totalCreditsEarned: totalCreditsEarned._sum.amount || 0,
                    totalCreditsUsed: Math.abs(totalCreditsUsed._sum.amount || 0),
                    promoCodesRedeemed: promoRedemptions.length
                }
            };

            // eslint-disable-next-line no-console

            res.json({
                success: true,
                data: userDetails
            });

        } catch (error) {
            console.error('❌ ADMIN-USERS: Get user details failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get user details',
                message: error.message
            });
        }
    }

    /**
     * Add credits to user account
     * POST /api/admin/users/:userId/credits
     */
    // eslint-disable-next-line max-lines-per-function
    static async addCredits(req, res) {
        try {
            console.log('🔍 ADMIN-USERS: addCredits called with:', {
                userId: req.params.userId,
                body: req.body,
                adminUser: req.adminUser ? { id: req.adminUser.id, email: req.adminUser.email } : 'No admin user'
            });

            const { userId } = req.params;
            const { amount, reason = 'Admin credit adjustment' } = req.body;
            const { adminUser } = req;

            // Validate amount
            if (!amount || !Number.isInteger(amount) || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid amount',
                    message: 'Amount must be a positive integer'
                });
            }

            // Check if user exists
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, username: true, creditBalance: true }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                    message: `User with ID ${userId} not found`
                });
            }

            // Add credits using transaction
            const result = await prisma.$transaction(async tx => {
                // Create credit ledger entry
                const ledgerEntry = await tx.creditLedger.create({
                    data: {
                        userId,
                        amount,
                        type: 'admin_adjustment',
                        description: reason,
                        metadata: {
                            adminUserId: adminUser.id,
                            adminEmail: adminUser.email,
                            timestamp: new Date().toISOString()
                        }
                    }
                });


                // Update user's credit balance
                const updatedUser = await tx.user.update({
                    where: { id: userId },
                    data: {
                        creditBalance: {
                            increment: amount
                        }
                    },
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        creditBalance: true
                    }
                });


                return { ledgerEntry, updatedUser };
            });


            // eslint-disable-next-line no-console

            const responseData = {
                success: true,
                message: `Successfully added ${amount} credits to user account`,
                data: {
                    user: result.updatedUser,
                    transaction: result.ledgerEntry,
                    previousBalance: user.creditBalance,
                    newBalance: result.updatedUser.creditBalance
                }
            };

            res.json(responseData);

        } catch (error) {
            console.error('❌ ADMIN-USERS: Add credits failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to add credits',
                message: error.message
            });
        }
    }

    /**
     * Suspend user account
     * POST /api/admin/users/:userId/suspend
     */
    static async suspendUser(req, res) {
        try {
            const { userId } = req.params;
            const { reason = 'Account suspended by administrator' } = req.body;
            const { adminUser } = req;

            // Check if user exists
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, username: true, isAdmin: true, isSuspended: true }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                    message: `User with ID ${userId} not found`
                });
            }

            // Prevent suspending admin users
            if (user.isAdmin) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot suspend admin user',
                    message: 'Admin users cannot be suspended'
                });
            }

            // Check if user is already suspended
            if (user.isSuspended) {
                return res.status(400).json({
                    success: false,
                    error: 'User already suspended',
                    message: 'User is already suspended'
                });
            }

            // Suspend the user
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { isSuspended: true },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    isSuspended: true
                }
            });

            console.log(
                `✅ ADMIN-USERS: User suspended: ${user.email} by ${adminUser.email}. ` +
                `Reason: ${reason}`
            );

            res.json({
                success: true,
                message: 'User suspended successfully',
                data: {
                    user: updatedUser,
                    action: {
                        userId,
                        userEmail: user.email,
                        reason,
                        suspendedBy: adminUser.email,
                        suspendedAt: new Date().toISOString()
                    }
                }
            });

        } catch (error) {
            console.error('❌ ADMIN-USERS: Suspend user failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to suspend user',
                message: error.message
            });
        }
    }

    /**
     * Unsuspend user account
     * POST /api/admin/users/:userId/unsuspend
     */
    static async unsuspendUser(req, res) {
        try {
            const { userId } = req.params;
            const { reason = 'Account reactivated by administrator' } = req.body;
            const { adminUser } = req;

            // Check if user exists
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, username: true, isSuspended: true }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                    message: `User with ID ${userId} not found`
                });
            }

            // Check if user is not suspended
            if (!user.isSuspended) {
                return res.status(400).json({
                    success: false,
                    error: 'User not suspended',
                    message: 'User is not currently suspended'
                });
            }

            // Unsuspend the user
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { isSuspended: false },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    isSuspended: true
                }
            });

            console.log(
                `✅ ADMIN-USERS: User unsuspended: ${user.email} by ${adminUser.email}. ` +
                `Reason: ${reason}`
            );

            res.json({
                success: true,
                message: 'User unsuspended successfully',
                data: {
                    user: updatedUser,
                    action: {
                        userId,
                        userEmail: user.email,
                        reason,
                        unsuspendedBy: adminUser.email,
                        unsuspendedAt: new Date().toISOString()
                    }
                }
            });

        } catch (error) {
            console.error('❌ ADMIN-USERS: Unsuspend user failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to unsuspend user',
                message: error.message
            });
        }
    }

    /**
     * Get user activity summary
     * GET /api/admin/users/:userId/activity
     */
    // eslint-disable-next-line max-lines-per-function
    static async getUserActivity(req, res) {
        try {
            const { userId } = req.params;
            const { range = '30d' } = req.query;

            // Calculate date range
            const timeRange = UsersController.calculateTimeRange(range);

            // Get user activity data
            const [user, imageActivity, paymentActivity, creditActivity] = await Promise.all([
                prisma.user.findUnique({
                    where: { id: userId },
                    select: { id: true, email: true, username: true }
                }),

                // Image generation activity
                prisma.$queryRaw`
                    SELECT
                        DATE(createdAt) as date,
                        COUNT(*) as images_generated,
                        COUNT(DISTINCT provider) as providers_used
                    FROM images
                    WHERE userId = ${userId}
                        AND createdAt >= ${timeRange.start}
                        AND createdAt <= ${timeRange.end}
                    GROUP BY DATE(createdAt)
                    ORDER BY date DESC
                `,

                // Payment activity
                prisma.stripePayment.findMany({
                    where: {
                        userId,
                        createdAt: {
                            gte: timeRange.start,
                            lte: timeRange.end
                        }
                    },
                    select: {
                        amount: true,
                        credits: true,
                        status: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' }
                }),

                // Credit transactions
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
                        description: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' }
                })
            ]);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                    message: `User with ID ${userId} not found`
                });
            }

            const activitySummary = {
                user,
                timeRange: {
                    start: timeRange.start,
                    end: timeRange.end,
                    range
                },
                imageActivity,
                paymentActivity,
                creditActivity,
                summary: {
                    totalImagesInPeriod: imageActivity.reduce((sum, day) => sum + Number(day.images_generated), 0),
                    totalSpentInPeriod: paymentActivity
                        .filter(p => p.status === 'completed')
                        .reduce((sum, p) => sum + p.amount, 0) / 100,
                    totalCreditsEarnedInPeriod: creditActivity
                        .filter(c => c.amount > 0)
                        .reduce((sum, c) => sum + c.amount, 0),
                    totalCreditsUsedInPeriod: Math.abs(creditActivity
                        .filter(c => c.amount < 0)
                        .reduce((sum, c) => sum + c.amount, 0))
                }
            };

            // eslint-disable-next-line no-console

            res.json({
                success: true,
                data: activitySummary
            });

        } catch (error) {
            console.error('❌ ADMIN-USERS: Get user activity failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get user activity',
                message: error.message
            });
        }
    }

    /**
     * Bulk update users
     * POST /api/admin/users/bulk
     */
    static async bulkUpdate(req, res) {
        try {
            const { userIds, updates } = req.body;
            const { adminUser } = req;

            if (!Array.isArray(userIds) || userIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid user IDs',
                    message: 'userIds must be a non-empty array'
                });
            }

            if (!updates || typeof updates !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid updates',
                    message: 'updates must be an object'
                });
            }

            // eslint-disable-next-line no-console
            // eslint-disable-next-line no-console

            // For now, just log the bulk operation
            // In a production system, you would implement the actual bulk update logic

            res.json({
                success: true,
                message: `Bulk update logged for ${userIds.length} users`,
                data: {
                    userIds,
                    updates,
                    updatedBy: adminUser.email,
                    updatedAt: new Date().toISOString(),
                    note: 'Bulk update functionality requires implementation based on specific requirements'
                }
            });

        } catch (error) {
            console.error('❌ ADMIN-USERS: Bulk update failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to bulk update users',
                message: error.message
            });
        }
    }

    /**
     * Export users data
     * GET /api/admin/users/export
     */
    // eslint-disable-next-line max-lines-per-function, max-statements
    static async exportUsers(req, res) {
        try {
            const { format = 'csv', ...filters } = req.query;

            // Use the same filtering logic as getUsers
            const where = {};

            if (filters.status && filters.status !== 'all') {
                // Add status filter if implemented
            }
            if (filters.isAdmin !== undefined) {
                where.isAdmin = filters.isAdmin === 'true';
            }

            const users = await prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    username: true,
                    isAdmin: true,
                    isSuspended: true,
                    creditBalance: true,
                    createdAt: true
                    // _count: {
                    //     images: true,
                    //     stripePayments: true
                    // }
                },
                orderBy: { createdAt: 'desc' }
            });

            if (format === 'csv') {
                const csvHeaders = [
                    'User ID',
                    'Email',
                    'Username',
                    'Is Admin',
                    'Credit Balance',
                    'Total Images',
                    'Total Payments',
                    'Join Date'
                ];

                const csvRows = users.map(user => [
                    user.id,
                    user.email,
                    user.username || '',
                    user.isAdmin ? 'Yes' : 'No',
                    user.creditBalance || 0,
                    0, // Images count - will be available when relations are working
                    0, // Payments count - will be available when relations are working
                    user.createdAt.toISOString().split('T')[0]
                ]);

                const csvContent = [
                    csvHeaders.join(','),
                    ...csvRows.map(row => row.map(field => (typeof field === 'string' && field.includes(',')
                        ? `"${field}"`
                        : field)
                    ).join(','))
                ].join('\n');

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=users-export-${new Date().toISOString().split('T')[0]}.csv`);
                res.send(csvContent);

            } else if (format === 'json') {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename=users-export-${new Date().toISOString().split('T')[0]}.json`);
                res.json(users);

            } else {
                throw new Error(`Unsupported export format: ${format}`);
            }

            // eslint-disable-next-line no-console

        } catch (error) {
            console.error('❌ ADMIN-USERS: Export users failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to export users',
                message: error.message
            });
        }
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
            case '7d':
                start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        return { start, end };
    }
}

export default UsersController;
