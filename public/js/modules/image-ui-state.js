/**
 * Image UI State Manager
 * Extracted from images.js - handles UI states, button management, and user interactions
 */

class ImageUIState {
    constructor() {
        this.isGenerating = false;
    }

    disableGenerateButton() {
        const generateBtn = document.querySelector('.btn-generate');

        if (generateBtn) {
            generateBtn.classList.add('processing');
            generateBtn.textContent = 'Generating...';
            generateBtn.disabled = true;
            generateBtn.style.cssText = `
                opacity: 0.7;
                cursor: not-allowed;
                animation: processing 1.5s ease-in-out infinite;
            `;
        }
    }

    enableGenerateButton() {
        const generateBtn = document.querySelector('.btn-generate');

        if (generateBtn) {
            generateBtn.classList.remove('processing');
            generateBtn.textContent = 'START';
            generateBtn.disabled = false;
            generateBtn.style.cssText = `
                opacity: 1;
                cursor: pointer;
                animation: none;
            `;
        }
    }

    setGeneratingState(isGenerating) {
        this.isGenerating = isGenerating;
        if (isGenerating) {
            this.disableGenerateButton();
        } else {
            this.enableGenerateButton();
        }
    }

    updateButtonState() {
        const generateBtn = document.querySelector('.btn-generate');

        if (!generateBtn) {
            return;
        }

        const hasProviders = this.isProviderSelected();
        const hasPrompt = this.getCurrentPrompt().length > 0;
        const isAuthenticated = window.userApi && window.userApi.isAuthenticated();

        // Don't update if currently generating
        if (this.isGenerating) {
            return;
        }

        if (!isAuthenticated) {
            // Button disabled for auth reasons
            generateBtn.disabled = true;
            generateBtn.textContent = 'LOGIN REQUIRED';
            generateBtn.style.cssText = `
                opacity: 0.6;
                cursor: not-allowed;
                background: #6b7280;
            `;
        } else if (!hasProviders) {
            // Button disabled for missing providers
            generateBtn.disabled = true;
            generateBtn.textContent = 'SELECT PROVIDERS';
            generateBtn.style.cssText = `
                opacity: 0.6;
                cursor: not-allowed;
                background: #ef4444;
            `;
        } else if (!hasPrompt) {
            // Button disabled for missing prompt
            generateBtn.disabled = true;
            generateBtn.textContent = 'ENTER PROMPT';
            generateBtn.style.cssText = `
                opacity: 0.6;
                cursor: not-allowed;
                background: #f59e0b;
            `;
        } else {
            // Button enabled
            this.enableGenerateButton();
        }
    }

    isProviderSelected() {
        const checkedProviders = Array.from(
            document.querySelectorAll('input[name="providers"]:checked')
        );

        return checkedProviders.length > 0;
    }

    getCurrentPrompt() {
        const textarea = document.querySelector('#prompt-textarea');

        return textarea ? textarea.value.trim() : '';
    }

    getSelectedProviders() {
        const checkedProviders = Array.from(
            document.querySelectorAll('input[name="providers"]:checked')
        );

        return checkedProviders.map(input => input.value);
    }

    validateGenerationInputs() {
        const prompt = this.getCurrentPrompt();
        const providers = this.getSelectedProviders();

        const errors = [];

        if (!prompt) {
            errors.push('Please enter a prompt');
        }

        if (providers.length === 0) {
            errors.push('Please select at least one AI provider');
        }

        return {
            isValid: errors.length === 0,
            errors,
            prompt,
            providers
        };
    }

    showValidationErrors(errors) {
        errors.forEach(error => {
            console.warn(`⚠️ VALIDATION: ${error}`);
            this.showError(error);
        });

        // Special handling for provider selection error
        const providerError = errors.find(error => error.includes('provider'));

        if (providerError) {
            this.showProviderSelectionAlert();

            return;
        }

        // Could integrate with notification system here
        if (window.ErrorHandler) {
            window.ErrorHandler.showUserError(errors.join('. '));
        }
    }

