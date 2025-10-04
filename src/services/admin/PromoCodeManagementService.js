import databaseClient from '../../database/PrismaClient.js';

export class PromoCodeManagementService {
    constructor() {
        this.prisma = databaseClient.getClient();
    }

    /**
     * Build where clause for promo code queries
     */
    buildPromoCodeWhereClause(filters) {
        const where = {};

        if (filters.status === 'active') {
            where.isActive = true;
            where.expiresAt = { gt: new Date() };
        } else if (filters.status === 'expired') {
            where.expiresAt = { lte: new Date() };
        } else if (filters.status === 'inactive') {
            where.isActive = false;
        }

        if (filters.search) {
            where.code = { contains: filters.search, mode: 'insensitive' };
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
     * Get promo codes with filtering and pagination
     */
    async getPromoCodes(filters = {}, pagination = {}) {
        const {
            page = 1,
            limit = 50,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = { ...filters, ...pagination };

        const skip = (page - 1) * limit;
        const where = this.buildPromoCodeWhereClause(filters);

        const [promoCodes, totalCount] = await Promise.all([
            this.prisma.promoCode.findMany({
                where,
                include: {
                    redemptions: {
                        select: {
                            id: true,
                            userId: true,
                            redeemedAt: true
                        }
                    }
                },
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit
            }),
            this.prisma.promoCode.count({ where })
        ]);

        return {
            promoCodes,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        };
    }

    /**
     * Validate promo code data
     */
    validatePromoCodeData(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate) {
            if (!data.code || typeof data.code !== 'string') {
                errors.push('Promo code is required and must be a string');
            }

            if (!data.credits || !Number.isInteger(data.credits) || data.credits <= 0) {
                errors.push('Credits must be a positive integer');
            }
        }

        if (data.maxRedemptions !== undefined && (!Number.isInteger(data.maxRedemptions) || data.maxRedemptions < 1)) {
            errors.push('Max redemptions must be a positive integer');
        }

        if (data.expiresAt && !this.isValidDate(data.expiresAt)) {
            errors.push('Invalid expiration date');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Check if promo code already exists
     */
    async checkPromoCodeExists(code, excludeId = null) {
        const where = { code: { equals: code, mode: 'insensitive' } };

        if (excludeId) {
            where.id = { not: excludeId };
        }

        return await this.prisma.promoCode.findFirst({ where });
    }

    /**
     * Create new promo code
     */
    async createPromoCode(data) {
        const validation = this.validatePromoCodeData(data);

        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const existingCode = await this.checkPromoCodeExists(data.code);

        if (existingCode) {
            throw new Error('Promo code already exists');
        }

        return await this.prisma.promoCode.create({
            data: {
                code: data.code.toUpperCase(),
                credits: data.credits,
                maxRedemptions: data.maxRedemptions || null,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
                isActive: data.isActive !== false,
                description: data.description || null
            }
        });
    }

    /**
     * Update existing promo code
     */
    async updatePromoCode(id, data) {
        const validation = this.validatePromoCodeData(data, true);

        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const existingCode = await this.checkPromoCodeExists(data.code, id);

        if (existingCode) {
            throw new Error('Promo code already exists');
        }

        const updateData = {};

        if (data.code !== undefined) {
            updateData.code = data.code.toUpperCase();
        }
        if (data.credits !== undefined) {
            updateData.credits = data.credits;
        }
        if (data.maxRedemptions !== undefined) {
            updateData.maxRedemptions = data.maxRedemptions;
        }
        if (data.expiresAt !== undefined) {
            updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
        }
        if (data.isActive !== undefined) {
            updateData.isActive = data.isActive;
        }
        if (data.description !== undefined) {
            updateData.description = data.description;
        }

        return await this.prisma.promoCode.update({
            where: { id },
            data: updateData
        });
    }

    /**
     * Delete promo code
     */
    async deletePromoCode(id) {
        const promoCode = await this.prisma.promoCode.findUnique({
            where: { id },
            include: { redemptions: true }
        });

        if (!promoCode) {
            throw new Error('Promo code not found');
        }

        // Note: Allowing deletion of promo codes with existing redemptions
        // Previous redemptions will be orphaned for simpler data management

        return await this.prisma.promoCode.delete({
            where: { id }
        });
    }

    /**
     * Get promo code statistics
     */
    async getPromoStats(promoId) {
        const promoCode = await this.prisma.promoCode.findUnique({
            where: { id: promoId },
            include: {
                redemptions: {
                    include: {
                        user: {
                            select: { email: true, username: true }
                        }
                    },
                    orderBy: { redeemedAt: 'desc' }
                }
            }
        });

        if (!promoCode) {
            throw new Error('Promo code not found');
        }

        const totalRedemptions = promoCode.redemptions.length;
        const totalCreditsGiven = totalRedemptions * promoCode.credits;
        const remainingRedemptions = promoCode.maxRedemptions
            ? Math.max(0, promoCode.maxRedemptions - totalRedemptions)
            : null;

        return {
            ...promoCode,
            statistics: {
                totalRedemptions,
                totalCreditsGiven,
                remainingRedemptions,
                isFullyRedeemed: promoCode.maxRedemptions ? totalRedemptions >= promoCode.maxRedemptions : false,
                isExpired: promoCode.expiresAt ? new Date() > promoCode.expiresAt : false
            }
        };
    }

    /**
     * Get promo codes overview statistics
     */
    async getPromoCodesOverview() {
        const [totalCodes, activeCodes, expiredCodes, totalRedemptions, totalCreditsGiven] = await Promise.all([
            this.prisma.promoCode.count(),
            this.prisma.promoCode.count({
                where: {
                    isActive: true,
                    expiresAt: { gt: new Date() }
                }
            }),
            this.prisma.promoCode.count({
                where: {
                    expiresAt: { lte: new Date() }
                }
            }),
            this.prisma.promoRedemption.count(),
            this.prisma.promoRedemption.aggregate({
                _sum: { credits: true }
            })
        ]);

        return {
            totalCodes,
            activeCodes,
            expiredCodes,
            inactiveCodes: totalCodes - activeCodes - expiredCodes,
            totalRedemptions,
            totalCreditsGiven: totalCreditsGiven._sum.credits || 0
        };
    }

    /**
     * Get promo codes usage statistics
     */
    async getPromoCodesUsage(filters = {}) {
        const where = {};

        if (filters.dateFrom || filters.dateTo) {
            where.redeemedAt = {};
            if (filters.dateFrom) {
                where.redeemedAt.gte = new Date(filters.dateFrom);
            }
            if (filters.dateTo) {
                where.redeemedAt.lte = new Date(filters.dateTo);
            }
        }

        return await this.prisma.promoRedemption.findMany({
            where,
            include: {
                promoCode: {
                    select: { code: true, credits: true }
                },
                user: {
                    select: { email: true, username: true }
                }
            },
            orderBy: { redeemedAt: 'desc' }
        });
    }

    /**
     * Get recent redemptions
     */
    async getRecentRedemptions(limit = 50) {
        return await this.prisma.promoRedemption.findMany({
            take: limit,
            include: {
                promoCode: {
                    select: { code: true, credits: true }
                },
                user: {
                    select: { email: true, username: true }
                }
            },
            orderBy: { redeemedAt: 'desc' }
        });
    }

    /**
     * Validate date string
     */
    isValidDate(dateString) {
        const date = new Date(dateString);

        return date instanceof Date && !isNaN(date);
    }
}
