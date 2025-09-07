/**
 * Credit Balance Service
 * Focused solely on balance operations
 */

import databaseClient from '../../database/PrismaClient.js';

const prisma = databaseClient.getClient();

export class CreditBalanceService {

    /**
     * Get user's current credit balance
     */
    async getBalance(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { creditBalance: true }
            });

            if (!user) {
                throw new Error(`User not found: ${userId}`);
            }

            return user.creditBalance;
        } catch (error) {
            console.error('💳 BALANCE-SERVICE: Error getting balance:', error);
            throw error;
        }
    }

    /**
     * Check if user has sufficient credits
     */
    async hasCredits(userId, amount = 1) {
        if (!userId || amount < 0) {
            return false;
        }

        try {
            const balance = await this.getBalance(userId);

            return balance >= amount;
        } catch (error) {
            console.error('💳 BALANCE-SERVICE: Error checking credits:', error);

            return false;
        }
    }

    /**
     * Get multiple users' balances (admin function)
     */
    async getMultipleBalances(userIds) {
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return [];
        }

        try {
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, creditBalance: true }
            });

            return users.reduce((acc, user) => {
                acc[user.id] = user.creditBalance;

                return acc;
            }, {});
        } catch (error) {
            console.error('💳 BALANCE-SERVICE: Error getting multiple balances:', error);
            throw error;
        }
    }

    /**
     * Get balance statistics (admin function)
     */
    async getBalanceStats() {
        try {
            const stats = await prisma.user.aggregate({
                _avg: { creditBalance: true },
                _min: { creditBalance: true },
                _max: { creditBalance: true },
                _sum: { creditBalance: true },
                _count: { creditBalance: true }
            });

            return {
                averageBalance: Math.round(stats._avg.creditBalance || 0),
                minBalance: stats._min.creditBalance || 0,
                maxBalance: stats._max.creditBalance || 0,
                totalCredits: stats._sum.creditBalance || 0,
                userCount: stats._count.creditBalance || 0
            };
        } catch (error) {
            console.error('💳 BALANCE-SERVICE: Error getting balance stats:', error);
            throw error;
        }
    }
}

export default new CreditBalanceService();
