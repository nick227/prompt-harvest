/* global userApi */
// User management module using centralized API service
let _user = null;

// Note: Email validation now handled by apiService.isValidEmail()

/**
 * Fallback email validation function
 */
const isValidEmailFallback = email => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    return re.test(String(email).toLowerCase());
};

/**
 * Safe email validation with fallback
 */
const validateEmail = email => {
    if (window.apiService && typeof window.apiService.isValidEmail === 'function') {
        return window.apiService.isValidEmail(email);
    }
    console.warn('⚠️ apiService.isValidEmail not available, using fallback validation');

    return isValidEmailFallback(email);
};

/**
 * Check password strength
 */
const checkPasswordStrength = password => {
    let score = 0;
    const feedback = [];

    if (password.length >= 8) {
        score++;
    } else {
        feedback.push('At least 8 characters');
    }

    if ((/[a-z]/).test(password)) {
        score++;
    } else {
        feedback.push('Lowercase letter');
    }

    if ((/[A-Z]/).test(password)) {
        score++;
    } else {
        feedback.push('Uppercase letter');
    }

    if ((/[0-9]/).test(password)) {
        score++;
    } else {
        feedback.push('Number');
    }

    if ((/[^A-Za-z0-9]/).test(password)) {
        score++;
    } else {
        feedback.push('Special character');
    }

    let strength;
    let color;

    if (score < 2) {
        strength = 'weak';
        color = 'red';
    } else if (score < 4) {
        strength = 'medium';
        color = 'yellow';
    } else {
        strength = 'strong';
        color = 'green';
    }

    return { score, strength, color, feedback };
};

/**
 * Register new user
 */
const registerUser = async e => {
    e.preventDefault();
    try {
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword')/* TODO: Refactor nested ternary */?.value || password;

        // Clear previous messages
        hideMessages();

        // Client-side validation
        if (!email) {
            throw new Error('Email is required');
        }

        // Basic email validation
        if (!validateEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        if (!password) {
            throw new Error('Password is required');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }

        // Show loading state
        showAuthLoading('register');
        const data = await userApi.register(email, password, confirmPassword);

        // Extract user data from the correct response structure
        const userData = data.data?.user || data.user || data;

        if (data.success && userData) {
            // Set the user data
            _user = userData;

            // Check if we have a token (should be handled by UserApiService)
            if (data.data?.token || data.token) { /* Empty block */ }

            // Update the authentication component

            if (window.authComponent) {
                window.authComponent.setUser(userData);

            } else {
                console.warn('⚠️ Authentication component not available');
            }

            showSuccessMessage('Registration successful! Redirecting to homepage...');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        } else {
            throw new Error('Registration response format unexpected');
        }
    } catch (error) {
        console.error('❌ Registration failed:', error);
        showErrorMessage(error.message || 'Registration failed. Please try again.');
    } finally {
        hideAuthLoading('register');
    }
};

/**
 * Login user
 */
const loginUser = async e => {
    console.log('🔐 LOGIN: Form submitted');
    e.preventDefault();

    try {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        console.log('🔐 LOGIN: Extracted credentials', { email: email ? 'PROVIDED' : 'EMPTY', password: password ? 'PROVIDED' : 'EMPTY' });

        // Clear previous messages
        hideMessages();

        // Client-side validation
        if (!email) {
            throw new Error('Email is required');
        }

        // Basic email validation
        if (!validateEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        if (!password) {
            throw new Error('Password is required');
        }

        // Show loading state
        showAuthLoading('login');
        console.log('🔐 LOGIN: Calling userApi.login...');
        const data = await userApi.login(email, password);

        console.log('🔐 LOGIN: Received response', data);

        // Extract user data from the correct response structure
        const userData = data.data?.user || data.user || data;

        if (data.success && userData) {
            _user = userData;

            // Update the authentication component
            if (window.authComponent) {
                window.authComponent.setUser(userData);
            }

            showSuccessMessage('Login successful! Redirecting to homepage...');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        } else {
            throw new Error('Login response format unexpected');
        }
    } catch (error) {
        console.error('❌ Login failed:', error);
        showErrorMessage(error.message || 'Login failed. Please try again.');
    } finally {
        hideAuthLoading('login');
    }
};

/**
 * Check if user is authenticated
 */
const _checkUser = async() => {
    try {
        if (!userApi.isAuthenticated()) {
            return null;
        }

        const userData = await userApi.getProfile();

        // Extract user data from response structure
        const _user = userData.data?.user || userData.user || userData;

        window.user = _user;

        return _user;
    } catch (error) {
        console.warn('User check failed:', error.message);

        return null;
    }
};

/**
 * Logout user
 */
const logoutUser = async() => {
    try {

        await userApi.logout();
        _user = null;

        // Update authentication component
        if (window.authComponent) {
            window.authComponent.setUser(null);

        }

        showSuccessMessage('Logged out successfully');
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    } catch (error) {
        console.error('❌ Logout failed:', error);
        showErrorMessage(`Logout failed: ${error.message}`);
    }
};

/**
 * Show authentication loading state
 */
const showAuthLoading = type => {
    const form = document.getElementById(`${type}Form`);

    if (form) {
        const submitBtn = form.querySelector('button[type="submit"]');

        if (submitBtn) {
            submitBtn.disabled = true;
            const buttonText = type === 'login' ? 'Signing In...' : 'Creating Account...';

            submitBtn.innerHTML = `
                <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                    <svg class="animate-spin h-5 w-5 text-purple-300" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </span>
                ${buttonText}
            `;

            // Disable all form inputs during loading
            const inputs = form.querySelectorAll('input');

            inputs.forEach(input => {
                input.disabled = true;
            });
        }
    }
};

/**
 * Hide authentication loading state
 */
const hideAuthLoading = type => {
    const form = document.getElementById(`${type}Form`);

    if (form) {
        const submitBtn = form.querySelector('button[type="submit"]');

        if (submitBtn) {
            submitBtn.disabled = false;
            const buttonText = type === 'login' ? 'Sign In' : 'Create Account';

            submitBtn.innerHTML = `
                <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                    <svg class="h-5 w-5 text-purple-300 group-hover:text-purple-200 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                </span>
                ${buttonText}
            `;

            // Re-enable all form inputs
            const inputs = form.querySelectorAll('input');

            inputs.forEach(input => {
                input.disabled = false;
            });
        }
    }
};

/**
 * Show success message
 */
const showSuccessMessage = message => {
    const successEl = document.getElementById('authSuccess');

    if (successEl) {
        successEl.textContent = message;
        successEl.classList.remove('hidden');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            successEl.classList.add('hidden');
        }, 5000);
    }
};

