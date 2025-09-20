/**
 * SystemSettingsController
 *
 * Handles CRUD operations for system settings in the admin panel.
 * Provides endpoints for managing system-wide configuration.
 */

import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError } from '../../errors/CustomErrors.js';
import systemSettingsService from '../../services/SystemSettingsService.js';
import { validateRequired, validateString, validateNumber } from '../../utils/ValidationService.js';

// Simple boolean validation helper
const validateBoolean = (value, fieldName) => {
    if (typeof value !== 'boolean') {
        throw new ValidationError(`${fieldName} must be a boolean`);
    }
};

export class SystemSettingsController {
    /**
     * Get all system settings
     * GET /api/admin/system-settings
     */
    static getAll = asyncHandler(async (req, res) => {
        try {
            const settings = await systemSettingsService.getAll();

            res.json({
                success: true,
                data: settings,
                count: settings.length
            });
        } catch (error) {
            console.error('❌ SYSTEM-SETTINGS-CONTROLLER: Error getting all settings:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve system settings'
            });
        }
    });

    /**
     * Get a specific system setting by key
     * GET /api/admin/system-settings/:key
     */
    static getByKey = asyncHandler(async (req, res) => {
        try {
            const { key } = req.params;
            validateRequired(key, 'Setting key');

            const value = await systemSettingsService.get(key);

            if (value === null) {
                return res.status(404).json({
                    success: false,
                    error: `Setting "${key}" not found`
                });
            }

            res.json({
                success: true,
                data: {
                    key,
                    value
                }
            });
        } catch (error) {
            console.error('❌ SYSTEM-SETTINGS-CONTROLLER: Error getting setting:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to retrieve system setting'
            });
        }
    });

    /**
     * Create or update a system setting
     * POST /api/admin/system-settings
     */
    static createOrUpdate = asyncHandler(async (req, res) => {
        try {
            const { key, value, description, dataType } = req.body;

            // Validation
            validateRequired(key, 'Setting key');
            validateRequired(value, 'Setting value');
            validateString(key, 'Setting key');

            // Validate data type
            const allowedTypes = ['string', 'number', 'boolean', 'json'];
            if (dataType && !allowedTypes.includes(dataType)) {
                throw new ValidationError(`Data type must be one of: ${allowedTypes.join(', ')}`);
            }

            // Type-specific validation
            const finalDataType = dataType || 'string';
            if (finalDataType === 'number') {
                validateNumber(value, 'Setting value');
            } else if (finalDataType === 'boolean' && typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
                throw new ValidationError('Boolean value must be true or false');
            }

            const setting = await systemSettingsService.set(
                key,
                value,
                description,
                finalDataType
            );

            res.json({
                success: true,
                data: setting,
                message: `Setting "${key}" updated successfully`
            });
        } catch (error) {
            console.error('❌ SYSTEM-SETTINGS-CONTROLLER: Error creating/updating setting:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Failed to create/update system setting'
            });
        }
    });

    /**
     * Delete a system setting
     * DELETE /api/admin/system-settings/:key
     */
    static delete = asyncHandler(async (req, res) => {
        try {
            const { key } = req.params;
            validateRequired(key, 'Setting key');

            const success = await systemSettingsService.delete(key);

            if (!success) {
                return res.status(404).json({
                    success: false,
                    error: `Setting "${key}" not found`
                });
            }

            res.json({
                success: true,
                message: `Setting "${key}" deleted successfully`
            });
        } catch (error) {
            console.error('❌ SYSTEM-SETTINGS-CONTROLLER: Error deleting setting:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to delete system setting'
            });
        }
    });

    /**
     * Initialize default system settings
     * POST /api/admin/system-settings/initialize
     */
    static initializeDefaults = asyncHandler(async (req, res) => {
        try {
            await systemSettingsService.initializeDefaults();

            res.json({
                success: true,
                message: 'Default system settings initialized successfully'
            });
        } catch (error) {
            console.error('❌ SYSTEM-SETTINGS-CONTROLLER: Error initializing defaults:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to initialize default system settings'
            });
        }
    });

    /**
     * Get system settings cache statistics
     * GET /api/admin/system-settings/cache-stats
     */
    static getCacheStats = asyncHandler(async (req, res) => {
        try {
            const stats = systemSettingsService.getCacheStats();

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('❌ SYSTEM-SETTINGS-CONTROLLER: Error getting cache stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve cache statistics'
            });
        }
    });

    /**
     * Clear system settings cache
     * POST /api/admin/system-settings/clear-cache
     */
    static clearCache = asyncHandler(async (req, res) => {
        try {
            systemSettingsService.clearCache();

            res.json({
                success: true,
                message: 'System settings cache cleared successfully'
            });
        } catch (error) {
            console.error('❌ SYSTEM-SETTINGS-CONTROLLER: Error clearing cache:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear system settings cache'
            });
        }
    });
}

export default SystemSettingsController;
