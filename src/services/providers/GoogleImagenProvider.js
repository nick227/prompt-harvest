import axios from 'axios';
import dotenv from 'dotenv';
import modelInterface from '../ModelInterface.js';

dotenv.config();

export class GoogleImagenProvider {
    constructor() {
        this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        this.apiKey = process.env.GOOGLE_CLOUD_API_KEY;
        this.credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }

    /**
     * Validate Google Imagen configuration
     */
    validateConfig() {
        if (!this.projectId) {
            throw new Error('Google Cloud Project ID not configured');
        }

        if (!this.apiKey && !this.credentials) {
            throw new Error('Google Cloud API key or credentials not configured');
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
     * Generate image using Google Imagen
     */
    async generateImage(prompt, guidance, model = 'imagen-3-generate-001') {
        this.validateConfig();

        const { url } = await this.getModelConfig(model);

        if (!url) {
            throw new Error(`No URL configured for model ${model}`);
        }

        // Special handling for different model types
        if (url.includes('text2image_flux')) {
            return await this.generateFluxImage(prompt, guidance, model, url);
        }

        // Default Imagen generation
        return await this.generateImagenImage(prompt, guidance, model, url);
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
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 120000
            });

            if (!response.data) {
                throw new Error('Invalid response from Google Imagen API');
            }

            return {
                success: true,
                data: response.data,
                provider: 'google',
                model
            };

        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Generate image with Imagen model
     */
    async generateImagenImage(prompt, guidance, model, url) {
        const keyValidation = await this.validateApiKey();

        if (keyValidation) {
            throw new Error('Google Imagen API key validation failed');
        }

        const payload = {
            instances: [{
                prompt,
                parameters: {
                    guidance_scale: guidance,
                    width: 1024,
                    height: 1024
                }
            }]
        };

        try {
            const response = await axios.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 120000
            });

            if (!response.data || !response.data.predictions || response.data.predictions.length === 0) {
                throw new Error('Invalid response format from Google Imagen');
            }

            const prediction = response.data.predictions[0];

            if (!prediction.bytesBase64Encoded) {
                throw new Error('No image data in response');
            }

            return {
                success: true,
                data: prediction.bytesBase64Encoded,
                provider: 'google',
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
            const message = error.response.data?.error?.message || error.message;

            if (status === 400) {
                return new Error(`Bad request: ${message}`);
            } else if (status === 401) {
                return new Error('Invalid API key or credentials');
            } else if (status === 403) {
                return new Error('Access forbidden');
            } else if (status === 429) {
                return new Error('Rate limit exceeded');
            } else if (status >= 500) {
                return new Error(`Server error: ${message}`);
            }
        }

        if (error.code === 'ECONNABORTED') {
            return new Error('Request timeout');
        }

        return new Error(`Google Imagen API error: ${error.message}`);
    }

    /**
     * Validate Google Imagen API key
     */
    async validateApiKey() {
        try {
            const response = await axios.get(`https://aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/us-central1/models`, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`
                },
                timeout: 10000
            });

            return false; // Key is valid
        } catch (error) {
            return true; // Key validation failed
        }
    }

    /**
     * Check if provider is available
     */
    isAvailable() {
        return !!(this.projectId && (this.apiKey || this.credentials));
    }

    /**
     * Get provider configuration
     */
    getConfig() {
        return {
            type: 'google',
            name: 'Google Imagen',
            available: this.isAvailable(),
            models: ['imagen-3-generate-001'],
            maxPromptLength: 1000,
            supportedSizes: ['1024x1024', '512x512']
        };
    }
}
