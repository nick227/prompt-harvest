/**
 * Base Provider Interface
 *
 * Defines the common interface that all image generation providers must implement
 */

/**
 * Base class for image generation providers
 * All providers should extend this class and implement the required methods
 */
export class BaseProvider {
    constructor(providerName) {
        this.providerName = providerName;
    }

    /**
     * Generate an image using the provider's API
     * @param {string} prompt - Image generation prompt
     * @param {number} guidance - Guidance value for generation
     * @param {string} model - Model name/identifier
     * @param {string} userId - User ID for tracking (optional)
     * @param {Object} options - Additional generation options
     * @param {string} options.size - Image size (e.g., '1024x1024')
     * @param {string} options.quality - Quality setting (e.g., 'standard', 'hd')
     * @param {AbortSignal} options.signal - Abort signal for cancellation
     * @returns {Promise<Object>} Generation result with success/error status
     * @abstract
     */
    async generateImage(prompt, guidance, model, userId, options) {
        throw new Error(`generateImage() must be implemented by ${this.constructor.name}`);
    }

    /**
     * Test if the provider is available and properly configured
     * @returns {Promise<boolean>} True if provider is available
     */
    async testAvailability() {
        throw new Error(`testAvailability() must be implemented by ${this.constructor.name}`);
    }

    /**
     * Get list of available models for this provider
     * @returns {Promise<Array>} Array of available model names
     */
    async getAvailableModels() {
        throw new Error(`getAvailableModels() must be implemented by ${this.constructor.name}`);
    }

    /**
     * Get provider metadata
     * @returns {Object} Provider metadata
     */
    getMetadata() {
        return {
            name: this.providerName,
            type: this.constructor.name
        };
    }
}

/**
 * Provider Interface Requirements:
 *
 * 1. All providers must implement generateImage()
 * 2. All providers should use assertCredentials() for validation
 * 3. All providers should use withRetry() for resilient API calls
 * 4. All providers must return results using createSuccessResult() or createErrorResult()
 * 5. All providers should handle standard HTTP status codes (400, 401, 429, 500+)
 * 6. All providers should mask sensitive data in error responses
 * 7. All providers should track request duration and include in metadata
 */

export default BaseProvider;

