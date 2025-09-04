import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Minimal Credit Management Service
 * Handles all credit operations with full audit trail
 */
class CreditService {

    /**
     * Get user's current credit balance
     */
    async getBalance(userId) {
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
            console.error('💳 CREDIT-SERVICE: Error getting balance:', error);
            throw error;
        }
    }

    /**
     * Add credits to user account with ledger entry
     */
    // eslint-disable-next-line max-params
    async addCredits(userId, amount, type = 'purchase', description, metadata = {}) {
        try {
            // Validate amount (prevent negative credits through this method)
            if (amount <= 0) {
                throw new Error(`Invalid credit amount: ${amount}. Use debitCredits for negative amounts.`);
            }

            const result = await prisma.$transaction(async tx => {
                // Update user balance
                const user = await tx.user.update({
                    where: { id: userId },
                    data: {
                        creditBalance: {
                            increment: amount
                        }
                    }
                });

                // Create ledger entry
                const ledgerEntry = await tx.creditLedger.create({
                    data: {
                        userId,
                        type,
                        amount,
                        description,
                        stripePaymentId: metadata.stripePaymentId || null,
                        promoCodeId: metadata.promoCodeId || null,
                        metadata: metadata.additional ? JSON.stringify(metadata.additional) : null
                    }
                });

                return {
                    newBalance: user.creditBalance,
                    ledgerEntry
                };
            }, {
                timeout: 10000 // 10 second timeout
            });

            // eslint-disable-next-line no-console
            console.log(`💳 CREDIT-SERVICE: Added ${amount} credits to user ${userId}. New balance: ${result.newBalance}`);

            return result;

        } catch (error) {
            console.error('💳 CREDIT-SERVICE: Error adding credits:', error);
            throw error;
        }
    }

    /**
     * Debit credits from user account (for image generation)
     */
    async debitCredits(userId, amount, description, metadata = {}) {
        try {
            const result = await prisma.$transaction(async tx => {
                // Check current balance
                const user = await tx.user.findUnique({
                    where: { id: userId },
                    select: { creditBalance: true }
                });

                if (!user) {
                    throw new Error(`User not found: ${userId}`);
                }

                if (user.creditBalance < amount) {
                    throw new Error(`Insufficient credits. Required: ${amount}, Available: ${user.creditBalance}`);
                }

                // Update user balance
                const updatedUser = await tx.user.update({
                    where: { id: userId },
                    data: {
                        creditBalance: {
                            decrement: amount
                        }
                    }
                });

                // Create ledger entry (negative amount for debit)
                const ledgerEntry = await tx.creditLedger.create({
                    data: {
                        userId,
                        type: 'debit',
                        amount: -amount, // Negative for debit
                        description,
                        metadata: metadata ? JSON.stringify(metadata) : null
                    }
                });

                return {
                    newBalance: updatedUser.creditBalance,
                    ledgerEntry
                };
            }, {
                timeout: 10000 // 10 second timeout
            });

            // eslint-disable-next-line no-console
            console.log(`💳 CREDIT-SERVICE: Debited ${amount} credits from user ${userId}. New balance: ${result.newBalance}`);

            return result;

        } catch (error) {
            console.error('💳 CREDIT-SERVICE: Error debiting credits:', error);
            throw error;
        }
    }

    /**
     * Refund credits (reverse a previous debit)
     */
    async refundCredits(userId, amount, description, metadata = {}) {
        try {
            // Validate amount
            if (amount <= 0) {
                throw new Error(`Invalid refund amount: ${amount}. Amount must be positive.`);
            }

            const result = await prisma.$transaction(async tx => {
                // Update user balance (add back the credits)
                const user = await tx.user.update({
                    where: { id: userId },
                    data: {
                        creditBalance: {
                            increment: amount
                        }
                    }
                });

                // Create ledger entry (positive amount for refund)
                const ledgerEntry = await tx.creditLedger.create({
                    data: {
                        userId,
                        type: 'refund',
                        amount, // Positive amount for refund
                        description,
                        stripePaymentId: metadata.stripePaymentId || null,
                        metadata: metadata ? JSON.stringify(metadata) : null
                    }
                });

                return {
                    newBalance: user.creditBalance,
                    ledgerEntry
                };
            }, {
                timeout: 10000 // 10 second timeout
            });

            // eslint-disable-next-line no-console
            console.log(`💳 CREDIT-SERVICE: Refunded ${amount} credits to user ${userId}. New balance: ${result.newBalance}`);

            return result;

        } catch (error) {
            console.error('💳 CREDIT-SERVICE: Error refunding credits:', error);
            throw error;
        }
    }

    /**
     * Check if user has sufficient credits
     */
    async hasCredits(userId, amount = 1) {
        try {
            const balance = await this.getBalance(userId);

            return balance >= amount;
        } catch (error) {
            console.error('💳 CREDIT-SERVICE: Error checking credits:', error);

            return false;
        }
    }

    /**
     * Get user's credit history
     */
    async getCreditHistory(userId, limit = 50) {
        try {
            const history = await prisma.creditLedger.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: {
                    stripePayment: {
                        select: {
                            stripeSessionId: true,
                            amount: true,
                            status: true
                        }
                    },
                    promoCode: {
                        select: {
                            code: true
                        }
                    }
                }
            });

            return history;
        } catch (error) {
            console.error('💳 CREDIT-SERVICE: Error getting credit history:', error);
            throw error;
        }
    }

    /**
     * Redeem promo code
     */
    // eslint-disable-next-line max-lines-per-function
    async redeemPromoCode(userId, promoCode) {
        try {
            const result = await prisma.$transaction(async tx => {
                // eslint-disable-next-line max-lines-per-function
                // Find promo code
                const promo = await tx.promoCode.findUnique({
                    where: { code: promoCode.toUpperCase() }
                });

                if (!promo) {
                    throw new Error('Invalid promo code');
                }

                if (!promo.isActive) {
                    throw new Error('Promo code is inactive');
                }

                if (promo.expiresAt && promo.expiresAt < new Date()) {
                    throw new Error('Promo code has expired');
                }

                if (promo.maxRedemptions && promo.currentRedemptions >= promo.maxRedemptions) {
                    throw new Error('Promo code has reached maximum redemptions');
                }

                // Check if user already redeemed this promo
                const existingRedemption = await tx.promoRedemption.findUnique({
                    where: {
                        userId_promoCodeId: {
                            userId,
                            promoCodeId: promo.id
                        }
                    }
                });

                if (existingRedemption) {
                    throw new Error('You have already redeemed this promo code');
                }

                // Create redemption record
                await tx.promoRedemption.create({
                    data: {
                        userId,
                        promoCodeId: promo.id,
                        credits: promo.credits
                    }
                });

                // Update promo code redemption count
                await tx.promoCode.update({
                    where: { id: promo.id },
                    data: {
                        currentRedemptions: {
                            increment: 1
                        }
                    }
                });

                // Add credits to user account
                const creditResult = await this.addCredits(
                    userId,
                    promo.credits,
                    'promo',
                    `Promo code: ${promo.code}`,
                    { promoCodeId: promo.id }
                );

                return {
                    credits: promo.credits,
                    newBalance: creditResult.newBalance,
                    promoCode: promo.code
                };
            });

            // eslint-disable-next-line no-console
            console.log(`💳 CREDIT-SERVICE: User ${userId} redeemed promo code ${promoCode} for ${result.credits} credits`);

            return result;

        } catch (error) {
            console.error('💳 CREDIT-SERVICE: Error redeeming promo code:', error);
            throw error;
        }
    }

    /**
     * Reconcile user balance with ledger (admin function)
     */
    // eslint-disable-next-line max-lines-per-function
    async reconcileBalance(userId) {
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
            });

            if (result.adjustment !== 0) {
                // eslint-disable-next-line no-console
                console.log(`💳 CREDIT-SERVICE: Reconciled user ${userId} balance. Adjustment: ${result.adjustment}`);
            }

            return result;

        } catch (error) {
            console.error('💳 CREDIT-SERVICE: Error reconciling balance:', error);
            throw error;
        }
    }

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
}

export default new CreditService();
