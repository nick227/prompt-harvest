import { OpenAIProvider } from './providers/OpenAIProvider.js';
import { DezgoProvider } from './providers/DezgoProvider.js';
import { GoogleImagenProvider } from './providers/GoogleImagenProvider.js';
import modelInterface from './ModelInterface.js';

export class ImageGenerationService {
    constructor() {
        this.providers = {
            openai: new OpenAIProvider(),
            dezgo: new DezgoProvider(),
            google: new GoogleImagenProvider()
        };
    }

    /**
     * Validate image generation parameters
     */
    validateImageParams(prompt, guidance, providerName) {
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            throw new Error('Prompt is required and must be a non-empty string');
        }

        if (typeof guidance !== 'number' || guidance < 0 || guidance > 20) {
            throw new Error('Guidance must be a number between 0 and 20');
        }

        const isValidProvider = this.isProviderAvailable(providerName);
        if (!providerName || !isValidProvider) {
            throw new Error(`Provider ${providerName} is not available`);
        }
    }

    /**
     * Generate image using a specific provider
     */
    async generateProviderImage(providerName, prompt, guidance, model = null) {
        this.validateImageParams(prompt, guidance, providerName);

        const provider = this.providers[providerName];
        if (!provider) {
            throw new Error(`Provider ${providerName} not found`);
        }

        const defaultModel = this.getDefaultModel(providerName);
        const targetModel = model || defaultModel;

        return await provider.generateImage(prompt, guidance, targetModel);
    }

    /**
     * Generate images using multiple providers in parallel
     */
    async generateMultipleProviderImages(providers, prompt, guidance, model = null) {
        const promises = providers.map(async (providerName) => {
            try {
                const result = await this.generateProviderImage(providerName, prompt, guidance, model);
                return {
                    provider: providerName,
                    success: true,
                    data: result.data,
                    model: result.model
                };
            } catch (error) {
                return {
                    provider: providerName,
                    success: false,
                    error: error.message
                };
            }
        });

        const results = await Promise.allSettled(promises);
        return this.formatResults(results, providers);
    }

    /**
     * Generate image from a randomly selected provider
     */
    async generateRandomProviderImage(providers, prompt, guidance) {
        const availableProviders = providers.filter(p => this.isProviderAvailable(p));

        if (availableProviders.length === 0) {
            throw new Error('No providers available');
        }

        const randomProvider = availableProviders[Math.floor(Math.random() * availableProviders.length)];
        return await this.generateProviderImage(randomProvider, prompt, guidance);
    }

    /**
     * Get available providers
     */
    getAvailableProviders() {
        return Object.keys(this.providers).filter(providerName =>
            this.isProviderAvailable(providerName)
        );
    }

    /**
     * Check if provider is available
     */
    isProviderAvailable(providerName) {
        const provider = this.providers[providerName];
        return provider ? provider.isAvailable() : false;
    }

    /**
     * Get provider configuration
     */
    getProviderConfig(providerName) {
        const provider = this.providers[providerName];
        return provider ? provider.getConfig() : null;
    }

    /**
     * Get default model for provider
     */
    getDefaultModel(providerName) {
        const config = this.getProviderConfig(providerName);
        return config?.models?.[0] || 'default';
    }

    /**
     * Format Promise.allSettled results
     */
    formatResults(results, providers) {
        return results.map((result, index) => {
            if (result.status === 'rejected') {
                return {
                    provider: providers[index],
                    success: false,
                    error: result.reason?.message || result.reason
                };
            }

            if (result.status === 'fulfilled' && result.value?.error) {
                return {
                    provider: providers[index],
                    success: false,
                    error: result.value.error
                };
            }

            return {
                provider: providers[index],
                success: result.status === 'fulfilled' && result.value && !result.value.error,
                data: result.status === 'fulfilled' ? result.value : null,
                error: result.status === 'rejected' ? result.reason : null
            };
        });
    }

    /**
     * Generate unique ID for requests
     */
    generateId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get model configuration
     */
    async getModelConfig(model) {
        return await modelInterface.getModelConfig(model);
    }

    /**
     * Test provider connectivity
     */
    async testProvider(providerName) {
        const provider = this.providers[providerName];
        if (!provider) {
            return { available: false, error: 'Provider not found' };
        }

        try {
            const isAvailable = provider.isAvailable();
            return { available: isAvailable, error: isAvailable ? null : 'Provider not configured' };
        } catch (error) {
            return { available: false, error: error.message };
        }
    }
}
