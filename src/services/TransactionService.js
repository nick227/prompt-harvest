import databaseClient from '../database/PrismaClient.js';
import SimplifiedCreditService from './credit/SimplifiedCreditService.js';
import { calculateUserCosts } from '../config/costMatrix.js';

export class TransactionService {
    constructor() {
        this.prisma = databaseClient.getClient();
    }

    // Log a new transaction
    async logTransaction(userId, provider, count = 1) {
        try {
            // eslint-disable-next-line no-console
            console.log(`💰 TRANSACTION: Logging transaction for user ${userId}: provider=${provider}, count=${count}`);

            const transaction = await this.prisma.transaction.create({
                data: {
                    userId,
                    provider,
                    count,
                    cost: SimplifiedCreditService.getCreditCost(provider) * count,
                    createdAt: new Date()
                }
            });

            // eslint-disable-next-line no-console
            console.log(`✅ TRANSACTION: Successfully logged transaction ${transaction.id}`);

            return transaction;
        } catch (error) {
            console.error('❌ TRANSACTION: Error logging transaction:', error);
            throw error;
        }
    }

    // Get user's generation statistics
    async getUserStats(userId, startDate = null, endDate = null) {
        try {
            const whereClause = this.buildDateFilter(userId, startDate, endDate);
            const transactions = await this.getUserTransactions(whereClause);
            const stats = this.calculateUserStats(transactions, userId, startDate, endDate);

            // Add credit balance information
            try {
                const creditBalance = await SimplifiedCreditService.getBalance(userId);
                const creditValue = creditBalance * 0.005; // 1 credit = $0.005

                stats.creditBalance = creditBalance;
                stats.creditValue = creditValue;
            } catch (creditError) {
                console.warn('⚠️ TRANSACTION: Could not fetch credit balance:', creditError.message);
                stats.creditBalance = 0;
                stats.creditValue = 0;
            }

            return stats;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error getting user stats:', error);
            if (error.code === 'P1001' || error.code === 'P1008') {
                throw new Error('Database connection failed');
            }
            throw error;
        }
    }

    // Get cost for a specific generation request
    getGenerationCost(providers) {
        if (!Array.isArray(providers) || providers.length === 0) {
            return 0;
        }

        const totalCost = providers.reduce((sum, provider) => sum + SimplifiedCreditService.getCreditCost(provider), 0);

        return totalCost;
    }

    /**
     * Build date filter for queries
     */
    buildDateFilter(userId, startDate, endDate) {
        const whereClause = { userId };

        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) {
                whereClause.createdAt.gte = startDate;
            }
            if (endDate) {
                whereClause.createdAt.lte = endDate;
            }
        }

        return whereClause;
    }

    /**
     * Get user transactions from database
     */
    async getUserTransactions(whereClause) {
        return await this.prisma.transaction.findMany({
            where: whereClause,
            select: {
                id: true,
                provider: true,
                count: true,
                cost: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Calculate user statistics from transactions
     */
    calculateUserStats(transactions, userId, startDate, endDate) {
        const totalCost = transactions.reduce((sum, t) => sum + t.cost, 0);
        const generationCount = transactions.reduce((sum, t) => sum + t.count, 0);

        // Provider breakdown
        const providerBreakdown = transactions.reduce((breakdown, t) => {
            if (!breakdown[t.provider]) {
                breakdown[t.provider] = { count: 0, cost: 0 };
            }
            breakdown[t.provider].count += t.count;
            breakdown[t.provider].cost += t.cost;

            return breakdown;
        }, {});

        return {
            userId,
            period: { startDate, endDate },
            totalCost,
            generationCount,
            providerBreakdown,
            averageCostPerGeneration: generationCount > 0
                ? totalCost / generationCount
                : 0
        };
    }

    // Get provider usage breakdown for a user
    async getProviderUsage(userId, startDate = null, endDate = null) {
        try {
            const whereClause = { userId };

            if (startDate || endDate) {
                whereClause.createdAt = {};
                if (startDate) {
                    whereClause.createdAt.gte = startDate;
                }
                if (endDate) {
                    whereClause.createdAt.lte = endDate;
                }
            }

            const usage = await this.prisma.image.groupBy({
                by: ['provider'],
                where: whereClause,
                _count: {
                    provider: true
                },
                _sum: {
                    // We'll calculate costs in memory since they're not stored
                }
            });

            // Calculate costs for each provider
            const providerBreakdown = usage.map(item => ({
                provider: item.provider,
                generationCount: item._count.provider,
                totalCost: SimplifiedCreditService.getCreditCost(item.provider) * item._count.provider,
                averageCost: SimplifiedCreditService.getCreditCost(item.provider)
            }));

            return providerBreakdown;
        } catch (error) {
            console.error('Error getting provider usage:', error);
            throw error;
        }
    }

    // Get daily usage statistics
    async getDailyUsage(userId, days = 30) {
        try {
            const startDate = new Date();

            startDate.setDate(startDate.getDate() - days);

            const images = await this.prisma.image.findMany({
                where: {
                    userId,
                    createdAt: {
                        gte: startDate
                    }
                },
                select: {
                    provider: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' }
            });

            // Group by date
            const dailyUsage = {};

            images.forEach(image => {
                const [date] = image.createdAt.toISOString().split('T');

                if (!dailyUsage[date]) {
                    dailyUsage[date] = {
                        date,
                        generationCount: 0,
                        totalCost: 0,
                        providers: {}
                    };
                }

                dailyUsage[date].generationCount++;
                const cost = SimplifiedCreditService.getCreditCost(image.provider);

                dailyUsage[date].totalCost += cost;

                if (!dailyUsage[date].providers[image.provider]) {
                    dailyUsage[date].providers[image.provider] = {
                        count: 0,
                        cost: 0
                    };
                }
                dailyUsage[date].providers[image.provider].count++;
                dailyUsage[date].providers[image.provider].cost += cost;
            });

            return Object.values(dailyUsage).sort((a, b) => a.date.localeCompare(b.date));
        } catch (error) {
            console.error('Error getting daily usage:', error);
            throw error;
        }
    }

    // Get system-wide statistics (admin only)
    async getSystemStats(startDate = null, endDate = null) {
        try {
            const whereClause = {};

            if (startDate || endDate) {
                whereClause.createdAt = {};
                if (startDate) {
                    whereClause.createdAt.gte = startDate;
                }
                if (endDate) {
                    whereClause.createdAt.lte = endDate;
                }
            }

            const images = await this.prisma.image.findMany({
                where: whereClause,
                select: {
                    userId: true,
                    provider: true,
                    createdAt: true
                }
            });

            const costs = calculateUserCosts(images, startDate, endDate);

            // Get unique users
            const uniqueUsers = new Set(images.map(img => img.userId)).size;

            return {
                period: { startDate, endDate },
                totalGenerations: costs.generationCount,
                totalCost: costs.totalCost,
                uniqueUsers,
                averageCostPerGeneration: costs.generationCount > 0
                    ? costs.totalCost / costs.generationCount
                    : 0,
                providerBreakdown: costs.providerBreakdown
            };
        } catch (error) {
            console.error('Error getting system stats:', error);
            throw error;
        }
    }

    // Get cost estimate for a generation request
    async estimateGenerationCost(providers) {
        const cost = this.getGenerationCost(providers);

        return {
            providers,
            estimatedCost: cost,
            costBreakdown: providers.map(provider => ({
                provider,
                cost: SimplifiedCreditService.getCreditCost(provider)
            }))
        };
    }
}
