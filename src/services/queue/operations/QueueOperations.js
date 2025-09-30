/**
 * Queue Operations - Simple queue operation delegations
 *
 * Handles:
 * - Basic queue operations (pause, resume, clear, etc.)
 * - Configuration access
 * - Status checks
 * - Duplicate request ID policy management
 */

import { ValidationError } from '../errors/QueueErrors.js';

export class QueueOperations {
    constructor(queueCore, lifecycle, initialization) {
        this.queueCore = queueCore;
        this.lifecycle = lifecycle;
        this.initialization = initialization;
        this._duplicateRequestIdPolicy = 'cancelPrevious';
        this._acceptingNewTasks = true;
    }

    /**
     * Clear entire queue
     * @returns {number} Number of cleared requests
     */
    clearQueue() {
        // Clear lifecycle tracking for dropped tasks
        this.lifecycle.clear();

        return this.queueCore.clear();
    }

    /**
     * Check if queue needs attention
     * @returns {boolean} True if attention needed
     */
    needsAttention() {
        return this.queueCore?.needsAttention() ?? false;
    }

    /**
     * Get recommended actions
     * @returns {Array} Recommended actions
     */
    getRecommendedActions() {
        return this.queueCore?.getRecommendedActions() ?? [];
    }

    /**
     * Pause queue processing
     */
    pause() {
        this.queueCore.pause();
    }

    /**
     * Resume queue processing
     */
    resume() {
        this.queueCore.resume();
    }

    /**
     * Check if queue is paused
     * @returns {boolean} True if paused
     */
    isPaused() {
        return this.queueCore.isPaused();
    }

    /**
     * Get queue configuration
     * @returns {Object} Queue configuration
     */
    getConfig() {
        return this.queueCore.getConfig();
    }

    /**
     * Check if queue is properly initialized
     * @returns {boolean}
     */
    isReady() {
        return this.initialization.isReady();
    }

    /**
     * Get initialization state
     * @returns {Object}
     */
    getInitState() {

        return this.initialization.getInitState();
    }

    /**
     * Check if queue is accepting new tasks
     * @returns {boolean} True if accepting new tasks
     */
    isAcceptingTasks() {
        return this._acceptingNewTasks ?? true;
    }

    /**
     * Set the duplicate request ID policy at runtime
     * @param {string} policy - Policy to use ('rejectNew', 'cancelPrevious', 'allow')
     */
    setDuplicateRequestIdPolicy(policy) {
        if (!['rejectNew', 'cancelPrevious', 'allow'].includes(policy)) {
            throw new ValidationError(`Invalid duplicateRequestIdPolicy: ${policy}. Must be one of: rejectNew, cancelPrevious, allow`);
        }
        this._duplicateRequestIdPolicy = policy;
    }

    /**
     * Get the current duplicate request ID policy
     * @returns {string} Current policy
     */
    getDuplicateRequestIdPolicy() {
        return this._duplicateRequestIdPolicy;
    }

    /**
     * Set whether queue accepts new tasks (useful for maintenance)
     * @param {boolean} accepting - Whether to accept new tasks
     */
    setAcceptingTasks(accepting) {
        this._acceptingNewTasks = accepting;
    }

    /**
     * Convenience method to stop accepting new tasks (maintenance mode)
     */
    stopAcceptingTasks() {
        this.setAcceptingTasks(false);
    }

    /**
     * Convenience method to resume accepting new tasks
     * Note: After graceful shutdown, this recreates the shutdown controller for new tasks
     */
    resumeAcceptingTasks() {
        this.setAcceptingTasks(true);
    }

    /**
     * Handle duplicate request IDs based on policy
     * @param {Object} opts - Options object to modify
     */
    handleDuplicateRequestIds(opts) {
        // This method is called by QueueDuplicateRequestHandler
        // The actual duplicate handling logic should be implemented here
        // For now, we'll just pass through the options without modification
        // TODO: Implement proper duplicate request ID handling based on policy
        console.log('🔍 QUEUE OPERATIONS: handleDuplicateRequestIds called with policy:', this._duplicateRequestIdPolicy);

        // The actual implementation would depend on the specific requirements
        // for handling duplicate request IDs (cancel previous, reject new, allow, etc.)
        return opts;
    }
}
