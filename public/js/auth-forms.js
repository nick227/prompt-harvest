/**
 * Simple Authentication Forms Handler with Debugging
 * Tracks when and why form attributes change
 */

class AuthFormsHandler {
    constructor() {
        console.log('🔐 AUTH-FORMS: Creating handler...');
        this.init();
    }

    async init() {
        try {
            console.log('🔐 AUTH-FORMS: Starting initialization...');

            // Wait for dependencies
            await this.waitForUserSystem();
            await this.waitForAuthMessaging();

            // Set up button handlers and form prevention
            this.setupButtonHandlers();

            console.log('🔐 AUTH-FORMS: Successfully initialized');

        } catch (error) {
            console.error('🔐 AUTH-FORMS: Initialization failed:', error);
            this.setupBasicFallback();
        }
    }

    async waitForUserSystem() {
        while (!window.userSystem) {
            console.log('🔐 AUTH-FORMS: Waiting for UserSystem...');
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('🔐 AUTH-FORMS: UserSystem found');
    }

    async waitForAuthMessaging() {
        while (!window.authMessaging) {
            console.log('🔐 AUTH-FORMS: Waiting for AuthMessaging...');
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('🔐 AUTH-FORMS: AuthMessaging found');
    }

    setupButtonHandlers() {
        console.log('🔐 AUTH-FORMS: Setting up button handlers...');

        // Handle button clicks instead of form submissions
        const loginButton = document.getElementById('loginSubmitBtn');
        const registerButton = document.getElementById('registerSubmitBtn');

        console.log('🔐 AUTH-FORMS: Found login button:', loginButton);
        console.log('🔐 AUTH-FORMS: Found register button:', registerButton);

        // Simple form submit prevention with debugging
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginForm) {
            console.log('🔐 AUTH-FORMS: Login form found, monitoring attributes...');
            console.log('🔐 AUTH-FORMS: Login form attributes:', {
                action: loginForm.action,
                method: loginForm.method,
                id: loginForm.id
            });

            // Monitor for changes to form attributes (for debugging only)
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'attributes' && (mutation.attributeName === 'action' || mutation.attributeName === 'method')) {
                        console.log('🔐 AUTH-FORMS: Form attributes changed!', {
                            attribute: mutation.attributeName,
                            oldValue: mutation.oldValue,
                            newValue: loginForm.getAttribute(mutation.attributeName),
                            action: loginForm.action,
                            method: loginForm.method
                        });
                    }
                });
            });

            observer.observe(loginForm, {
                attributes: true,
                attributeOldValue: true,
                attributeFilter: ['action', 'method']
            });
        }

        if (registerForm) {
            console.log('🔐 AUTH-FORMS: Register form found, monitoring attributes...');
            console.log('🔐 AUTH-FORMS: Register form attributes:', {
                action: registerForm.action,
                method: registerForm.method,
                id: registerForm.id
            });

            // Monitor for changes to form attributes (for debugging only)
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'attributes' && (mutation.attributeName === 'action' || mutation.attributeName === 'method')) {
                        console.log('🔐 AUTH-FORMS: Form attributes changed!', {
                            attribute: mutation.attributeName,
                            oldValue: mutation.oldValue,
                            newValue: registerForm.getAttribute(mutation.attributeName),
                            action: registerForm.action,
                            method: registerForm.method
                        });
                    }
                });
            });

            observer.observe(registerForm, {
                attributes: true,
                attributeOldValue: true,
                attributeFilter: ['action', 'method']
            });
        }

        if (loginButton) {
            console.log('🔐 AUTH-FORMS: Adding login button handler');
            loginButton.addEventListener('click', this.handleLoginClick.bind(this));
        }

        if (registerButton) {
            console.log('🔐 AUTH-FORMS: Adding register button handler');
            registerButton.addEventListener('click', this.handleRegisterClick.bind(this));
        }

        console.log('🔐 AUTH-FORMS: Button handlers setup complete');
    }

    setupBasicFallback() {
        console.log('🔐 AUTH-FORMS: Setting up basic fallback...');

        // Simple fallback - just show loading message
        const forms = document.querySelectorAll('form');

        forms.forEach(form => {
            console.log('🔐 AUTH-FORMS: Form found in fallback:', form.id);
        });
    }

    async handleLoginClick(e) {
        console.log('🔐 AUTH-FORMS: Login button clicked');
        e.preventDefault();
        console.log('🔐 AUTH-FORMS: Button click handled');

        if (!window.authMessaging) {
            alert('Authentication system not ready. Please refresh the page.');

            return;
        }

        try {
            // Clear previous messages
            window.authMessaging.clearMessages();
            window.authMessaging.clearAllValidationErrors();

            // Get form data
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            // Basic validation
            if (!email) {
                window.authMessaging.showValidationError('loginEmail', 'Email is required');

                return;
            }

            if (!password) {
                window.authMessaging.showValidationError('loginPassword', 'Password is required');

                return;
            }

            // Show loading
            window.authMessaging.showLoading('Signing in...');

            // Attempt login
            await window.userSystem.login(email, password);

            // Success
            window.authMessaging.showSuccess('Login successful! Redirecting...');

        } catch (error) {
            console.error('🔐 LOGIN-ERROR:', error);

            // Show error
            const errorMessage = this.getErrorMessage(error);

            window.authMessaging.showError(errorMessage);
        }
    }

    async handleRegisterClick(e) {
        console.log('🔐 AUTH-FORMS: Register button clicked');
        e.preventDefault();
        console.log('🔐 AUTH-FORMS: Button click handled');

        if (!window.authMessaging) {
            alert('Authentication system not ready. Please refresh the page.');

            return;
        }

        try {
            // Clear previous messages
            window.authMessaging.clearMessages();
            window.authMessaging.clearAllValidationErrors();

            // Get form data
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Debug password comparison
            console.log('🔐 AUTH-FORMS: Password validation:', {
                password: password ? `${password.substring(0, 2)}***` : 'empty',
                confirmPassword: confirmPassword ? `${confirmPassword.substring(0, 2)}***` : 'empty',
                passwordLength: password ? password.length : 0,
                confirmLength: confirmPassword ? confirmPassword.length : 0,
                match: password === confirmPassword
            });

            // More detailed debugging
            console.log('🔐 AUTH-FORMS: Raw values:', {
                password: `"${password}"`,
                confirmPassword: `"${confirmPassword}"`,
                passwordTrimmed: `"${password.trim()}"`,
                confirmTrimmed: `"${confirmPassword.trim()}"`,
                passwordCharCodes: password ? Array.from(password).map(c => c.charCodeAt(0)) : [],
                confirmCharCodes: confirmPassword ? Array.from(confirmPassword).map(c => c.charCodeAt(0)) : []
            });

            // Basic validation
            if (!email) {
                window.authMessaging.showValidationError('registerEmail', 'Email is required');

                return;
            }

            if (!password) {
                window.authMessaging.showValidationError('registerPassword', 'Password is required');

                return;
            }

            if (password !== confirmPassword) {
                window.authMessaging.showValidationError('confirmPassword', 'Passwords do not match');

                return;
            }

            if (password.length < 6) {
                window.authMessaging.showValidationError('registerPassword', 'Password must be at least 6 characters');

                return;
            }

            // Show loading
            window.authMessaging.showLoading('Creating account...');

            // Attempt registration
            console.log('🔐 AUTH-FORMS: Attempting registration with:', { email, password: '***' });
            const result = await window.userSystem.register(email, password, confirmPassword);

            console.log('🔐 AUTH-FORMS: Registration result:', result);

            // Success
            window.authMessaging.showSuccess('Account created successfully! Redirecting...');

        } catch (error) {
            console.error('🔐 REGISTER-ERROR:', error);

            // Show error
            const errorMessage = this.getErrorMessage(error);

            window.authMessaging.showError(errorMessage);
        }
    }

    getErrorMessage(error) {
        if (typeof error === 'string') {
            return error;
        }
        if (error.message) {
            return error.message;
        }
        if (error.error) {
            return error.error;
        }

        return 'An unexpected error occurred';
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🔐 AUTH-FORMS: DOM ready, creating handler...');
        new AuthFormsHandler();
    });
} else {
    console.log('🔐 AUTH-FORMS: DOM already ready, creating handler...');
    new AuthFormsHandler();
}

// Export for global access
window.AuthFormsHandler = AuthFormsHandler;
