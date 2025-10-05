import axios from 'axios';
import dotenv from 'dotenv';
import modelInterface from '../ModelInterface.js';

dotenv.config();

export class DezgoProvider {
    constructor() {
        this.apiKey = process.env.DEZGO_API_KEY;
        this.baseUrl = 'https://api.dezgo.com';
    }

    /**
     * Validate Dezgo configuration
     */
    validateConfig() {
        if (!this.apiKey) {
            throw new Error('Dezgo API key not configured');
        }

        return true;
    }

    /**
     * Get model configuration
     */
    async getModelConfig(model) {
        const config = await modelInterface.getModelConfig(model);

        if (!config) {
            throw new Error(`Model ${model} not found in configuration`);
        }

        return config;
    }

    /**
     * Generate image using Dezgo API
     */
    async generateImage(prompt, guidance, model = 'flux-dev') {
        this.validateConfig();

        const { url } = await this.getModelConfig(model);

        if (!url) {
            throw new Error(`No URL configured for model ${model}`);
        }

        // Special handling for different model types
        if (url.includes('text2image_sdxl_lightning')) {
            // Lightning models have different parameter structure
            return await this.generateLightningImage(prompt, guidance, model, url);
        }

        if (url.includes('text2image_flux')) {
            // Flux models have different parameter structure
            return await this.generateFluxImage(prompt, guidance, model, url);
        }

        // Default generation
        return await this.generateDefaultImage(prompt, guidance, model, url);
    }

    /**
     * Generate image with Lightning model
     */
    async generateLightningImage(prompt, guidance, model, url) {
        const keyValidation = await this.validateApiKey();

        if (keyValidation) {
            throw new Error('Dezgo API key validation failed');
        }

        const payload = {
            prompt,
            steps: 4, // Lightning models use fewer steps
            guidance_scale: guidance,
            width: 1024,
            height: 1024
        };

        try {
            const response = await axios.post(url, payload, {
                headers: {
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 120000
            });

            if (!response.data) {
                throw new Error('Invalid response from Dezgo API');
            }

            return {
                success: true,
                data: response.data,
                provider: 'dezgo',
                model
            };

        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Generate image with Flux model
     */
    async generateFluxImage(prompt, guidance, model, url) {
        const payload = {
            prompt,
            guidance_scale: guidance,
            width: 1024,
            height: 1024,
            num_inference_steps: 20
        };

        try {
            const response = await axios.post(url, payload, {
                headers: {
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 120000
            });

            if (!response.data) {
                throw new Error('Invalid response from Dezgo API');
            }

            return {
                success: true,
                data: response.data,
                provider: 'dezgo',
                model
            };

        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Generate image with default parameters
     */
    async generateDefaultImage(prompt, guidance, model, url) {
        const payload = {
            prompt,
            guidance_scale: guidance,
            width: 1024,
            height: 1024
        };

        try {
            const response = await axios.post(url, payload, {
                headers: {
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 120000
            });

            if (!response.data) {
                throw new Error('Invalid response from Dezgo API');
            }

            return {
                success: true,
                data: response.data,
                provider: 'dezgo',
                model
            };

        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Handle API errors
     */
    handleError(error) {
        if (error.response) {
            const { status } = error.response;
            const message = error.response.data?.message || error.message;

            if (status === 400) {
                return new Error(`Bad request: ${message}`);
            } else if (status === 401) {
                return new Error('Invalid API key');
            } else if (status === 429) {
                return new Error('Rate limit exceeded');
            } else if (status === 499) {
                return new Error('Client disconnected - request cancelled');
            } else if (status >= 500) {
                return new Error(`Server error: ${message}`);
            }
        }

        if (error.code === 'ECONNABORTED') {
            return new Error('Request timeout');
        }

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return new Error('Network error: Unable to connect to Dezgo API');
        }

        return new Error(`Dezgo API error: ${error.message}`);
    }

    /**
     * Validate Dezgo API key
     */
    async validateApiKey() {
        try {
            const response = await axios.get(`${this.baseUrl}/models`, {
                headers: {
                    'X-API-Key': this.apiKey
                },
                timeout: 10000
            });

            return false; // Key is valid
        } catch (error) {
            return true; // Key validation failed
        }
    }

    /**
     * Test model availability
     */
    async testModelAvailability(model) {
        const { url } = await this.getModelConfig(model);

        if (!url) {
            return false;
        }

        try {
            // Test with a simple request
            const response = await axios.post(url, {
                prompt: 'test',
                width: 512,
                height: 512
            }, {
                headers: {
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if provider is available
     */
    isAvailable() {
        return !!this.apiKey;
    }

    /**
     * Get provider configuration
     */
    getConfig() {
        return {
            type: 'dezgo',
            name: 'Dezgo',
            available: this.isAvailable(),
            models: ['flux-dev', 'sdxl-lightning'],
            maxPromptLength: 2000,
            supportedSizes: ['1024x1024', '512x512', '768x768']
        };
    }
}
