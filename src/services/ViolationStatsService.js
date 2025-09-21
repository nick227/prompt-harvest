import databaseClient from '../database/PrismaClient.js';

export class ViolationStatsService {
    constructor() {
        this.prisma = databaseClient.getClient();
    }

    /**
     * Build where clause for violation queries
     */
    buildWhereClause(options) {
        const { userId, severity, startDate, endDate } = options;
        const where = {};

        if (userId) {
            where.userId = userId;
        }
        if (severity) {
            where.severity = severity;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = startDate;
            }
            if (endDate) {
                where.createdAt.lte = endDate;
            }
        }

        return where;
    }

    /**
     * Get total count of violations
     */
    async getTotalCount(where) {
        return await this.prisma.violations.count({ where });
    }

    /**
     * Get violations with pagination
     */
    async getViolationsWithPagination(where, limit, offset) {
        return await this.prisma.violations.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            select: {
                id: true,
                userId: true,
                userEmail: true,
                username: true,
                violationType: true,
                detectedWords: true,
                severity: true,
                endpoint: true,
                isBlocked: true,
                createdAt: true
            }
        });
    }

    /**
     * Get severity breakdown statistics
     */
    async getSeverityStats(where) {
        const severityStats = await this.prisma.violations.groupBy({
            by: ['severity'],
            where,
            _count: { severity: true }
        });

        return severityStats.map(stat => ({
            severity: stat.severity,
            count: stat._count.severity
        }));
    }

    /**
     * Get top violating users
     */
    async getTopViolators() {
        const topViolators = await this.prisma.violations.groupBy({
            by: ['userId', 'userEmail', 'username'],
            where: { userId: { not: null } },
            _count: { userId: true },
            orderBy: { _count: { userId: 'desc' } },
            take: 10
        });

        return topViolators.map(violator => ({
            userId: violator.userId,
            userEmail: violator.userEmail,
            username: violator.username,
            violationCount: violator._count.userId
        }));
    }

    /**
     * Get top endpoints with violations
     */
    async getTopEndpoints(where) {
        const topEndpoints = await this.prisma.violations.groupBy({
            by: ['endpoint'],
            where,
            _count: { endpoint: true },
            orderBy: { _count: { endpoint: 'desc' } },
            take: 10
        });

        return topEndpoints.map(endpoint => ({
            endpoint: endpoint.endpoint,
            violationCount: endpoint._count.endpoint
        }));
    }

    /**
     * Get recent violations count (last 24 hours)
     */
    async getRecentViolationsCount(where) {
        return await this.prisma.violations.count({
            where: {
                ...where,
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
            }
        });
    }

    /**
     * Get comprehensive violation statistics
     */
    async getViolationStats(options = {}) {
        const {
            userId = null,
            severity = null,
            startDate = null,
            endDate = null,
            limit = 100,
            offset = 0
        } = options;

        try {
            const where = this.buildWhereClause({ userId, severity, startDate, endDate });

            // Execute all queries in parallel for better performance
            const [
                totalCount,
                violations,
                severityStats,
                topViolators,
                topEndpoints,
                recentViolations
            ] = await Promise.all([
                this.getTotalCount(where),
                this.getViolationsWithPagination(where, limit, offset),
                this.getSeverityStats(where),
                this.getTopViolators(),
                this.getTopEndpoints(where),
                this.getRecentViolationsCount(where)
            ]);

            return {
                totalCount,
                violations,
                severityStats,
                topViolators,
                topEndpoints,
                recentViolations,
                pagination: {
                    limit,
                    offset,
                    hasMore: offset + limit < totalCount
                }
            };
        } catch (error) {
            console.error('❌ VIOLATION STATS: Error getting violation stats:', error);
            throw error;
        }
    }
}
