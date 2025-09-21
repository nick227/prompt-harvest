import databaseClient from '../../database/PrismaClient.js';
import SimplifiedCreditService from '../credit/SimplifiedCreditService.js';

export class UserManagementService {
    constructor() {
        this.prisma = databaseClient.getClient();
    }

    /**
     * Get order by clause for Prisma queries
     */
    getOrderByClause(sortBy, sortOrder) {
        const validSortFields = {
            email: 'email',
            username: 'username',
            createdAt: 'createdAt',
            created_at: 'createdAt',
            updatedAt: 'updatedAt',
            updated_at: 'updatedAt',
            creditBalance: 'creditBalance',
            isAdmin: 'isAdmin'
        };

        const field = validSortFields[sortBy] || 'createdAt';
        const order = sortOrder === 'desc' ? 'desc' : 'asc';

        return { [field]: order };
    }

    /**
     * Build where clause for user queries
     */
    buildUserWhereClause(filters) {
        const where = {};

        if (filters.search) {
            where.OR = [
                { email: { contains: filters.search, mode: 'insensitive' } },
                { username: { contains: filters.search, mode: 'insensitive' } }
            ];
        }

        if (filters.isAdmin !== undefined) {
            where.isAdmin = filters.isAdmin === 'true';
        }

        if (filters.isSuspended !== undefined) {
            where.isSuspended = filters.isSuspended === 'true';
        }

        if (filters.dateFrom || filters.dateTo) {
            where.createdAt = {};
            if (filters.dateFrom) {
                where.createdAt.gte = new Date(filters.dateFrom);
            }
            if (filters.dateTo) {
                where.createdAt.lte = new Date(filters.dateTo);
            }
        }

        return where;
    }

    /**
     * Get users with pagination and filtering
     */
    async getUsers(filters = {}, pagination = {}) {
        const {
            search = '',
            isAdmin = '',
            isSuspended = '',
            dateFrom = '',
            dateTo = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = filters;

        const {
            page = 1,
            limit = 20
        } = pagination;

        const skip = (page - 1) * limit;
        const where = this.buildUserWhereClause({
            search,
            isAdmin,
            isSuspended,
            dateFrom,
            dateTo
        });

        const orderBy = this.getOrderByClause(sortBy, sortOrder);

        const [users, totalCount] = await Promise.all([
            this.prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    username: true,
                    name: true,
                    isAdmin: true,
                    isSuspended: true,
                    creditBalance: true,
                    createdAt: true,
                    updatedAt: true
                },
                orderBy,
                skip,
                take: limit
            }),
            this.prisma.user.count({ where })
        ]);

        return {
            users,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        };
    }

    /**
     * Get detailed user information
     */
    async getUserDetails(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                images: {
                    select: {
                        id: true,
                        prompt: true,
                        provider: true,
                        model: true,
                        isPublic: true,
                        rating: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                transactions: {
                    select: {
                        id: true,
                        type: true,
                        amount: true,
                        description: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 20
                }
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Get additional statistics
        const stats = await this.getUserStatistics(userId);

        return {
            ...user,
            statistics: stats
        };
    }

    /**
     * Get user statistics
     */
    async getUserStatistics(userId) {
        const [
            totalImages,
            publicImages,
            totalTransactions,
            creditTransactions,
            lastLogin
        ] = await Promise.all([
            this.prisma.image.count({ where: { userId } }),
            this.prisma.image.count({ where: { userId, isPublic: true } }),
            this.prisma.transaction.count({ where: { userId } }),
            this.prisma.transaction.count({
                where: {
                    userId,
                    type: { in: ['credit_purchase', 'credit_adjustment'] }
                }
            }),
            this.prisma.user.findUnique({
                where: { id: userId },
                select: { updatedAt: true }
            })
        ]);

        return {
            totalImages,
            publicImages,
            totalTransactions,
            creditTransactions,
            lastLogin: lastLogin?.updatedAt
        };
    }

    /**
     * Add credits to user account
     */
    async addCredits(userId, amount, reason, adminId) {
        if (!userId || !amount || amount <= 0) {
            throw new Error('Invalid user ID or credit amount');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const result = await SimplifiedCreditService.addCredits(
            userId,
            amount,
            'admin_adjustment',
            reason || 'Credits added by admin',
            {
                adminId,
                reason,
                timestamp: new Date().toISOString()
            }
        );

        return {
            success: result,
            newBalance: user.creditBalance + amount
        };
    }

    /**
     * Suspend user account
     */
    async suspendUser(userId, reason, adminId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        if (user.isAdmin) {
            throw new Error('Cannot suspend admin users');
        }

        const result = await this.prisma.user.update({
            where: { id: userId },
            data: {
                isSuspended: true,
                suspensionReason: reason,
                suspendedAt: new Date(),
                suspendedBy: adminId
            }
        });

        return result;
    }

    /**
     * Unsuspend user account
     */
    async unsuspendUser(userId, adminId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const result = await this.prisma.user.update({
            where: { id: userId },
            data: {
                isSuspended: false,
                suspensionReason: null,
                suspendedAt: null,
                suspendedBy: null,
                unsuspendedAt: new Date(),
                unsuspendedBy: adminId
            }
        });

        return result;
    }

    /**
     * Get user activity log
     */
    async getUserActivity(userId, limit = 50) {
        const [images, transactions, violations] = await Promise.all([
            this.prisma.image.findMany({
                where: { userId },
                select: {
                    id: true,
                    prompt: true,
                    provider: true,
                    model: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' },
                take: limit
            }),
            this.prisma.transaction.findMany({
                where: { userId },
                select: {
                    id: true,
                    type: true,
                    amount: true,
                    description: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' },
                take: limit
            }),
            this.prisma.violations.findMany({
                where: { userId },
                select: {
                    id: true,
                    violationType: true,
                    severity: true,
                    detectedWords: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' },
                take: limit
            })
        ]);

        // Combine and sort all activities
        const activities = [
            ...images.map(img => ({ ...img, type: 'image_generation' })),
            ...transactions.map(tx => ({ ...tx, type: 'transaction' })),
            ...violations.map(v => ({ ...v, type: 'violation' }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return activities.slice(0, limit);
    }

    /**
     * Export users to CSV format
     */
    async exportUsers(filters = {}) {
        const where = this.buildUserWhereClause(filters);

        const users = await this.prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                isAdmin: true,
                isSuspended: true,
                creditBalance: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return users;
    }
}
