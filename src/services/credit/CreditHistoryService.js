/**
 * Credit History Service
 * Handles credit history and ledger operations
 */

import databaseClient from '../../database/PrismaClient.js';

const prisma = databaseClient.getClient();

export class CreditHistoryService {

    /**
     * Get user's credit history
     */
    async getCreditHistory(userId, limit = 50) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        if (limit < 1 || limit > 100) {
            throw new Error('Limit must be between 1 and 100');
        }

        try {
            const history = await prisma.creditLedger.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                select: {
                    id: true,
                    userId: true,
                    type: true,
                    amount: true,
                    description: true,
                    stripePaymentId: true,
                    promoCodeId: true,
                    metadata: true,
                    createdAt: true
                }
            });

            return history;
        } catch (error) {
            console.error('💳 HISTORY-SERVICE: Error getting credit history:', error);
            throw error;
        }
    }

    /**
     * Get credit history by type
     */
    async getCreditHistoryByType(userId, type, limit = 50) {
        if (!userId || !type) {
            throw new Error('User ID and type are required');
        }

        const validTypes = ['purchase', 'debit', 'promo', 'refund', 'adjustment'];

        if (!validTypes.includes(type)) {
            throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
        }

        try {
            const history = await prisma.creditLedger.findMany({
                where: { userId, type },
                orderBy: { createdAt: 'desc' },
                take: limit
            });

            return history;
        } catch (error) {
            console.error('💳 HISTORY-SERVICE: Error getting credit history by type:', error);
            throw error;
        }
    }

    /**
     * Get credit summary for user
     */
    async getCreditSummary(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            // Get aggregated data by type
            const summary = await prisma.creditLedger.groupBy({
                by: ['type'],
                where: { userId },
                _sum: { amount: true },
                _count: { amount: true }
            });

            // Get current balance
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { creditBalance: true }
            });

            const summaryObj = {
                currentBalance: user?.creditBalance || 0,
                totalTransactions: 0,
                byType: {}
            };

            summary.forEach(item => {
                summaryObj.byType[item.type] = {
                    totalAmount: item._sum.amount || 0,
                    transactionCount: item._count.amount || 0
                };
                summaryObj.totalTransactions += item._count.amount || 0;
            });

            return summaryObj;
        } catch (error) {
            console.error('💳 HISTORY-SERVICE: Error getting credit summary:', error);
            throw error;
        }
    }

    /**
     * Get credit history for date range
     */
    async getCreditHistoryByDateRange(userId, startDate, endDate, limit = 50) {
        if (!userId || !startDate || !endDate) {
            throw new Error('User ID, start date, and end date are required');
        }

        if (new Date(startDate) > new Date(endDate)) {
            throw new Error('Start date must be before end date');
        }

        try {
            const history = await prisma.creditLedger.findMany({
                where: {
                    userId,
                    createdAt: {
                        gte: new Date(startDate),
                        lte: new Date(endDate)
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limit
            });

            return history;
        } catch (error) {
            console.error('💳 HISTORY-SERVICE: Error getting credit history by date range:', error);
            throw error;
        }
    }

    /**
     * Get recent transactions (last 24 hours)
     */
    async getRecentTransactions(userId, limit = 10) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        const yesterday = new Date();

        yesterday.setDate(yesterday.getDate() - 1);

        try {
            const recent = await prisma.creditLedger.findMany({
                where: {
                    userId,
                    createdAt: { gte: yesterday }
                },
                orderBy: { createdAt: 'desc' },
                take: limit
            });

            return recent;
        } catch (error) {
            console.error('💳 HISTORY-SERVICE: Error getting recent transactions:', error);
            throw error;
        }
    }

    /**
     * Export credit history to CSV format (admin function)
     */
    async exportCreditHistory(userId, startDate, endDate) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            const history = await this.getCreditHistoryByDateRange(userId, startDate, endDate, 1000);

            const csvHeader = 'Date,Type,Amount,Description,Balance After\n';
            const csvRows = history.map(entry => {
                const [date] = entry.createdAt.toISOString().split('T');
                const { type, amount } = entry;
                const description = `"${entry.description.replace(/"/g, '""')}"`;

                return `${date},${type},${amount},${description}`;
            }).join('\n');

            return csvHeader + csvRows;
        } catch (error) {
            console.error('💳 HISTORY-SERVICE: Error exporting credit history:', error);
            throw error;
        }
    }
}

export default new CreditHistoryService();
