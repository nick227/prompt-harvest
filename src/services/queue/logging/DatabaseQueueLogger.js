/**
 * Database Queue Logger - Long-term Storage Logging System
 *
 * Provides persistent logging of queue errors, warnings, and events
 * with database storage for historical analysis and compliance.
 */

import databaseClient from '../../../database/PrismaClient.js';

export class DatabaseQueueLogger {
    constructor() {
        this.prisma = databaseClient.getClient();
        this.logLevels = {
            ERROR: 'error',
            WARNING: 'warning',
            INFO: 'info',
            DEBUG: 'debug'
        };

        // Fire-and-forget logging - no blocking operations
        this.isLogging = false;
    }

    /**
     * Log an error with context (fire-and-forget)
     * @param {string} message - Error message
     * @param {Object} context - Additional context
     * @param {Error} error - Original error object
     */
    logError(message, context = {}, error = null) {
        this._log(this.logLevels.ERROR, message, context, error);
    }

    /**
     * Log a warning with context (fire-and-forget)
     * @param {string} message - Warning message
     * @param {Object} context - Additional context
     */
    logWarning(message, context = {}) {
        this._log(this.logLevels.WARNING, message, context);
    }

    /**
     * Log a warning with context (alias for logWarning, matches console.warn convention)
     * @param {string} message - Warning message
     * @param {Object} context - Additional context
     */
    logWarn(message, context = {}) {
        this.logWarning(message, context);
    }

    /**
     * Log an info message with context (fire-and-forget)
     * @param {string} message - Info message
     * @param {Object} context - Additional context
     */
    logInfo(message, context = {}) {
        this._log(this.logLevels.INFO, message, context);
    }

    /**
     * Log a debug message with context (fire-and-forget)
     * @param {string} message - Debug message
     * @param {Object} context - Additional context
     */
    logDebug(message, context = {}) {
        this._log(this.logLevels.DEBUG, message, context);
    }

    /**
     * Internal logging method (fire-and-forget)
     * @private
     */
    _log(level, message, context = {}, error = null) {
        // Fire-and-forget - don't block the main thread
        setImmediate(async () => {
            try {
                const logData = {
                    level,
                    message,
                    context: this._sanitizeContext(context),
                    error: error ? this._extractErrorInfo(error) : null,
                    requestId: context.requestId || null,
                    userId: context.userId || null
                };

                // Store in database (non-blocking)
                await this.prisma.queueLog.create({
                    data: logData
                });

                // Console logging for development (non-blocking)
                this._consoleLog(level, message, context, error);

            } catch (logError) {
                // Never let logging errors break the main flow
                console.error('DatabaseQueueLogger: Logging failed (non-critical):', logError.message);
            }
        });
    }

    /**
     * Get recent logs for admin dashboard
     * @param {number} limit - Maximum number of logs to return
     * @param {string} level - Filter by log level
     * @param {string} requestId - Filter by request ID
     * @param {string} userId - Filter by user ID
     * @returns {Promise<Array>} Recent log entries
     */
    async getRecentLogs(limit = 50, level = null, requestId = null, userId = null) {
        try {
            const where = {};

            if (level) {
                where.level = level;
            }
            if (requestId) {
                where.requestId = requestId;
            }
            if (userId) {
                where.userId = userId;
            }

            const logs = await this.prisma.queueLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit
            });

