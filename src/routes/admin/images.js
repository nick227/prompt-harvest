/**
 * Admin Images Routes
 * Image management functionality
 */

import express from 'express';
import { requireAdmin, logAdminActionMiddleware } from '../../middleware/AdminAuthMiddleware.js';
import ImagesController from '../../controllers/admin/ImagesController.js';

const router = express.Router();

// Image management routes
router.get('/images',
    requireAdmin,
    ImagesController.getImages
);

router.get('/images/:imageId',
    requireAdmin,
    ImagesController.getImageDetails
);

router.delete('/images/:imageId',
    requireAdmin,
    logAdminActionMiddleware('delete_image'),
    ImagesController.deleteImage
);

router.post('/images/:imageId/moderate',
    requireAdmin,
    logAdminActionMiddleware('moderate_image'),
    ImagesController.moderateImage
);

router.get('/images/export',
    requireAdmin,
    ImagesController.exportImages
);

router.post('/images/:imageId/toggle-visibility',
    requireAdmin,
    logAdminActionMiddleware('toggle_image_visibility'),
    ImagesController.toggleVisibility
);

router.post('/images/:imageId/admin-hide',
    requireAdmin,
    logAdminActionMiddleware('admin_hide_image'),
    ImagesController.adminHideImage
);

router.post('/images/:imageId/admin-show',
    requireAdmin,
    logAdminActionMiddleware('admin_show_image'),
    ImagesController.adminShowImage
);

router.post('/images/:imageId/generate-tags',
    requireAdmin,
    logAdminActionMiddleware('generate_image_tags'),
    ImagesController.generateTags
);

router.post('/images/:imageId/update-tags',
    requireAdmin,
    logAdminActionMiddleware('update_image_tags'),
    ImagesController.updateTags
);

export default router;
