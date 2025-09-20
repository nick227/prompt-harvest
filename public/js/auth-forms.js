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

        const loginButton = document.getElementById('loginSubmitBtn');
        const registerButton = document.getElementById('registerSubmitBtn');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        this.setupFormMonitoring(loginForm, registerForm);
        this.setupButtonClickHandlers(loginButton, registerButton);

        console.log('🔐 AUTH-FORMS: Button handlers setup complete');
    }

    setupFormMonitoring(loginForm, registerForm) {
        if (loginForm) {
            this.monitorFormAttributes(loginForm, 'Login');
        }

        if (registerForm) {
            this.monitorFormAttributes(registerForm, 'Register');
        }
    }

    monitorFormAttributes(form, formType) {
        console.log(`🔐 AUTH-FORMS: ${formType} form found, monitoring attributes...`);
        console.log(`🔐 AUTH-FORMS: ${formType} form attributes:`, {
            action: form.action,
            method: form.method,
            id: form.id
        });

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && (mutation.attributeName === 'action' || mutation.attributeName === 'method')) {
                    console.log(`🔐 AUTH-FORMS: ${formType} form attributes changed!`, {
                        attribute: mutation.attributeName,
                        oldValue: mutation.oldValue,
                        newValue: form.getAttribute(mutation.attributeName),
                        action: form.action,
                        method: form.method
                    });
                }
            });
        });

        observer.observe(form, {
            attributes: true,
            attributeOldValue: true,
            attributeFilter: ['action', 'method']
        });
    }

    setupButtonClickHandlers(loginButton, registerButton) {
        if (loginButton) {
            console.log('🔐 AUTH-FORMS: Adding login button handler');
            loginButton.addEventListener('click', this.handleLoginClick.bind(this));
        }

        if (registerButton) {
            console.log('🔐 AUTH-FORMS: Adding register button handler');
            registerButton.addEventListener('click', this.handleRegisterClick.bind(this));
        }
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
            this.showFallbackError('Authentication system not ready. Please refresh the page.');

            return;
        }

        try {
            window.authMessaging.clearMessages();
            window.authMessaging.clearAllValidationErrors();

            const formData = this.getLoginFormData();

            if (!this.validateLoginForm(formData)) {
                return;
            }

            await this.performLogin(formData);
        } catch (error) {
            this.handleLoginError(error);
        }
    }

    getLoginFormData() {
        return {
            email: document.getElementById('loginEmail').value.trim(),
            password: document.getElementById('loginPassword').value
        };
    }

    validateLoginForm(formData) {
        const { email, password } = formData;

        if (!email) {
            window.authMessaging.showValidationError('loginEmail', 'Email is required');

            return false;
        }

        if (!password) {
            window.authMessaging.showValidationError('loginPassword', 'Password is required');

            return false;
        }

        return true;
    }

    async performLogin(formData) {
        const { email, password } = formData;

        window.authMessaging.showLoading('Signing in...');
        await window.userSystem.login(email, password);
        window.authMessaging.showSuccess('Login successful! Redirecting...');
    }

    handleLoginError(error) {
        console.error('🔐 LOGIN-ERROR:', error);
        const errorMessage = this.getErrorMessage(error);

        window.authMessaging.showError(errorMessage);
    }

    async handleRegisterClick(e) {
        console.log('🔐 AUTH-FORMS: Register button clicked');
        e.preventDefault();
        console.log('🔐 AUTH-FORMS: Button click handled');

        if (!window.authMessaging) {
            this.showFallbackError('Authentication system not ready. Please refresh the page.');

            return;
        }

        try {
            window.authMessaging.clearMessages();
            window.authMessaging.clearAllValidationErrors();

            const formData = this.getRegisterFormData();

            this.logPasswordValidation(formData);

            if (!this.validateRegisterForm(formData)) {
                return;
            }

            await this.performRegistration(formData);
        } catch (error) {
            this.handleRegisterError(error);
        }
    }

    getRegisterFormData() {
        return {
            email: document.getElementById('registerEmail').value.trim(),
            password: document.getElementById('registerPassword').value,
            confirmPassword: document.getElementById('confirmPassword').value
        };
    }

    logPasswordValidation(formData) {
        const { password, confirmPassword } = formData;

        console.log('🔐 AUTH-FORMS: Password validation:', {
            password: password ? `${password.substring(0, 2)}***` : 'empty',
            confirmPassword: confirmPassword ? `${confirmPassword.substring(0, 2)}***` : 'empty',
            passwordLength: password ? password.length : 0,
            confirmLength: confirmPassword ? confirmPassword.length : 0,
            match: password === confirmPassword
        });

        console.log('🔐 AUTH-FORMS: Raw values:', {
            password: `"${password}"`,
            confirmPassword: `"${confirmPassword}"`,
            passwordTrimmed: `"${password.trim()}"`,
            confirmTrimmed: `"${confirmPassword.trim()}"`,
            passwordCharCodes: password ? Array.from(password).map(c => c.charCodeAt(0)) : [],
            confirmCharCodes: confirmPassword ? Array.from(confirmPassword).map(c => c.charCodeAt(0)) : []
        });
    }

    validateRegisterForm(formData) {
        const { email, password, confirmPassword } = formData;

        if (!email) {
            window.authMessaging.showValidationError('registerEmail', 'Email is required');

            return false;
        }

        if (!password) {
            window.authMessaging.showValidationError('registerPassword', 'Password is required');

            return false;
        }

        if (password !== confirmPassword) {
            window.authMessaging.showValidationError('confirmPassword', 'Passwords do not match');

            return false;
        }

        if (password.length < 6) {
            window.authMessaging.showValidationError('registerPassword', 'Password must be at least 6 characters');

            return false;
        }

        return true;
    }

    async performRegistration(formData) {
        const { email, password, confirmPassword } = formData;

        window.authMessaging.showLoading('Creating account...');

        console.log('🔐 AUTH-FORMS: Attempting registration with:', { email, password: '***' });
        const result = await window.userSystem.register(email, password, confirmPassword);

        console.log('🔐 AUTH-FORMS: Registration result:', result);
        window.authMessaging.showSuccess('Account created successfully! Redirecting...');
    }

    handleRegisterError(error) {
        console.error('🔐 REGISTER-ERROR:', error);
        const errorMessage = this.getErrorMessage(error);

        window.authMessaging.showError(errorMessage);
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

    showFallbackError(message) {
        // Create a simple error display when authMessaging is not available
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
