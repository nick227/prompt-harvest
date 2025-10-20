/**
 * Queue Rate Limiter Cleanup Handler
 *
 * Handles rate limiter cleanup operations for the queue system.
 * Robust and idempotent - safe to call start/restart/clear multiple times.
 */

export class QueueRateLimiterCleanup {
    constructor(analytics, epochNow = Date.now) {
        this._analytics = analytics;
        this._epochNow = epochNow;
        this._cleanupId = null;
    }

    /**
     * Start rate limiter cleanup (idempotent)
     * @returns {boolean} True if cleanup was started, false if already running
     */
    start() {
        // Check if already running via explicit handle
        if (this._cleanupId) {
            return false; // Already running
        }

        // Check if running via analytics probe (fallback)
        const isCleanupRunning = this._analytics?.isRateLimiterCleanupRunning?.() ?? false;

        if (isCleanupRunning) {
            return false; // Already running
        }

        // Start cleanup
        this._cleanupId = this._analytics.startRateLimiterCleanup();

        // Emit metric for ops visibility
        this._analytics?.recordMetrics({
            action: 'rate_limiter_cleanup_started',
            timestamp: this._epochNow()
        });

        return true;
    }

    /**
     * Stop rate limiter cleanup (idempotent)
     * @returns {boolean} True if cleanup was stopped, false if not running
     */
    stop() {
        if (!this._cleanupId) {
            return false; // Not running
        }

        clearInterval(this._cleanupId);
        this._cleanupId = null;

        // Emit metric for ops visibility
        this._analytics?.recordMetrics({
            action: 'rate_limiter_cleanup_stopped',
            timestamp: this._epochNow()
        });

        return true;
    }

    /**
     * Restart rate limiter cleanup (idempotent)
     * Centralizes the restart logic for consistent behavior
     * @returns {boolean} True if cleanup was restarted, false if already running
     */
    restart() {
        // Early return if already running to avoid unnecessary work
        if (this.isRunning()) {
            // Record noop metric for incident postmortems
            this._analytics?.recordMetrics({
                action: 'rate_limiter_cleanup_restart_noop',
                timestamp: this._epochNow()
            });

            return false;
        }

        // Stop if running (belt and suspenders)
        this.stop();

        // Start fresh
        const started = this.start();

        if (started) {
            // Emit metric for ops visibility
            this._analytics?.recordMetrics({
                action: 'rate_limiter_cleanup_restarted',
                timestamp: this._epochNow()
            });
        }

        return started;
    }

    /**
     * Check if cleanup is running
     * @returns {boolean} True if cleanup is running
     */
    isRunning() {
        // Check explicit handle first
        if (this._cleanupId) {
            return true;
        }

        // Fallback to analytics probe
        return this._analytics?.isRateLimiterCleanupRunning?.() ?? false;
    }

    /**
     * Clear cleanup handle (for shutdown scenarios)
     * Idempotent - safe to call multiple times
     */
    clear() {
        this._cleanupId = null;
    }
}
