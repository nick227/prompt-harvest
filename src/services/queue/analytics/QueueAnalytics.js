/**
 * Queue Analytics - Consolidated metrics and backpressure management
 *
 * Handles:
 * - Metrics collection and historical analysis
 * - Backpressure management and rate limiting
 * - Capacity control and performance optimization
 * - Health monitoring and alerting
 */

import { BackpressureError, RateLimitError } from '../errors/QueueErrors.js';
import { databaseQueueLogger } from '../logging/DatabaseQueueLogger.js';

export class QueueAnalytics {
    constructor(queueCore, options = {}) {
        this.queueCore = queueCore;

        // Historical metrics and priority support
        this._metricsHistory = [];
        this._maxHistorySize = options.maxHistorySize || 1000;

        // Tunable backpressure configuration
        this._backpressureConfig = {
            queueMultiplier: 20, // concurrency * multiplier = max queue size
            nearCapacityThreshold: 0.8, // 80% utilization triggers warnings
            maxQueueTimeMinutes: 10, // Target max queue time in minutes
            avgProcessingTimeEWMA: 0, // Exponential weighted moving average
            ewmaAlpha: 0.1 // EWMA smoothing factor
        };

        // Cap observability tracking
        this._capObservability = {
            lastEffectiveCap: null,
            lastCapReason: null,
            capChangeLogThreshold: 5000 // Log cap changes if >5s apart
        };

        // Sample tracking for cold-start gating
        this._sampleTracking = {
            completionCount: 0,
            coldStartThreshold: 0 // Will be set to 2 * concurrency in initializeWithSettings
        };

        // User rate limiter
        this._userRateLimiter = new Map();

        // Start periodic cleanup of expired rate limiter buckets
        this._rateLimiterCleanupId = this._startRateLimiterCleanup();
    }

    /**
     * Record metrics for historical analysis
     * @param {Object} metrics - Metrics to record
     */
    recordMetrics(metrics) {
        this._metricsHistory.push({
            timestamp: Date.now(),
            ...metrics
        });

        // Keep only recent history
        if (this._metricsHistory.length > this._maxHistorySize) {
            this._metricsHistory = this._metricsHistory.slice(-this._maxHistorySize);
        }
    }

    /**
     * Get historical trends for analysis
     * @param {number} timeWindow - Time window in milliseconds
     * @returns {Array} Historical metrics within time window
     */
    getHistoricalTrends(timeWindow = 3600000) { // 1 hour default
        const cutoff = Date.now() - timeWindow;

        return this._metricsHistory.filter(m => m.timestamp > cutoff);
    }

    /**
     * Calculate queue growth rate
     * @param {Array} trends - Historical trends data
     * @returns {number} Growth rate per minute
     */
    calculateQueueGrowthRate(trends) {
        if (trends.length < 2) {
            return 0;
        }

        const first = trends[0];
        const last = trends[trends.length - 1];
        const timeDiff = (last.timestamp - first.timestamp) / 60000; // minutes

        if (timeDiff === 0) {
            return 0;
        }

        return (last.queueSize - first.queueSize) / timeDiff;
    }

    /**
     * Calculate error rate trends
     * @param {Array} trends - Historical trends data
     * @returns {Object} Error rate analysis
     */
    calculateErrorRateTrends(trends) {
        if (trends.length === 0) {
            return { errorRate: 0, trend: 'stable' };
        }

        const errorMetrics = trends.filter(t => t.action === 'task_error');
        const totalTasks = trends.filter(t => t.action === 'task_complete' || t.action === 'task_error'
        ).length;

        const errorRate = totalTasks > 0 ? (errorMetrics.length / totalTasks) * 100 : 0;

        // Determine trend
        const recent = trends.slice(-Math.min(10, trends.length));
        const older = trends.slice(0, Math.max(0, trends.length - 10));

        let trend = 'stable';

        if (recent.length > 0 && older.length > 0) {
            const recentErrorRate = this._calculateErrorRateForPeriod(recent);
            const olderErrorRate = this._calculateErrorRateForPeriod(older);

            if (recentErrorRate > olderErrorRate * 1.1) {
                trend = 'increasing';
            } else if (recentErrorRate < olderErrorRate * 0.9) {
                trend = 'decreasing';
            }
        }

        return { errorRate, trend };
    }

