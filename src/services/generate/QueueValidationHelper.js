/**
 * Queue Validation Helper
 *
 * Provides validation utilities for queue system initialization
 */

export class QueueValidationHelper {
    /**
     * Validate that all expected managers were returned from initialization
     * @param {Object} managers - Manager bundle from initialization
     * @throws {Error} If any expected manager is missing
     */
    static validateManagerBundle(managers) {
        const expectedManagers = [
            'lifecycle', 'timeoutHandler', 'analytics', 'rateLimiterCleanup',
            'retryManager', 'initialization', 'operations', 'shutdown',
            'validation', 'taskManager', 'signalHandler', 'duplicateRequestHandler'
        ];

        for (const managerName of expectedManagers) {
            if (!managers[managerName]) {
                throw new Error(`QueueInitializationManager failed to return ${managerName}`);
            }
        }
    }
}
