/**
 * Admin Promo Code Service
 * Provides admin functionality for managing promo codes
 */

import databaseClient from '../database/PrismaClient.js';
import PromoCodeService from './credit/PromoCodeService.js';

const prisma = databaseClient.getClient();

export class AdminPromoService {

    /**
     * Create a new promo code
     */
    async createPromoCode(data) {
        const {
            code,
            credits,
            description,
            maxRedemptions = null,
            expiresAt = null,
            isActive = true
        } = data;

        // Validation
        if (!code || !credits) {
            throw new Error('Code and credits are required');
        }

        if (credits <= 0) {
            throw new Error('Credits must be positive');
        }

        if (maxRedemptions && maxRedemptions <= 0) {
            throw new Error('Max redemptions must be positive');
        }

        try {
            const promoCode = await prisma.promoCode.create({
                data: {
                    code: code.toUpperCase().trim(),
                    credits,
                    description: description?.trim() || null,
                    maxRedemptions,
                    expiresAt: expiresAt ? new Date(expiresAt) : null,
                    isActive
                }
            });


            return promoCode;

        } catch (error) {
            if (error.code === 'P2002') {
                throw new Error('Promo code already exists');
            }
            console.error('❌ ADMIN: Error creating promo code:', error);
            throw error;
        }
    }

    /**
     * Update an existing promo code
     */
    async updatePromoCode(promoCodeId, updates) {
        const allowedUpdates = ['credits', 'description', 'maxRedemptions', 'expiresAt', 'isActive'];
        const filteredUpdates = {};

        // Only allow specific fields to be updated
        for (const [key, value] of Object.entries(updates)) {
            if (allowedUpdates.includes(key) && value !== undefined) {
                if (key === 'expiresAt' && value) {
                    filteredUpdates[key] = new Date(value);
                } else {
                    filteredUpdates[key] = value;
                }
            }
        }

        if (Object.keys(filteredUpdates).length === 0) {
            throw new Error('No valid updates provided');
        }

        try {
            const promoCode = await prisma.promoCode.update({
                where: { id: promoCodeId },
                data: filteredUpdates
            });


            return promoCode;

        } catch (error) {
            if (error.code === 'P2025') {
                throw new Error('Promo code not found');
            }
            console.error('❌ ADMIN: Error updating promo code:', error);
            throw error;
        }
    }

    /**
     * Delete a promo code
     */
    async deletePromoCode(promoCodeId) {
        try {
            const promoCode = await prisma.promoCode.delete({
                where: { id: promoCodeId }
            });


            return { success: true, deletedCode: promoCode.code };

        } catch (error) {
            if (error.code === 'P2025') {
                throw new Error('Promo code not found');
            }
            console.error('❌ ADMIN: Error deleting promo code:', error);
            throw error;
        }
    }

    /**
     * Get all promo codes with statistics
     */
    async getAllPromoCodes(includeInactive = false) {
        try {
            const whereClause = includeInactive ? {} : { isActive: true };

            const promoCodes = await prisma.promoCode.findMany({
                where: whereClause,
                include: {
                    redemptions: {
                        select: {
                            id: true,
                            userId: true,
                            credits: true,
                            createdAt: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Calculate statistics for each promo code
            const promoCodesWithStats = promoCodes.map(promo => {
                const totalCreditsGranted = promo.redemptions.reduce((sum, r) => sum + r.credits, 0);
                const redemptionRate = promo.maxRedemptions
                    ? (promo.currentRedemptions / promo.maxRedemptions) * 100
                    : null;

                return {
                    ...promo,
                    stats: {
                        totalCreditsGranted,
                        redemptionRate,
                        uniqueUsers: new Set(promo.redemptions.map(r => r.userId)).size
                    }
                };
            });

            return promoCodesWithStats;

        } catch (error) {
            console.error('❌ ADMIN: Error getting promo codes:', error);
            throw error;
        }
    }

    /**
     * Get promo code by ID
     */
    async getPromoCodeById(promoCodeId) {
        try {
            const promoCode = await prisma.promoCode.findUnique({
                where: { id: promoCodeId },
                include: {
                    redemptions: {
                        include: {
                            user: {
                                select: { email: true, username: true }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });

            if (!promoCode) {
                throw new Error('Promo code not found');
            }

            return promoCode;

        } catch (error) {
            console.error('❌ ADMIN: Error getting promo code:', error);
            throw error;
        }
    }

    /**
     * Get promo code redemption statistics
     */
    async getPromoCodeStats(promoCodeId) {
        try {
            return await PromoCodeService.getPromoStats(promoCodeId);

        } catch (error) {
            console.error('❌ ADMIN: Error getting promo code stats:', error);
            throw error;
        }
    }

    /**
     * Get system-wide promo code statistics
     */
    async getSystemPromoStats() {
        try {
            const totalPromoCodes = await prisma.promoCode.count();
            const activePromoCodes = await prisma.promoCode.count({ where: { isActive: true } });
            const totalRedemptions = await prisma.promoRedemption.count();
            const totalCreditsGranted = await prisma.promoRedemption.aggregate({
                _sum: { credits: true }
            });

            // Get top performing promo codes
            const topPromoCodes = await prisma.promoCode.findMany({
                orderBy: { currentRedemptions: 'desc' },
                take: 5,
                select: {
                    code: true,
                    credits: true,
                    currentRedemptions: true,
                    maxRedemptions: true
                }
            });

            return {
                totalPromoCodes,
                activePromoCodes,
                totalRedemptions,
                totalCreditsGranted: totalCreditsGranted._sum.credits || 0,
                topPromoCodes
            };

        } catch (error) {
            console.error('❌ ADMIN: Error getting system promo stats:', error);
            throw error;
        }
    }

    /**
     * Validate promo code without redeeming it
     */
    async validatePromoCode(code, userId = null) {
        try {
            const promoCode = await prisma.promoCode.findUnique({
                where: { code: code.toUpperCase() }
            });

            if (!promoCode) {
                return { valid: false, error: 'Invalid promo code' };
            }

            if (!promoCode.isActive) {
                return { valid: false, error: 'Promo code is inactive' };
            }

            if (promoCode.expiresAt && promoCode.expiresAt < new Date()) {
                return { valid: false, error: 'Promo code has expired' };
            }

            if (promoCode.maxRedemptions && promoCode.currentRedemptions >= promoCode.maxRedemptions) {
                return { valid: false, error: 'Promo code has reached maximum redemptions' };
            }

            // Check if user already redeemed this promo (if userId provided)
            if (userId) {
                const existingRedemption = await prisma.promoRedemption.findUnique({
                    where: {
                        userId_promoCodeId: { userId, promoCodeId: promoCode.id }
                    }
                });

                if (existingRedemption) {
                    return { valid: false, error: 'You have already redeemed this promo code' };
                }
            }

            return {
                valid: true,
                promoCode: {
                    id: promoCode.id,
                    code: promoCode.code,
                    credits: promoCode.credits,
                    description: promoCode.description
                }
            };

        } catch (error) {
            console.error('❌ ADMIN: Error validating promo code:', error);

            return { valid: false, error: 'Validation failed' };
        }
    }
}

export default new AdminPromoService();
