/**
 * Admin API Queue Service
 * Lightweight request queue for admin API endpoints
 * Provides minimal supervision before requests hit the sophisticated image generation queue
 */

export class AdminApiQueueService {
    constructor(options = {}) {
        // Simple configuration
        this.config = {
            maxConcurrent: options.maxConcurrent || 5,
            maxQueueSize: options.maxQueueSize || 20,
            requestsPerMinute: options.requestsPerMinute || 50,
            apiTimeout: options.apiTimeout || 30000,
            queueTimeout: options.queueTimeout || 60000,
            maxRetries: options.maxRetries || 1,
            retryDelay: options.retryDelay || 2000,
            ...options
        };

        // Simple in-memory queue
        this.queue = [];
        this.active = 0;

        // Simple rate limiting per user
        this.userRequests = new Map();

        // Basic metrics
        this.metrics = {
            totalRequests: 0,
            queuedRequests: 0,
            activeRequests: 0,
            completedRequests: 0,
            failedRequests: 0,
            startTime: Date.now()
        };

        // Clean up rate limiter every minute
        setInterval(() => this.cleanupRateLimiter(), 60000);
    }

    /**
     * Add API request to lightweight queue
     */
    async addRequest(requestData, user, options = {}) {
        // Check rate limit
        if (!this.checkRateLimit(user.id)) {
            throw new Error('Rate limit exceeded');
        }

        // Check queue capacity
        if (this.queue.length >= this.config.maxQueueSize) {
            throw new Error('API queue is full');
        }

        // Add to simple queue
        const request = {
            requestData,
            user,
            timestamp: Date.now(),
            id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            options
        };

        this.queue.push(request);
        this.metrics.totalRequests++;
        this.metrics.queuedRequests++;

        // Process if under concurrency limit
        if (this.active < this.config.maxConcurrent) {
            this.processNext();
        }

        return {
            queued: true,
            queuePosition: this.queue.length,
            requestId: request.id
        };
    }

    /**
     * Process next request in queue
     */
    async processNext() {
        if (this.queue.length === 0 || this.active >= this.config.maxConcurrent) {
            return;
        }

        const request = this.queue.shift();

        this.active++;
        this.metrics.queuedRequests--;
        this.metrics.activeRequests++;

        try {
            // Route to appropriate handler
            const result = await this.routeRequest(request);

            this.metrics.completedRequests++;

            return result;
        } catch (error) {
            this.metrics.failedRequests++;
            throw error;
        } finally {
            this.active--;
            this.metrics.activeRequests--;

            // Process next if queue has items
            if (this.queue.length > 0) {
                this.processNext();
            }
        }
    }

    /**
     * Route request to appropriate handler
     */
    async routeRequest(request) {
        const { requestData, user } = request;

        switch (requestData.endpoint) {
            case '/api/admin/generate-image':
                return this.handleImageGeneration(requestData, user);
            case '/api/admin/create-blog-post':
                return this.handleBlogCreation(requestData, user);
            case '/api/admin/usage-stats':
                return this.handleUsageStats(requestData, user);
            default:
                throw new Error('Unknown endpoint');
        }
    }

    /**
     * Handle image generation (passes to existing sophisticated queue)
     */
    async handleImageGeneration(requestData, user) {
        // This is where we'd call the existing EnhancedImageService
        // which internally uses the sophisticated image generation queue
        // For now, return a simple response indicating it's been queued
        return {
            success: true,
            data: {
                message: 'Image generation queued for processing',
                requestId: requestData.id,
                estimatedProcessingTime: '2-5 minutes'
            }
        };
    }

    /**
     * Handle blog creation
     */
    async handleBlogCreation(requestData, user) {
        // This would integrate with the existing BlogService
        // For now, return a simple response
        return {
            success: true,
            data: {
                message: 'Blog post created successfully',
                requestId: requestData.id,
                title: requestData.body.title
            }
        };
    }

    /**
     * Handle usage stats
     */
    async handleUsageStats(requestData, user) {
        // This would integrate with the existing database
        // For now, return simple stats
        return {
            success: true,
            data: {
                message: 'Usage stats retrieved',
                requestId: requestData.id,
                stats: this.getStatus()
            }
        };
    }

    /**
     * Simple rate limiting
     */
    checkRateLimit(userId) {
        const now = Date.now();
        const userRequests = this.userRequests.get(userId) || [];

        // Remove requests older than 1 minute
        const recentRequests = userRequests.filter(time => now - time < 60000);

        if (recentRequests.length >= this.config.requestsPerMinute) {
            return false;
        }

        recentRequests.push(now);
        this.userRequests.set(userId, recentRequests);

        return true;
    }

    /**
     * Clean up rate limiter
     */
    cleanupRateLimiter() {
        const now = Date.now();

        for (const [userId, requests] of this.userRequests.entries()) {
            if (now - requests[requests.length - 1] > 300000) { // 5 minutes
                this.userRequests.delete(userId);
            }
        }
    }

    /**
     * Get simple queue status
     */
    getStatus() {
        return {
            queue: {
                size: this.queue.length,
                active: this.active,
                maxConcurrent: this.config.maxConcurrent,
                maxQueueSize: this.config.maxQueueSize
            },
            metrics: this.metrics,
            health: this.getHealthStatus()
        };
    }

    /**
     * Simple health check
     */
    getHealthStatus() {
        if (this.queue.length > 15) {
            return { status: 'warning', message: 'Queue is getting busy' };
        }

        if (this.queue.length > 18) {
            return { status: 'critical', message: 'Queue is overloaded' };
        }

        return { status: 'healthy', message: 'Queue is normal' };
    }
}
