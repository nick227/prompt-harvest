// Terms API Manager - Handles API calls for terms data
class TermsAPIManager {
    constructor() {
        this.baseURL = window.location.origin;
    }

    // Load terms from API
    async loadTerms() {
        try {
            const response = await fetch(`${this.baseURL}${window.TERMS_CONSTANTS.ENDPOINTS.LOAD_TERMS}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            return this.processTermsResponse(data);
        } catch (error) {
            console.error('Error loading terms:', error);
            throw error;
        }
    }

    // Add term via API
    async addTerm(termWord) {
        try {
            console.log('🚀 API: Starting addTerm request for:', termWord);
            console.log('🔍 API: Request URL:', `${this.baseURL}${window.TERMS_CONSTANTS.ENDPOINTS.ADD_TERM}`);

            const response = await fetch(`${this.baseURL}${window.TERMS_CONSTANTS.ENDPOINTS.ADD_TERM}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify({
                    word: termWord.trim()
                })
            });

            console.log('📡 API: Response received:', {
                status: response.status,
                ok: response.ok,
                statusText: response.statusText
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            return this.processAddTermResponse(data);
        } catch (error) {
            console.error('Error adding term:', error);
            throw error;
        }
    }

    // Delete term via API
    async deleteTerm(termWord) {
        try {
            const response = await fetch(`${this.baseURL}${window.TERMS_CONSTANTS.ENDPOINTS.DELETE_TERM}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify({
                    word: termWord.trim()
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            return this.processDeleteTermResponse(data);
        } catch (error) {
            console.error('Error deleting term:', error);
            throw error;
        }
    }

    // Update term via API
    async updateTerm(termWord, updatedData) {
        try {
            const response = await fetch(`${this.baseURL}${window.TERMS_CONSTANTS.ENDPOINTS.UPDATE_TERM}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify({
                    word: termWord.trim(),
                    ...updatedData
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            return this.processUpdateTermResponse(data);
        } catch (error) {
            console.error('Error updating term:', error);
            throw error;
        }
    }

    // Search terms via API
    async searchTerms(query) {
        try {
            const response = await fetch(`${this.baseURL}${window.TERMS_CONSTANTS.ENDPOINTS.SEARCH_TERMS}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify({
                    query: query.trim()
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            return this.processSearchResponse(data);
        } catch (error) {
            console.error('Error searching terms:', error);
            throw error;
        }
    }

    // Get term statistics via API
    async getTermStats() {
        try {
            const response = await fetch(`${this.baseURL}${window.TERMS_CONSTANTS.ENDPOINTS.GET_STATS}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            return this.processStatsResponse(data);
        } catch (error) {
            console.error('Error getting term stats:', error);
            throw error;
        }
    }

    // Process terms response
    processTermsResponse(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid response format');
        }

        // Handle different response formats
        if (Array.isArray(data)) {
            return data;
        } else if (data.terms && Array.isArray(data.terms)) {
            return data.terms;
        } else if (data.data && Array.isArray(data.data)) {
            return data.data;
        }

        throw new Error('No terms data found in response');
    }

    // Process add term response
    processAddTermResponse(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid response format');
        }

        // Check for success indicators
        if (data.success === false) {
            throw new Error(data.message || 'Failed to add term');
        }

        if (data.error) {
            throw new Error(data.error);
        }

        // Return the added term data
        return data.term || data.data || data;
    }

    // Process delete term response
    processDeleteTermResponse(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid response format');
        }

        // Check for success indicators
        if (data.success === false) {
            throw new Error(data.message || 'Failed to delete term');
        }

        if (data.error) {
            throw new Error(data.error);
        }

        return data;
    }

    // Process update term response
    processUpdateTermResponse(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid response format');
        }

        // Check for success indicators
        if (data.success === false) {
            throw new Error(data.message || 'Failed to update term');
        }

        if (data.error) {
            throw new Error(data.error);
        }

        // Return the updated term data
        return data.term || data.data || data;
    }

    // Process search response
    processSearchResponse(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid response format');
        }

        // Handle different response formats
        if (Array.isArray(data)) {
            return data;
        } else if (data.results && Array.isArray(data.results)) {
            return data.results;
        } else if (data.data && Array.isArray(data.data)) {
            return data.data;
        }

        throw new Error('No search results found in response');
    }

    // Process stats response
    processStatsResponse(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid response format');
        }

        return data.stats || data.data || data;
    }

    // Validate term word
    validateTermWord(termWord) {
        if (!termWord || typeof termWord !== 'string') {
            throw new Error('Term word must be a non-empty string');
        }

        const trimmed = termWord.trim();

        if (trimmed.length === 0) {
            throw new Error('Term word cannot be empty');
        }

        if (trimmed.length > 100) {
            throw new Error('Term word is too long (max 100 characters)');
        }

        // Check for invalid characters
        const invalidChars = /[<>"'&]/;

        if (invalidChars.test(trimmed)) {
            throw new Error('Term word contains invalid characters');
        }

        return trimmed;
    }

    // Build request URL with parameters
    buildRequestURL(endpoint, params = {}) {
        const url = new URL(`${this.baseURL}${endpoint}`);

        for (const [key, value] of Object.entries(params)) {
            if (value !== null && value !== undefined) {
                url.searchParams.append(key, value);
            }
        }

        return url.toString();
    }

    // Handle API errors
    handleAPIError(error, operation) {
        let message = 'An error occurred';

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            message = 'Network error - please check your connection';
        } else if (error.message) {
            const { message: errorMessage } = error;

            message = errorMessage;
        } else if (typeof error === 'string') {
            message = error;
        }

        console.error(`${operation} error:`, error);

        return {
            success: false,
            error: message,
            originalError: error
        };
    }

    // Check if user is authenticated
    async checkAuthentication() {
        try {
            const response = await fetch(`${this.baseURL}${window.TERMS_CONSTANTS.ENDPOINTS.USER_AUTH}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            return response.ok;
        } catch (error) {
            console.error('Authentication check error:', error);

            return false;
        }
    }

    // Get CSRF token if available
    getCSRFToken() {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

        return token || null;
    }

    // Add CSRF token to headers if available
    addCSRFHeaders(headers = {}) {
        const token = this.getCSRFToken();

        if (token) {
            return { ...headers, 'X-CSRF-TOKEN': token };
        }

        return headers;
    }

    // Retry failed requests
    async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error;

                if (attempt === maxRetries) {
                    throw error;
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
        }

        throw lastError;
    }

    // Delete term via API (alternative implementation)
    async deleteTermAlternative(termWord) {
        try {
            const response = await fetch(`${this.baseURL}/ai/word/delete/${encodeURIComponent(termWord)}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            return this.processDeleteTermResponseAlternative(data);
        } catch (error) {
            console.error('Error deleting term:', error);
            throw error;
        }
    }

    // Process delete term response (alternative implementation)
    processDeleteTermResponseAlternative(response) {
        if (response.success) {
            return {
                success: true,
                message: response.message,
                deletedWord: response.deletedWord
            };
        } else {
            throw new Error(response.error || 'Failed to delete term');
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.TermsAPIManager = TermsAPIManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TermsAPIManager;
}
