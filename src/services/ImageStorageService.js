/**
 * ImageStorageService - Storage Interface
 *
 * This service provides a clean interface for image storage operations.
 * It can be easily switched between local filesystem and CDN storage
 * without changing the calling code.
 */

import { fileSystemManager } from '../utils/FileSystemManager.js';
import { cloudflareR2Service } from './CloudflareR2Service.js';
import { cloudflareR2Config } from './CloudflareR2Config.js';
import crypto from 'crypto';

export class ImageStorageService {
    constructor(storageType = 'local') {
        this.storageType = storageType;
    }

    /**
     * Save image data to storage
     * @param {Buffer} imageBuffer - Image data as buffer
     * @param {string} filename - Filename for the image
     * @param {Object} options - Storage options
     * @returns {Promise<string>} Storage URL/path
     */
    async saveImage(imageBuffer, filename, options = {}) {
        // Input validation
        if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
            throw new Error('Image buffer is required and must be a Buffer');
        }
        if (!filename || typeof filename !== 'string') {
            throw new Error('Filename is required and must be a string');
        }
        if (imageBuffer.length === 0) {
            throw new Error('Image buffer cannot be empty');
        }

        switch (this.storageType) {
            case 'local':
                return await this._saveToLocal(imageBuffer, filename, options);
            case 'cdn':
                return await this._saveToCDN(imageBuffer, filename, options);
            default:
                throw new Error(`Unsupported storage type: ${this.storageType}`);
        }
    }

    /**
     * Delete image from storage
     * @param {string} imagePath - Image path/URL
     * @returns {Promise<boolean>} Success status
     */
    async deleteImage(imagePath) {
        switch (this.storageType) {
            case 'local':
                return await this._deleteFromLocal(imagePath);
            case 'cdn':
                return await this._deleteFromCDN(imagePath);
            default:
                throw new Error(`Unsupported storage type: ${this.storageType}`);
        }
    }

    /**
     * Get image info from storage
     * @param {string} imagePath - Image path/URL
     * @returns {Promise<Object>} Image metadata
     */
    async getImageInfo(imagePath) {
        switch (this.storageType) {
            case 'local':
                return await this._getLocalImageInfo(imagePath);
            case 'cdn':
                return await this._getCDNImageInfo(imagePath);
            default:
                throw new Error(`Unsupported storage type: ${this.storageType}`);
        }
    }

    /**
     * Check if image exists in storage
     * @param {string} imagePath - Image path/URL
     * @returns {Promise<boolean>} Exists status
     */
    async imageExists(imagePath) {
        switch (this.storageType) {
            case 'local':
                return await this._localImageExists(imagePath);
            case 'cdn':
                return await this._cdnImageExists(imagePath);
            default:
                throw new Error(`Unsupported storage type: ${this.storageType}`);
        }
    }

    // ============================================================================
    // LOCAL STORAGE IMPLEMENTATION
    // ============================================================================

    async _saveToLocal(imageBuffer, filename, options) {
        try {

            const savedFilename = await fileSystemManager.saveImageAtomic(imageBuffer, filename, options);
            const imageUrl = `uploads/${savedFilename}`;


            return imageUrl;
        } catch (error) {
            console.error('❌ Failed to save image to local storage:', error.message);
            throw new Error(`Local storage save failed: ${error.message}`);
        }
    }

    async _deleteFromLocal(imagePath) {
        try {
            // Extract filename from path (remove 'uploads/' prefix)
            const filename = imagePath.replace('uploads/', '');
            const success = await fileSystemManager.deleteImage(filename);


            return success;
        } catch (error) {
            console.error('❌ Failed to delete image from local storage:', error);

            return false;
        }
    }

    async _getLocalImageInfo(imagePath) {
        try {
            // Extract filename from path (remove 'uploads/' prefix)
            const filename = imagePath.replace('uploads/', '');
            const info = await fileSystemManager.getImageInfo(filename);

            return {
                ...info,
                storageType: 'local',
                url: imagePath
            };
        } catch (error) {
            console.error('❌ Failed to get local image info:', error);
            throw new Error(`Local image info failed: ${error.message}`);
        }
    }

    async _localImageExists(imagePath) {
        try {
            // Extract filename from path (remove 'uploads/' prefix)
            const filename = imagePath.replace('uploads/', '');
            const info = await fileSystemManager.getImageInfo(filename);

            return !!info;
        } catch (error) {
            return false;
        }
    }

    // ============================================================================
    // CDN STORAGE IMPLEMENTATION (Cloudflare R2)
    // ============================================================================

    async _saveToCDN(imageBuffer, filename, options) {
        try {

            // Use the filename as the key (no 'uploads/' prefix for CDN)
            const key = filename;
            const publicUrl = await cloudflareR2Service.saveImage(imageBuffer, key, options);


            return publicUrl;
        } catch (error) {
            console.error('❌ Failed to save image to Cloudflare R2:', error.message);
            throw new Error(`Cloudflare R2 save failed: ${error.message}`);
        }
    }

    async _deleteFromCDN(imagePath) {
        try {

            // Extract key from URL
            const key = cloudflareR2Service.extractKeyFromUrl(imagePath);
            const success = await cloudflareR2Service.deleteImage(key);


            return success;
        } catch (error) {
            console.error('❌ Failed to delete image from Cloudflare R2:', error.message);

            return false;
        }
    }

    async _getCDNImageInfo(imagePath) {
        try {

            // Extract key from URL
            const key = cloudflareR2Service.extractKeyFromUrl(imagePath);

            return await cloudflareR2Service.getImageInfo(key);
        } catch (error) {
            console.error('❌ Failed to get image info from Cloudflare R2:', error.message);
            throw new Error(`Cloudflare R2 info failed: ${error.message}`);
        }
    }

    async _cdnImageExists(imagePath) {
        try {
            // Extract key from URL
            const key = cloudflareR2Service.extractKeyFromUrl(imagePath);

            return await cloudflareR2Service.imageExists(key);
        } catch (error) {
            console.error('❌ Error checking image existence in Cloudflare R2:', error.message);

            return false;
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Generate content-hashed filename for optimal caching
     * @param {Buffer} imageBuffer - Image data as buffer
     * @param {string} provider - Provider name
     * @param {string} extension - File extension (default: jpg)
     * @returns {string} Content-hashed filename
     */
    generateFilename(imageBuffer, provider, extension = 'jpg') {
        const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
        const shortHash = hash.substring(0, 16); // Use first 16 characters for shorter filenames

        return `${provider}_${shortHash}.${extension}`;
    }

    /**
     * Get storage type
     * @returns {string} Current storage type
     */
    getStorageType() {
        return this.storageType;
    }

    /**
     * Switch storage type (for runtime switching)
     * @param {string} newStorageType - New storage type
     */
    setStorageType(newStorageType) {
        if (!['local', 'cdn'].includes(newStorageType)) {
            throw new Error(`Invalid storage type: ${newStorageType}`);
        }

        // Validate CDN configuration if switching to CDN
        if (newStorageType === 'cdn' && !this.isCDNConfigured()) {
            throw new Error('CDN storage is not properly configured. Please check your environment variables.');
        }

        this.storageType = newStorageType;
    }

    /**
     * Check if CDN (Cloudflare R2) is properly configured
     * @returns {boolean} True if CDN is configured
     */
    isCDNConfigured() {
        try {
            return cloudflareR2Config.isConfigured();
        } catch (error) {
            console.warn('⚠️ CDN configuration check failed:', error.message);

            return false;
        }
    }

    /**
     * Get CDN health status
     * @returns {Promise<Object>} CDN health status
     */
    async getCDNHealth() {
        try {
            return await cloudflareR2Service.getHealth();
        } catch (error) {
            return {
                status: 'unhealthy',
                service: 'CloudflareR2Service',
                error: error.message
            };
        }
    }
}

// Export singleton instance with default local storage
export const imageStorageService = new ImageStorageService(process.env.STORAGE_TYPE);
