
/**
 * Centralized API Service for frontend
 * Handles all API requests with proper error handling, validation, and authentication
 */

class ApiService {
    constructor() {
        this.baseUrl = window.location.origin;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        };

        // Request timeout in milliseconds
        this.timeout = 30000;

        // Retry configuration
        this.retryConfig = {
            maxRetries: 2,
            retryDelay: 1000,
            retryableStatusCodes: [408, 429, 500, 502, 503, 504]
        };

        // Circuit breaker state
        this.circuitBreaker = {
            failures: 0,
            lastFailure: null,
            threshold: 5,
            timeout: 60000,
            state: 'CLOSED' // CLOSED, OPEN, HALF_OPEN
        };

        // Counter for multiple 401s on profile endpoint
        this.profile401Count = 0;
    }

    /**
     * Get authentication headers
     */
    getAuthHeaders() {
        const headers = { ...this.defaultHeaders };

        // Add any authentication tokens if available
        const token = this.getAuthToken();

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            // Only log auth headers when debugging
            if (window.location.search.includes('debug')) {
                console.log('🔑 API: Adding auth header with token:', `${token.substring(0, 20)}...`);
            }
        } else {
            console.log('🔑 API: No auth token found in storage');
        }

        return headers;
    }

    /**
     * Get authentication token from storage
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    /**
     * Set authentication token
     */
    setAuthToken(token, remember = false) {
        if (remember) {
            localStorage.setItem('authToken', token);
        } else {
            sessionStorage.setItem('authToken', token);
        }
    }

    /**
     * Clear authentication token
     */
    clearAuthToken() {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
    }

    /**
     * Check if circuit breaker is open
     */
    isCircuitBreakerOpen() {
        if (this.circuitBreaker.state === 'OPEN') {
            const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailure;

            if (timeSinceLastFailure > this.circuitBreaker.timeout) {
                this.circuitBreaker.state = 'HALF_OPEN';

                return false;
            }

            return true;
        }

        return false;
    }

    /**
     * Record circuit breaker failure
     */
    recordFailure() {
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailure = Date.now();
        if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
            this.circuitBreaker.state = 'OPEN';
        }
    }

    /**
     * Record circuit breaker success
     */
    recordSuccess() {
        this.circuitBreaker.failures = 0;
        this.circuitBreaker.state = 'CLOSED';
    }

    /**
     * Create timeout promise
     */
    createTimeoutPromise() {
        return new Promise((_, reject) => {
            setTimeout(() => {
                const timeoutError = new Error('Request timeout');

                timeoutError.isTimeout = true; // Mark as timeout error
                reject(timeoutError);
            }, this.timeout);
        });
    }

    /**
     * Retry request with exponential backoff
     */
    async retryRequest(requestFn, retryCount = 0) {
        try {
            return await requestFn();
        } catch (error) {
            if (retryCount >= this.retryConfig.maxRetries) {
                throw error;
            }

            // Check if error is retryable
            const isRetryable = !error.isTimeout && (
                this.retryConfig.retryableStatusCodes.includes(error.status) ||
                error.message.includes('network')
            );

            if (!isRetryable) {
                throw error;
            }

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, this.retryConfig.retryDelay * Math.pow(2, retryCount))
            );

            return this.retryRequest(requestFn, retryCount + 1);
        }
    }

    /**
     * Make HTTP request with full error handling
     */
    async request(method, endpoint, data = null, options = { /* Empty block */ }) {
        // Check circuit breaker
        if (this.isCircuitBreakerOpen()) {
            throw new Error('Service temporarily unavailable. Please try again later.');
        }

        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
        const headers = { ...this.getAuthHeaders(), ...options.headers };

        // Only log headers for auth endpoints or when debugging
        if (endpoint.includes('/api/auth/') || window.location.search.includes('debug')) {
            console.log('🔑 API: Request headers for', endpoint, ':', headers);
        }

        const requestOptions = {
            method: method.toUpperCase(),
            headers,
            credentials: 'include',
            ...options
        };

        if (data && method !== 'GET') {
            requestOptions.body = JSON.stringify(data);
        }

        const requestFn = async () => {
            const response = await Promise.race([
                fetch(url, requestOptions),
                this.createTimeoutPromise()
            ]);

            // Handle different response types
            let responseData;
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            // Handle authentication errors
            if (response.status === 401) {
                console.log('🔑 API: 401 Unauthorized - clearing auth token');

                // Don't clear token immediately for profile endpoint (might be backend issue)
                const isProfileEndpoint = url.includes('/api/auth/profile');

                if (isProfileEndpoint) {
                    console.log('🔑 API: Profile endpoint 401 - this might be a backend issue, not clearing token yet');
                    // Only clear token if we get multiple 401s on profile endpoint
                    if (this.profile401Count && this.profile401Count > 1) {
                        console.log('🔑 API: Multiple profile 401s - clearing token');
                        this.clearAuthToken();
                    } else {
                        this.profile401Count = (this.profile401Count || 0) + 1;
                        console.log('🔑 API: Profile 401 count:', this.profile401Count);
                    }
                } else {
                    this.clearAuthToken();
                }

                // Don't redirect for auth endpoints (login/register)
                const isAuthEndpoint = url.includes('/api/auth/');

                if (!isAuthEndpoint) {
                    window.location.href = '/login';
                }

                throw new Error('Authentication required');
            }

            // Handle rate limiting
            if (response.status === 429) {
                const retryAfter = response.headers.get('retry-after');

                throw new Error(`Rate limit exceeded. Please wait ${retryAfter || 60} seconds.`);
            }

            // Handle other errors
            if (!response.ok) {
                console.error('🔍 API Error Response Debug:', {
                    status: response.status,
                    statusText: response.statusText,
                    contentType,
                    responseData,
                    url
                });

                // Log full response data for debugging
                if (responseData && typeof responseData === 'object') {
                    console.error('🔍 Full Server Response:', JSON.stringify(responseData, null, 2));
                }

                // Use the most descriptive error message available
                const errorMessage = responseData?.message || responseData?.error || `HTTP ${response.status}`;
                const error = new Error(errorMessage);

                error.status = response.status;
                error.data = responseData;
                error.response = response;
                throw error;
            }

            return responseData;
        };

        try {
            const _result = await this.retryRequest(requestFn);

            this.recordSuccess();

            return _result;
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }

    // Convenience methods
    async get(endpoint, options = { /* Empty block */ }) {
        return this.request('GET', endpoint, null, options);
    }

    async post(endpoint, data = null, options = { /* Empty block */ }) {
        return this.request('POST', endpoint, data, options);
    }

    async put(endpoint, data = null, options = { /* Empty block */ }) {
        return this.request('PUT', endpoint, data, options);
    }

    async delete(endpoint, options = { /* Empty block */ }) {
        return this.request('DELETE', endpoint, null, options);
    }

    async patch(endpoint, data = null, options = { /* Empty block */ }) {
        return this.request('PATCH', endpoint, data, options);
    }
}

