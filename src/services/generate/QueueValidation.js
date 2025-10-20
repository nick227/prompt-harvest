/**
 * Queue Validation Handler
 *
 * Handles validation and normalization of queue options
 */

export class QueueValidation {
    constructor(lifecycle, analytics) {
        this.lifecycle = lifecycle;
        this.analytics = analytics;
    }

    /**
     * Validate and normalize task options
     * @param {Object} options - Task options to validate
     * @returns {Object} Validated options
     */
    validateOptions(options) {
        const validated = { ...options };

        this._validateTimeout(validated);
        this._validateMaxRetries(validated);
        this._normalizePriority(validated);

        return validated;
    }

    /**
     * Validate and clamp timeout values
     * @param {Object} validated - Options object to modify
     * @private
     */
    _validateTimeout(validated) {
        if (validated.timeout === undefined) { return; }

        const originalTimeout = validated.timeout;

        validated.timeout = Math.max(1000, Math.min(validated.timeout, 3600000)); // 1s to 1h

        if (validated.timeout !== originalTimeout) {
            if (originalTimeout < 0) {
                console.warn(`QueueManager: Invalid negative timeout ${originalTimeout}ms clamped to 1000ms. Use positive values.`);
            }

            this.analytics?.recordMetrics({
                action: 'timeout_clamped',
                originalTimeout,
                clampedTimeout: validated.timeout,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Validate and clamp maxRetries values
     * @param {Object} validated - Options object to modify
     * @private
     */
    _validateMaxRetries(validated) {
        if (validated.maxRetries === undefined) { return; }

        const originalRetries = validated.maxRetries;

        validated.maxRetries = Math.max(0, Math.min(validated.maxRetries, 9));

        if (validated.maxRetries !== originalRetries) {
            if (originalRetries < 0) {
                console.warn(`QueueManager: Invalid negative maxRetries ${originalRetries} clamped to 0. Use non-negative values.`);
            }

            this.analytics?.recordMetrics({
                action: 'max_retries_clamped',
                originalRetries,
                clampedRetries: validated.maxRetries,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Normalize priority values
     * @param {Object} validated - Options object to modify
     * @private
     */
    _normalizePriority(validated) {
        const originalPriority = validated.priority;

        // Early guard: Check for NaN before processing
        if (typeof originalPriority === 'number' && !Number.isFinite(originalPriority)) {
            console.warn(`QueueManager: Invalid priority ${originalPriority} (NaN/Infinity) defaulting to 0`);
            validated.priority = 0;

            return;
        }

        const normalizedPriority = this.lifecycle.toPQueuePriority(validated.priority);

        if (originalPriority !== normalizedPriority) {
            this.analytics?.recordMetrics({
                action: 'priority_normalized',
                originalPriority,
                normalizedPriority,
                timestamp: Date.now()
            });
        }

        validated.priority = normalizedPriority;
    }
}
