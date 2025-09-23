/**
 * AI Image Generator Service
 * Handles API calls for AI image generation
 */

export class AIImageGeneratorService {
    constructor() {
        this.baseUrl = '/api';
    }

    /**
     * Get authentication headers
     */
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    /**
     * Generate image using AI
     */
    async generateImage(prompt, provider = 'dalle3', options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/profile/generate-avatar`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    prompt,
                    provider,
                    ...options
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                return {
                    success: true,
                    imageUrl: data.data.avatarUrl,
                    prompt: data.data.prompt || prompt,
                    provider: data.data.provider || provider,
                    metadata: data.data.metadata || {}
                };
            } else {
                throw new Error(data.message || 'Failed to generate image');
            }
        } catch (error) {
            console.error('AI Image Generation Error:', error);
            return {
                success: false,
                error: error.message || 'Failed to generate image'
            };
        }
    }

    /**
     * Generate image for general use (not profile avatar)
     */
    async generateGeneralImage(prompt, provider = 'dalle3', options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/images/generate`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    prompt,
                    provider,
                    ...options
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                return {
                    success: true,
                    imageUrl: data.data.imageUrl,
                    prompt: data.data.prompt || prompt,
                    provider: data.data.provider || provider,
                    metadata: data.data.metadata || {}
                };
            } else {
                throw new Error(data.message || 'Failed to generate image');
            }
        } catch (error) {
            console.error('AI Image Generation Error:', error);
            return {
                success: false,
                error: error.message || 'Failed to generate image'
            };
        }
    }

    /**
     * Get available providers
     */
    getProviders() {
        return [
            { value: 'dalle3', label: 'DALL-E 3 (High Quality)', cost: 1 },
            { value: 'dalle2', label: 'DALL-E 2 (Standard)', cost: 1 }
        ];
    }

    /**
     * Get provider cost
     */
    getProviderCost(provider) {
        const providers = this.getProviders();
        const providerData = providers.find(p => p.value === provider);
        return providerData?.cost || 1;
    }

    /**
     * Validate prompt
     */
    validatePrompt(prompt) {
        if (!prompt || typeof prompt !== 'string') {
            return { valid: false, message: 'Prompt is required' };
        }

        const trimmed = prompt.trim();
        if (trimmed.length === 0) {
            return { valid: false, message: 'Prompt cannot be empty' };
        }

        if (trimmed.length < 3) {
            return { valid: false, message: 'Prompt must be at least 3 characters' };
        }

        if (trimmed.length > 500) {
            return { valid: false, message: 'Prompt must be 500 characters or less' };
        }

        return { valid: true, message: 'Prompt is valid' };
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        return !!token;
    }

    /**
     * Get user credits (if available)
     */
    async getUserCredits() {
        try {
            const response = await fetch(`${this.baseUrl}/auth/profile`, {
                headers: this.getAuthHeaders()
            });

            const data = await response.json();

            if (response.ok && data.success) {
                return {
                    success: true,
                    credits: data.data.user?.credits || 0
                };
            } else {
                return {
                    success: false,
                    credits: 0
                };
            }
        } catch (error) {
            console.error('Failed to get user credits:', error);
            return {
                success: false,
                credits: 0
            };
        }
    }
}

// Create singleton instance
export const aiImageGeneratorService = new AIImageGeneratorService();

// Export default
export default aiImageGeneratorService;