// User-related API methods
class UserApiService extends ApiService {
    /**
     * Register new user
     */
    async register(email, password, confirmPassword) {
        // Client-side validation
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        if (!this.isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }

        const data = await this.post('/api/auth/register', { email, password });

        // Store token from the correct location in response
        const token = data.data?.token || data.token;

        if (token) {
            this.setAuthToken(token, true);
        }

        return data;
    }

    /**
     * Login user
     */
    async login(email, password) {
        console.log('🌐 API: login() called');

        // Client-side validation
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        if (!this.isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        console.log('🌐 API: Sending login request to /api/auth/login');
        const data = await this.post('/api/auth/login', { email, password });

        console.log('🌐 API: Login response received', data);

        // Store token from the correct location in response
        const token = data.data?.token || data.token;

        if (token) {
            this.setAuthToken(token, true);
        }

        return data;
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            await this.post('/api/auth/logout');
        } finally {
            this.clearAuthToken();
        }
    }

    /**
     * Get current user profile
     */
    async getProfile() {
        return this.get('/api/auth/profile');
    }

    /**
     * Update user profile
     */
    async updateProfile(profileData) {
        return this.put('/api/auth/profile', profileData);
    }

    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword) {
        if (!currentPassword || !newPassword) {
            throw new Error('Current and new passwords are required');
        }

        if (newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters long');
        }

        return this.post('/api/auth/change-password', { currentPassword, newPassword });
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(email) {
        if (!email || !this.isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        return this.post('/api/auth/forgot-password', { email });
    }

    /**
     * Reset password with token
     */
    async resetPassword(token, newPassword) {
        if (!token || !newPassword) {
            throw new Error('Token and new password are required');
        }

        if (newPassword.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        return this.post('/api/auth/reset-password', { token, newPassword });
    }

    /**
     * Validate email format
     */
    isValidEmail(email) {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        return re.test(String(email).toLowerCase());
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.getAuthToken();
    }
}

// Image-related API methods
class ImageApiService extends ApiService {
    /**
     * Generate image
     */
    async generateImage(prompt, providers, guidance = 10, options = { /* Empty block */ }) {
        if (!prompt || prompt.trim().length === 0) {
            throw new Error('Prompt is required');
        }

        if (!providers || !Array.isArray(providers) || providers.length === 0) {
            throw new Error('At least one provider must be selected');
        }

        if (guidance < 1 || guidance > 20) {
            throw new Error('Guidance must be between 1 and 20');
        }

        const payload = {
            prompt: prompt.trim(),
            providers,
            guidance,
            ...options
        };

        return this.post('/api/image/generate', payload);
    }

    /**
     * Get images with pagination
     */
    async getImages(page = 1, limit = 20, filters = { /* Empty block */ }) {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...filters
        });

        return this.get(`/api/images?${params}`);
    }

    /**
     * Get single image by ID
     */
    async getImage(id) {
        if (!id) {
            throw new Error('Image ID is required');
        }

        return this.get(`/api/images/${id}`);
    }

    /**
     * Rate image
     */
    async rateImage(id, rating) {
        if (!id) {
            throw new Error('Image ID is required');
        }

        if (!rating || rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }

        return this.post(`/api/images/${id}/rating`, { rating });
    }

    /**
     * Delete image
     */
    async deleteImage(id) {
        if (!id) {
            throw new Error('Image ID is required');
        }

        return this.delete(`/api/images/${id}`);
    }

    /**
     * Get image statistics
     */
    async getImageStats() {
        return this.get('/api/images/stats');
    }
}

// Create global instances
const apiService = new ApiService();
const userApi = new UserApiService();
const imageApi = new ImageApiService();

// Export to global scope
if (typeof window !== 'undefined') {
    window.apiService = apiService;
    window.userApi = userApi;
    window.imageApi = imageApi;
}

// Export for module environments only
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiService, UserApiService, ImageApiService, apiService, userApi, imageApi };
}
