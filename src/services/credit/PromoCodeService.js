/**
 * Promo Code Service
 * Handles promo code validation and redemption
 */

import databaseClient from '../../database/PrismaClient.js';
import CreditTransactionService from './CreditTransactionService.js';

const prisma = databaseClient.getClient();

export class PromoCodeService {

    /**
     * Redeem promo code
     */
    async redeemPromoCode(userId, promoCode) {
        // Input validation
        this.validateRedemptionInput(userId, promoCode);

        try {
            const result = await prisma.$transaction(async tx => {
                // Find and validate promo code
                const promo = await this.findAndValidatePromo(tx, promoCode);

                // Check if user already redeemed this promo
                await this.checkExistingRedemption(tx, userId, promo.id);

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
                    data: { currentRedemptions: { increment: 1 } }
                });

                return promo;
            }, { timeout: 15000 });

            // Add credits to user account (outside transaction for better error handling)
            const creditResult = await CreditTransactionService.addCredits(
                userId,
                result.credits,
                'promo',
                `Promo code: ${result.code}`,
                { promoCodeId: result.id }
            );

            console.log(
                `💳 PROMO-SERVICE: User ${userId} redeemed promo code ${promoCode} ` +
                `for ${result.credits} credits`
            );

            return {
                credits: result.credits,
                newBalance: creditResult.newBalance,
                promoCode: result.code
            };

        } catch (error) {
            console.error('💳 PROMO-SERVICE: Error redeeming promo code:', error);
            throw error;
        }
    }

    /**
     * Find and validate promo code
     */
    async findAndValidatePromo(tx, promoCode) {
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

        return promo;
    }

    /**
     * Check if user already redeemed this promo
     */
    async checkExistingRedemption(tx, userId, promoCodeId) {
        const existingRedemption = await tx.promoRedemption.findUnique({
            where: {
                userId_promoCodeId: { userId, promoCodeId }
            }
        });

        if (existingRedemption) {
            throw new Error('You have already redeemed this promo code');
        }
    }

    /**
     * Validate redemption input
     */
    validateRedemptionInput(userId, promoCode) {
        if (!userId) {
            throw new Error('User ID is required');
        }
        if (!promoCode || typeof promoCode !== 'string') {
            throw new Error('Promo code is required and must be a string');
        }
        if (promoCode.trim().length < 3 || promoCode.trim().length > 50) {
            throw new Error('Promo code must be between 3 and 50 characters');
        }
    }

    /**
     * Get user's promo redemption history
     */
    async getUserRedemptions(userId, limit = 20) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            const redemptions = await prisma.promoRedemption.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: {
                    promoCode: {
                        select: { code: true, credits: true }
                    }
                }
            });

            return redemptions;
        } catch (error) {
            console.error('💳 PROMO-SERVICE: Error getting user redemptions:', error);
            throw error;
        }
    }

    /**
     * Get promo code statistics (admin function)
     */
    async getPromoStats(promoCodeId) {
        if (!promoCodeId) {
            throw new Error('Promo code ID is required');
        }

        try {
            const promo = await prisma.promoCode.findUnique({
                where: { id: promoCodeId },
                include: {
                    redemptions: {
                        select: { createdAt: true, credits: true }
                    }
                }
            });

            if (!promo) {
                throw new Error('Promo code not found');
            }

            const totalCreditsGranted = promo.redemptions.reduce((sum, r) => sum + r.credits, 0);
            const redemptionRate = promo.maxRedemptions
                ? (promo.currentRedemptions / promo.maxRedemptions) * 100
                : null;

            return {
                code: promo.code,
                totalRedemptions: promo.currentRedemptions,
                maxRedemptions: promo.maxRedemptions,
                redemptionRate,
                totalCreditsGranted,
                isActive: promo.isActive,
                expiresAt: promo.expiresAt
            };
        } catch (error) {
            console.error('💳 PROMO-SERVICE: Error getting promo stats:', error);
            throw error;
        }
    }
}

export default new PromoCodeService();
