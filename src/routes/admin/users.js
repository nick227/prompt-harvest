/**
 * Admin Users Routes
 * User management functionality
 */

import express from 'express';
import { requireAdmin, logAdminActionMiddleware } from '../../middleware/AdminAuthMiddleware.js';
import UsersController from '../../controllers/admin/UsersController.js';

const router = express.Router();

// User management routes
router.get('/users',
    requireAdmin,
    UsersController.getUsers
);

router.get('/users/:userId',
    requireAdmin,
    UsersController.getUserDetails
);

router.post('/users/:userId/credits',
    requireAdmin,
    logAdminActionMiddleware('add_credits'),
    UsersController.addCredits
);

router.post('/users/:userId/suspend',
    requireAdmin,
    logAdminActionMiddleware('suspend_user'),
    UsersController.suspendUser
);

router.post('/users/:userId/unsuspend',
    requireAdmin,
    logAdminActionMiddleware('unsuspend_user'),
    UsersController.unsuspendUser
);

router.get('/users/:userId/activity',
    requireAdmin,
    UsersController.getUserActivity
);

router.post('/users/bulk',
    requireAdmin,
    logAdminActionMiddleware('bulk_update_users'),
    UsersController.bulkUpdate
);

router.get('/users/export',
    requireAdmin,
    UsersController.exportUsers
);

export default router;