    /**
     * Calculate error rate for a specific period
     * @param {Array} period - Period data
     * @returns {number} Error rate percentage
     * @private
     */
    _calculateErrorRateForPeriod(period) {
        const errorMetrics = period.filter(t => t.action === 'task_error');
        const totalTasks = period.filter(t => t.action === 'task_complete' || t.action === 'task_error'
        ).length;

        return totalTasks > 0 ? (errorMetrics.length / totalTasks) * 100 : 0;
    }

    /**
     * Get enhanced metrics with historical analysis
     * @param {Object} baseMetrics - Base metrics from queue core
     * @param {Function} getMaxQueueSize - Function to get max queue size
     * @param {Object} backpressureConfig - Backpressure configuration
     * @param {Object} capObservability - Cap observability data
     * @returns {Object} Enhanced metrics
     */
    getEnhancedMetrics(baseMetrics, getMaxQueueSize, backpressureConfig, capObservability) {
        const trends = this.getHistoricalTrends();
        const growthRate = this.calculateQueueGrowthRate(trends);
        const errorAnalysis = this.calculateErrorRateTrends(trends);

        // Calculate capacity utilization
        const current = baseMetrics.current || {};
        const queueSize = current.queueSize || 0;
        const activeJobs = current.activeJobs || 0;
        const maxQueueSize = getMaxQueueSize();

        const capacity = {
            maxQueueSize,
            currentUtilization: maxQueueSize > 0 ? ((queueSize + activeJobs) / maxQueueSize) * 100 : 0,
            isNearCapacity: (queueSize + activeJobs) > (maxQueueSize * backpressureConfig.nearCapacityThreshold)
        };

        // Calculate performance metrics from trends
        const completedTasks = trends.filter(t => t.action === 'task_complete');
        const errorTasks = trends.filter(t => t.action === 'task_error');
        const totalTasks = completedTasks.length + errorTasks.length;

        // Calculate average processing time from completed tasks
        const avgProcessingTime = completedTasks.length > 0
            ? completedTasks.reduce((sum, t) => sum + (t.duration || 0), 0) / completedTasks.length
            : (backpressureConfig.avgProcessingTimeEWMA || 0);

        // Calculate rates (as fractions 0.0-1.0)
        const successRate = totalTasks > 0 ? completedTasks.length / totalTasks : 0;
        const errorRate = totalTasks > 0 ? errorTasks.length / totalTasks : 0;

        // Calculate tasks per minute (from last hour of trends)
        const oneMinuteAgo = Date.now() - 60000;
        const recentTasks = trends.filter(t =>
            (t.action === 'task_complete' || t.action === 'task_error') &&
            t.timestamp > oneMinuteAgo
        );
        const tasksPerMinute = recentTasks.length;

        const performance = {
            avgProcessingTime: Math.round(avgProcessingTime),
            successRate,
            errorRate,
            tasksPerMinute,
            throughput: tasksPerMinute,
            retryRate: 0 // TODO: Calculate retry rate if needed
        };

        return {
            ...baseMetrics,
            trends: {
                growthRate,
                errorPatterns: errorAnalysis,
                timeWindow: 3600000 // 1 hour
            },
            capacity,
            performance,
            backpressure: {
                config: backpressureConfig,
                observability: capObservability
            }
        };
    }

