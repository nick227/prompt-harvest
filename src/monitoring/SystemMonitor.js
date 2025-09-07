import { circuitBreakerManager } from '../utils/CircuitBreaker.js';
import { fileSystemManager } from '../utils/FileSystemManager.js';
import databaseClient from '../database/PrismaClient.js';

export class SystemMonitor {
    constructor() {
        this.metrics = {
            startTime: Date.now(),
            requests: {
                total: 0,
                successful: 0,
                failed: 0,
                byEndpoint: new Map()
            },
            performance: {
                averageResponseTime: 0,
                responseTimes: []
            },
            errors: {
                byType: new Map(),
                recent: []
            },
            resources: {
                memory: {},
                disk: {},
                database: {}
            }
        };

        this.alerts = [];
        this.isMonitoring = false;
    }

    start() {
        this.isMonitoring = true;
        this.scheduleHealthChecks();
        console.log('🔍 System monitoring started');
    }

    stop() {
        this.isMonitoring = false;
        console.log('🔍 System monitoring stopped');
    }

    recordRequest(endpoint, duration, success, error = null) {
        this.metrics.requests.total++;

        if (success) {
            this.metrics.requests.successful++;
        } else {
            this.metrics.requests.failed++;
            this.recordError(error);
        }

        // Record by endpoint
        if (!this.metrics.requests.byEndpoint.has(endpoint)) {
            this.metrics.requests.byEndpoint.set(endpoint, {
                total: 0,
                successful: 0,
                failed: 0,
                averageResponseTime: 0
            });
        }

        const endpointStats = this.metrics.requests.byEndpoint.get(endpoint);

        endpointStats.total++;
        if (success) {
            endpointStats.successful++;
        } else {
            endpointStats.failed++;
        }

        // Update response time metrics
        this.updateResponseTimeMetrics(duration);
        endpointStats.averageResponseTime = this.calculateAverageResponseTime(endpointStats);
    }

    recordError(error) {
        const errorType = error?.name || 'Unknown';

        if (!this.metrics.errors.byType.has(errorType)) {
            this.metrics.errors.byType.set(errorType, 0);
        }

        this.metrics.errors.byType.set(
            errorType,
            this.metrics.errors.byType.get(errorType) + 1
        );

        // Keep recent errors (last 100)
        this.metrics.errors.recent.push({
            type: errorType,
            message: error?.message || 'Unknown error',
            timestamp: Date.now(),
            stack: error?.stack
        });

        if (this.metrics.errors.recent.length > 100) {
            this.metrics.errors.recent.shift();
        }

        // Check for error thresholds
        this.checkErrorThresholds(errorType);
    }

    updateResponseTimeMetrics(duration) {
        this.metrics.performance.responseTimes.push(duration);

        // Keep only last 1000 response times
        if (this.metrics.performance.responseTimes.length > 1000) {
            this.metrics.performance.responseTimes.shift();
        }

        this.metrics.performance.averageResponseTime =
            this.metrics.performance.responseTimes.reduce((a, b) => a + b, 0) /
            this.metrics.performance.responseTimes.length;
    }

    calculateAverageResponseTime(_endpointStats) {
        // This would need to be implemented with actual response time tracking per endpoint
        return this.metrics.performance.averageResponseTime;
    }

    async checkSystemHealth() {
        const health = {
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.metrics.startTime,
            status: 'healthy',
            checks: {}
        };

        try {
            // Database health check
            health.checks.database = await this.checkDatabaseHealth();

            // File system health check
            health.checks.fileSystem = await this.checkFileSystemHealth();

            // Circuit breaker health check
            health.checks.circuitBreakers = this.checkCircuitBreakerHealth();

            // Memory health check
            health.checks.memory = this.checkMemoryHealth();

            // Overall status
            const failedChecks = Object.values(health.checks).filter(check => !check.healthy);

            if (failedChecks.length > 0) {
                health.status = 'degraded';
            }

            this.metrics.resources = health.checks;

        } catch (error) {
            health.status = 'unhealthy';
            health.error = error.message;
        }

        return health;
    }

