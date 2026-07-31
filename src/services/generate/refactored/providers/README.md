# Image Generation Providers

This directory contains image generation provider implementations and the common provider interface.

## Architecture

### BaseProvider Interface

All image generation providers should extend the `BaseProvider` class and implement the following methods:

```javascript
class MyProvider extends BaseProvider {
    constructor() {
        super('my-provider');
    }

    async generateImage(prompt, guidance, model, userId, options) {
        // Implementation
    }

    async testAvailability() {
        // Implementation
    }

    async getAvailableModels() {
        // Implementation
    }
}
```

### Required Methods

1. **generateImage(prompt, guidance, model, userId, options)**
   - Generate an image using the provider's API
   - Returns a result object using `createSuccessResult()` or `createErrorResult()`
   - Should use `withRetry()` for resilience
   - Must validate credentials using `assertCredentials()`

2. **testAvailability()**
   - Test if the provider is available and properly configured
   - Returns `true` if available, `false` otherwise

3. **getAvailableModels()**
   - Get list of available models for this provider
   - Returns array of model objects

## Provider Implementations

### Grok Provider (New - Class-based)
- **File**: `GrokProvider.js`
- **Class**: `GrokProvider`
- **Env Variable**: `GROK_API_KEY`
- **Status**: ✅ Implements BaseProvider interface

### OpenAI Provider (Legacy - Function-based)
- **File**: `OpenAIProvider.js`
- **Env Variable**: `OPENAI_API_KEY`
- **Status**: ⏳ Pending refactor to BaseProvider

### Google Imagen Provider (Legacy - Function-based)
- **File**: `GoogleImagenProvider.js`
- **Env Variables**: `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`
- **Status**: ⏳ Pending refactor to BaseProvider

### Dezgo Provider (Legacy - Function-based)
- **File**: `DezgoProvider.js`
- **Env Variable**: `DEZGO_API_KEY`
- **Status**: ⏳ Pending refactor to BaseProvider

## Using the Provider Factory

The `ProviderFactory` provides a centralized way to create provider instances:

```javascript
import { createProvider } from './providers/ProviderFactory.js';

// Create a provider instance
const grokProvider = createProvider('grok');

// Generate an image
const result = await grokProvider.generateImage(
    'A beautiful sunset',
    7.5,
    'grok-2-image',
    'user123',
    {}  // Grok doesn't support size/quality options
);

if (result.success) {
    console.log('Image generated:', result.data);
} else {
    console.error('Error:', result.error);
}
```

## Legacy Function-based Usage

For backward compatibility, providers still export their generateImage function:

```javascript
import { generateImage } from './providers/GrokProvider.js';

const result = await generateImage(prompt, guidance, model, userId, options);
```

## Adding a New Provider

1. Create a new file: `MyProvider.js`
2. Extend `BaseProvider`
3. Implement required methods
4. Add credential check to `CredentialValidator.js`
5. Register in `ProviderFactory.js`
6. Export from `index.js`

Example:

```javascript
// MyProvider.js
import { BaseProvider } from './BaseProvider.js';
import { assertCredentials } from '../core/CredentialValidator.js';

export class MyProvider extends BaseProvider {
    constructor() {
        super('my-provider');
    }

    async generateImage(prompt, guidance, model, userId, options) {
        assertCredentials('my-provider');
        // Implementation
    }

    async testAvailability() {
        // Implementation
    }

    async getAvailableModels() {
        // Implementation
    }
}
```

## Error Handling

All providers must:
- Use `createSuccessResult()` for successful operations
- Use `createErrorResult()` with appropriate `ERROR_CODES`
- Mask sensitive data using `maskSensitiveHeaders()`
- Handle standard HTTP status codes (400, 401, 429, 500+)
- Support retry logic via `withRetry()`

## Common Utilities

Providers have access to these utilities:

- **Core**: `CredentialValidator`, `RetryPolicy`, `ResultTypes`
- **Utils**: `ValidationHelpers`, `SecurityHelpers`, `ModelFeatureDetection`, `HttpAgents`

## Migration Plan

### Phase 1: ✅ Complete
- Create `BaseProvider` interface
- Implement `GrokProvider` with new interface
- Create `ProviderFactory`
- Update `CredentialValidator`

### Phase 2: Planned
- Refactor `OpenAIProvider` to extend `BaseProvider`
- Refactor `GoogleImagenProvider` to extend `BaseProvider`
- Refactor `DezgoProvider` to extend `BaseProvider`

### Phase 3: Planned
- Update all code that instantiates providers to use `ProviderFactory`
- Remove scattered provider condition checks
- Centralize provider selection logic

## Environment Variables

Required environment variables for each provider:

```env
# Grok (xAI)
GROK_API_KEY=your_grok_api_key
GROK_API_URL=https://api.x.ai/v1  # Optional, defaults to this

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Google Imagen
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=path_or_json

# Dezgo (Flux, SDXL, etc.)
DEZGO_API_KEY=your_dezgo_api_key
```

