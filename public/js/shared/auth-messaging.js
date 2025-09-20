/**
 * Shared Authentication Messaging System
 * Provides consistent error handling and user feedback for login/register screens
 */

class AuthMessaging {
    constructor() {
        this.errorElement = null;
        this.successElement = null;
        this.loadingElement = null;
        this.init();
    }

    init() {
        console.log('🔐 AUTH-MESSAGING: Initializing...');

        // Find common elements
        this.errorElement = document.getElementById('authError');
        this.successElement = document.getElementById('authSuccess');
        this.loadingElement = document.getElementById('authLoading');

        console.log('🔐 AUTH-MESSAGING: Elements found:', {
            error: !!this.errorElement,
            success: !!this.successElement,
            loading: !!this.loadingElement
        });

        // Create loading element if it doesn't exist
        if (!this.loadingElement) {
            this.createLoadingElement();
        }

        console.log('🔐 AUTH-MESSAGING: Initialization complete');
    }

    createLoadingElement() {
        console.log('🔐 AUTH-MESSAGING: Creating loading element...');

        this.loadingElement = document.createElement('div');
        this.loadingElement.id = 'authLoading';
        this.loadingElement.className = 'hidden mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm';
        this.loadingElement.innerHTML = `
            <div class="flex items-center space-x-2">
                <svg class="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing...</span>
            </div>
        `;

        // Insert after the form
        const form = document.querySelector('form');

        if (form) {
            form.parentNode.insertBefore(this.loadingElement, form.nextSibling);
            console.log('🔐 AUTH-MESSAGING: Loading element inserted after form');
        } else {
            console.warn('🔐 AUTH-MESSAGING: No form found to insert loading element');
        }
    }

    showError(message, details = null) {
        console.log('🔐 AUTH-MESSAGING: Showing error:', message, details);
        this.hideAll();

        if (this.errorElement) {
            this.errorElement.innerHTML = `
                <div class="flex items-start space-x-2">
                    <svg class="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p class="font-medium">${message}</p>
                        ${details ? `<p class="text-xs mt-1 opacity-75">${details}</p>` : ''}
                    </div>
                </div>
            `;
            this.errorElement.classList.remove('hidden');
            console.log('🔐 AUTH-MESSAGING: Error displayed successfully');
        } else {
            console.error('🔐 AUTH-MESSAGING: Error element not found, falling back to alert');
            alert(`Error: ${message}${details ? `\n\nDetails: ${details}` : ''}`);
        }

        console.error('🔐 AUTH-ERROR:', message, details);
    }

    showSuccess(message, details = null) {
        console.log('🔐 AUTH-MESSAGING: Showing success:', message, details);
        this.hideAll();

        if (this.successElement) {
            this.successElement.innerHTML = `
                <div class="flex items-start space-x-2">
                    <svg class="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p class="font-medium">${message}</p>
                        ${details ? `<p class="text-xs mt-1 opacity-75">${details}</p>` : ''}
                    </div>
                </div>
            `;
            this.successElement.classList.remove('hidden');
            console.log('🔐 AUTH-MESSAGING: Success displayed successfully');
        } else {
            console.warn('🔐 AUTH-MESSAGING: Success element not found, falling back to alert');
            alert(`Success: ${message}${details ? `\n\nDetails: ${details}` : ''}`);
        }

        console.log('🔐 AUTH-SUCCESS:', message, details);
    }

    showLoading(message = 'Processing...') {
        console.log('🔐 AUTH-MESSAGING: Showing loading:', message);
        this.hideAll();

        if (this.loadingElement) {
            this.loadingElement.querySelector('span').textContent = message;
            this.loadingElement.classList.remove('hidden');
            console.log('🔐 AUTH-MESSAGING: Loading displayed successfully');
        } else {
            console.warn('🔐 AUTH-MESSAGING: Loading element not found');
        }
    }

    hideAll() {
        console.log('🔐 AUTH-MESSAGING: Hiding all messages');
        if (this.errorElement) {
            this.errorElement.classList.add('hidden');
        }
        if (this.successElement) {
            this.successElement.classList.add('hidden');
        }
        if (this.loadingElement) {
            this.loadingElement.classList.add('hidden');
        }
    }

    clearMessages() {
        this.hideAll();
    }

    // Common error messages
    static getErrorMessage(error) {
        if (typeof error === 'string') {
            return error;
        }

        if (error.message) {
            return error.message;
        }

        if (error.status === 401) {
            return 'Invalid email or password';
        }

        if (error.status === 409) {
            return 'Account already exists with this email';
        }

        if (error.status === 422) {
            return 'Please check your input and try again';
        }

        if (error.status === 429) {
            return 'Too many attempts. Please wait a moment and try again';
        }

        if (error.status >= 500) {
            return 'Server error. Please try again later';
        }

        return 'An unexpected error occurred. Please try again';
    }

    // Validation helpers
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email || !emailRegex.test(email)) {
            return 'Please enter a valid email address';
        }

        return null;
    }

    validatePassword(password, confirmPassword = null) {
        if (!password || password.length < 6) {
            return 'Password must be at least 6 characters long';
        }

        if (confirmPassword && password !== confirmPassword) {
            return 'Passwords do not match';
        }

        return null;
    }

    // Show validation errors
    showValidationError(fieldId, message) {
        console.log('🔐 AUTH-MESSAGING: Showing validation error for', fieldId, ':', message);

        const field = document.getElementById(fieldId);

        if (field) {
            // Add error styling
            field.classList.add('border-red-500', 'focus:ring-red-500');

            // Show field-specific error
            let errorDiv = field.parentNode.querySelector('.field-error');

            if (!errorDiv) {
                errorDiv = document.createElement('p');
                errorDiv.className = 'field-error text-xs text-red-600 mt-1';
                field.parentNode.appendChild(errorDiv);
            }
            errorDiv.textContent = message;
        } else {
            console.warn('🔐 AUTH-MESSAGING: Field not found for validation error:', fieldId);
        }
    }

    clearValidationError(fieldId) {
        const field = document.getElementById(fieldId);

        if (field) {
            field.classList.remove('border-red-500', 'focus:ring-red-500');

            const errorDiv = field.parentNode.querySelector('.field-error');

            if (errorDiv) {
                errorDiv.remove();
            }
        }
    }

    clearAllValidationErrors() {
        const fields = ['loginEmail', 'loginPassword', 'registerEmail', 'registerPassword', 'confirmPassword'];

        fields.forEach(fieldId => this.clearValidationError(fieldId));
    }
}

// Initialize and export
console.log('🔐 AUTH-MESSAGING: Script loaded, creating instance...');
const authMessaging = new AuthMessaging();

if (typeof window !== 'undefined') {
    window.AuthMessaging = AuthMessaging;
    window.authMessaging = authMessaging;
    console.log('🔐 AUTH-MESSAGING: Exported to window');
}
