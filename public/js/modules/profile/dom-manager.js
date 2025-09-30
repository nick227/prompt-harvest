/**
 * DOM Manager for Profile Management
 * Handles all DOM operations and element caching
 */

class ProfileDOMManager {
    constructor() {
        this.elements = this.cacheElements();
        this.usernameCheckTimer = null;
        this.lastUsernameValue = '';
        // Elements cached successfully
        this.setupEventListeners();
    }

    /**
     * Cache DOM elements for better performance
     */
    cacheElements() {
        return {
            // Profile display
            currentUsername: document.getElementById('current-username'),
            currentEmail: document.getElementById('current-email'),
            currentAvatar: document.getElementById('current-avatar'),

            // Username form
            usernameInput: document.getElementById('username-input'),
            updateUsernameBtn: document.getElementById('update-username-btn'),
            usernameStatus: document.getElementById('username-status'),

            // Avatar options
            avatarUpload: document.getElementById('avatar-upload'),
            avatarGenerate: document.getElementById('avatar-generate'),
            avatarExisting: document.getElementById('avatar-existing'),
            avatarFileInput: document.getElementById('avatar-file-input'),

            // Forms
            aiGenerationForm: document.getElementById('ai-generation-form'),
            existingImagesGrid: document.getElementById('existing-images-grid'),

            // AI generation
            avatarPrompt: document.getElementById('avatar-prompt'),
            avatarProviders: document.getElementById('avatar-providers'),
            avatarGenerationCost: document.getElementById('avatar-generation-cost'),
            generateAvatarBtn: document.getElementById('generate-avatar-btn'),

            // AI generation preview
            aiGenerationPreview: document.getElementById('ai-generation-preview'),
            generatedAvatarImg: document.getElementById('generated-avatar-img'),
            generationStatusText: document.getElementById('generation-status-text'),
            generatedPromptText: document.getElementById('generated-prompt-text'),
            generatedProviderText: document.getElementById('generated-provider-text'),
            useGeneratedAvatar: document.getElementById('use-generated-avatar'),
            regenerateAvatar: document.getElementById('regenerate-avatar'),

            // Actions removed - no longer needed

            // Status
            profileUpdateStatus: document.getElementById('profile-update-status')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const { elements } = this;
        // Setting up event listeners

        // Username input events
        if (elements.usernameInput) {
            elements.usernameInput.addEventListener('input', e => this.handleUsernameInput(e));
            elements.usernameInput.addEventListener('keydown', e => this.handleUsernameKeydown(e));
            elements.usernameInput.addEventListener('keyup', e => this.handleUsernameKeyup(e));
            elements.usernameInput.addEventListener('keypress', e => this.emit('usernameKeypress', e));
        }

        if (elements.updateUsernameBtn) {
            elements.updateUsernameBtn.addEventListener('click', () => this.emit('updateUsername'));
        }

        // File input events
        if (elements.avatarFileInput) {
            elements.avatarFileInput.addEventListener('change', e => this.emit('fileUpload', e));
        }


        // Action buttons removed - no longer needed

        // Avatar options
        if (elements.avatarUpload) {
            elements.avatarUpload.addEventListener('change', e => this.emit('avatarOptionChange', e));
        }
        if (elements.avatarGenerate) {
            elements.avatarGenerate.addEventListener('change', e => this.emit('avatarOptionChange', e));
        }
        if (elements.avatarExisting) {
            elements.avatarExisting.addEventListener('change', e => this.emit('avatarOptionChange', e));
        }

        // AI generation
        if (elements.avatarProviders) {
            elements.avatarProviders.addEventListener('change', () => this.emit('providerChange'));
        }

        if (elements.generateAvatarBtn) {
            elements.generateAvatarBtn.addEventListener('click', () => this.emit('generateAvatar'));
        }

        if (elements.useGeneratedAvatar) {
            elements.useGeneratedAvatar.addEventListener('click', () => this.emit('useGeneratedAvatar'));
        }

        if (elements.regenerateAvatar) {
            elements.regenerateAvatar.addEventListener('click', () => this.emit('regenerateAvatar'));
        }
    }

    /**
     * Event emitter for DOM events
     */
    emit(eventName, data) {
        const event = new CustomEvent(`profile:${eventName}`, { detail: data });

        document.dispatchEvent(event);
    }

    /**
     * Handle username input with immediate feedback
     */
    handleUsernameInput(event) {
        const username = event.target.value.trim();
        const statusElement = this.elements.usernameStatus;

        // Clear previous timer
        if (this.usernameCheckTimer) {
            clearTimeout(this.usernameCheckTimer);
            this.usernameCheckTimer = null;
        }

        // Clear status if user is typing
        if (statusElement && username.length > 0) {
            statusElement.textContent = '';
            statusElement.className = 'input-status';
        }

        // Clear input visual state classes
        if (this.elements.usernameInput) {
            this.elements.usernameInput.classList.remove('valid', 'checking', 'invalid');
        }

        // Emit the original event for backward compatibility
        this.emit('usernameInput', event);
    }

    /**
     * Handle username keydown - disable update button immediately when user starts typing
     */
    handleUsernameKeydown(event) {
        // Disable update button immediately when user starts typing
        const { updateUsernameBtn } = this.elements;

        if (updateUsernameBtn) {
            updateUsernameBtn.disabled = true;
        }
    }

    /**
     * Handle username keyup with timer for auto-check
     */
    handleUsernameKeyup(event) {
        const username = event.target.value.trim();

        // Clear previous timer
        if (this.usernameCheckTimer) {
            clearTimeout(this.usernameCheckTimer);
        }

        // Only set timer if username is valid and different from last check
        if (username.length >= 3 && username !== this.lastUsernameValue) {
            // Show checking status
            this.showUsernameStatus('checking', 'Checking availability...');

            console.log('🔍 DOM MANAGER: Setting timer for username check:', username);

            this.usernameCheckTimer = setTimeout(() => {
                console.log('🔍 DOM MANAGER: Timer fired, checking username:', username);
                this.emit('checkUsername');
                this.lastUsernameValue = username;
            }, 1000); // 1 second delay
        }
    }

    /**
     * Update profile display
     */
    updateProfileDisplay(user) {
        if (!user) {
            return;
        }

        this.setTextContent('currentUsername', user.username || 'Loading...');
        this.setTextContent('currentEmail', user.email || 'Loading...');

        if (user.picture && this.elements.currentAvatar) {
            this.elements.currentAvatar.src = user.picture;
            this.elements.currentAvatar.alt = `${user.username}'s profile picture`;
        }
    }

    /**
     * Show/hide elements
     */
    showElement(id) {
        const element = this.elements[id];

        if (element) {
            element.classList.remove('hidden');
        }
    }

    hideElement(id) {
        const element = this.elements[id];

        if (element) {
            element.classList.add('hidden');
        }
    }

    /**
     * Hide all avatar forms
     */
    hideAllAvatarForms() {
        const forms = ['aiGenerationForm', 'existingImagesGrid', 'avatarFileInput', 'aiGenerationPreview'];

        forms.forEach(formId => this.hideElement(formId));
    }

    /**
     * Show avatar form based on selection
     */
    showAvatarForm(type) {
        // Showing avatar form
        this.hideAllAvatarForms();

        switch (type) {
            case 'upload':
                this.showElement('avatarFileInput');
                break;
            case 'generate':
                this.showElement('aiGenerationForm');
                break;
            case 'existing':
                this.showElement('existingImagesGrid');
                break;
        }
    }

    /**
     * Update username status
     */
    showUsernameStatus(type, message) {
        const { usernameStatus, updateUsernameBtn, usernameInput } = this.elements;

        if (!usernameStatus) {
            return;
        }

        usernameStatus.textContent = message;
        usernameStatus.className = `input-status ${type}`;

        // Update input field visual state
        if (usernameInput) {
            usernameInput.classList.remove('valid', 'checking', 'invalid');
            if (type === 'success') {
                usernameInput.classList.add('valid');
            } else if (type === 'checking') {
                usernameInput.classList.add('checking');
            } else if (type === 'error') {
                usernameInput.classList.add('invalid');
            }
        }

        // Enable update button only if username is available AND input is not empty
        const username = usernameInput?.value?.trim() || '';
        const shouldEnable = type === 'success' && username.length >= 3;

        if (updateUsernameBtn) {
            updateUsernameBtn.disabled = !shouldEnable;

            console.log('🔍 DOM MANAGER: showUsernameStatus debug:', {
                type,
                message,
                username,
                usernameLength: username.length,
                shouldEnable,
                hasUpdateBtn: !!updateUsernameBtn,
                buttonDisabled: updateUsernameBtn.disabled
            });
        } else {
            console.error('❌ DOM MANAGER: updateUsernameBtn element not found!');
        }
    }

    /**
     * Update username button states
     */
    updateUsernameButtonStates(isAvailable = false) {
        const { updateUsernameBtn } = this.elements;

        if (updateUsernameBtn) {
            updateUsernameBtn.disabled = !isAvailable;
        }
    }

    /**
     * Test method to manually enable button (for debugging)
     */
    testEnableButton() {
        const { updateUsernameBtn } = this.elements;

        if (updateUsernameBtn) {
            updateUsernameBtn.disabled = false;
            console.log('🔍 DOM MANAGER: TEST - Button manually enabled');
        }
    }

    /**
     * Update save button state (removed - no longer needed)
     */
    updateSaveButtonState(isEnabled, reason = '') {
        // No longer needed - each avatar type handles its own save operation
    }


    /**
     * Display existing images
     */
    displayExistingImages(images) {
        const { existingImagesGrid } = this.elements;

        if (!existingImagesGrid) {
            return;
        }

        // Displaying existing images

        if (images.length === 0) {
            existingImagesGrid.innerHTML = '<p class="text-gray-500">No images found</p>';

            return;
        }

        existingImagesGrid.innerHTML = images.map(image => `
            <div class="existing-image-item" data-image-id="${image.id}">
                <img src="${image.url || image.imageUrl}" alt="Generated image" class="existing-image-thumbnail">
                <div class="image-overlay">
                    <span class="image-prompt">${image.prompt?.substring(0, 50)}...</span>
                </div>
            </div>
        `).join('');

        // Add click listeners
        existingImagesGrid.querySelectorAll('.existing-image-item').forEach(item => {
            item.addEventListener('click', () => {
                const { imageId } = item.dataset;

                this.emit('selectExistingImage', { imageId, element: item });
            });
        });
    }

    /**
     * Update generation cost
     */
    updateGenerationCost(cost = 1) {
        const { avatarGenerationCost } = this.elements;

        if (avatarGenerationCost) {
            avatarGenerationCost.textContent = `${cost} credit${cost !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Show status message
     */
    showStatus(type, message) {
        const { profileUpdateStatus } = this.elements;

        if (!profileUpdateStatus) {
            return;
        }

        profileUpdateStatus.textContent = message;
        profileUpdateStatus.className = `profile-status ${type}`;
    }

    /**
     * Reset form
     */
    resetForm() {
        const { usernameInput, usernameStatus, avatarFileInput } = this.elements;

        if (usernameInput) {
            usernameInput.value = '';
        }
        if (usernameStatus) {
            usernameStatus.textContent = '';
        }
        if (avatarFileInput) {
            avatarFileInput.value = '';
        }

        this.hideAllAvatarForms();
        this.updateSaveButtonState(false);
    }

    /**
     * Utility method to set text content safely
     */
    setTextContent(elementId, text) {
        const element = this.elements[elementId];

        if (element) {
            element.textContent = text;
        }
    }

    /**
     * Get form data
     */
    getFormData() {
        const { usernameInput, avatarPrompt, avatarProviders } = this.elements;

        return {
            username: usernameInput?.value?.trim() || '',
            avatarPrompt: avatarPrompt?.value?.trim() || '',
            avatarProvider: avatarProviders?.value || 'dalle3'
        };
    }

    /**
     * Get selected avatar type
     */
    getSelectedAvatarType() {
        const selected = document.querySelector('input[name="avatar-type"]:checked');

        return selected?.value || null;
    }

    /**
     * Show AI generation preview
     */
    showAIGenerationPreview(avatarUrl, prompt, provider) {
        const { aiGenerationPreview, generatedAvatarImg, generatedPromptText, generatedProviderText } = this.elements;

        if (generatedAvatarImg) {
            generatedAvatarImg.src = avatarUrl;
        }
        if (generatedPromptText) {
            generatedPromptText.textContent = prompt;
        }
        if (generatedProviderText) {
            generatedProviderText.textContent = provider === 'dalle3' ? 'DALL-E 3' : 'DALL-E 2';
        }

        this.showElement('aiGenerationPreview');
    }

    /**
     * Show generation loading state
     */
    showGenerationLoading() {
        const { generateAvatarBtn, generationStatusText } = this.elements;

        if (generateAvatarBtn) {
            generateAvatarBtn.disabled = true;
            generateAvatarBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Generating...';
        }

        if (generationStatusText) {
            generationStatusText.textContent = 'Generating your avatar...';
            generationStatusText.parentElement.className = 'generation-status generating';
        }
    }

    /**
     * Hide generation loading state
     */
    hideGenerationLoading() {
        const { generateAvatarBtn, generationStatusText } = this.elements;

        if (generateAvatarBtn) {
            generateAvatarBtn.disabled = false;
            generateAvatarBtn.innerHTML = '<i class="fas fa-magic" aria-hidden="true"></i> Generate Avatar';
        }

        if (generationStatusText) {
            generationStatusText.textContent = 'Ready to use';
            generationStatusText.parentElement.className = 'generation-status';
        }
    }

    /**
     * Show generation error
     */
    showGenerationError(message) {
        const { generationStatusText } = this.elements;

        if (generationStatusText) {
            generationStatusText.textContent = message;
            generationStatusText.parentElement.className = 'generation-status error';
        }
    }
}

// Export for global access
window.ProfileDOMManager = ProfileDOMManager;
