import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export class FileSystemManager {
    constructor(uploadDir = 'public/uploads') {
        this.uploadDir = uploadDir;
        this.ensureUploadDirectory();
    }

    ensureUploadDirectory() {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
            console.log(`✅ Created upload directory: ${this.uploadDir}`);
        }
    }

    async saveImageAtomic(buffer, filename, options = {}) {
        const tempPath = path.join(this.uploadDir, `temp_${filename}`);
        const finalPath = path.join(this.uploadDir, filename);

        try {
            // Step 1: Write to temporary file
            await this.writeBufferToFile(buffer, tempPath);

            // Step 2: Process with Sharp if needed
            if (options.processWithSharp !== false) {
                await this.processWithSharp(tempPath, finalPath, options);
                // Clean up temp file
                await this.deleteFile(tempPath);
            } else {
                // Move temp file to final location
                await this.moveFile(tempPath, finalPath);
            }

            // Step 3: Verify final file exists and is valid
            await this.verifyImageFile(finalPath);

            console.log(`✅ Image saved successfully: ${filename}`);

            return filename;

        } catch (error) {
            // Cleanup on failure
            await this.cleanupOnFailure(tempPath, finalPath);
            throw new Error(`Failed to save image ${filename}: ${error.message}`);
        }
    }

    async writeBufferToFile(buffer, filePath) {
        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, buffer, error => {
                if (error) {
                    reject(new Error(`Failed to write file: ${error.message}`));
                } else {
                    resolve();
                }
            });
        });
    }

    async processWithSharp(inputPath, outputPath, options = {}) {
        const sharpOptions = {
            format: 'jpeg',
            quality: options.quality || 90,
            ...options.sharp
        };

        try {
            await sharp(inputPath)
                .toFormat(sharpOptions.format)
                .jpeg({ quality: sharpOptions.quality })
                .toFile(outputPath);
        } catch (error) {
            throw new Error(`Sharp processing failed: ${error.message}`);
        }
    }

    async moveFile(sourcePath, destPath) {
        return new Promise((resolve, reject) => {
            fs.rename(sourcePath, destPath, error => {
                if (error) {
                    reject(new Error(`Failed to move file: ${error.message}`));
                } else {
                    resolve();
                }
            });
        });
    }

    async deleteFile(filePath) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(filePath)) {
                resolve(); // File doesn't exist, consider it deleted

                return;
            }

            fs.unlink(filePath, error => {
                if (error) {
                    reject(new Error(`Failed to delete file: ${error.message}`));
                } else {
                    resolve();
                }
            });
        });
    }

    async verifyImageFile(filePath) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(filePath)) {
                reject(new Error(`Image file not found: ${filePath}`));

                return;
            }

            // Check file size
            const stats = fs.statSync(filePath);

            if (stats.size === 0) {
                reject(new Error(`Image file is empty: ${filePath}`));

                return;
            }

            // Verify it's a valid image using Sharp
            sharp(filePath)
                .metadata()
                .then(metadata => {
                    if (!metadata.width || !metadata.height) {
                        reject(new Error(`Invalid image metadata: ${filePath}`));
                    } else {
                        resolve(metadata);
                    }
                })
                .catch(error => {
                    reject(new Error(`Invalid image file: ${error.message}`));
                });
        });
    }

    async cleanupOnFailure(tempPath, finalPath) {
        try {
            // Clean up any temporary or partial files
            await this.deleteFile(tempPath);
            await this.deleteFile(finalPath);
        } catch (error) {
            console.error('⚠️ Cleanup failed:', error.message);
        }
    }

    async deleteImage(filename) {
        const filePath = path.join(this.uploadDir, filename);

        try {
            await this.deleteFile(filePath);
            console.log(`✅ Image deleted: ${filename}`);

            return true;
        } catch (error) {
            console.error(`❌ Failed to delete image ${filename}:`, error.message);

            return false;
        }
    }

    async getImageInfo(filename) {
        const filePath = path.join(this.uploadDir, filename);

        try {
            if (!fs.existsSync(filePath)) {
                throw new Error('Image file not found');
            }

            const stats = fs.statSync(filePath);
            const metadata = await sharp(filePath).metadata();

            return {
                filename,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                width: metadata.width,
                height: metadata.height,
                format: metadata.format
            };
        } catch (error) {
            throw new Error(`Failed to get image info: ${error.message}`);
        }
    }

    async listImages(limit = 100) {
        try {
            const files = fs.readdirSync(this.uploadDir);
            const imageFiles = files.filter(file => (/\.(jpg|jpeg|png|gif|webp)$/i).test(file)
            );

            const imageInfos = [];

            for (const file of imageFiles.slice(0, limit)) {
                try {
                    const info = await this.getImageInfo(file);

                    imageInfos.push(info);
                } catch (error) {
                    console.warn(`⚠️ Skipping invalid image: ${file}`);
                }
            }

            return imageInfos;
        } catch (error) {
            throw new Error(`Failed to list images: ${error.message}`);
        }
    }

    async cleanupOrphanedFiles(validImageIds) {
        try {
            const files = fs.readdirSync(this.uploadDir);
            const orphanedFiles = [];

            for (const file of files) {
                if (!(/\.(jpg|jpeg|png|gif|webp)$/i).test(file)) {
                    continue; // Skip non-image files
                }

                // Check if this file is referenced in the database
                const isReferenced = validImageIds.some(id => file.includes(id) || file.startsWith(id));

                if (!isReferenced) {
                    orphanedFiles.push(file);
                }
            }

            // Delete orphaned files
            for (const file of orphanedFiles) {
                await this.deleteImage(file);
            }

            console.log(`🧹 Cleaned up ${orphanedFiles.length} orphaned files`);

            return orphanedFiles.length;

        } catch (error) {
            throw new Error(`Failed to cleanup orphaned files: ${error.message}`);
        }
    }

    getDiskUsage() {
        try {
            const files = fs.readdirSync(this.uploadDir);
            let totalSize = 0;
            let fileCount = 0;

            for (const file of files) {
                const filePath = path.join(this.uploadDir, file);
                const stats = fs.statSync(filePath);

                if (stats.isFile()) {
                    totalSize += stats.size;
                    fileCount++;
                }
            }

            return {
                totalSize,
                fileCount,
                averageSize: fileCount > 0 ? totalSize / fileCount : 0,
                formattedSize: this.formatBytes(totalSize)
            };
        } catch (error) {
            throw new Error(`Failed to get disk usage: ${error.message}`);
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) {
            return '0 Bytes';
        }
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }
}

// Global file system manager instance
export const fileSystemManager = new FileSystemManager();
