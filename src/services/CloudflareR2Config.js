/**
 * CloudflareR2Config - Configuration Service
 * 
 * Handles configuration and validation for Cloudflare R2 storage.
 * Provides a clean interface for R2 settings and validation.
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class CloudflareR2Config {
    constructor() {
        this.config = this.loadConfig();
        // Don't validate in constructor - let isConfigured() handle it
    }

    /**
     * Load configuration from environment variables
     * @returns {Object} R2 configuration object
     */
    loadConfig() {
        return {
            accountId: process.env.R2_ACCOUNT_ID,
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
            bucketName: process.env.R2_BUCKET,
            publicUrl: process.env.R2_PUBLIC_BASE_URL,
            region: process.env.R2_REGION || 'auto',
            endpoint: process.env.R2_S3_ENDPOINT,
            forcePathStyle: process.env.R2_FORCE_PATH_STYLE === 'true',
            signedUrlTtl: parseInt(process.env.R2_SIGNED_URL_TTL_SECONDS) || 300
        };
    }

    /**
     * Validate that all required configuration is present
     * @throws {Error} If configuration is invalid
     */
    validateConfig() {
        const required = [
            'accountId',
            'accessKeyId', 
            'secretAccessKey',
            'bucketName',
            'publicUrl',
            'endpoint'
        ];

        const missing = required.filter(key => !this.config[key]);

        if (missing.length > 0) {
            throw new Error(`Missing required Cloudflare R2 configuration: ${missing.join(', ')}`);
        }

        // Validate URL format
        try {
            new URL(this.config.publicUrl);
        } catch (error) {
            throw new Error(`Invalid R2_PUBLIC_BASE_URL format: ${this.config.publicUrl}`);
        }

        console.log('✅ Cloudflare R2 configuration validated successfully');
    }

    /**
     * Get the complete configuration object
     * @returns {Object} R2 configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Get AWS SDK compatible configuration
     * @returns {Object} AWS SDK configuration
     */
    getAwsConfig() {
        return {
            region: this.config.region,
            endpoint: this.config.endpoint,
            credentials: {
                accessKeyId: this.config.accessKeyId,
                secretAccessKey: this.config.secretAccessKey
            },
            forcePathStyle: this.config.forcePathStyle
        };
    }

    /**
     * Get the public URL for a given key
     * @param {string} key - Object key
     * @returns {string} Public URL
     */
    getPublicUrl(key) {
        const baseUrl = this.config.publicUrl.endsWith('/') 
            ? this.config.publicUrl.slice(0, -1) 
            : this.config.publicUrl;
        
        const cleanKey = key.startsWith('/') ? key.slice(1) : key;
        
        return `${baseUrl}/${cleanKey}`;
    }

    /**
     * Check if configuration is available
     * @returns {boolean} True if configuration is complete
     */
    isConfigured() {
        try {
            this.validateConfig();
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Export singleton instance
export const cloudflareR2Config = new CloudflareR2Config();
