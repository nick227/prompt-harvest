/**
 * PerformanceMonitor - Comprehensive performance monitoring and optimization
 *
 * Integrates all performance optimization services and provides monitoring.
 */

import { QueryOptimizer } from '../../database/QueryOptimizer.js';
import { ConnectionPoolOptimizer } from '../../database/ConnectionPoolOptimizer.js';
import { SmartCacheService } from '../cache/SmartCacheService.js';
import { MemoryOptimizer } from './MemoryOptimizer.js';

export class PerformanceMonitor {
    constructor() {
        console.log('🔧 PerformanceMonitor: Initializing...');

        // Initialize optimization services
        this.queryOptimizer = new QueryOptimizer();
        this.connectionOptimizer = new ConnectionPoolOptimizer();
        this.cacheService = new SmartCacheService();
        this.memoryOptimizer = new MemoryOptimizer();

        // Performance metrics
        this.metrics = {
            startTime: Date.now(),
            totalRequests: 0,
            averageResponseTime: 0,
            errorCount: 0,
            cacheHits: 0,
            cacheMisses: 0
        };

        this.startMonitoring();
        console.log('✅ PerformanceMonitor: Initialized successfully');
    }

    /**
     * Start performance monitoring
     */
    startMonitoring() {
        // Monitor performance every 60 seconds
        setInterval(() => {
            this.collectMetrics();
            this.optimizePerformance();
        }, 60000);

        console.log('🔧 Performance monitoring started');
    }

    /**
     * Collect performance metrics
     */
    async collectMetrics() {
        try {
            const metrics = {
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: this.memoryOptimizer.getMemoryStats(),
                database: await this.connectionOptimizer.getPerformanceMetrics(),
                cache: this.cacheService.getStats(),
                application: this.metrics
            };

            // Log performance summary
            this.logPerformanceSummary(metrics);

        } catch (error) {
            console.error('❌ Failed to collect performance metrics:', error);
        }
    }

    /**
     * Optimize performance based on current metrics
     */
    async optimizePerformance() {
        try {
            const recommendations = this.memoryOptimizer.getOptimizationRecommendations();

            if (recommendations.length > 0) {
                console.log('🔧 Performance optimization recommendations:', recommendations);

                for (const recommendation of recommendations) {
                    await this.executeOptimization(recommendation);
                }
            }

        } catch (error) {
            console.error('❌ Performance optimization failed:', error);
        }
    }

    /**
     * Execute optimization based on recommendation
     * @param {Object} recommendation - Optimization recommendation
     */
    async executeOptimization(recommendation) {
        try {
            switch (recommendation.action) {
                case 'optimizeMemory':
                    await this.memoryOptimizer.optimizeMemory();
                    break;
                case 'triggerGarbageCollection':
                    this.memoryOptimizer.triggerGarbageCollection();
                    break;
                case 'clearCaches':
                    this.cacheService.clear();
                    break;
                default:
                    console.log(`⚠️ Unknown optimization action: ${recommendation.action}`);
            }
        } catch (error) {
            console.error('❌ Optimization execution failed:', error);
        }
    }

    /**
     * Log performance summary
     * @param {Object} metrics - Performance metrics
     */
    logPerformanceSummary(metrics) {
        const memory = metrics.memory.current;
        const heapUsage = parseFloat(metrics.memory.heapUsageRatio);

        console.log('📊 Performance Summary:', {
            uptime: `${Math.floor(metrics.uptime / 60)} minutes`,
            memory: {
                heap: memory.heapUsed,
                total: memory.heapTotal,
                usage: metrics.memory.heapUsageRatio
            },
            requests: metrics.application.totalRequests,
            errors: metrics.application.errorCount,
            cache: {
                hits: metrics.application.cacheHits,
                misses: metrics.application.cacheMisses,
                hitRate: this.calculateCacheHitRate()
            }
        });

        // Warn about performance issues
        if (heapUsage > 80) {
            console.warn('⚠️ High memory usage detected');
        }

        if (metrics.application.errorCount > 10) {
            console.warn('⚠️ High error rate detected');
        }
    }

    /**
     * Calculate cache hit rate
     * @returns {string} Cache hit rate percentage
     */
    calculateCacheHitRate() {
        const total = this.metrics.cacheHits + this.metrics.cacheMisses;

        if (total === 0) { return '0%'; }

        const hitRate = (this.metrics.cacheHits / total * 100).toFixed(1);

        return `${hitRate}%`;
    }

    /**
     * Record request metrics
     * @param {string} endpoint - Request endpoint
     * @param {number} duration - Request duration
     * @param {boolean} success - Whether request was successful
     */
    recordRequest(endpoint, duration, success = true) {
        this.metrics.totalRequests++;

        if (!success) {
            this.metrics.errorCount++;
        }

        // Update average response time
        this.metrics.averageResponseTime =
            (this.metrics.averageResponseTime + duration) / 2;
    }

    /**
     * Record cache hit
     */
    recordCacheHit() {
        this.metrics.cacheHits++;
    }

    /**
     * Record cache miss
     */
    recordCacheMiss() {
        this.metrics.cacheMisses++;
    }

    /**
     * Get comprehensive performance report
     * @returns {Object} Performance report
     */
    async getPerformanceReport() {
        try {
            const report = {
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: this.memoryOptimizer.getMemoryStats(),
                database: await this.connectionOptimizer.getPerformanceMetrics(),
                cache: this.cacheService.getStats(),
                application: this.metrics,
                recommendations: this.memoryOptimizer.getOptimizationRecommendations()
            };

            return report;

        } catch (error) {
            console.error('❌ Failed to generate performance report:', error);
            throw error;
        }
    }

    /**
     * Get optimization services
     * @returns {Object} Optimization services
     */
    getOptimizationServices() {
        return {
            queryOptimizer: this.queryOptimizer,
            connectionOptimizer: this.connectionOptimizer,
            cacheService: this.cacheService,
            memoryOptimizer: this.memoryOptimizer
        };
    }

    /**
     * Cleanup all optimization services
     */
    cleanup() {
        this.connectionOptimizer.cleanup();
        this.memoryOptimizer.cleanup();
        console.log('🔧 PerformanceMonitor: Cleaned up all services');
    }
}
