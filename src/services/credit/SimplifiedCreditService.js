/**
 * Simplified Credit Service
 * Orchestrates focused credit services with a clean API
 */

import CreditBalanceService from './CreditBalanceService.js';
import CreditTransactionService from './CreditTransactionService.js';
import PromoCodeService from './PromoCodeService.js';
import CreditHistoryService from './CreditHistoryService.js';
import databaseClient from '../../database/PrismaClient.js';
import modelInterface from '../ModelInterface.js';

const prisma = databaseClient.getClient();

export class SimplifiedCreditService {

    constructor() {
        this.balance = CreditBalanceService;
        this.transactions = CreditTransactionService;
        this.promos = PromoCodeService;
        this.history = CreditHistoryService;
        this.costCache = new Map();
        this.lastCacheUpdate = 0;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // ===== BALANCE OPERATIONS =====

    /**
     * Get user's current credit balance
     */
    async getBalance(userId) {
        return this.balance.getBalance(userId);
    }

    /**
     * Check if user has sufficient credits
     */
    async hasCredits(userId, amount = 1) {
        return this.balance.hasCredits(userId, amount);
    }

    // ===== TRANSACTION OPERATIONS =====

    /**
     * Add credits to user account
     */
    // eslint-disable-next-line max-params
    async addCredits(userId, amount, type = 'purchase', description, metadata = {}) {
        return this.transactions.addCredits(userId, amount, type, description, metadata);
    }

    /**
     * Debit credits from user account
     */
    async debitCredits(userId, amount, description, metadata = {}) {
        return this.transactions.debitCredits(userId, amount, description, metadata);
    }

    /**
     * Refund credits to user account
     */
    async refundCredits(userId, amount, description, metadata = {}) {
        return this.transactions.refundCredits(userId, amount, description, metadata);
    }

    // ===== PROMO CODE OPERATIONS =====

    /**
     * Redeem promo code
     */
    async redeemPromoCode(userId, promoCode) {
        return this.promos.redeemPromoCode(userId, promoCode);
    }

    // ===== HISTORY OPERATIONS =====

    /**
     * Get user's credit history
     */
    async getCreditHistory(userId, limit = 50) {
        return this.history.getCreditHistory(userId, limit);
    }

    /**
     * Get credit summary for user
     */
    async getCreditSummary(userId) {
        return this.history.getCreditSummary(userId);
    }

    // ===== UTILITY OPERATIONS =====

    /**
     * Get credit pricing for image generation (synchronous with caching)
     * Dynamic cost system using database model costs
     */
    getCreditCost(provider, multiplier = false, mixup = false, mashup = false) {
        // Always use hardcoded USD costs (database has old credit values)
        const legacyCosts = {
            dalle: 0.02,
            flux: 0.015,
            dreamshaper: 0.005,
            tshirt: 0.003,
            stability: 0.01,
            midjourney: 0.025,
            default: 0.005
        };

        let cost = legacyCosts[provider] || legacyCosts.default;

        // Apply modifiers
        if (multiplier) {
            cost *= 2;
        }
        if (mixup) {
            cost += 0.002; // Small USD increment for mixup
        }
        if (mashup) {
            cost += 0.002; // Small USD increment for mashup
        }

        // Round to 4 decimal places for USD precision
        cost = Math.round(cost * 10000) / 10000;

        return Math.max(0.001, cost); // Minimum 0.001 USD
    }

    /**
     * Get credit pricing for image generation (async version)
     * Dynamic cost system using database model costs
     */
    async getCreditCostAsync(provider, multiplier = false, mixup = false, mashup = false) {
        // Get cost from database via ModelConfigurationService
        let cost;

        try {
            cost = await modelInterface.getCreditCost(provider);
        } catch (error) {
            console.warn(`⚠️ CREDIT-SERVICE: Failed to get cost for ${provider}, using fallback:`, error.message);
            // Fallback to legacy hardcoded costs for compatibility
            const legacyCosts = {
                stability: 2,
                midjourney: 4,
                default: 1
            };

            cost = legacyCosts[provider] || legacyCosts.default;
        }

        // Apply modifiers
        if (multiplier) {
            cost *= 2;
        }
        if (mixup) {
            cost += 0.5; // Reduced from 1 to 0.5 for fractional credits
        }
        if (mashup) {
            cost += 0.5; // Reduced from 1 to 0.5 for fractional credits
        }

        // Round to nearest 0.25 credit increment for consistency
        cost = Math.round(cost * 4) / 4;

        return Math.max(0.25, cost); // Minimum 0.25 credits
    }

    /**
     * Refresh cost cache from database
     * @private
     */
    async refreshCostCache() {
        try {
            const allModels = await modelInterface.getAllModels();

            this.costCache.clear();

            allModels.forEach(model => {
                this.costCache.set(model.name, model.costPerImage);
            });

            this.lastCacheUpdate = Date.now();
            console.log(`🔄 CREDIT-SERVICE: Cost cache refreshed with ${allModels.length} models`);
        } catch (error) {
            console.error('❌ CREDIT-SERVICE: Failed to refresh cost cache:', error);
        }
    }

    /**
     * Check if cache should be refreshed
     * @private
     * @returns {boolean} True if cache should be refreshed
     */
    shouldRefreshCache() {
        return Date.now() - this.lastCacheUpdate > this.cacheTimeout || this.costCache.size === 0;
    }

    /**
     * Reconcile user balance with ledger (admin function)
     */
    // eslint-disable-next-line max-lines-per-function
    async reconcileBalance(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            const result = await prisma.$transaction(async tx => {
                // Calculate balance from ledger
                const ledgerSum = await tx.creditLedger.aggregate({
                    where: { userId },
                    _sum: { amount: true }
                });

                const calculatedBalance = ledgerSum._sum.amount || 0;

                // Get current user balance
                const user = await tx.user.findUnique({
                    where: { id: userId },
                    select: { creditBalance: true }
                });

                if (!user) {
                    throw new Error(`User not found: ${userId}`);
                }

                const currentBalance = user.creditBalance;
                const difference = calculatedBalance - currentBalance;

                if (difference !== 0) {
                    // Update user balance to match ledger
                    await tx.user.update({
                        where: { id: userId },
                        data: { creditBalance: calculatedBalance }
                    });

                    // Create adjustment entry
                    await tx.creditLedger.create({
                        data: {
                            userId,
                            type: 'adjustment',
                            amount: difference,
                            description: `Balance reconciliation: ${difference > 0 ? 'added' : 'removed'} ${Math.abs(difference)} credits`,
                            metadata: JSON.stringify({
                                previousBalance: currentBalance,
                                calculatedBalance,
                                reconciliationDate: new Date().toISOString()
                            })
                        }
                    });
                }

                return {
                    previousBalance: currentBalance,
                    newBalance: calculatedBalance,
                    adjustment: difference
                };
            }, { timeout: 15000 });

            if (result.adjustment !== 0) {
                console.log(`💳 CREDIT-SERVICE: Reconciled user ${userId} balance. Adjustment: ${result.adjustment}`);
            }

            return result;

        } catch (error) {
            console.error('💳 CREDIT-SERVICE: Error reconciling balance:', error);
            throw error;
        }
    }

    /**
     * Health check for all credit services
     */
    async healthCheck() {
        try {
            // Test database connection
            await prisma.$queryRaw`SELECT 1`;

            return {
                status: 'healthy',
                services: {
                    balance: 'operational',
                    transactions: 'operational',
                    promos: 'operational',
                    history: 'operational'
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('💳 CREDIT-SERVICE: Health check failed:', error);

            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

export default new SimplifiedCreditService();
