/**
 * Admin API Queue Middleware
 * Lightweight middleware for API request queuing
 * Provides minimal supervision before requests hit the sophisticated image generation queue
 */

import { AdminApiQueueService } from '../services/AdminApiQueueService.js';

export class AdminApiQueueMiddleware {
    constructor() {
        this.queueService = new AdminApiQueueService();
    }

    /**
     * Queue API requests
     */
    static async queueRequest(req, res, next) {
        try {
            // Check if request should be queued
            if (this.shouldQueue(req)) {
                // Add to lightweight queue
                const result = await this.queueService.addRequest({
                    endpoint: req.path,
                    method: req.method,
                    body: req.body,
                    query: req.query
                }, req.apiUser, {
                    signal: req.signal // Support for request cancellation
                });

                // Return queued response
                return res.json({
                    success: true,
                    queued: true,
                    queuePosition: result.queuePosition,
                    requestId: result.requestId,
                    estimatedWaitTime: this.estimateWaitTime()
                });
            }

            // Process immediately if not queued
            next();
        } catch (error) {
            if (error.message === 'Rate limit exceeded') {
                return res.status(429).json({
                    success: false,
                    error: 'Rate limit exceeded',
                    retryAfter: 60
                });
            }

            if (error.message === 'API queue is full') {
                return res.status(503).json({
                    success: false,
                    error: 'Service temporarily unavailable',
                    retryAfter: 30
                });
            }

            throw error;
        }
    }

    /**
     * Determine if request should be queued
     */
    shouldQueue(req) {
        // Always queue image generation (long processing)
        if (req.path === '/api/admin/generate-image') {
            return true;
        }

        // Queue blog creation if queue is busy
        if (req.path === '/api/admin/create-blog-post') {
            const status = this.queueService.getStatus();

            return status.queue.size > 5;
        }

        // Never queue stats (fast response)
        if (req.path === '/api/admin/usage-stats') {
            return false;
        }

        return false;
    }

    /**
     * Estimate wait time
     */
    estimateWaitTime() {
        const status = this.queueService.getStatus();
        const avgProcessingTime = 5000; // 5 seconds average

        return status.queue.size * avgProcessingTime;
    }

    /**
     * Get queue status
     */
    static getQueueStatus() {
        return this.queueService.getStatus();
    }

    /**
     * Get queue health
     */
    static getQueueHealth() {
        return this.queueService.getHealthStatus();
    }
}
