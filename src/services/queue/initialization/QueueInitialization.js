/**
 * Queue Initialization and Circuit Breaker
 *
 * Handles initialization logic, retry mechanisms, and circuit breaker patterns
 */

import { InitializationError } from '../errors/QueueErrors.js';
import systemSettingsService from '../../SystemSettingsService.js';

export class QueueInitialization {
    constructor(queueService) {
        this.queueService = queueService;

        // Initialization state management
        this._initState = {
            isInitialized: false,
            isInitializing: false,
            lastError: null,
            lastInitTime: null
        };

        // Retry configuration
        this._retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000
        };

        // Circuit breaker for init retry to prevent spam under persistent failures
        this._initCircuitBreaker = {
            isOpen: false,
            lastFailureTime: null,
            backoffMs: 30000 // 30 seconds
        };
    }

    /**
     * Initialize with retry logic to prevent dead-end failures
     * @returns {Promise<void>}
     */
    async initializeWithRetry() {
        const maxRetries = 3;
        let lastError;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                await this.initializeWithSettings();

                return; // Success
            } catch (error) {
                lastError = error;

                // Don't retry on last attempt
                if (attempt === maxRetries - 1) {
                    break;
                }

                // Exponential backoff with jitter: 1s, 2s, 4s
                const baseDelay = Math.pow(2, attempt) * 1000;
                const jitter = Math.random() * baseDelay * 0.1; // 10% jitter
                const delay = baseDelay + jitter;

                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        // All retries failed - open circuit breaker
        this._openInitCircuitBreaker();
        throw lastError;
    }

    /**
     * Initialize queue with dynamic settings from database
     * @returns {Promise<void>}
     */
    async initializeWithSettings() {
        if (this._initState.isInitializing) {
            return this._readyPromise;
        }

        this._initState.isInitializing = true;
        this._initState.lastInitTime = new Date();

        try {
            const concurrency = await systemSettingsService.get('queue_max_concurrent_requests', 2);

            // Coerce and validate concurrency value
            const coercedConcurrency = this._coerceConcurrency(concurrency);
            const validatedConcurrency = this._validateConcurrency(coercedConcurrency);

            // Update queue service concurrency only if different
            if (this.queueService.queue.concurrency !== validatedConcurrency) {
                this.queueService.queue.concurrency = validatedConcurrency;
            }

            this._initState.isInitialized = true;
            this._initState.lastError = null;
        } catch (error) {
            this._initState.lastError = error;
            // Don't mark as initialized on error - let it be retried
            throw error;
        } finally {
            this._initState.isInitializing = false;
        }
    }

    /**
     * Update queue concurrency dynamically
     * @param {number} concurrency - New concurrency value
     * @returns {Promise<Object>} Update result
     */
    async updateConcurrency(concurrency) {
        // Coerce and validate input
        const coercedConcurrency = this._coerceConcurrency(concurrency);
        const validatedConcurrency = this._validateConcurrency(coercedConcurrency);

        // Check if concurrency is actually changing
        if (this.queueService.queue.concurrency === validatedConcurrency) {
            return { success: true, concurrency: validatedConcurrency, message: 'Concurrency unchanged' };
        }

        // Store previous values for rollback
        const previousConcurrency = this.queueService.queue.concurrency;

        try {
            // Update queue service concurrency
            this.queueService.queue.concurrency = validatedConcurrency;

            // Update system settings
            await systemSettingsService.set(
                'queue_max_concurrent_requests',
                validatedConcurrency,
                'Maximum number of concurrent image generation requests processed by the queue',
                'number'
            );

            return { success: true, concurrency: validatedConcurrency };
        } catch (error) {
            // Revert to previous values on failure
            this.queueService.queue.concurrency = previousConcurrency;

            // Log the error but don't throw to avoid double logging
            console.error('Failed to update queue concurrency:', error.message);
            throw error;
        }
    }

    /**
     * Check if queue is properly initialized
     * @returns {boolean}
     */
    isReady() {
        return this._initState.isInitialized && !this._initState.lastError;
    }

    /**
     * Wait for queue to be ready (propagates typed errors)
     * @returns {Promise<void>}
     */
    async ready() {
        try {
            await this._readyPromise;
        } catch (error) {
            // Propagate InitializationError for clean HTTP mapping
            if (error.name === 'InitializationError') {
                throw error;
            }
            // Wrap other errors as InitializationError
            throw new InitializationError(`Queue initialization failed: ${error.message}`);
        }
    }

    /**
     * Get initialization state
     * @returns {Object}
     */
    getInitState() {
        return { ...this._initState };
    }

    /**
     * Check if re-initialization can be attempted (circuit breaker)
     * @returns {boolean}
     */
    canAttemptReinit() {
        const breaker = this._initCircuitBreaker;

        if (!breaker.isOpen) {
            return true;
        }

        // Check if backoff period has expired
        const now = Date.now();

        if (breaker.lastFailureTime && (now - breaker.lastFailureTime) > breaker.backoffMs) {
            breaker.isOpen = false;
            breaker.lastFailureTime = null;

            return true;
        }

        return false;
    }

    /**
     * Coerce concurrency value to number
     * @param {any} concurrency - Concurrency value to coerce
     * @returns {number} Coerced concurrency value
     * @private
     */
    _coerceConcurrency(concurrency) {
        if (concurrency === null || concurrency === undefined) {
            return 2; // Default fallback
        }

        const coerced = Number(concurrency);

        return Number.isNaN(coerced) ? 2 : coerced; // Default fallback for NaN
    }

    /**
     * Validate concurrency value
     * @param {number} concurrency - Concurrency value to validate
     * @returns {number} Validated concurrency value
     * @private
     */
    _validateConcurrency(concurrency) {
        if (typeof concurrency !== 'number' || !Number.isInteger(concurrency)) {
            throw new Error('Concurrency must be an integer');
        }

        if (concurrency < 1 || concurrency > 10) {
            throw new Error('Concurrency must be between 1 and 10');
        }

        return concurrency;
    }

    /**
     * Open the initialization circuit breaker
     * @private
     */
    _openInitCircuitBreaker() {
        this._initCircuitBreaker.isOpen = true;
        this._initCircuitBreaker.lastFailureTime = Date.now();
    }
}