/**
 * Show error message
 */
const showErrorMessage = message => {
    const errorEl = document.getElementById('authError');

    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');

        // Auto-hide after 8 seconds
        setTimeout(() => {
            errorEl.classList.add('hidden');
        }, 8000);
    }
};

/**
 * Hide all messages
 */
const hideMessages = () => {
    const successEl = document.getElementById('authSuccess');
    const errorEl = document.getElementById('authError');

    if (successEl) {
        successEl.classList.add('hidden');
    }
    if (errorEl) {
        errorEl.classList.add('hidden');
    }
};

/**
 * Render user UI
 */
const _renderUserUI = email => {
    // Update the auth component if it exists (preferred method)
    if (window.authComponent) {
        window.authComponent.setUser({ email });

        return;
    }

    // Fallback for old authentication element
    const authentication = document.getElementById('authentication');

    if (authentication) {
        authentication.innerHTML = `
            <div class="row">
                ${email} <button id="logout-button">Logout</button>
            </div>
        `;
        const logoutButton = document.getElementById('logout-button');

        if (logoutButton) {
            logoutButton.addEventListener('click', logoutUser);
        }
    }
};

/**
 * Update email validation indicator
 */
const updateEmailValidation = (email, formType = 'login') => {
    const validationIndicator = document.getElementById('emailValidation');
    const validationText = document.getElementById('emailValidationText');

    if (!validationIndicator || !validationText) {
        return;
    }

    if (!email) {
        validationIndicator.classList.add('hidden');

        return;
    }

    if (!validateEmail(email)) {
        validationIndicator.classList.remove('hidden');
        validationText.textContent = 'Please enter a valid email address';
        validationText.className = 'text-xs text-red-400';
    } else {
        validationIndicator.classList.add('hidden');
    }
};

/**
 * Update password strength indicator
 */
const updatePasswordStrength = password => {
    const strengthIndicator = document.getElementById('passwordStrength');
    const strengthBars = strengthIndicator?.querySelectorAll('.h-1');
    const strengthText = document.getElementById('passwordStrengthText');

    if (!strengthIndicator || !strengthBars || !strengthText) {
        return;
    }

    if (!password) {
        strengthIndicator.classList.add('hidden');

        return;
    }

    const { score, strength, color, feedback } = checkPasswordStrength(password);

    strengthIndicator.classList.remove('hidden');

    // Update bars
    strengthBars.forEach((bar, index) => {
        bar.className = 'h-1 flex-1 rounded';
        if (index < score) {
            bar.classList.add(`bg-${color}-500`);
        } else {
            bar.classList.add('bg-gray-600');
        }
    });

    // Update text
    strengthText.textContent = `Strength: ${strength}${feedback.length > 0 ? ` (${feedback.slice(0, 2).join(', ')})` : ''}`;
    strengthText.className = `text-xs mt-1 text-${color}-400`;
};

/**
 * Toggle password visibility
 */
const _togglePasswordVisibility = inputId => {
    const input = document.getElementById(inputId);

    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
};

/**
 * Initialize page elements
 */
const loadPageElements = () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', loginUser);

        // Add email validation for login form
        const loginEmailInput = document.getElementById('loginEmail');

        if (loginEmailInput) {
            loginEmailInput.addEventListener('input', e => {
                updateEmailValidation(e.target.value, 'login');
            });
        }

        // Add password visibility toggle for login
        const loginPasswordInput = document.getElementById('loginPassword');

        if (loginPasswordInput) {
            loginPasswordInput.addEventListener('keyup', e => {
                if (e.key === 'Enter') {
                    loginForm.dispatchEvent(new Event('submit'));
                }
            });
        }
    }

    if (registerForm) {
        registerForm.addEventListener('submit', registerUser);

        // Add password strength checker
        const passwordInput = document.getElementById('registerPassword');

        if (passwordInput) {
            passwordInput.addEventListener('input', e => {
                updatePasswordStrength(e.target.value);
            });
        }

        // Add email validation for register form
        const registerEmailInput = document.getElementById('registerEmail');

        if (registerEmailInput) {
            registerEmailInput.addEventListener('input', e => {
                updateEmailValidation(e.target.value, 'register');
            });
        }

        // Add Enter key support for register form
        const confirmPasswordInput = document.getElementById('confirmPassword');

        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('keyup', e => {
                if (e.key === 'Enter') {
                    registerForm.dispatchEvent(new Event('submit'));
                }
            });
        }

    }
};

// Global logout function for header component
window.logout = logoutUser;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', loadPageElements);
