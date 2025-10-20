/**
 * Provider Module Exports
 *
 * Central export point for all image generation providers
 */

// Base Provider
export { BaseProvider } from './BaseProvider.js';

// Provider Implementations
export { GrokProvider, generateImage as generateImageGrok } from './GrokProvider.js';

// Legacy Providers (will be refactored to use BaseProvider)
export { default as OpenAIProvider, generateImage as generateImageOpenAI } from './OpenAIProvider.js';
export { default as GoogleImagenProvider, generateImage as generateImageGoogle } from './GoogleImagenProvider.js';
export { default as DezgoProvider, generateImage as generateImageDezgo } from './DezgoProvider.js';

// Provider Factory
export {
    createProvider,
    getRegisteredProviders,
    isProviderRegistered,
    registerProvider
} from './ProviderFactory.js';

