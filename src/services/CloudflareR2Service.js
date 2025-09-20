/**
 * CloudflareR2Service - Cloudflare R2 Storage Implementation
 * 
 * Implements image storage operations using Cloudflare R2 (S3-compatible).
 * Uses AWS SDK for S3 operations with R2-specific configuration.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { cloudflareR2Config } from './CloudflareR2Config.js';

export class CloudflareR2Service {
    constructor() {
        this.config = null;
        this.awsConfig = null;
        this.s3Client = null;
        this.initialized = false;
        
        // Only initialize if configuration is available
        if (cloudflareR2Config.isConfigured()) {
            this.initialize();
        }
    }

    /**
     * Initialize the service with configuration
     * @private
     */
    initialize() {
        try {
            this.config = cloudflareR2Config.getConfig();
            this.awsConfig = cloudflareR2Config.getAwsConfig();
            this.s3Client = new S3Client(this.awsConfig);
            this.initialized = true;
            
            console.log('🔧 CloudflareR2Service initialized');
        } catch (error) {
            console.warn('⚠️ CloudflareR2Service initialization failed:', error.message);
            this.initialized = false;
        }
    }

    /**
     * Check if service is properly initialized
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return this.initialized && this.s3Client !== null;
    }

    /**
     * Save image buffer to R2
     * @param {Buffer} imageBuffer - Image data as buffer
     * @param {string} key - Object key (filename)
     * @param {Object} options - Upload options
     * @returns {Promise<string>} Public URL of uploaded image
     */
    async saveImage(imageBuffer, key, options = {}) {
        if (!this.isInitialized()) {
            throw new Error('CloudflareR2Service is not initialized. Check your configuration.');
        }

        // Input validation
        if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
            throw new Error('Image buffer is required and must be a Buffer');
        }
        if (!key || typeof key !== 'string') {
            throw new Error('Key is required and must be a string');
        }
        if (imageBuffer.length === 0) {
            throw new Error('Image buffer cannot be empty');
        }

        try {
            console.log(`💾 Uploading image to Cloudflare R2: ${key}`);

            // Determine content type
            const contentType = this.getContentType(key, options.contentType);
            
            const command = new PutObjectCommand({
                Bucket: this.config.bucketName,
                Key: key,
                Body: imageBuffer,
                ContentType: contentType,
                CacheControl: options.cacheControl || 'public, max-age=31536000', // 1 year cache
                Metadata: {
                    uploadedAt: new Date().toISOString(),
                    ...options.metadata
                }
            });

            await this.s3Client.send(command);

            const publicUrl = cloudflareR2Config.getPublicUrl(key);
            console.log(`✅ Image uploaded to Cloudflare R2: ${publicUrl}`);

            return publicUrl;
        } catch (error) {
            console.error('❌ Failed to upload image to Cloudflare R2:', {
                error: error.message,
                key,
                bucket: this.config.bucketName,
                endpoint: this.config.endpoint
            });
            throw new Error(`Cloudflare R2 upload failed: ${error.message}`);
        }
    }

    /**
     * Delete image from R2
     * @param {string} key - Object key
     * @returns {Promise<boolean>} Success status
     */
    async deleteImage(key) {
        if (!this.isInitialized()) {
            throw new Error('CloudflareR2Service is not initialized. Check your configuration.');
        }

        if (!key || typeof key !== 'string') {
            throw new Error('Key is required and must be a string');
        }

        try {
            console.log(`🗑️ Deleting image from Cloudflare R2: ${key}`);

            const command = new DeleteObjectCommand({
                Bucket: this.config.bucketName,
                Key: key
            });

            await this.s3Client.send(command);

            console.log(`✅ Image deleted from Cloudflare R2: ${key}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to delete image from Cloudflare R2:`, error.message);
            return false;
        }
    }

    /**
     * Get image metadata from R2
     * @param {string} key - Object key
     * @returns {Promise<Object>} Image metadata
     */
    async getImageInfo(key) {
        if (!this.isInitialized()) {
            throw new Error('CloudflareR2Service is not initialized. Check your configuration.');
        }

        try {
            console.log(`📋 Getting image info from Cloudflare R2: ${key}`);

            const command = new HeadObjectCommand({
                Bucket: this.config.bucketName,
                Key: key
            });

            const response = await this.s3Client.send(command);

            const publicUrl = cloudflareR2Config.getPublicUrl(key);

            return {
                key,
                size: response.ContentLength,
                contentType: response.ContentType,
                lastModified: response.LastModified,
                etag: response.ETag,
                storageType: 'cloudflare-r2',
                url: publicUrl,
                metadata: response.Metadata || {}
            };
        } catch (error) {
            console.error(`❌ Failed to get image info from Cloudflare R2:`, error.message);
            throw new Error(`Cloudflare R2 info failed: ${error.message}`);
        }
    }

    /**
     * Check if image exists in R2
     * @param {string} key - Object key
     * @returns {Promise<boolean>} Exists status
     */
    async imageExists(key) {
        if (!this.isInitialized()) {
            return false; // Return false instead of throwing for existence checks
        }

        try {
            const command = new HeadObjectCommand({
                Bucket: this.config.bucketName,
                Key: key
            });

            await this.s3Client.send(command);
            return true;
        } catch (error) {
            if (error.name === 'NotFound') {
                return false;
            }
            console.error(`❌ Error checking image existence in Cloudflare R2:`, error.message);
            return false;
        }
    }

    /**
     * Generate a presigned URL for temporary access
     * @param {string} key - Object key
     * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
     * @returns {Promise<string>} Presigned URL
     */
    async getPresignedUrl(key, expiresIn = 3600) {
        if (!this.isInitialized()) {
            throw new Error('CloudflareR2Service is not initialized. Check your configuration.');
        }

        try {
            const command = new GetObjectCommand({
                Bucket: this.config.bucketName,
                Key: key
            });

            return await getSignedUrl(this.s3Client, command, { expiresIn });
        } catch (error) {
            console.error(`❌ Failed to generate presigned URL:`, error.message);
            throw new Error(`Presigned URL generation failed: ${error.message}`);
        }
    }

    /**
     * Determine content type based on file extension
     * @param {string} filename - Filename
     * @param {string} overrideType - Override content type
     * @returns {string} Content type
     */
    getContentType(filename, overrideType = null) {
        if (overrideType) {
            return overrideType;
        }

        const extension = filename.toLowerCase().split('.').pop();
        const contentTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml'
        };

        return contentTypes[extension] || 'image/jpeg';
    }

    /**
     * Extract key from URL
     * @param {string} url - Public URL
     * @returns {string} Object key
     */
    extractKeyFromUrl(url) {
        if (!url || typeof url !== 'string') {
            throw new Error('URL is required and must be a string');
        }

        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
            
            if (!pathname) {
                throw new Error('URL does not contain a valid path');
            }
            
            return pathname;
        } catch (error) {
            throw new Error(`Invalid URL format: ${url} - ${error.message}`);
        }
    }

    /**
     * Get service health status
     * @returns {Promise<Object>} Health status
     */
    async getHealth() {
        if (!this.isInitialized()) {
            return {
                status: 'uninitialized',
                service: 'CloudflareR2Service',
                error: 'Service not initialized - check configuration'
            };
        }

        try {
            // Try to list objects to test connection
            const command = new ListObjectsV2Command({
                Bucket: this.config.bucketName,
                MaxKeys: 1
            });

            await this.s3Client.send(command);

            return {
                status: 'healthy',
                service: 'CloudflareR2Service',
                bucket: this.config.bucketName,
                endpoint: this.config.endpoint
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                service: 'CloudflareR2Service',
                error: error.message
            };
        }
    }
}

// Export singleton instance
export const cloudflareR2Service = new CloudflareR2Service();
