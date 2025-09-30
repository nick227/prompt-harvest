/**
 * Queue Lifecycle - Consolidated task lifecycle management
 *
 * Handles:
 * - Task lifecycle tracking and cancellation
 * - Abort signal management and combination
 * - Priority management and mapping
 * - Request controller coordination
 */

export class QueueLifecycle {
    constructor() {
        // Task lifecycle tracking
        this._activeTasks = new Map(); // requestId -> lifecycle entry
        this._requestControllers = new Map(); // requestId -> Set of controllers

        // Signal management
        this._shutdownController = new AbortController();

        // Priority management
        this._priorityLevels = Object.freeze({
            high: 1,
            normal: 5,
            low: 10
        });
    }

    // ===== TASK LIFECYCLE MANAGEMENT =====

    /**
     * Track task lifecycle
     * @param {string} requestId - Request ID
     * @param {Promise} promise - Task promise
     * @param {AbortController} requestController - Request controller
     * @param {Object} options - Task options
     * @returns {Object} Lifecycle entry
     */
    trackTaskLifecycle(requestId, promise, requestController, options) {
        const lifecycleEntry = {
            requestId,
            promise,
            requestController,
            started: false,
            options,
            createdAt: Date.now()
        };

        this._activeTasks.set(requestId, lifecycleEntry);

        return lifecycleEntry;
    }

    /**
     * Cleanup task lifecycle
     * @param {string} requestId - Request ID
     * @param {Object} lifecycleEntry - Lifecycle entry
     */
    cleanupTaskLifecycle(requestId, lifecycleEntry) {
        if (lifecycleEntry) {
            this._activeTasks.delete(requestId);
        }
    }

    /**
     * Check if there are active entries for a request ID
     * @param {string} requestId - Request ID
     * @returns {boolean} True if active entries exist
     */
    hasActiveEntries(requestId) {
        return this._activeTasks.has(requestId);
    }

    /**
     * Get request controller for a request ID
     * @param {string} requestId - Request ID
     * @returns {AbortController|null} Request controller or null
     */
    getRequestController(requestId) {
        const lifecycleEntry = this._activeTasks.get(requestId);

        return lifecycleEntry?.requestController || null;
    }

    /**
     * Cancel request by ID
     * @param {string} requestId - Request ID to cancel
     * @returns {boolean} True if request was found and cancelled
     */
    cancelRequest(requestId) {
        const lifecycleEntry = this._activeTasks.get(requestId);

        if (!lifecycleEntry) {
            return false;
        }

        // Abort the request controller
        if (lifecycleEntry.requestController) {
            lifecycleEntry.requestController.abort('user_cancellation');
        }

        // Clean up lifecycle entry
        this.cleanupTaskLifecycle(requestId, lifecycleEntry);

        return true;
    }

    /**
     * Create request controller
     * @param {string} requestId - Request ID
     * @param {Object} options - Task options
     * @returns {AbortController} Request controller
     */
    createRequestController(requestId, options) {
        const controller = new AbortController();

        // Track controller for this request
        if (!this._requestControllers.has(requestId)) {
            this._requestControllers.set(requestId, new Set());
        }
        this._requestControllers.get(requestId).add(controller);

        return controller;
    }

    /**
     * Cleanup task controller
     * @param {string} requestId - Request ID
     * @param {AbortController} requestController - Request controller
     */
    cleanupTaskController(requestId, requestController) {
        const controllers = this._requestControllers.get(requestId);

        if (controllers) {
            controllers.delete(requestController);
            if (controllers.size === 0) {
                this._requestControllers.delete(requestId);
            }
        }
    }

    /**
     * Clear all lifecycle tracking
     */
    clear() {
        this._activeTasks.clear();
        this._requestControllers.clear();
    }

    // ===== SIGNAL MANAGEMENT =====

    /**
     * Prepare abort signal for task
     * @param {Object} options - Task options
     * @returns {Object} Signal and cleanup function
     */
    prepareAbortSignal(options) {
        const { abortSignal, signal } = options;

        // Use provided signal or create new one
        const externalSignal = abortSignal || signal;

        if (externalSignal) {
            return { signal: externalSignal, cleanup: () => {} };
        }

        // Create new controller for this task
        const controller = new AbortController();

        return { signal: controller.signal, cleanup: () => {} };
    }

