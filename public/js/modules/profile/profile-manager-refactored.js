/**
 * Profile Manager - Refactored Version
 * Coordinates profile management functionality using modular architecture
 */

import { ProfileAuthUtils } from './auth-utils.js';
import { ProfileDOMManager } from './dom-manager.js';
import { ProfileAPIService } from './api-service.js';
import { ProfileFormValidator } from './form-validator.js';
import { AvatarManager } from './avatar-manager.js';
import { AIImageGenerator } from '../../components/ai-image-generator.js';

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.isCheckingUsername = false;
        this.isUpdatingProfile = false;
        this.usernameAvailable = false;

        // Initialize modules
        this.domManager = new ProfileDOMManager();
        this.avatarManager = new AvatarManager();
        this.aiGenerator = null;

        this.init();
    }

    /**
     * Initialize the profile manager
     */
    async init() {
        await this.loadCurrentUser();
        this.setupEventListeners();
        this.setupUserSystemListener();
    }

    /**
     * Load current user data
     */
    async loadCurrentUser() {
        try {
            console.log('🔍 PROFILE: Loading current user...');

            this.currentUser = await ProfileAuthUtils.getCurrentUser();
            console.log('🔍 PROFILE: Got user:', this.currentUser);

            this.domManager.updateProfileDisplay(this.currentUser);
        } catch (error) {
            console.error('Failed to load current user:', error);
            this.domManager.showStatus('error', 'Failed to load user data');
        }
    }

    /**
     * Setup event listeners for DOM events
     */
    setupEventListeners() {
        // Username events
        document.addEventListener('profile:usernameInput', e => this.handleUsernameInput(e.detail));
        document.addEventListener('profile:usernameKeypress', e => this.handleUsernameKeypress(e.detail));
        document.addEventListener('profile:checkUsername', () => this.checkUsernameAvailability());
        document.addEventListener('profile:updateUsername', () => this.updateUsername());

        // Avatar events
        document.addEventListener('profile:avatarOptionChange', e => this.handleAvatarOptionChange(e.detail));
        document.addEventListener('profile:fileUpload', e => this.handleFileUpload(e.detail));
        document.addEventListener('profile:removeUpload', () => this.removeUploadedFile());
        document.addEventListener('profile:selectExistingImage', e => this.selectExistingImage(e.detail));
        document.addEventListener('profile:providerChange', () => this.updateGenerationCost());
        // AI generation is now handled by the widget

        // Action events removed - each avatar type handles its own operations
    }

    /**
     * Setup user system listener
     */
    setupUserSystemListener() {
        window.addEventListener('authStateChanged', () => {
            console.log('🔍 PROFILE: Auth state changed, refreshing user data');
            this.loadCurrentUser();
        });

        if (window.userSystem) {
            const originalSetUser = window.userSystem.setUser.bind(window.userSystem);

            window.userSystem.setUser = user => {
                originalSetUser(user);
                this.currentUser = user;
                this.domManager.updateProfileDisplay(this.currentUser);
                console.log('🔍 PROFILE: User system updated, synced local user data');
            };
        }
    }

    /**
     * Handle username input
     */
    handleUsernameInput(event) {
        const username = event.target.value.trim();
        const statusElement = this.domManager.elements.usernameStatus;

        // Reset availability state when user types
        this.usernameAvailable = false;

        if (statusElement && username.length > 0) {
            statusElement.textContent = '';
            statusElement.className = 'input-status';
        }

        this.updateSaveButtonState();
    }

    /**
     * Handle username keypress
     */
    handleUsernameKeypress(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const checkBtn = this.domManager.elements.checkUsernameBtn;

            if (checkBtn && !checkBtn.disabled) {
                this.checkUsernameAvailability();
            }
        }
    }

    /**
     * Validate username before checking availability
     */
    validateUsernameForCheck() {
        if (!ProfileAuthUtils.isAuthenticated()) {
            this.domManager.showUsernameStatus('error', 'Please log in to check username availability');

            return null;
        }

        const { username } = this.domManager.getFormData();

        if (username.length < 3) {
            this.domManager.showUsernameStatus('error', 'Username must be at least 3 characters');

            return null;
        }

        if (username.length > 50) {
            this.domManager.showUsernameStatus('error', 'Username must be less than 50 characters');

            return null;
        }

        // Check for valid characters (alphanumeric, underscore, hyphen)
        if (!(/^[a-zA-Z0-9_-]+$/).test(username)) {
            this.domManager.showUsernameStatus('error', 'Username can only contain letters, numbers, underscores, and hyphens');

            return null;
        }

        // Check if starts with letter or number
        if (!(/^[a-zA-Z0-9]/).test(username)) {
            this.domManager.showUsernameStatus('error', 'Username must start with a letter or number');

            return null;
        }

        if (username === this.currentUser?.username) {
            this.domManager.showUsernameStatus('info', 'This is already your username');

            return null;
        }

        return username;
    }

    async checkUsernameAvailability() {
        const username = this.validateUsernameForCheck();

        if (!username || this.isCheckingUsername) {
            return;
        }

        this.setCheckingState(true);

        try {
            const { response, data } = await ProfileAPIService.checkUsernameAvailability(username);

            this.handleUsernameCheckResponse(response, data);
        } catch (error) {
            this.handleUsernameCheckError(error);
        } finally {
            this.setCheckingState(false);
        }
    }

    setCheckingState(isChecking) {
        this.isCheckingUsername = isChecking;
        const { updateUsernameBtn } = this.domManager.elements;

        if (updateUsernameBtn) {
            // Only disable button when checking, don't disable when done
            if (isChecking) {
                updateUsernameBtn.disabled = true;
            }
            // When checking is done, let showUsernameStatus handle the button state
        }
    }

    handleUsernameCheckResponse(response, data) {
        console.log('🔍 PROFILE MANAGER: Username check response:', { response: response.ok, data });

        if (response.ok && data.success) {
            const message = data.data.available ? 'Username is available!' : 'Username is already taken';
            const type = data.data.available ? 'success' : 'error';

            console.log('🔍 PROFILE MANAGER: Setting status:', { type, message, available: data.data.available });
            this.domManager.showUsernameStatus(type, message);
            this.usernameAvailable = data.data.available;

            // Test: Try to manually enable button if username is available
            if (data.data.available) {
                console.log('🔍 PROFILE MANAGER: Username is available, testing button enable...');
                setTimeout(() => {
                    this.domManager.testEnableButton();
                }, 100);
            }
        } else {
            console.log('🔍 PROFILE MANAGER: Error response:', data.message);
            this.domManager.showUsernameStatus('error', data.message || 'Failed to check username');
            this.usernameAvailable = false;
        }
    }

    handleUsernameCheckError(error) {
        console.error('Failed to check username availability:', error);
        this.domManager.showUsernameStatus('error', 'Failed to check username availability');
        this.usernameAvailable = false;
        this.domManager.updateUsernameButtonStates(false);
    }

    /**
     * Update username
     */
    async updateUsername() {
        const username = this.validateUsernameForCheck();

        if (!username || !this.usernameAvailable || this.isUpdatingProfile) {
            return;
        }

        this.isUpdatingProfile = true;
        const { updateUsernameBtn } = this.domManager.elements;

        if (updateUsernameBtn) {
            updateUsernameBtn.disabled = true;
            updateUsernameBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Updating...';
        }

        try {
            await this.updateUserProfile({ username });
            this.domManager.showUsernameStatus('success', 'Username updated successfully!');

            // Clear the input and reset state
            this.domManager.elements.usernameInput.value = '';
            this.usernameAvailable = false;
        } catch (error) {
            console.error('Failed to update username:', error);
            this.domManager.showUsernameStatus('error', 'Failed to update username');
        } finally {
            this.isUpdatingProfile = false;

            if (updateUsernameBtn) {
                updateUsernameBtn.disabled = true;
                updateUsernameBtn.innerHTML = '<i class="fas fa-save" aria-hidden="true"></i> Update';
            }
        }
    }

    /**
     * Handle avatar option change
     */
    async handleAvatarOptionChange(event) {
        const selectedOption = event.target.value;

        this.domManager.showAvatarForm(selectedOption);

        // Load existing images if that option is selected
        if (selectedOption === 'existing') {
            await this.loadExistingImages();
        }

        // Initialize AI generator if needed
        if (selectedOption === 'generate') {
            this.initializeAIGenerator();
        }
    }

    /**
     * Load existing images for avatar selection
     */
    async loadExistingImages() {
        try {
            this.domManager.showStatus('info', 'Loading your images...');

            const images = await this.avatarManager.loadExistingImages();

            this.domManager.displayExistingImages(images);

            if (images.length === 0) {
                this.domManager.showStatus('info', 'No images found. Generate some images first!');
            } else {
                this.domManager.showStatus('success', `Loaded ${images.length} images`);
            }
        } catch (error) {
            console.error('Failed to load existing images:', error);
            this.domManager.showStatus('error', 'Failed to load images');
        }
    }

    /**
     * Initialize AI generator widget
     */
    initializeAIGenerator() {
        if (this.aiGenerator) {
            return; // Already initialized
        }

        this.aiGenerator = AIImageGenerator.createProfileAvatarGenerator(
            'profile-avatar-generator',
            data => this.handleUseGeneratedAvatar(data)
        );
    }

    /**
     * Handle file upload
     */
    async handleFileUpload(event) {
        const [file] = event.target.files;

        if (!file) {
            return;
        }

        const validation = ProfileFormValidator.validateUploadedFile(file);

        if (!validation.valid) {
            this.domManager.showStatus('error', validation.message);

            return;
        }

        try {
            // Show loading state
            this.domManager.showStatus('info', 'Uploading avatar...');

            // Upload and save immediately
            const avatarUrl = await this.avatarManager.uploadAvatarFile();

            // Update user profile immediately
            await this.updateUserProfile({ avatarUrl });

            this.domManager.showUploadPreview(file);
            this.domManager.showStatus('success', 'Avatar updated successfully!');

            // Reset form state after successful update
            this.resetFormAfterAvatarUpdate();
        } catch (error) {
            console.error('Failed to upload avatar:', error);
            this.domManager.showStatus('error', 'Failed to upload avatar');
        }
    }

    /**
     * Remove uploaded file
     */
    removeUploadedFile() {
        this.avatarManager.removeUploadedFile();
        this.domManager.hideElement('uploadPreview');
        this.domManager.elements.avatarFileInput.value = '';

        // Uncheck upload radio
        const uploadRadio = document.getElementById('avatar-upload');

        if (uploadRadio) {
            uploadRadio.checked = false;
        }
    }

    /**
     * Select existing image
     */
    async selectExistingImage({ imageId, element }) {
        // Remove previous selection
        const previousSelected = this.domManager.elements.existingImagesGrid.querySelector('.selected');

        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }

        // Add selection to new element
        element.classList.add('selected');

        try {
            // Show loading state
            this.domManager.showStatus('info', 'Setting avatar...');

            // Set avatar immediately
            const avatarUrl = await this.avatarManager.setAvatarFromImage(imageId);

            // Update user profile immediately
            await this.updateUserProfile({ avatarUrl });

            this.domManager.showStatus('success', 'Avatar updated successfully!');

            // Reset form state after successful update
            this.resetFormAfterAvatarUpdate();
        } catch (error) {
            console.error('Failed to set avatar from existing image:', error);
            this.domManager.showStatus('error', 'Failed to set avatar');

            // Remove selection on error
            element.classList.remove('selected');
        }
    }

    /**
     * Update generation cost (legacy - now handled by widget)
     */
    updateGenerationCost() {
        // This is now handled by the AI generator widget
    }

    /**
     * Handle using generated avatar
     */
    async handleUseGeneratedAvatar(data) {
        if (!data || !data.imageUrl) {
            this.domManager.showStatus('error', 'No generated avatar to use');

            return;
        }

        try {
            // Update user's profile picture
            const updates = { avatarUrl: data.imageUrl };
            const { response, data: responseData } = await ProfileAPIService.updateProfile(updates);

            if (response.ok && responseData.success) {
                if (responseData.data.user) {
                    this.currentUser = { ...this.currentUser, ...responseData.data.user };
                    this.domManager.updateProfileDisplay(this.currentUser);
                    ProfileAuthUtils.syncUserData(this.currentUser);
                }

                this.domManager.showStatus('success', 'Avatar updated successfully!');
                this.resetFormAfterAvatarUpdate();
            } else {
                throw new Error(responseData.message || 'Failed to update avatar');
            }
        } catch (error) {
            console.error('Failed to use generated avatar:', error);
            this.domManager.showStatus('error', 'Failed to update avatar');
        }
    }

    /**
     * Handle regenerating avatar (legacy - now handled by widget)
     */
    handleRegenerateAvatar() {
        // This is now handled by the AI generator widget
    }

    /**
     * Handle avatar changes for save (removed - no longer needed)
     */
    async handleAvatarChangesForSave(_selectedAvatarType, _avatarState) {
        // No longer needed - each avatar type handles its own save operation
    }

    /**
     * Build profile updates object (removed - no longer needed)
     */
    buildProfileUpdates(_formData, _avatarUrl) {
        // No longer needed - each avatar type handles its own save operation
    }

    /**
     * Update user profile via API
     */
    async updateUserProfile(updates) {
        const { response, data } = await ProfileAPIService.updateProfile(updates);

        if (response.ok && data.success) {
            if (data.data.user) {
                this.currentUser = { ...this.currentUser, ...data.data.user };
                this.domManager.updateProfileDisplay(this.currentUser);
                ProfileAuthUtils.syncUserData(this.currentUser);
            }

            this.domManager.showStatus('success', 'Profile updated successfully');
            this.resetForm();
        } else {
            this.domManager.showStatus('error', data.message || 'Failed to update profile');
        }
    }

    /**
     * Update save button state (removed - no longer needed)
     */
    updateSaveButtonState() {
        // No longer needed - each avatar type handles its own save operation
    }

    /**
     * Save profile changes (removed - no longer needed)
     */
    async saveProfile() {
        // No longer needed - each avatar type handles its own save operation
    }

    /**
     * Cancel changes (removed - no longer needed)
     */
    cancelChanges() {
        // No longer needed - each avatar type handles its own operations
    }

    /**
     * Reset form
     */
    resetForm() {
        this.domManager.resetForm();
        this.avatarManager.reset();

        // Reset AI generator if it exists
        if (this.aiGenerator) {
            this.aiGenerator.reset();
        }

        this.updateSaveButtonState();
    }

    /**
     * Reset form state after successful avatar update
     */
    resetFormAfterAvatarUpdate() {
        // Uncheck all avatar option radio buttons
        const avatarRadios = document.querySelectorAll('input[name="avatar-type"]');

        avatarRadios.forEach(radio => {
            radio.checked = false;
        });

        // Hide all avatar forms
        this.domManager.hideAllAvatarForms();

        // Clear any selections in the existing images grid
        const selectedItems = this.domManager.elements.existingImagesGrid.querySelectorAll('.selected');

        selectedItems.forEach(item => item.classList.remove('selected'));

        // Reset avatar manager state
        this.avatarManager.reset();

        // Reset AI generator if it exists
        if (this.aiGenerator) {
            this.aiGenerator.reset();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
});

export default ProfileManager;
