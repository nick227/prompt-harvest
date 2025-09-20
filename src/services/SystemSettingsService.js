/**
 * SystemSettingsService
 *
 * Manages system-wide configuration settings stored in the database.
 * Provides CRUD operations for system settings with type conversion.
 */

import databaseClient from '../database/PrismaClient.js';

class SystemSettingsService {
    constructor() {
        this.prisma = databaseClient.getClient();
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get a system setting by key
     * @param {string} key - The setting key
     * @param {*} defaultValue - Default value if setting not found
     * @returns {Promise<*>} The setting value with proper type conversion
     */
    async get(key, defaultValue = null) {
        try {
            // Check cache first
            if (this.cache.has(key) && this.cacheExpiry.get(key) > Date.now()) {
                return this.cache.get(key);
            }

            const setting = await this.prisma.systemSettings.findUnique({
                where: {
                    key,
                    isActive: true
                }
            });

            if (!setting) {
                return defaultValue;
            }

            // Convert value based on data type
            const convertedValue = this.convertValue(setting.value, setting.dataType);

            // Cache the result
            this.cache.set(key, convertedValue);
            this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);

            return convertedValue;
        } catch (error) {
            console.error(`❌ SYSTEM-SETTINGS: Error getting setting "${key}":`, error);
            return defaultValue;
        }
    }

    /**
     * Set a system setting
     * @param {string} key - The setting key
     * @param {*} value - The setting value
     * @param {string} description - Description of the setting
     * @param {string} dataType - Data type (string, number, boolean, json)
     * @returns {Promise<Object>} The created/updated setting
     */
    async set(key, value, description = null, dataType = 'string') {
        try {
            const stringValue = this.convertToString(value, dataType);

            const setting = await this.prisma.systemSettings.upsert({
                where: { key },
                update: {
                    value: stringValue,
                    description,
                    dataType,
                    updatedAt: new Date()
                },
                create: {
                    key,
                    value: stringValue,
                    description,
                    dataType
                }
            });

            // Update cache
            this.cache.set(key, value);
            this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);

            console.log(`✅ SYSTEM-SETTINGS: Updated setting "${key}" = ${value}`);
            return setting;
        } catch (error) {
            console.error(`❌ SYSTEM-SETTINGS: Error setting "${key}":`, error);
            throw error;
        }
    }

    /**
     * Get all system settings
     * @returns {Promise<Array>} Array of all settings
     */
    async getAll() {
        try {
            const settings = await this.prisma.systemSettings.findMany({
                where: { isActive: true },
                orderBy: { key: 'asc' }
            });

            return settings.map(setting => ({
                ...setting,
                convertedValue: this.convertValue(setting.value, setting.dataType)
            }));
        } catch (error) {
            console.error('❌ SYSTEM-SETTINGS: Error getting all settings:', error);
            throw error;
        }
    }

    /**
     * Delete a system setting
     * @param {string} key - The setting key
     * @returns {Promise<boolean>} Success status
     */
    async delete(key) {
        try {
            await this.prisma.systemSettings.update({
                where: { key },
                data: { isActive: false }
            });

            // Remove from cache
            this.cache.delete(key);
            this.cacheExpiry.delete(key);

            console.log(`✅ SYSTEM-SETTINGS: Deleted setting "${key}"`);
            return true;
        } catch (error) {
            console.error(`❌ SYSTEM-SETTINGS: Error deleting setting "${key}":`, error);
            throw error;
        }
    }

    /**
     * Initialize default system settings
     * @returns {Promise<void>}
     */
    async initializeDefaults() {
        const defaultSettings = [
            {
                key: 'new_user_welcome_credits',
                value: '100',
                description: 'Number of free credits given to new users upon registration',
                dataType: 'number'
            },
            {
                key: 'max_image_generations_per_hour',
                value: '10',
                description: 'Maximum number of image generations allowed per user per hour',
                dataType: 'number'
            },
            {
                key: 'maintenance_mode',
                value: 'false',
                description: 'Enable maintenance mode to temporarily disable the service',
                dataType: 'boolean'
            },
            {
                key: 'default_image_provider',
                value: 'flux',
                description: 'Default image generation provider for new users',
                dataType: 'string'
            }
        ];

        for (const setting of defaultSettings) {
            try {
                await this.set(
                    setting.key,
                    setting.value,
                    setting.description,
                    setting.dataType
                );
            } catch (error) {
                console.error(`❌ SYSTEM-SETTINGS: Failed to initialize "${setting.key}":`, error);
            }
        }

        console.log('✅ SYSTEM-SETTINGS: Default settings initialized');
    }

    /**
     * Convert string value to appropriate type
     * @param {string} value - String value
     * @param {string} dataType - Data type
     * @returns {*} Converted value
     */
    convertValue(value, dataType) {
        switch (dataType) {
            case 'number':
                return parseInt(value, 10);
            case 'boolean':
                return value === 'true';
            case 'json':
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            default:
                return value;
        }
    }

    /**
     * Convert value to string for storage
     * @param {*} value - Value to convert
     * @param {string} dataType - Data type
     * @returns {string} String representation
     */
    convertToString(value, dataType) {
        switch (dataType) {
            case 'json':
                return JSON.stringify(value);
            default:
                return String(value);
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.cacheExpiry.clear();
        console.log('✅ SYSTEM-SETTINGS: Cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            ttl: this.CACHE_TTL
        };
    }
}

// Create singleton instance
const systemSettingsService = new SystemSettingsService();

export default systemSettingsService;