    /**
     * Get detailed health status with enhanced diagnostics
     * @param {Object} health - Basic health data
     * @param {Object} metrics - Enhanced metrics
     * @returns {Object} Detailed health status
     */
    getDetailedHealthStatus(health, metrics) {
        const recommendations = this._generateHealthRecommendations(health, metrics);
        const diagnostics = this._generateDiagnostics(health, metrics);

        return {
            ...health,
            recommendations,
            diagnostics,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Generate health recommendations
     * @param {Object} health - Health data
     * @param {Object} metrics - Metrics data
     * @returns {Array} Recommendations
     * @private
     */
    _generateHealthRecommendations(health, metrics) {
        const recommendations = [];

        if (health.status === 'critical') {
            recommendations.push('Immediate attention required');
            recommendations.push('Consider scaling resources');
            recommendations.push('Review error patterns');
        }

        if (metrics.capacity?.isNearCapacity) {
            recommendations.push('Queue approaching capacity limit');
            recommendations.push('Consider increasing concurrency');
        }

        if (metrics.trends?.errorPatterns?.trend === 'increasing') {
            recommendations.push('Error rate is increasing');
            recommendations.push('Investigate recent changes');
        }

        return recommendations;
    }

    /**
     * Generate diagnostic information
     * @param {Object} health - Health data
     * @param {Object} metrics - Metrics data
     * @returns {Object} Diagnostic information
     * @private
     */
    _generateDiagnostics(health, metrics) {
        return {
            queueHealth: health.status,
            capacityUtilization: metrics.capacity?.currentUtilization || 0,
            errorTrend: metrics.trends?.errorPatterns?.trend || 'stable',
            growthRate: metrics.trends?.growthRate || 0,
            recommendations: this._generateHealthRecommendations(health, metrics)
        };
    }

    /**
     * Check backpressure to prevent queue overload
     */
    checkBackpressure() {
        const currentMetrics = this.queueCore.getMetrics().current;
        const queueSize = currentMetrics?.queueSize ?? 0;
        const activeJobs = currentMetrics?.activeJobs ?? 0;
        const maxQueueSize = this.getMaxQueueSize();
        const { concurrency } = this.queueCore.queue;

        // Calculate waiting room capacity (ensure at least 1 slot for queuing)
        const waitingRoomCap = Math.max(maxQueueSize - activeJobs, 1);

        if (queueSize >= waitingRoomCap) {
            // Log backpressure event (fire-and-forget)
            databaseQueueLogger.logWarn('Queue backpressure triggered', {
                queueSize,
                waitingRoomCap,
                activeJobs,
                maxQueueSize,
                concurrency,
                utilization: `${((queueSize + activeJobs) / maxQueueSize * 100).toFixed(1)}%`
            });

            throw new BackpressureError(
                `Queue waiting room full. Current: ${queueSize}, ` +
                `Capacity: ${waitingRoomCap}, Active: ${activeJobs}, ` +
                `Max: ${maxQueueSize}`
            );
        }
    }

    /**
     * Check user rate limits
     * @param {string} userId - User ID to check
     */
    checkUserRateLimit(userId) {
        if (!userId) {
            return; // No rate limiting for anonymous users
        }

        const now = Date.now();
        const userLimits = this._userRateLimiter.get(userId) || {
            requests: [],
            lastCleanup: now
        };

        // Clean up old requests (older than 1 minute)
        const oneMinuteAgo = now - 60000;

        userLimits.requests = userLimits.requests.filter(timestamp => timestamp > oneMinuteAgo);

        // Check rate limit (10 requests per minute)
        const maxRequestsPerMinute = 10;

        if (userLimits.requests.length >= maxRequestsPerMinute) {
            // Log rate limit event (fire-and-forget)
            databaseQueueLogger.logWarn('User rate limit exceeded', {
                userId,
                currentRequests: userLimits.requests.length,
                maxRequestsPerMinute,
                timeWindow: '1 minute'
            });

            throw new RateLimitError(
                `Rate limit exceeded for user ${userId}. ` +
                `Max ${maxRequestsPerMinute} requests per minute.`
            );
        }

        // Add current request
        userLimits.requests.push(now);
        userLimits.lastCleanup = now;
        this._userRateLimiter.set(userId, userLimits);
    }

    /**
     * Get maximum queue size based on backpressure configuration
     * @returns {number} Maximum queue size
     */
    getMaxQueueSize() {
        const { concurrency } = this.queueCore.queue;
        const { queueMultiplier, maxQueueTimeMinutes, avgProcessingTimeEWMA } = this._backpressureConfig;

        // Time-based capacity calculation
        const maxQueueTimeMs = maxQueueTimeMinutes * 60 * 1000;
        const timeBasedCap = avgProcessingTimeEWMA > 0
            ? Math.floor(maxQueueTimeMs / avgProcessingTimeEWMA)
            : concurrency * queueMultiplier;

        // Ensure minimum viable capacity
        const minSafeCap = Math.max(concurrency, 1);
        const clampedTimeBasedCap = Math.max(timeBasedCap, minSafeCap);

        // Use the more restrictive of time-based or heuristic capacity
        const finalCap = Math.min(clampedTimeBasedCap, concurrency * queueMultiplier);

        // Log significant cap changes for observability
        this._logCapChange(finalCap);

        return finalCap;
    }

    /**
     * Log capacity changes for observability
     * @param {number} newCap - New capacity value
     * @private
     */
    _logCapChange(newCap) {
        const now = Date.now();
        const { lastEffectiveCap, lastCapReason, capChangeLogThreshold } = this._capObservability;

        if (lastEffectiveCap !== null &&
            Math.abs(newCap - lastEffectiveCap) > 0 &&
            (now - this._capObservability.lastLogTime || 0) > capChangeLogThreshold) {

            console.log(`📊 QueueAnalytics: Capacity changed from ${lastEffectiveCap} to ${newCap} (${lastCapReason})`);
            this._capObservability.lastLogTime = now;
        }

        this._capObservability.lastEffectiveCap = newCap;
        this._capObservability.lastCapReason = 'dynamic_calculation';
    }

    /**
     * Update processing time EWMA
     * @param {number} processingTime - Processing time in milliseconds
     */
    updateProcessingTimeEWMA(processingTime) {
        const { avgProcessingTimeEWMA, ewmaAlpha } = this._backpressureConfig;

        if (avgProcessingTimeEWMA === 0) {
            // Initialize with first sample
            this._backpressureConfig.avgProcessingTimeEWMA = processingTime;
        } else {
            // Update EWMA
            this._backpressureConfig.avgProcessingTimeEWMA =
                (ewmaAlpha * processingTime) + ((1 - ewmaAlpha) * avgProcessingTimeEWMA);
        }
    }

    /**
     * Set cold start threshold
     * @param {number} threshold - Cold start threshold
     */
    setColdStartThreshold(threshold) {
        this._sampleTracking.coldStartThreshold = threshold;
    }

    /**
     * Increment completion count
     */
    incrementCompletionCount() {
        this._sampleTracking.completionCount++;
    }

    /**
     * Get backpressure configuration
     * @returns {Object} Backpressure configuration
     */
    getBackpressureConfig() {
        return { ...this._backpressureConfig };
    }

    /**
     * Get capacity observability data
     * @returns {Object} Capacity observability data
     */
    getCapObservability() {
        return { ...this._capObservability };
    }

    /**
     * Start periodic cleanup of expired rate limiter buckets
     * @returns {number} Cleanup interval ID
     */
    startRateLimiterCleanup() {
        if (this._rateLimiterCleanupId) {
            return this._rateLimiterCleanupId;
        }
        this._rateLimiterCleanupId = this._startRateLimiterCleanup();

        return this._rateLimiterCleanupId;
    }

    /**
     * Stop periodic cleanup of expired rate limiter buckets
     */
    stopRateLimiterCleanup() {
        if (this._rateLimiterCleanupId) {
            clearInterval(this._rateLimiterCleanupId);
            this._rateLimiterCleanupId = null;
        }
    }

    /**
     * Start periodic cleanup of expired rate limiter buckets
     * @returns {number} Cleanup interval ID
     * @private
     */
    _startRateLimiterCleanup() {
        return setInterval(() => {
            const now = Date.now();
            const oneMinuteAgo = now - 60000;

            for (const [userId, limits] of this._userRateLimiter.entries()) {
                if (now - limits.lastCleanup > 300000) { // 5 minutes
                    this._userRateLimiter.delete(userId);
                } else {
                    limits.requests = limits.requests.filter(timestamp => timestamp > oneMinuteAgo);
                    if (limits.requests.length === 0) {
                        this._userRateLimiter.delete(userId);
                    }
                }
            }
        }, 300000); // Clean up every 5 minutes
    }

}

export default QueueAnalytics;
