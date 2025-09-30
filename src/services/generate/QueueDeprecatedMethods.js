/**
 * Queue Deprecated Methods
 *
 * Handles deprecated API methods with consistent warnings and metrics.
 */

export class QueueDeprecatedMethods {
    constructor(analytics, epochNow) {
        this._analytics = analytics;
        this._epochNow = epochNow;
        this._deprecationWarned = false;
    }

    /**
     * Show one-time deprecation warning for deprecated APIs
     * @param {string} methodName - Name of deprecated method
     * @param {string} alternative - Recommended alternative
     */
    warnDeprecated(methodName, alternative) {
        if (!this._deprecationWarned) {
            console.warn(`QueueManager: ${methodName}() is deprecated. ${alternative}`);
            this._deprecationWarned = true;
        }
    }

    /**
     * Record deprecated API usage metrics
     * @param {string} api - API method name
     */
    recordDeprecatedApiUsage(api) {
        this._analytics?.recordMetrics({
            action: 'deprecated_api_used',
            api,
            timestamp: this._epochNow()
        });
    }

    /**
     * Get queue data for monitoring (lightweight view)
     * @deprecated Use getOverview() for most use cases
     * @param {Object} queueData - Queue data from _getQueueData
     * @returns {Object} Queue data with deprecated shape
     */
    getQueueData(queueData) {
        this.warnDeprecated('getQueueData', 'Use getOverview() for most use cases.');
        this.recordDeprecatedApiUsage('getQueueData');

        return {
            initialization: queueData.initialization ?? {},
            current: queueData.metrics?.current ?? {},
            health: queueData.health ?? {},
            config: queueData.metrics?.config ?? {},
            state: queueData.state ?? {},
            deprecated: true
        };
    }

    /**
     * Get queue status (lightweight view)
     * @deprecated Use getOverview() for most use cases
     * @param {Object} queueData - Queue data from _getQueueData
     * @returns {Object} Queue status with deprecated shape
     */
    getQueueStatus(queueData) {
        this.warnDeprecated('getQueueStatus', 'Use getOverview() for most use cases.');
        this.recordDeprecatedApiUsage('getQueueStatus');

        return {
            // Basic status
            isInitialized: queueData.initialization?.isInitialized ?? false,
            isAcceptingTasks: queueData.initialization?.isAcceptingTasks ?? false,
            isShuttingDown: queueData.initialization?.isShuttingDown ?? false,
            isShutdown: queueData.initialization?.isShutdown ?? false,
            concurrency: queueData.state?.concurrency ?? queueData.metrics?.current?.concurrency ?? 2,
            queueSize: queueData.state?.length ?? queueData.metrics?.current?.queueSize ?? 0,
            activeJobs: queueData.metrics?.current?.activeJobs ?? 0,
            pendingJobs: queueData.metrics?.current?.pendingJobs ?? 0,
            completedJobs: queueData.metrics?.current?.completedJobs ?? 0,
            failedJobs: queueData.metrics?.current?.failedJobs ?? 0,
            deprecated: true
        };
    }

    /**
     * Get queue metrics (lightweight view)
     * @deprecated Use getOverview() for most use cases
     * @param {Object} queueData - Queue data from _getQueueData
     * @returns {Object} Queue metrics with deprecated shape
     */
    getQueueMetrics(queueData) {
        this.warnDeprecated('getQueueMetrics', 'Use getOverview() for most use cases.');
        this.recordDeprecatedApiUsage('getQueueMetrics');

        return {
            ...(queueData.metrics ?? {}),
            deprecated: true
        };
    }
}