    showProviderSelectionAlert() {
        console.log('🔒 PROVIDER: Showing provider selection alert');

        // Show prominent alert for provider selection
        if (window.ErrorHandler) {
            window.ErrorHandler.showUserError('Please select at least one AI provider to generate images. You can select multiple providers or use the "all" option.', () => {
                // Focus on provider section
                const providerSection = document.getElementById('provider-list');

                if (providerSection) {
                    providerSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Add a temporary highlight
                    providerSection.style.border = '2px solid #ef4444';
                    providerSection.style.borderRadius = '8px';
                    setTimeout(() => {
                        providerSection.style.border = '';
                        providerSection.style.borderRadius = '';
                    }, 3000);
                }
            });
        } else {
            // Fallback: show error
            this.showError('Please select at least one AI provider to generate images.');
        }
    }

    showAuthRequiredMessage() {
        console.log('🔒 AUTH: Showing authentication required message');

        // Show authentication required message
        if (window.ErrorHandler) {
            window.ErrorHandler.showUserError('Please log in to generate images. Click here to login.', () => {
                // Redirect to login page
                window.location.href = '/login.html';
            });
        } else {
            // Fallback: show error
            this.showError('Please log in to generate images.');
            window.location.href = '/login.html';
        }
    }

    showGenerationSuccess(_imageData) {
        console.log('✅ Generation completed successfully');

        // Could show success notification here
        if (window.ErrorHandler) {
            // Don't show success message for now to avoid spam
            // window.ErrorHandler.showUserError('Image generated successfully!');
        }
    }

    showGenerationError(error) {
        console.error('❌ Generation failed:', error);

        if (window.ErrorHandler) {
            window.ErrorHandler.handleGenerationError(error);
        } else {
            console.warn('Image generation failed. Please try again.');
        }
    }

    // Event listener management
    setupEventListeners(handleGenerateClick) {
        const generateBtn = document.querySelector('.btn-generate');

        if (generateBtn) {
            // Store bound function for proper event listener management
            if (!this.boundHandleGenerateClick) {
                this.boundHandleGenerateClick = handleGenerateClick;
            }

            // Remove any existing listeners to avoid duplicates
            generateBtn.removeEventListener('click', this.boundHandleGenerateClick);

            // Add the click listener with validation check
            generateBtn.addEventListener('click', e => {
                // Check if button is disabled due to missing providers
                if (generateBtn.disabled && !this.isProviderSelected()) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showProviderSelectionAlert();

                    return;
                }

                // Check if button is disabled due to missing prompt
                if (generateBtn.disabled && !this.getCurrentPrompt()) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showError('Please enter a prompt before generating images.');

                    return;
                }

                // Check if button is disabled due to authentication
                if (generateBtn.disabled && (!window.userApi || !window.userApi.isAuthenticated())) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showAuthRequiredMessage();

                    return;
                }

                // Call the original handler
                this.boundHandleGenerateClick(e);
            });

            // Set up real-time button state updates
            this.setupButtonStateListeners();
        } else {
            console.error('❌ ImageUIState: Generate button not found');

            // Only retry a limited number of times to prevent infinite loops
            this.retryCount = (this.retryCount || 0) + 1;
            if (this.retryCount < 5) {
                setTimeout(() => {
                    this.setupEventListeners(handleGenerateClick);
                }, 1000);
            } else {
                console.error('❌ ImageUIState: Max retries reached, giving up on button setup');
            }
        }
    }

    setupButtonStateListeners() {
        // Listen for provider changes
        document.addEventListener('change', e => {
            if (e.target.name === 'providers') {
                this.updateButtonState();
            }
        });

        // Listen for prompt changes
        const promptTextarea = document.querySelector('#prompt-textarea');

        if (promptTextarea) {
            promptTextarea.addEventListener('input', () => {
                this.updateButtonState();
            });
        }

        // Delay initial button state update to allow providers to load from localStorage
        setTimeout(() => {
            this.updateButtonState();
        }, 200);
    }

    cleanup() {
        const generateBtn = document.querySelector('.btn-generate');

        if (generateBtn && this.boundHandleGenerateClick) {
            generateBtn.removeEventListener('click', this.boundHandleGenerateClick);
        }
    }

    showError(message) {
        // Create a simple error display
        const errorDiv = document.createElement('div');

        errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// Export for global access
window.ImageUIState = ImageUIState;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageUIState;
}
