import { systemMonitor } from '../monitoring/SystemMonitor.js';
import { validateAuthentication } from '../middleware/enhancedValidation.js';

// eslint-disable-next-line max-lines-per-function
export const setupMonitoringRoutes = app => {
    // System health check (public)
    app.get('/api/health', async (req, res) => {
        try {
            const health = await systemMonitor.checkSystemHealth();

            res.json({
                success: true,
                data: health,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // Detailed system metrics (admin only)
    app.get('/api/monitoring/metrics', validateAuthentication, (req, res) => {
        // Check if user is admin
        if (!req.userInfo?.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'ACCESS_DENIED',
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
        }

        try {
            const metrics = systemMonitor.getMetrics();

            res.json({
                success: true,
                data: metrics,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // System alerts (admin only)
    app.get('/api/monitoring/alerts', validateAuthentication, (req, res) => {
        // Check if user is admin
        if (!req.userInfo?.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'ACCESS_DENIED',
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
        }

        try {
            const alerts = systemMonitor.getAlerts();

            res.json({
                success: true,
                data: alerts,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // Acknowledge alert (admin only)
    app.post('/api/monitoring/alerts/:alertId/acknowledge', validateAuthentication, (req, res) => {
        // Check if user is admin
        if (!req.userInfo?.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'ACCESS_DENIED',
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
        }

        try {
            const { alertId } = req.params;

            systemMonitor.acknowledgeAlert(alertId);

            res.json({
                success: true,
                message: 'Alert acknowledged',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // File system information (admin only)
    app.get('/api/monitoring/filesystem', validateAuthentication, async (req, res) => {
        // Check if user is admin
        if (!req.userInfo?.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'ACCESS_DENIED',
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
        }

        try {
            const { fileSystemManager } = await import('../utils/FileSystemManager.js');

            const diskUsage = fileSystemManager.getDiskUsage();
            const recentImages = await fileSystemManager.listImages(20);

            res.json({
                success: true,
                data: {
                    diskUsage,
                    recentImages,
                    uploadDirectory: fileSystemManager.uploadDir
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // Cleanup orphaned files (admin only)
    app.post('/api/monitoring/filesystem/cleanup', validateAuthentication, async (req, res) => {
        // Check if user is admin
        if (!req.userInfo?.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'ACCESS_DENIED',
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
        }

        try {
            const { fileSystemManager } = await import('../utils/FileSystemManager.js');
            const { databaseClient } = await import('../database/PrismaClient.js');

            // Get all valid image IDs from database
            const prisma = databaseClient.getClient();
            const validImages = await prisma.image.findMany({
                select: { id: true }
            });
            const validImageIds = validImages.map(img => img.id);

            // Cleanup orphaned files
            const cleanedCount = await fileSystemManager.cleanupOrphanedFiles(validImageIds);

            res.json({
                success: true,
                data: {
                    cleanedCount,
                    message: `Cleaned up ${cleanedCount} orphaned files`
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // Start/stop monitoring (admin only)
    app.post('/api/monitoring/:action', validateAuthentication, (req, res) => {
        // Check if user is admin
        if (!req.userInfo?.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'ACCESS_DENIED',
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
        }

        try {
            const { action } = req.params;

            if (action === 'start') {
                systemMonitor.start();
                res.json({
                    success: true,
                    message: 'System monitoring started',
                    timestamp: new Date().toISOString()
                });
            } else if (action === 'stop') {
                systemMonitor.stop();
                res.json({
                    success: true,
                    message: 'System monitoring stopped',
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: 'INVALID_ACTION',
                    message: 'Action must be "start" or "stop"',
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // eslint-disable-next-line no-console
    console.log('✅ Monitoring routes configured');
};
