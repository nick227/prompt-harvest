/**
 * API Service for Profile Management
 * Handles all API calls related to profile operations
 */


class ProfileAPIService {
    /**
     * Check username availability
     */
    static async checkUsernameAvailability(username) {
        const response = await fetch('/api/profile/check-username', {
            method: 'POST',
            headers: ProfileAuthUtils.getAuthHeaders(),
            body: JSON.stringify({ username })
        });

        const data = await response.json();

        return { response, data };
    }

    /**
     * Update user profile
     */
    static async updateProfile(updates) {
        const response = await fetch('/api/profile/update', {
            method: 'PUT',
            headers: ProfileAuthUtils.getAuthHeaders(),
            body: JSON.stringify(updates)
        });

        const data = await response.json();

        return { response, data };
    }

    /**
     * Generate avatar using AI
     */
    static async generateAvatar(prompt, provider) {
        const response = await fetch('/api/profile/generate-avatar', {
            method: 'POST',
            headers: ProfileAuthUtils.getAuthHeaders(),
            body: JSON.stringify({ prompt, provider })
        });

        const data = await response.json();

        return { response, data };
    }

    /**
     * Get user's images
     */
    static async getUserImages(limit = 20, page = 1) {
        const response = await fetch(`/api/profile/user-images?limit=${limit}&page=${page}`, {
            headers: ProfileAuthUtils.getAuthHeaders()
        });

        const data = await response.json();

        return { response, data };
    }

    /**
     * Set avatar from existing image
     */
    static async setAvatarFromImage(imageId) {
        const response = await fetch('/api/profile/set-avatar', {
            method: 'POST',
            headers: ProfileAuthUtils.getAuthHeaders(),
            body: JSON.stringify({ imageId })
        });

        const data = await response.json();

        return { response, data };
    }

    /**
     * Upload avatar file
     */
    static async uploadAvatar(fileData, filename, mimeType) {
        const response = await fetch('/api/profile/upload-avatar', {
            method: 'POST',
            headers: ProfileAuthUtils.getAuthHeaders(),
            body: JSON.stringify({
                fileData,
                filename,
                mimeType
            })
        });

        const data = await response.json();

        return { response, data };
    }

    /**
     * Convert file to base64
     */
    static fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}

// Export for global access
window.ProfileAPIService = ProfileAPIService;
