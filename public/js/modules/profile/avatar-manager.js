/**
 * Avatar Manager for Profile Management
 * Handles avatar-related operations and state management
 */

import { ProfileAPIService } from './api-service.js';
import { ProfileAuthUtils } from './auth-utils.js';

export class AvatarManager {
    constructor() {
        this.selectedImageId = null;
        this.uploadedFile = null;
        this.isGenerating = false;
        this.generatedAvatar = null;
    }

    /**
     * Handle file upload
     */
    async handleFileUpload(file) {
        this.uploadedFile = file;
        return file;
    }

    /**
     * Remove uploaded file
     */
    removeUploadedFile() {
        this.uploadedFile = null;
    }

    /**
     * Select existing image
     */
    selectExistingImage(imageId) {
        this.selectedImageId = imageId;
    }

    /**
     * Upload avatar file
     */
    async uploadAvatarFile() {
        if (!this.uploadedFile) {
            throw new Error('No file to upload');
        }

        try {
            const fileData = await ProfileAPIService.fileToBase64(this.uploadedFile);

            const { response, data } = await ProfileAPIService.uploadAvatar(
                fileData,
                this.uploadedFile.name,
                this.uploadedFile.type
            );

            if (response.ok && data.success && data.data.avatarUrl) {
                return data.data.avatarUrl;
            } else {
                throw new Error(data.message || 'Failed to upload avatar');
            }
        } catch (error) {
            console.error('Failed to upload avatar:', error);
            throw error;
        }
    }

    /**
     * Generate avatar using AI
     */
    async generateAvatar(prompt, provider) {
        if (this.isGenerating) {
            throw new Error('Avatar generation already in progress');
        }

        this.isGenerating = true;

        try {
            const { response, data } = await ProfileAPIService.generateAvatar(prompt, provider);

            if (response.ok && data.success && data.data.avatarUrl) {
                // Store the generated avatar for preview
                this.generatedAvatar = {
                    url: data.data.avatarUrl,
                    prompt: prompt,
                    provider: provider
                };
                return data.data.avatarUrl;
            } else {
                throw new Error(data.message || 'Failed to generate avatar');
            }
        } catch (error) {
            console.error('Failed to generate avatar:', error);
            throw error;
        } finally {
            this.isGenerating = false;
        }
    }

    /**
     * Get generated avatar data
     */
    getGeneratedAvatar() {
        return this.generatedAvatar;
    }

    /**
     * Clear generated avatar
     */
    clearGeneratedAvatar() {
        this.generatedAvatar = null;
    }

    /**
     * Set avatar from existing image
     */
    async setAvatarFromImage(imageId) {
        try {
            const { response, data } = await ProfileAPIService.setAvatarFromImage(imageId);

            if (response.ok && data.success && data.data.avatarUrl) {
                return data.data.avatarUrl;
            } else {
                throw new Error(data.message || 'Failed to set avatar');
            }
        } catch (error) {
            console.error('Failed to set avatar from image:', error);
            throw error;
        }
    }

    /**
     * Load existing images
     */
    async loadExistingImages(limit = 20, page = 1) {
        try {
            const { response, data } = await ProfileAPIService.getUserImages(limit, page);

            if (response.ok && data.success) {
                return data.data?.images || data.images || [];
            } else {
                throw new Error(data.message || 'Failed to load images');
            }
        } catch (error) {
            console.error('Failed to load existing images:', error);
            throw error;
        }
    }

    /**
     * Update user avatar in global system
     */
    updateUserAvatar(avatarUrl, currentUser) {
        if (currentUser) {
            currentUser.picture = avatarUrl;
            ProfileAuthUtils.syncUserData(currentUser);
        }
    }

    /**
     * Reset avatar state
     */
    reset() {
        this.selectedImageId = null;
        this.uploadedFile = null;
        this.isGenerating = false;
        this.generatedAvatar = null;
    }

    /**
     * Get current state
     */
    getState() {
        return {
            selectedImageId: this.selectedImageId,
            uploadedFile: this.uploadedFile,
            isGenerating: this.isGenerating
        };
    }

    /**
     * Upload avatar file and return URL
     */
    async uploadAvatarFile() {
        if (!this.uploadedFile) {
            throw new Error('No file to upload');
        }

        const formData = new FormData();
        formData.append('avatar', this.uploadedFile);

        const response = await fetch('/api/profile/upload-avatar', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload avatar');
        }

        const data = await response.json();
        return data.data.avatarUrl;
    }

    /**
     * Set avatar from existing image and return URL
     */
    async setAvatarFromImage(imageId) {
        if (!imageId) {
            throw new Error('No image selected');
        }

        const response = await fetch('/api/profile/set-avatar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ imageId })
        });

        if (!response.ok) {
            throw new Error('Failed to set avatar from image');
        }

        const data = await response.json();
        return data.data.avatarUrl;
    }
}
