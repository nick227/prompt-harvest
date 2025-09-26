/**
 * Form Validator for Profile Management
 * Handles validation logic for profile forms
 */

class ProfileFormValidator {
    /**
     * Validate username
     */
    static validateUsername(username, currentUsername = '') {
        if (!username || typeof username !== 'string') {
            return { valid: false, message: 'Username is required' };
        }

        const trimmed = username.trim();

        if (trimmed.length < 3) {
            return { valid: false, message: 'Username must be at least 3 characters' };
        }

        if (trimmed.length > 50) {
            return { valid: false, message: 'Username must be 50 characters or less' };
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
            return { valid: false, message: 'Username can only contain letters, numbers, underscores, and hyphens' };
        }

        if (trimmed === currentUsername) {
            return { valid: false, message: 'This is already your username' };
        }

        return { valid: true, message: 'Username is valid' };
    }

    /**
     * Validate avatar prompt
     */
    static validateAvatarPrompt(prompt) {
        if (!prompt || typeof prompt !== 'string') {
            return { valid: false, message: 'Avatar description is required' };
        }

        const trimmed = prompt.trim();

        if (trimmed.length === 0) {
            return { valid: false, message: 'Avatar description cannot be empty' };
        }

        if (trimmed.length > 500) {
            return { valid: false, message: 'Avatar description must be 500 characters or less' };
        }

        return { valid: true, message: 'Avatar description is valid' };
    }

    /**
     * Validate uploaded file
     */
    static validateUploadedFile(file) {
        if (!file) {
            return { valid: false, message: 'No file selected' };
        }

        if (!file.type.startsWith('image/')) {
            return { valid: false, message: 'File must be an image' };
        }

        if (file.size > 5 * 1024 * 1024) {
            return { valid: false, message: 'File must be smaller than 5MB' };
        }

        return { valid: true, message: 'File is valid' };
    }

    /**
     * Validate provider selection
     */
    static validateProvider(provider) {
        const validProviders = ['dalle3', 'dalle2'];

        if (!provider || !validProviders.includes(provider)) {
            return { valid: false, message: 'Invalid provider selected' };
        }

        return { valid: true, message: 'Provider is valid' };
    }

    /**
     * Get validation state for save button
     */
    static getSaveButtonState(formData, selectedAvatarType, uploadedFile, selectedImageId) {
        const { username, avatarPrompt, avatarProvider } = formData;

        // Check if there are any changes
        const hasUsernameChange = username && username.length > 0;
        const hasAvatarChange = selectedAvatarType && (
            (selectedAvatarType === 'upload' && uploadedFile) ||
            (selectedAvatarType === 'existing' && selectedImageId)
        );

        if (!hasUsernameChange && !hasAvatarChange) {
            return { enabled: false, reason: 'No changes to save' };
        }

        // Validate username if changed
        if (hasUsernameChange) {
            const usernameValidation = this.validateUsername(username);
            if (!usernameValidation.valid) {
                return { enabled: false, reason: usernameValidation.message };
            }
        }

        // No longer needed - each avatar type handles its own save operation
        return { enabled: false, reason: 'No longer used' };
    }
}
