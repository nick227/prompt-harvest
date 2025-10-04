/**
 * Admin Promo Codes Controller
 * Handles promo code management operations
 */

import databaseClient from '../../database/PrismaClient.js';
import { PromoCodeManagementService } from '../../services/admin/PromoCodeManagementService.js';

const prisma = databaseClient.getClient();

class PromoCodesController {
    /**
     * Get all promo codes
     * GET /api/admin/promo-codes
     */
    // eslint-disable-next-line max-lines-per-function
    static async getPromoCodes(req, res) {
        try {
            const {
                page = 1,
                limit = 50,
                status = 'all',
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = req.query;

            // Build where conditions
            const where = {};

            if (status === 'active') {
                where.isActive = true;
                where.expiresAt = { gt: new Date() };
            } else if (status === 'expired') {
                where.expiresAt = { lte: new Date() };
            } else if (status === 'disabled') {
                where.isActive = false;
            }

            // Calculate pagination
            const offset = (parseInt(page) - 1) * parseInt(limit);

            // Get promo codes with usage stats
            const [promoCodes, totalCount] = await Promise.all([
                prisma.promoCode.findMany({
                    where,
                    orderBy: {
                        [sortBy]: sortOrder
                    },
                    take: parseInt(limit),
                    skip: offset
                }),
                prisma.promoCode.count({ where })
            ]);

            // Format response data
            const formattedPromoCodes = promoCodes.map(promo => ({
                id: promo.id,
                code: promo.code,
                credits: promo.credits,
                maxRedemptions: promo.maxRedemptions,
                currentRedemptions: promo.currentRedemptions,
                redemptionCount: promo.currentRedemptions, // Use currentRedemptions field
                isActive: promo.isActive,
                expiresAt: promo.expiresAt,
                createdAt: promo.createdAt,
                updatedAt: promo.updatedAt,
                status: PromoCodesController.getPromoStatus(promo)
            }));

            const totalPages = Math.ceil(totalCount / parseInt(limit));

            // eslint-disable-next-line no-console

            res.json({
                success: true,
                data: {
                    items: formattedPromoCodes,
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
            console.error('❌ ADMIN-PROMO: Get promo codes failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get promo codes',
                message: error.message
            });
        }
    }

    /**
     * Create new promo code
     * POST /api/admin/promo-codes
     */
    static async createPromoCode(req, res) {
        try {
            const {
                code,
                credits,
                maxRedemptions,
                expiresAt,
                isActive = true
            } = req.body;

            const { adminUser } = req;

            // Validate and check for existing code
            const validationResult = await PromoCodesController.validateAndCheckPromoCode(
                code, credits, maxRedemptions, expiresAt, isActive
            );

            if (!validationResult.isValid) {
                return res.status(validationResult.status).json(validationResult.response);
            }

            // Create promo code
            const promoCode = await PromoCodesController.createPromoCodeRecord(
                code, credits, maxRedemptions, expiresAt, isActive
            );

            // eslint-disable-next-line no-console

            return res.status(201).json({
                success: true,
                message: 'Promo code created successfully',
                data: {
                    ...promoCode,
                    status: PromoCodesController.getPromoStatus(promoCode)
                }
            });

        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('❌ ADMIN-PROMO: Create promo code failed:', error);

            return res.status(500).json({
                success: false,
                error: 'Failed to create promo code',
                message: error.message
            });
        }
    }

    /**
     * Update promo code
     * PUT /api/admin/promo-codes/:promoId
     */
    // eslint-disable-next-line max-lines-per-function, max-statements
    static async updatePromoCode(req, res) {
        try {
            const { promoId } = req.params;
            const updates = req.body;

            const { adminUser } = req;

            // Check if promo code exists
            const existingPromo = await prisma.promoCode.findUnique({
                where: { id: promoId }
            });

            if (!existingPromo) {
                return res.status(404).json({
                    success: false,
                    error: 'Promo code not found',
                    message: `Promo code with ID ${promoId} not found`
                });
            }

            // Validate updates
            const validation = PromoCodesController.validatePromoData(updates, true);

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid update data',
                    message: validation.errors.join(', ')
                });
            }

            // Prepare update data
            const updateData = {};

            if (updates.code && updates.code !== existingPromo.code) {
                // Check if new code already exists
                const codeExists = await prisma.promoCode.findUnique({
                    where: { code: updates.code.toUpperCase() }
                });

                if (codeExists && codeExists.id !== promoId) {
                    return res.status(400).json({
                        success: false,
                        error: 'Code already exists',
                        message: `Promo code '${updates.code}' already exists`
                    });
                }

                updateData.code = updates.code.toUpperCase();
            }

            if (updates.credits !== undefined) {
                updateData.credits = parseInt(updates.credits);
            }

            if (updates.maxRedemptions !== undefined) {
                updateData.maxRedemptions = updates.maxRedemptions ? parseInt(updates.maxRedemptions) : null;
            }

            if (updates.expiresAt !== undefined) {
                updateData.expiresAt = updates.expiresAt ? new Date(updates.expiresAt) : null;
            }

            if (updates.isActive !== undefined) {
                updateData.isActive = Boolean(updates.isActive);
            }

            // Update promo code
            const updatedPromo = await prisma.promoCode.update({
                where: { id: promoId },
                data: updateData
            });

            // eslint-disable-next-line no-console

            return res.json({
                success: true,
                message: 'Promo code updated successfully',
                data: {
                    ...updatedPromo,
                    status: PromoCodesController.getPromoStatus(updatedPromo)
                }
            });

        } catch (error) {
            console.error('❌ ADMIN-PROMO: Update promo code failed:', error);

            return res.status(500).json({
                success: false,
                error: 'Failed to update promo code',
                message: error.message
            });
        }
    }

