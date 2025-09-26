/**
 * ConnectionPoolOptimizer - Database connection pooling optimization
 *
 * Optimizes database connections and provides connection health monitoring.
 */

import databaseClient from './PrismaClient.js';

export class ConnectionPoolOptimizer {
    constructor() {
        this.prisma = databaseClient.getClient();
        this.connectionStats = {
            active: 0,
            idle: 0,
            total: 0,
            errors: 0,
            lastHealthCheck: null
        };
        this.healthCheckInterval = null;
        this.startHealthMonitoring();
    }

    /**
     * Start connection health monitoring
     */
    startHealthMonitoring() {
        // Health check every 30 seconds
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthCheck();
        }, 30000);

        console.log('🔧 Connection pool health monitoring started');
    }

    /**
     * Stop health monitoring
     */
    stopHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        console.log('🔧 Connection pool health monitoring stopped');
    }

    /**
     * Perform health check on database connection
     */
    async performHealthCheck() {
        try {
            const startTime = Date.now();
            await this.prisma.$queryRaw`SELECT 1`;
            const responseTime = Date.now() - startTime;

            this.connectionStats.lastHealthCheck = {
                timestamp: new Date().toISOString(),
                responseTime,
                status: 'healthy'
            };

            // Log slow queries
            if (responseTime > 1000) {
                console.warn(`⚠️ Slow database query detected: ${responseTime}ms`);
            }

        } catch (error) {
            this.connectionStats.errors++;
            this.connectionStats.lastHealthCheck = {
                timestamp: new Date().toISOString(),
                status: 'unhealthy',
                error: error.message
            };

            console.error('❌ Database health check failed:', error.message);
        }
    }

    /**
     * Get connection pool statistics
     * @returns {Object} Connection statistics
     */
    getConnectionStats() {
        return {
            ...this.connectionStats,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime()
        };
    }

    /**
     * Optimize connection pool settings
     * @param {Object} options - Pool optimization options
     */
    async optimizeConnectionPool(options = {}) {
        const {
            maxConnections = 10,
            minConnections = 2,
            connectionTimeout = 30000,
            idleTimeout = 600000
        } = options;

        try {
            // This would be implemented with actual connection pool configuration
            // For now, we'll log the optimization settings
            console.log('🔧 Optimizing connection pool:', {
                maxConnections,
                minConnections,
                connectionTimeout,
                idleTimeout
            });

            // In a real implementation, you would configure the Prisma connection pool here
            // This might involve environment variables or Prisma configuration

        } catch (error) {
            console.error('❌ Connection pool optimization failed:', error);
            throw error;
        }
    }

    /**
     * Execute query with connection monitoring
     * @param {Function} queryFn - Query function to execute
     * @param {string} queryName - Name of the query for monitoring
     * @returns {Promise<*>} Query result
     */
    async executeWithMonitoring(queryFn, queryName = 'unknown') {
        const startTime = Date.now();

        try {
            const result = await queryFn();
            const duration = Date.now() - startTime;

            // Log slow queries
            if (duration > 1000) {
                console.warn(`⚠️ Slow query detected [${queryName}]: ${duration}ms`);
            }

            return result;

        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`❌ Query failed [${queryName}] after ${duration}ms:`, error.message);
            throw error;
        }
    }

    /**
     * Batch execute multiple queries efficiently
     * @param {Array} queries - Array of query functions
     * @returns {Promise<Array>} Array of results
     */
    async batchExecute(queries) {
        const startTime = Date.now();

        try {
            // Execute all queries in parallel
            const results = await Promise.all(queries);
            const duration = Date.now() - startTime;

            console.log(`✅ Batch executed ${queries.length} queries in ${duration}ms`);
            return results;

        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`❌ Batch execution failed after ${duration}ms:`, error.message);
            throw error;
        }
    }

    /**
     * Get database performance metrics
     * @returns {Object} Performance metrics
     */
    async getPerformanceMetrics() {
        try {
            const metrics = {
                connectionStats: this.getConnectionStats(),
                queryPerformance: await this.getQueryPerformance(),
                memoryUsage: process.memoryUsage(),
                timestamp: new Date().toISOString()
            };

            return metrics;

        } catch (error) {
            console.error('❌ Failed to get performance metrics:', error);
            throw error;
        }
    }

    /**
     * Get query performance statistics
     * @returns {Promise<Object>} Query performance data
     */
    async getQueryPerformance() {
        try {
            // This would typically involve querying database performance tables
            // For now, we'll return basic metrics
            return {
                averageResponseTime: this.connectionStats.lastHealthCheck?.responseTime || 0,
                totalQueries: this.connectionStats.total,
                errorRate: this.connectionStats.errors / Math.max(this.connectionStats.total, 1),
                lastHealthCheck: this.connectionStats.lastHealthCheck
            };

        } catch (error) {
            console.error('❌ Failed to get query performance:', error);
            return {
                averageResponseTime: 0,
                totalQueries: 0,
                errorRate: 0,
                lastHealthCheck: null
            };
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopHealthMonitoring();
        console.log('🔧 Connection pool optimizer cleaned up');
    }
}
