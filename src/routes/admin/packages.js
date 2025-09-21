/**
 * Admin Packages Routes
 * Package management functionality
 */

import express from 'express';
import { requireAdmin, logAdminActionMiddleware } from '../../middleware/AdminAuthMiddleware.js';
import PackageController from '../../controllers/admin/PackageController.js';

const router = express.Router();

// Package management routes
router.get('/packages',
    requireAdmin,
    PackageController.getPackages
);

router.post('/packages',
    requireAdmin,
    logAdminActionMiddleware('create_package'),
    PackageController.createPackage
);

router.put('/packages/:packageId',
    requireAdmin,
    logAdminActionMiddleware('update_package'),
    PackageController.updatePackage
);

router.delete('/packages/:packageId',
    requireAdmin,
    logAdminActionMiddleware('delete_package'),
    PackageController.deletePackage
);

router.get('/packages/analytics',
    requireAdmin,
    PackageController.getPackageAnalytics
);

export default router;