    /**
     * Delete promo code
     * DELETE /api/admin/promo-codes/:promoId
     */
    // eslint-disable-next-line max-lines-per-function
    static async deletePromoCode(req, res) {
        try {
            const { promoId } = req.params;
            const { adminUser } = req;

            // Check if promo code exists
            const existingPromo = await prisma.promoCode.findUnique({
                where: { id: promoId }
            });

            if (!existingPromo) {
                return res.status(404).json({
                    success: false,
                    error: 'Promo code not found',
                    message: `Promo code with ID ${promoId} not found`
                });
            }

            // Check if promo code has been redeemed
            if (existingPromo.currentRedemptions > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot delete redeemed promo code',
                    message: `Promo code '${existingPromo.code}' has been redeemed ` +
                        `${existingPromo.currentRedemptions} times and cannot be deleted`
                });
            }

            // Delete promo code
            await prisma.promoCode.delete({
                where: { id: promoId }
            });

            // eslint-disable-next-line no-console

            res.json({
                success: true,
                message: `Promo code '${existingPromo.code}' deleted successfully`,
                data: {
                    deletedCode: existingPromo.code,
                    deletedBy: adminUser.email,
                    deletedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ ADMIN-PROMO: Delete promo code failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete promo code',
                message: error.message
            });
        }
    }

    /**
     * Get promo code usage statistics
     * GET /api/admin/promo-codes/:promoId/stats
     */
    // eslint-disable-next-line max-lines-per-function
    static async getPromoStats(req, res) {
        try {
            const { promoId } = req.params;

            // Get promo code with detailed stats
            const promoCode = await prisma.promoCode.findUnique({
                where: { id: promoId }
            });

            if (!promoCode) {
                return res.status(404).json({
                    success: false,
                    error: 'Promo code not found'
                });
            }

            // Get related data separately
            const [redemptions, creditLedgerEntries] = await Promise.all([
                prisma.promoRedemption.findMany({
                    where: { promoCodeId: promoId },
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        userId: true,
                        credits: true,
                        createdAt: true
                    }
                }),
                prisma.creditLedger.findMany({
                    where: { promoCodeId: promoId },
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        userId: true,
                        amount: true,
                        type: true,
                        description: true,
                        createdAt: true
                    }
                })
            ]);

            // Get user data for redemptions and credit ledger
            const userIds = [...new Set([
                ...redemptions.map(r => r.userId),
                ...creditLedgerEntries.map(c => c.userId)
            ])];

            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: {
                    id: true,
                    email: true,
                    username: true
                }
            });

            const userMap = new Map(users.map(user => [user.id, user]));

            // Combine data
            const promoCodeWithDetails = {
                ...promoCode,
                redemptions: redemptions.map(redemption => ({
                    ...redemption,
                    user: userMap.get(redemption.userId) || null
                })),
                creditLedger: creditLedgerEntries.map(entry => ({
                    ...entry,
                    user: userMap.get(entry.userId) || null
                }))
            };

            // Calculate statistics
            const totalRedemptions = redemptions.length;
            const totalCreditsIssued = redemptions.length * promoCode.credits;

            const uniqueUsers = new Set(redemptions.map(r => r.userId)).size;

            // Daily redemption stats
            const dailyStats = PromoCodesController.calculateDailyStats(redemptions);

            // User breakdown
            const userStats = PromoCodesController.calculateUserStats(redemptions);

            const stats = {
                promoCode: {
                    id: promoCode.id,
                    code: promoCode.code,
                    credits: promoCode.credits,
                    maxRedemptions: promoCode.maxRedemptions,
                    isActive: promoCode.isActive,
                    expiresAt: promoCode.expiresAt,
                    createdAt: promoCode.createdAt,
                    status: PromoCodesController.getPromoStatus(promoCode)
                },
                statistics: {
                    totalRedemptions,
                    totalCreditsIssued,
                    uniqueUsers,
                    redemptionRate: promoCode.maxRedemptions ?
                        (totalRedemptions / promoCode.maxRedemptions * 100).toFixed(2)
                        : null,
                    averageCreditsPerUser: uniqueUsers > 0 ?
                        (totalCreditsIssued / uniqueUsers).toFixed(2)
                        : 0
                },
                dailyStats,
                userStats,
                recentRedemptions: promoCodeWithDetails.redemptions.slice(0, 10) // Last 10 redemptions
            };

            // eslint-disable-next-line no-console

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('❌ ADMIN-PROMO: Get promo stats failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get promo code statistics',
                message: error.message
            });
        }
    }

    /**
     * Validate promo code data and check for existing code
     */
    // eslint-disable-next-line max-params
    static async validateAndCheckPromoCode(code, credits, maxRedemptions, expiresAt, isActive) {
        // Validate required fields
        const validation = PromoCodesController.validatePromoData({
            code,
            credits,
            maxRedemptions,
            expiresAt,
            isActive
        });

        if (!validation.isValid) {
            return {
                isValid: false,
                status: 400,
                response: {
                    success: false,
                    error: 'Invalid promo code data',
                    message: validation.errors.join(', ')
                }
            };
        }

        // Check if code already exists
        const existingPromo = await prisma.promoCode.findUnique({
            where: { code: code.toUpperCase() }
        });

        if (existingPromo) {
            return {
                isValid: false,
                status: 400,
                response: {
                    success: false,
                    error: 'Promo code already exists',
                    message: `Promo code '${code}' already exists`
                }
            };
        }

        return { isValid: true };
    }

    /**
     * Create promo code record in database
     */
    // eslint-disable-next-line max-params
    static async createPromoCodeRecord(code, credits, maxRedemptions, expiresAt, isActive) {
        return await prisma.promoCode.create({
            data: {
                code: code.toUpperCase(),
                credits: parseInt(credits),
                maxRedemptions: maxRedemptions ? parseInt(maxRedemptions) : null,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                isActive: Boolean(isActive)
            }
        });
    }

    // ===========================================
    // UTILITY METHODS
    // ===========================================

    /**
     * Get promo code status
     */
    static getPromoStatus(promo) {
        if (!promo.isActive) {
            return 'disabled';
        }

        if (promo.expiresAt && promo.expiresAt <= new Date()) {
            return 'expired';
        }

        if (promo.maxRedemptions && promo.currentRedemptions >= promo.maxRedemptions) {
            return 'exhausted';
        }

        return 'active';
    }

    /**
     * Validate promo code data
     */
    static validatePromoData(data, isUpdate = false) {
        const errors = [];

        // Code validation
        if (!isUpdate && !data.code) {
            errors.push('Promo code is required');
        } else if (data.code && typeof data.code !== 'string') {
            errors.push('Promo code must be a string');
        } else if (data.code && (data.code.length < 3 || data.code.length > 50)) {
            errors.push('Promo code must be between 3 and 50 characters');
        } else if (data.code && !(/^[A-Z0-9]+$/).test(data.code.toUpperCase())) {
            errors.push('Promo code can only contain letters and numbers');
        }

        // Credits validation
        if (!isUpdate && data.credits === undefined) {
            errors.push('Credits amount is required');
        } else if (data.credits !== undefined) {
            if (!Number.isInteger(data.credits) || data.credits < 1 || data.credits > 10000) {
                errors.push('Credits must be an integer between 1 and 10000');
            }
        }

        // Max redemptions validation
        if (data.maxRedemptions !== undefined && data.maxRedemptions !== null) {
            if (!Number.isInteger(data.maxRedemptions) || data.maxRedemptions < 1) {
                errors.push('Max redemptions must be a positive integer');
            }
        }

        // Expiry date validation
        if (data.expiresAt !== undefined && data.expiresAt !== null) {
            const expiryDate = new Date(data.expiresAt);

            if (isNaN(expiryDate.getTime())) {
                errors.push('Invalid expiry date format');
            } else if (expiryDate <= new Date()) {
                errors.push('Expiry date must be in the future');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Calculate daily redemption statistics
     */
    static calculateDailyStats(redemptions) {
        const dailyData = {};

        redemptions.forEach(redemption => {
            const [date] = redemption.createdAt.toISOString().split('T');

            if (!dailyData[date]) {
                dailyData[date] = {
                    date,
                    redemptions: 0,
                    uniqueUsers: new Set()
                };
            }
            dailyData[date].redemptions++;
            dailyData[date].uniqueUsers.add(redemption.userId);
        });

        // Convert to array and format
        return Object.values(dailyData)
            .map(day => ({
                date: day.date,
                redemptions: day.redemptions,
                uniqueUsers: day.uniqueUsers.size
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Calculate user statistics
     */
    static calculateUserStats(redemptions) {
        const userCounts = {};

        redemptions.forEach(redemption => {
            const { userId } = redemption;

            if (!userCounts[userId]) {
                userCounts[userId] = {
                    user: redemption.user,
                    redemptions: 0,
                    firstRedemption: redemption.createdAt,
                    lastRedemption: redemption.createdAt
                };
            }
            userCounts[userId].redemptions++;

            if (redemption.createdAt < userCounts[userId].firstRedemption) {
                userCounts[userId].firstRedemption = redemption.createdAt;
            }
            if (redemption.createdAt > userCounts[userId].lastRedemption) {
                userCounts[userId].lastRedemption = redemption.createdAt;
            }
        });

        return Object.values(userCounts)
            .sort((a, b) => b.redemptions - a.redemptions); // Sort by redemption count
    }

    /**
     * Get promo codes overview statistics
     * GET /api/admin/promo-codes/stats
     */
    static async getPromoCodesOverview(req, res) {
        try {
            const [
                totalPromoCodes,
                activePromoCodes,
                expiredPromoCodes,
                totalRedemptions,
                totalCreditsIssued
            ] = await Promise.all([
                prisma.promoCode.count(),
                prisma.promoCode.count({
                    where: {
                        isActive: true,
                        OR: [
                            { expiresAt: null },
                            { expiresAt: { gt: new Date() } }
                        ]
                    }
                }),
                prisma.promoCode.count({
                    where: {
                        OR: [
                            { expiresAt: { lte: new Date() } },
                            { isActive: false }
                        ]
                    }
                }),
                prisma.promoRedemption.count(),
                prisma.promoRedemption.aggregate({
                    _sum: { credits: true }
                })
            ]);

            const overview = {
                totalPromoCodes,
                activePromoCodes,
                expiredPromoCodes,
                totalRedemptions,
                totalCreditsIssued: totalCreditsIssued._sum.credits || 0
            };


            res.json({
                success: true,
                data: overview
            });

        } catch (error) {
            console.error('❌ ADMIN-PROMO: Get overview failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get promo codes overview',
                message: error.message
            });
        }
    }

    /**
     * Get promo codes usage analytics
     * GET /api/admin/promo-codes/usage
     */
    static async getPromoCodesUsage(req, res) {
        try {
            const { days = 30 } = req.query;
            const startDate = new Date();

            startDate.setDate(startDate.getDate() - parseInt(days));

            // Get daily redemption data
            const dailyRedemptions = await prisma.promoRedemption.groupBy({
                by: ['createdAt'],
                where: {
                    createdAt: { gte: startDate }
                },
                _count: {
                    id: true
                },
                _sum: {
                    credits: true
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });

            // Format data for charts
            const chartData = dailyRedemptions.map(day => ({
                date: day.createdAt.toISOString().split('T')[0],
                redemptions: day._count.id,
                credits: day._sum.credits || 0
            }));


            res.json({
                success: true,
                data: {
                    period: `${days} days`,
                    dailyData: chartData
                }
            });

        } catch (error) {
            console.error('❌ ADMIN-PROMO: Get usage analytics failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get usage analytics',
                message: error.message
            });
        }
    }

    /**
     * Get recent promo code redemptions
     * GET /api/admin/promo-codes/redemptions
     */
    static async getRecentRedemptions(req, res) {
        try {
            const { limit = 50 } = req.query;

            const redemptions = await prisma.promoRedemption.findMany({
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            username: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: parseInt(limit)
            });

            // Get promo code details for each redemption
            const formattedRedemptions = await Promise.all(redemptions.map(async redemption => {
                const promoCode = await prisma.promoCode.findUnique({
                    where: { id: redemption.promoCodeId },
                    select: { id: true, code: true, credits: true }
                });

                return {
                    id: redemption.id,
                    code: promoCode?.code || 'Unknown',
                    credits: redemption.credits,
                    user: redemption.user,
                    createdAt: redemption.createdAt
                };
            }));


            res.json({
                success: true,
                data: {
                    items: formattedRedemptions,
                    count: formattedRedemptions.length
                }
            });

        } catch (error) {
            console.error('❌ ADMIN-PROMO: Get recent redemptions failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get recent redemptions',
                message: error.message
            });
        }
    }
}

export default PromoCodesController;