            return logs.map(log => ({
                id: log.id,
                level: log.level,
                message: log.message,
                context: log.context ? JSON.parse(log.context) : null,
                error: log.error ? JSON.parse(log.error) : null,
                requestId: log.requestId,
                userId: log.userId,
                timestamp: log.createdAt.toISOString()
            }));
        } catch (error) {
            console.error('DatabaseQueueLogger: Failed to get recent logs:', error.message);

            return [];
        }
    }

    /**
     * Get log statistics for admin dashboard
     * @returns {Promise<Object>} Log statistics
     */
    async getLogStats() {
        try {
            const timeRanges = this._getTimeRanges();
            const [totalCount, levelCounts, recentCounts, lastEntries, dailyCounts] = await Promise.all([
                this._getTotalCount(),
                this._getLevelCounts(),
                this._getRecentCounts(timeRanges.oneHourAgo),
                this._getLastEntries(),
                this._getDailyCounts(timeRanges.oneDayAgo)
            ]);

            return this._buildStatsObject(totalCount, levelCounts, recentCounts, lastEntries, dailyCounts);
        } catch (error) {
            console.error('DatabaseQueueLogger: Failed to get log stats:', error.message);

            return { total: 0, byLevel: {}, recentErrors: 0, recentWarnings: 0 };
        }
    }

    /**
     * Get time ranges for statistics
     * @private
     */
    _getTimeRanges() {
        const now = new Date();

        return {
            oneHourAgo: new Date(now.getTime() - 60 * 60 * 1000),
            oneDayAgo: new Date(now.getTime() - 24 * 60 * 60 * 1000)
        };
    }

    /**
     * Get total log count
     * @private
     */
    async _getTotalCount() {
        return await this.prisma.queueLog.count();
    }

    /**
     * Get counts by level
     * @private
     */
    async _getLevelCounts() {
        return await this.prisma.queueLog.groupBy({
            by: ['level'],
            _count: { level: true }
        });
    }

    /**
     * Get recent error and warning counts
     * @private
     */
    async _getRecentCounts(oneHourAgo) {
        const [recentErrors, recentWarnings] = await Promise.all([
            this.prisma.queueLog.count({
                where: { level: 'error', createdAt: { gte: oneHourAgo } }
            }),
            this.prisma.queueLog.count({
                where: { level: 'warning', createdAt: { gte: oneHourAgo } }
            })
        ]);

        return { recentErrors, recentWarnings };
    }

    /**
     * Get last error and warning entries
     * @private
     */
    async _getLastEntries() {
        const [lastError, lastWarning] = await Promise.all([
            this.prisma.queueLog.findFirst({
                where: { level: 'error' },
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.queueLog.findFirst({
                where: { level: 'warning' },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        return { lastError, lastWarning };
    }

    /**
     * Get daily counts for trends
     * @private
     */
    async _getDailyCounts(oneDayAgo) {
        return await this.prisma.queueLog.groupBy({
            by: ['level'],
            where: { createdAt: { gte: oneDayAgo } },
            _count: { level: true }
        });
    }

    /**
     * Build the final stats object
     * @private
     */
    _buildStatsObject(totalCount, levelCounts, recentCounts, lastEntries, dailyCounts) {
        const byLevel = this._convertLevelCounts(levelCounts);
        const dailyCountsObj = this._convertDailyCounts(dailyCounts);

        return {
            total: totalCount,
            byLevel,
            recentErrors: recentCounts.recentErrors,
            recentWarnings: recentCounts.recentWarnings,
            lastError: this._formatLastEntry(lastEntries.lastError),
            lastWarning: this._formatLastEntry(lastEntries.lastWarning),
            dailyCounts: dailyCountsObj
        };
    }

    /**
     * Convert level counts to object
     * @private
     */
    _convertLevelCounts(levelCounts) {
        return levelCounts.reduce((acc, item) => {
            acc[item.level] = item._count.level;

            return acc;
        }, {});
    }

    /**
     * Convert daily counts to object
     * @private
     */
    _convertDailyCounts(dailyCounts) {
        return dailyCounts.reduce((acc, item) => {
            acc[item.level] = item._count.level;

            return acc;
        }, {});
    }

    /**
     * Format last entry for response
     * @private
     */
    _formatLastEntry(entry) {
        if (!entry) {
            return null;
        }

        return {
            id: entry.id,
            message: entry.message,
            timestamp: entry.createdAt.toISOString(),
            context: entry.context ? JSON.parse(entry.context) : null
        };
    }

    /**
     * Search logs with advanced filtering
     * @param {Object} filters - Search filters
     * @returns {Promise<Array>} Matching log entries
     */
    async searchLogs(filters = {}) {
        try {
            const {
                level,
                requestId,
                userId,
                message,
                startDate,
                endDate,
                limit = 100,
                offset = 0
            } = filters;

            const where = {};

            if (level) {
                where.level = level;
            }
            if (requestId) {
                where.requestId = requestId;
            }
            if (userId) {
                where.userId = userId;
            }
            if (message) {
                where.message = { contains: message, mode: 'insensitive' };
            }
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) {
                    where.createdAt.gte = new Date(startDate);
                }
                if (endDate) {
                    where.createdAt.lte = new Date(endDate);
                }
            }

            const logs = await this.prisma.queueLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset
            });

            return logs.map(log => ({
                id: log.id,
                level: log.level,
                message: log.message,
                context: log.context ? JSON.parse(log.context) : null,
                error: log.error ? JSON.parse(log.error) : null,
                requestId: log.requestId,
                userId: log.userId,
                timestamp: log.createdAt.toISOString()
            }));
        } catch (error) {
            console.error('DatabaseQueueLogger: Failed to search logs:', error.message);

            return [];
        }
    }

    /**
     * Clean up old logs (fire-and-forget)
     * @param {number} olderThanDays - Delete logs older than this many days
     */
    clearOldLogs(olderThanDays = 30) {
        setImmediate(async () => {
            try {
                const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

                const result = await this.prisma.queueLog.deleteMany({
                    where: {
                        createdAt: { lt: cutoffDate }
                    }
                });

                console.log(`DatabaseQueueLogger: Cleaned up ${result.count} old log entries`);
            } catch (error) {
                console.error('DatabaseQueueLogger: Failed to clear old logs:', error.message);
            }
        });
    }

    /**
     * Get log trends for analytics
     * @param {number} days - Number of days to analyze
     * @returns {Promise<Object>} Trend data
     */
    async getLogTrends(days = 7) {
        try {
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            const trends = await this.prisma.queueLog.groupBy({
                by: ['level', 'createdAt'],
                where: {
                    createdAt: { gte: startDate }
                },
                _count: { level: true },
                orderBy: { createdAt: 'asc' }
            });

            return trends.reduce((acc, item) => {
                const [date] = item.createdAt.toISOString().split('T');

                if (!acc[date]) {
                    acc[date] = {};
                }
                acc[date][item.level] = item._count.level;

                return acc;
            }, {});
        } catch (error) {
            console.error('DatabaseQueueLogger: Failed to get log trends:', error.message);

            return {};
        }
    }

    /**
     * Sanitize context object to prevent circular references
     * @private
     */
    _sanitizeContext(context) {
        try {
            if (!context || typeof context !== 'object') {
                return null;
            }

            const sanitized = {};

            for (const [key, value] of Object.entries(context)) {
                sanitized[key] = this._sanitizeValue(value);
            }

            return JSON.stringify(sanitized);
        } catch (error) {
            return JSON.stringify({ error: 'Failed to sanitize context' });
        }
    }

    /**
     * Sanitize individual value to prevent circular references
     * @private
     */
    _sanitizeValue(value) {
        if (typeof value === 'function') {
            return '[Function]';
        }

        if (value instanceof Error) {
            return this._extractErrorInfo(value);
        }

        if (typeof value === 'object' && value !== null) {
            return this._testForCircularReference(value);
        }

        return value;
    }

    /**
     * Test if object has circular references
     * @private
     */
    _testForCircularReference(obj) {
        try {
            JSON.stringify(obj);

            return obj;
        } catch {
            return '[Circular Reference]';
        }
    }

    /**
     * Extract error information safely
     * @private
     */
    _extractErrorInfo(error) {
        try {
            return JSON.stringify({
                name: error.name,
                message: error.message,
                stack: error.stack?.substring(0, 1000), // Limit stack trace
                cause: error.cause ? this._extractErrorInfo(error.cause) : null
            });
        } catch {
            return JSON.stringify({ name: 'Unknown', message: 'Failed to extract error info' });
        }
    }

    /**
     * Console logging with appropriate level
     * @private
     */
    _consoleLog(level, message, context, error) {
        const timestamp = new Date().toISOString();
        const contextStr = Object.keys(context).length > 0 ? ` | Context: ${JSON.stringify(context)}` : '';
        const errorStr = error ? ` | Error: ${error.message}` : '';

        switch (level) {
            case this.logLevels.ERROR:
                console.error(`[QUEUE-ERROR] ${timestamp} | ${message}${contextStr}${errorStr}`);
                break;
            case this.logLevels.WARNING:
                console.warn(`[QUEUE-WARNING] ${timestamp} | ${message}${contextStr}`);
                break;
            case this.logLevels.INFO:
                console.info(`[QUEUE-INFO] ${timestamp} | ${message}${contextStr}`);
                break;
            case this.logLevels.DEBUG:
                console.debug(`[QUEUE-DEBUG] ${timestamp} | ${message}${contextStr}`);
                break;
        }
    }
}

// Singleton instance for global use
export const databaseQueueLogger = new DatabaseQueueLogger();