    /**
     * Combine multiple abort signals
     * @param {Array<AbortSignal>} signals - Signals to combine
     * @returns {Object} Combined signal with cleanup function
     */
    combineAbortSignals(signals) {
        if (signals.length === 0) {
            const controller = new AbortController();

            return { signal: controller.signal, cleanup: () => {} };
        }

        if (signals.length === 1) {
            return { signal: signals[0], cleanup: () => {} };
        }

        const controller = new AbortController();
        const cleanupFunctions = [];

        const abort = () => {
            if (!controller.signal.aborted) {
                try {
                    controller.abort();
                } catch (error) {
                    // Ignore abort errors - the signal is already aborted
                }
            }
        };

        for (const signal of signals) {
            if (signal.aborted) {
                abort();
                break;
            }

            const cleanup = () => signal.removeEventListener('abort', abort);

            signal.addEventListener('abort', abort, { once: true });
            cleanupFunctions.push(cleanup);
        }

        return {
            signal: controller.signal,
            cleanup: () => cleanupFunctions.forEach(cleanup => cleanup())
        };
    }

    /**
     * Check if shutdown is aborted
     * @returns {boolean} True if shutdown is aborted
     */
    isShutdownAborted() {
        return this._shutdownController.signal.aborted;
    }

    /**
     * Abort shutdown signal
     * @param {string} reason - Abort reason
     */
    abortShutdown(reason) {
        if (!this._shutdownController.signal.aborted) {
            this._shutdownController.abort(reason);
        }
    }

    /**
     * Recreate shutdown controller
     */
    recreateShutdownController() {
        this._shutdownController = new AbortController();
    }

    /**
     * Get shutdown signal
     * @returns {AbortSignal} Shutdown signal
     */
    getShutdownSignal() {
        return this._shutdownController.signal;
    }

    // ===== PRIORITY MANAGEMENT =====

    /**
     * Get priority levels
     * @returns {Object} Priority levels mapping
     */
    getPriorityLevels() {
        return this._priorityLevels;
    }

    /**
     * Get priority value for a given priority
     * @param {string|number} priority - Priority ('high', 'normal', 'low' or numeric)
     * @returns {number} Priority value
     */
    getPriorityValue(priority) {
        if (typeof priority === 'number') {
            return priority;
        }

        if (typeof priority === 'string') {
            const level = this._priorityLevels[priority.toLowerCase()];

            if (level !== undefined) {
                return level;
            }
        }

        return this._priorityLevels.normal; // Default to normal priority
    }

    /**
     * Convert priority to p-queue format
     * @param {string|number} priority - Priority value
     * @returns {number} p-queue priority (higher number = higher priority in p-queue)
     */
    toPQueuePriority(priority) {
        // If priority is already a negative number (p-queue format), return it as-is
        if (typeof priority === 'number' && priority < 0) {
            return priority;
        }

        const value = this.getPriorityValue(priority);

        // p-queue uses higher numbers for higher priority
        // Our API uses lower numbers for higher priority
        // So we invert the value
        return Number.isFinite(value) ? -value : 0;
    }

    /**
     * Get priority name from value
     * @param {number} value - Priority value
     * @returns {string} Priority name
     */
    getPriorityName(value) {
        for (const [name, val] of Object.entries(this._priorityLevels)) {
            if (val === value) {
                return name;
            }
        }

        return 'normal';
    }

    // ===== UTILITY METHODS =====

    /**
     * Get all active task IDs
     * @returns {Array<string>} Active task IDs
     */
    getActiveTaskIds() {
        return Array.from(this._activeTasks.keys());
    }

    /**
     * Get lifecycle entry for a request ID
     * @param {string} requestId - Request ID
     * @returns {Object|null} Lifecycle entry or null
     */
    getLifecycleEntry(requestId) {
        return this._activeTasks.get(requestId) || null;
    }

    /**
     * Get statistics about active tasks
     * @returns {Object} Task statistics
     */
    getTaskStatistics() {
        const activeCount = this._activeTasks.size;
        const startedCount = Array.from(this._activeTasks.values())
            .filter(entry => entry.started).length;
        const pendingCount = activeCount - startedCount;

        return {
            total: activeCount,
            started: startedCount,
            pending: pendingCount
        };
    }
}

// Export priority aliases for documentation consistency
export const PRIORITY_ALIASES = Object.freeze({
    high: 1,
    normal: 5,
    low: 10
});

export default QueueLifecycle;
