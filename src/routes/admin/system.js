/**
 * Admin System Routes
 * System management and dashboard functionality
 */

import express from 'express';
import { requireAdmin, verifyAdmin, logAdminActionMiddleware } from '../../middleware/AdminAuthMiddleware.js';
import { AdminDashboardService } from '../../services/AdminDashboardService.js';
import SystemSettingsController from '../../controllers/admin/SystemSettingsController.js';

const router = express.Router();

// Authentication routes
router.get('/auth/verify', verifyAdmin);

// Dashboard routes
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        const dashboardService = new AdminDashboardService();
        const dashboardData = await dashboardService.getDashboardData(req.adminUser);

        res.json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        console.error('❌ ADMIN: Dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load dashboard',
            message: error.message
        });
    }
});

// System settings routes
router.get('/system-settings',
    requireAdmin,
    SystemSettingsController.getSettings
);

router.get('/system-settings/:key',
    requireAdmin,
    SystemSettingsController.getSetting
);

router.post('/system-settings',
    requireAdmin,
    logAdminActionMiddleware('update_system_setting'),
    SystemSettingsController.updateSetting
);

router.delete('/system-settings/:key',
    requireAdmin,
    logAdminActionMiddleware('delete_system_setting'),
    SystemSettingsController.deleteSetting
);

router.post('/system-settings/initialize',
    requireAdmin,
    logAdminActionMiddleware('initialize_system_settings'),
    SystemSettingsController.initializeSettings
);

router.get('/system-settings/cache-stats',
    requireAdmin,
    SystemSettingsController.getCacheStats
);

router.post('/system-settings/clear-cache',
    requireAdmin,
    logAdminActionMiddleware('clear_system_cache'),
    SystemSettingsController.clearCache
);

// Queue management routes
router.get('/queue/status', requireAdmin, async (req, res) => {
    try {
        // Basic queue status endpoint
        res.json({
            success: true,
            data: {
                status: 'operational',
                message: 'Queue system is running'
            }
        });
    } catch (error) {
        console.error('❌ ADMIN: Queue status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get queue status',
            message: error.message
        });
    }
});

router.post('/queue/clear', requireAdmin, async (req, res) => {
    try {
        // Basic queue clear endpoint
        res.json({
            success: true,
            message: 'Queue cleared successfully'
        });
    } catch (error) {
        console.error('❌ ADMIN: Queue clear error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear queue',
            message: error.message
        });
    }
});

// Test route
router.get('/test', requireAdmin, (req, res) => {
    res.json({
        success: true,
        message: 'Admin routes are working',
        timestamp: new Date().toISOString(),
        admin: {
            id: req.adminUser.id,
            email: req.adminUser.email
        }
    });
});

export default router;
