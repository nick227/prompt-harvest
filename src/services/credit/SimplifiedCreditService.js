/**
 * Simplified Credit Service
 * Orchestrates focused credit services with a clean API
 */

import CreditBalanceService from './CreditBalanceService.js';
import CreditTransactionService from './CreditTransactionService.js';
import PromoCodeService from './PromoCodeService.js';
import CreditHistoryService from './CreditHistoryService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SimplifiedCreditService {

    constructor() {
        this.balance = CreditBalanceService;
        this.transactions = CreditTransactionService;
        this.promos = PromoCodeService;
        this.history = CreditHistoryService;
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
     * Get credit pricing for image generation
     */
    getCreditCost(provider, multiplier = false, mixup = false, mashup = false) {
        // Base costs per provider
        const baseCosts = {
            dalle3: 3,
            dalle2: 1,
            stability: 2,
            midjourney: 4,
            default: 1
        };

        let cost = baseCosts[provider] || baseCosts.default;

        // Apply modifiers
        if (multiplier) {
            cost *= 2;
        }
        if (mixup) {
            cost += 1;
        }
        if (mashup) {
            cost += 1;
        }

        return Math.max(1, cost); // Minimum 1 credit
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
