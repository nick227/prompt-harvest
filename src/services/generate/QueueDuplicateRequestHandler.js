/**
 * Queue Duplicate Request Handler
 *
 * Handles duplicate request ID policies and cleanup
 */

export class QueueDuplicateRequestHandler {
    constructor(operations) {
        this._operations = operations;
    }

    /**
     * Handle duplicate request IDs based on policy
     * @param {Object} opts - Options object to modify
     */
    handleDuplicateRequestIds(opts) {
        this._operations.handleDuplicateRequestIds(opts);
    }
}
