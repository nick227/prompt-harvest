/**
 * Image Buffer Manager
 *
 * PERFORMANCE OPTIMIZATION: Handles base64 to buffer conversion immediately
 * to reduce memory footprint and prevent memory bloat.
 *
 * - Converts base64 strings to Buffers immediately (saves ~30% memory)
 * - Releases base64 strings from memory
 * - Provides streaming capabilities for large images
 * - Compresses images to optimize storage and bandwidth
 */

import sharp from 'sharp';

export class ImageBufferManager {
    /**
     * Convert base64 to buffer immediately and release base64 string
     * @param {string} base64String - Base64 encoded image
     * @returns {Buffer} Image buffer
     */
    static base64ToBuffer(base64String) {
        if (!base64String || typeof base64String !== 'string') {
            throw new Error('Invalid base64 string provided');
        }

        // Remove data URI prefix if present
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');

        // Convert to buffer immediately
        const buffer = Buffer.from(base64Data, 'base64');

        return buffer;
    }

    /**
     * Process result and convert base64 to buffer immediately
     * MEMORY OPTIMIZATION: Replaces base64 with buffer to reduce memory usage
     *
     * @param {Object} result - Generation result with imageBase64
     * @returns {Object} Result with buffer instead of base64
     */
    static processGenerationResult(result) {
        if (!result || !result.imageBase64) {
            return result;
        }

        const startMem = process.memoryUsage().heapUsed;
        const originalBase64Length = result.imageBase64.length; // SAVE BEFORE DELETE

        // Convert base64 to buffer
        const buffer = this.base64ToBuffer(result.imageBase64);

        // Release base64 string from memory immediately
        delete result.imageBase64;

        // Add buffer to result
        result.imageBuffer = buffer;

        const endMem = process.memoryUsage().heapUsed;
        const savedMemory = originalBase64Length - buffer.length; // USE SAVED VALUE

        console.log('📊 Memory optimization: Base64 → Buffer conversion');
        console.log(`   Base64 size: ${(originalBase64Length / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   Buffer size: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   Memory saved: ~${(savedMemory / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   Heap change: ${((endMem - startMem) / 1024 / 1024).toFixed(2)}MB`);

        return result;
    }

    /**
     * Compress and optimize image buffer
     * @param {Buffer} buffer - Image buffer
     * @param {Object} options - Compression options
     * @returns {Promise<Buffer>} Compressed buffer
     */
    static async compressImage(buffer, options = {}) {
        // Input validation
        if (!Buffer.isBuffer(buffer)) {
            throw new Error('compressImage requires a Buffer');
        }

        if (buffer.length === 0) {
            throw new Error('Cannot compress empty buffer');
        }

        if (buffer.length > 50 * 1024 * 1024) { // 50MB limit
            console.warn(`⚠️  Very large image: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
        }

        const {
            quality = 85, // Good balance between quality and size
            maxWidth = 2048,
            maxHeight = 2048,
            format = 'webp' // WebP provides better compression
        } = options;

        try {
            const originalSize = buffer.length;

            let pipeline = sharp(buffer);

            // Get metadata to check format and dimensions
            const metadata = await pipeline.metadata();

            // Skip if already optimal format and size
            if (metadata.format === format &&
                metadata.width <= maxWidth &&
                metadata.height <= maxHeight &&
                originalSize < 2 * 1024 * 1024) { // < 2MB
                console.log(`✓ Image already optimized (${metadata.format}, ${metadata.width}x${metadata.height})`);

                return buffer;
            }

            // Resize if image is too large
            if (metadata.width > maxWidth || metadata.height > maxHeight) {
                pipeline = pipeline.resize(maxWidth, maxHeight, {
                    fit: 'inside',
                    withoutEnlargement: true
                });
            }

            // Compress based on format
            let compressed;

            if (format === 'webp') {
                compressed = await pipeline
                    .webp({ quality, effort: 4 }) // effort: 4 is good balance
                    .toBuffer();
            } else if (format === 'jpeg') {
                compressed = await pipeline
                    .jpeg({ quality, mozjpeg: true })
                    .toBuffer();
            } else if (format === 'png') {
                compressed = await pipeline
                    .png({ compressionLevel: 8, quality })
                    .toBuffer();
            } else {
                // Keep original format
                compressed = buffer;
            }

            const compressedSize = compressed.length;
            const savedPercent = ((1 - compressedSize / originalSize) * 100).toFixed(1);

            console.log(`🗜️  Image compression: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${savedPercent}% reduction)`);

            return compressed;
        } catch (error) {
            console.error('❌ Image compression failed:', error.message);

            // Return original buffer on failure
            return buffer;
        }
    }

    /**
     * Process image: convert base64 → buffer → compress
     * MEMORY & STORAGE OPTIMIZATION
     *
     * @param {string} base64String - Base64 encoded image
     * @param {Object} options - Processing options
     * @returns {Promise<Buffer>} Optimized image buffer
     */
    static async processAndCompress(base64String, options = {}) {
        // Step 1: Convert to buffer immediately
        const buffer = this.base64ToBuffer(base64String);

        // Step 2: Compress and optimize
        const compressed = await this.compressImage(buffer, options);

        return compressed;
    }

    /**
     * Buffer to base64 (when needed for API responses)
     * @param {Buffer} buffer - Image buffer
     * @param {string} mimeType - MIME type (default: image/png)
     * @returns {string} Base64 data URI
     */
    static bufferToBase64DataUri(buffer, mimeType = 'image/png') {
        if (!Buffer.isBuffer(buffer)) {
            throw new Error('Invalid buffer provided');
        }

        const base64 = buffer.toString('base64');

        return `data:${mimeType};base64,${base64}`;
    }

    /**
     * Get buffer size in MB
     * @param {Buffer} buffer - Image buffer
     * @returns {number} Size in MB
     */
    static getBufferSizeMB(buffer) {
        if (!Buffer.isBuffer(buffer)) {
            return 0;
        }

        return buffer.length / 1024 / 1024;
    }

    /**
     * Stream buffer to file (for large images)
     * @param {Buffer} buffer - Image buffer
     * @param {string} outputPath - Output file path
     * @returns {Promise<void>}
     */
    static async streamToFile(buffer, outputPath) {
        const fs = await import('fs');
        const stream = await import('stream');
        const { promisify } = await import('util');
        const pipeline = promisify(stream.default.pipeline);

        const readable = stream.Readable.from(buffer);
        const writable = fs.default.createWriteStream(outputPath);

        await pipeline(readable, writable);
    }
}

export default ImageBufferManager;