    async checkDatabaseHealth() {
        try {
            const prisma = databaseClient.getClient();
            const startTime = Date.now();

            // Test database connection
            await prisma.$queryRaw`SELECT 1`;

            const responseTime = Date.now() - startTime;

            // Get some basic stats
            const imageCount = await prisma.image.count();
            const userCount = await prisma.user.count();

            return {
                healthy: true,
                responseTime,
                stats: {
                    images: imageCount,
                    users: userCount
                }
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }

    async checkFileSystemHealth() {
        try {
            const diskUsage = fileSystemManager.getDiskUsage();
            const imageList = await fileSystemManager.listImages(10); // Sample of recent images

            return {
                healthy: true,
                diskUsage,
                recentImages: imageList.length,
                uploadDirectory: fileSystemManager.uploadDir
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }

    checkCircuitBreakerHealth() {
        try {
            const circuitBreakers = circuitBreakerManager.getHealth();
            const openBreakers = Object.values(circuitBreakers).filter(cb => cb.state === 'OPEN');

            return {
                healthy: openBreakers.length === 0,
                totalBreakers: Object.keys(circuitBreakers).length,
                openBreakers: openBreakers.length,
                details: circuitBreakers
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }

    checkMemoryHealth() {
        try {
            const memUsage = process.memoryUsage();
            const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

            return {
                healthy: heapUsedPercent < 90, // Alert if > 90% heap usage
                heapUsed: this.formatBytes(memUsage.heapUsed),
                heapTotal: this.formatBytes(memUsage.heapTotal),
                heapUsedPercent: `${heapUsedPercent.toFixed(2)}%`,
                rss: this.formatBytes(memUsage.rss),
                external: this.formatBytes(memUsage.external)
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }

    checkErrorThresholds(errorType) {
        const errorCount = this.metrics.errors.byType.get(errorType) || 0;

        // Alert if more than 10 errors of the same type in the last hour
        if (errorCount > 10) {
            this.createAlert('ERROR_THRESHOLD', {
                errorType,
                count: errorCount,
                message: `High error rate for ${errorType}: ${errorCount} errors`
            });
        }
    }

    createAlert(type, data) {
        const alert = {
            id: Date.now().toString(),
            type,
            data,
            timestamp: new Date().toISOString(),
            acknowledged: false
        };

        this.alerts.push(alert);

        // Keep only last 100 alerts
        if (this.alerts.length > 100) {
            this.alerts.shift();
        }

        console.warn(`🚨 Alert: ${type}`, data);

        return alert;
    }

    getMetrics() {
        return {
            ...this.metrics,
            uptime: Date.now() - this.metrics.startTime,
            successRate: this.metrics.requests.total > 0
                ? `${(this.metrics.requests.successful / this.metrics.requests.total * 100).toFixed(2)}%`
                : '0%'
        };
    }

    getAlerts() {
        return this.alerts.filter(alert => !alert.acknowledged);
    }

    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);

        if (alert) {
            alert.acknowledged = true;
        }
    }

    scheduleHealthChecks() {
        if (!this.isMonitoring) {
            return;
        }

        // Run health check every 5 minutes (300 seconds) instead of 30 seconds
        setTimeout(async () => {
            try {
                const health = await this.checkSystemHealth();

                // Check for critical issues
                if (health.status === 'unhealthy') {
                    this.createAlert('SYSTEM_UNHEALTHY', {
                        status: health.status,
                        error: health.error
                    });
                }

                // Check for degraded performance
                if (this.metrics.performance.averageResponseTime > 5000) {
                    this.createAlert('HIGH_RESPONSE_TIME', {
                        averageResponseTime: this.metrics.performance.averageResponseTime
                    });
                }

            } catch (error) {
                console.error('❌ Health check failed:', error);
            }

            // Schedule next check
            this.scheduleHealthChecks();
        }, 300000); // 5 minutes instead of 30 seconds
    }

    formatBytes(bytes) {
        if (bytes === 0) {
            return '0 Bytes';
        }
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    // Cleanup old metrics
    cleanup() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);

        // Clean up old response times
        this.metrics.performance.responseTimes =
            this.metrics.performance.responseTimes.filter(time => time > oneHourAgo);

        // Clean up old alerts
        this.alerts = this.alerts.filter(alert => new Date(alert.timestamp).getTime() > oneHourAgo);

        // Clean up old errors
        this.metrics.errors.recent = this.metrics.errors.recent.filter(error => error.timestamp > oneHourAgo);
    }
}

// Global system monitor instance
export const systemMonitor = new SystemMonitor();
