# Frontend Architecture - AutoImage

## Overview

This document outlines the frontend architecture of AutoImage, a sophisticated AI image generation application built with vanilla JavaScript using a modular, component-based architecture. The system emphasizes separation of concerns, event-driven communication, and centralized API management.

## Architecture Patterns

### 1. **Modular Component Architecture**
- **Component-based design** with clear separation of concerns
- **Manager pattern** for orchestrating business logic
- **Event delegation** for efficient DOM handling
- **Service layer** for API abstraction

### 2. **Core Design Principles**
- **Single Responsibility Principle** - Each module/component has one focused purpose
- **Dependency Injection** - Components receive dependencies rather than creating them
- **Event-driven Communication** - Loose coupling through custom events
- **Centralized State Management** - Global state managers for shared data

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                       │
├─────────────────────────────────────────────────────────────┤
│  App Loader (app.js)                                       │
│  ├── Module Registration & Initialization                  │
│  ├── Dependency Management                                 │
│  └── Application Lifecycle                                 │
├─────────────────────────────────────────────────────────────┤
│                     COMPONENT LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  UI Components:                                             │
│  ├── Auth Component (auth-component.js)                    │
│  ├── Header Component (header-component.js)                │
│  ├── Transaction Stats (transaction-stats-component.js)    │
│  └── Multiselect Dropdown (multiselect-dropdown.js)        │
├─────────────────────────────────────────────────────────────┤
│  Feature Components:                                        │
│  ├── Image Component                                       │
│  │   ├── Image Manager (coordination)                      │
│  │   ├── Image Events (user interactions)                  │
│  │   ├── Image UI (rendering)                             │
│  │   └── Image Data (data management)                      │
│  └── Generation Component                                   │
│      ├── Generation Manager (coordination)                 │
│      ├── Generation Events (user interactions)             │
│      ├── Generation UI (rendering)                         │
│      └── Generation Data (data management)                 │
├─────────────────────────────────────────────────────────────┤
│                      MODULE LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Modules:                                   │
│  ├── Images Manager (modules/images.js)                    │
│  ├── Feed Manager (modules/feed/feed-manager.js)           │
│  ├── Textarea Manager (modules/textarea.js)                │
│  ├── Search Manager (modules/search.js)                    │
│  ├── Rating Manager (modules/rating/rating-manager.js)     │
│  ├── Stats Manager (modules/stats/stats-manager.js)        │
│  ├── Prompts Manager (modules/prompts/prompts-manager.js)  │
│  ├── Provider Manager (modules/providers/provider-manager.js) │
│  ├── Guidance Manager (modules/guidance/guidance-manager.js) │
│  └── UI Manager (modules/ui.js)                           │
├─────────────────────────────────────────────────────────────┤
│                      SERVICE LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  Core Services:                                            │
│  ├── API Service (core/api-service.js)                     │
│  │   ├── Request Management                                │
│  │   ├── Authentication Handling                          │
│  │   ├── Error Handling & Retry Logic                     │
│  │   └── Circuit Breaker Pattern                          │
│  ├── Constants (core/constants.js)                         │
│  └── Utils (core/utils.js)                                │
├─────────────────────────────────────────────────────────────┤
│                    FOUNDATION LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  ├── User Management (user.js)                             │
│  ├── Tools & Utilities (tools.js)                          │
│  └── Terms Manager (terms-manager.js)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Event Management System

### Event Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    EVENT FLOW DIAGRAM                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Interaction                                           │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────┐    Event         ┌─────────────┐            │
│  │   DOM       │   Delegation     │   Event     │            │
│  │   Element   │ ──────────────▶  │  Handler    │            │
│  └─────────────┘                  └─────────────┘            │
│                                           │                  │
│                                           ▼                  │
│                                  ┌─────────────┐            │
│                                  │  Component  │            │
│                                  │  Manager    │            │
│                                  └─────────────┘            │
│                                           │                  │
│                                           ▼                  │
│                                  ┌─────────────┐            │
│                                  │   API       │            │
│                                  │  Service    │            │
│                                  └─────────────┘            │
│                                           │                  │
│                                           ▼                  │
│                                  ┌─────────────┐            │
│                                  │  Backend    │            │
│                                  │    API      │            │
│                                  └─────────────┘            │
│                                           │                  │
│                                           ▼                  │
│                                  ┌─────────────┐            │
│                                  │   UI        │            │
│                                  │  Update     │            │
│                                  └─────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1. **Event Delegation Strategy**

#### **Central Event Management**
```javascript
// Example from image-events.js
setupEventDelegation() {
    const imageContainer = document.querySelector('.prompt-output');

    if (imageContainer) {
        imageContainer.addEventListener('click', e => {
            this.handleImageClick(e);
        });
    }
}
```

#### **Benefits:**
- **Performance**: Single event listener handles multiple elements
- **Dynamic Content**: Works with elements added after page load
- **Memory Efficiency**: Reduces event listener overhead

### 2. **Component Event Patterns**

#### **Image Component Events**
- **Image Click Events**: Fullscreen view, image selection
- **Keyboard Events**: Navigation, shortcuts
- **Resize Events**: Responsive image handling
- **Load Events**: Progressive image loading

#### **Generation Component Events**
- **Button Click Events**: Start/stop generation
- **Provider Change Events**: Update generation settings
- **Form Events**: Input validation, auto-save
- **Progress Events**: Real-time generation updates

### 3. **Cross-Component Communication**

#### **Custom Events System**
```javascript
// Example: Authentication state change
window.dispatchEvent(new CustomEvent('authStateChanged', {
    detail: userData
}));

// Listen across components
document.addEventListener('authStateChanged', e => {
    this.updateUserInterface(e.detail);
});
```

#### **Event Types:**
- **`authStateChanged`**: User login/logout status
- **`imageGenerated`**: New image creation
- **`providerChanged`**: AI provider selection
- **`feedUpdated`**: Image feed refresh

---

## API Management System

### API Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API SERVICE LAYER                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   ApiService    │    │    UserApi      │                │
│  │   (Core)        │    │  (User Mgmt)    │                │
│  │                 │    │                 │                │
│  │ • Authentication│    │ • Login/Logout  │                │
│  │ • Request Mgmt  │    │ • Registration  │                │
│  │ • Error Handling│    │ • Profile Mgmt  │                │
│  │ • Retry Logic   │    │ • Token Refresh │                │
│  │ • Circuit Breaker│   │ • Validation    │                │
│  └─────────────────┘    └─────────────────┘                │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   ImageApi      │    │   Global APIs   │                │
│  │ (Image Mgmt)    │    │  (Utilities)    │                │
│  │                 │    │                 │                │
│  │ • Generation    │    │ • Feed Loading  │                │
│  │ • Upload/Download│   │ • Search        │                │
│  │ • Rating/Tags   │    │ • Stats         │                │
│  │ • Metadata      │    │ • Prompts       │                │
│  │ • Processing    │    │ • Terms         │                │
│  └─────────────────┘    └─────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1. **Core API Service Features**

#### **Authentication Management**
```javascript
// Centralized auth handling
class ApiService {
    getAuthHeaders() {
        const headers = { ...this.defaultHeaders };
        const token = this.getAuthToken();

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }
}
```

#### **Request Lifecycle**
1. **Pre-request**: Authentication, validation
2. **Request**: HTTP method, headers, body
3. **Response**: Status checking, data extraction
4. **Post-request**: Caching, error handling
5. **Retry Logic**: Automatic retry on failure
6. **Circuit Breaker**: Prevent cascade failures

### 2. **Error Handling Strategy**

#### **Layered Error Management**
```javascript
// Multi-level error handling
async request(url, options = {}) {
    try {
        const response = await this.retryRequest(requestFn);
        return this.handleResponse(response);
    } catch (error) {
        this.recordFailure();
        throw this.enhanceError(error);
    }
}
```

#### **Error Types:**
- **Network Errors**: Connection failures, timeouts
- **HTTP Errors**: 4xx/5xx status codes
- **Validation Errors**: Client-side validation failures
- **Circuit Breaker**: Service unavailable

### 3. **Request Patterns**

#### **Image Generation Flow**
```javascript
// Example: Image generation request
async generateImage(prompt, providers, guidance = 10) {
    // 1. Validation
    this.validateGenerationParams(prompt, providers, guidance);

    // 2. Authentication
    const headers = this.getAuthHeaders();

    // 3. Request
    const response = await this.post('/api/image/generate', {
        prompt, providers, guidance
    }, { headers });

    // 4. Response handling
    return this.handleGenerationResponse(response);
}
```

#### **Authentication Flow**
```javascript
// User authentication
async login(email, password) {
    // 1. Client-side validation
    this.validateCredentials(email, password);

    // 2. Login request
    const response = await this.post('/api/auth/login', {
        email, password
    });

    // 3. Token storage
    this.storeAuthToken(response.token);

    // 4. User state update
    this.updateUserState(response.user);
}
```

---

## Module System

### 1. **Module Registration Pattern**

#### **AppLoader Module Management**
```javascript
// Dynamic module loading
class AppLoader {
    async loadModules() {
        const moduleConfigs = [
            ['textArea', () => window.textAreaManager, ['Utils', 'StateManager']],
            ['feed', () => window.feedManager, ['Utils']],
            ['guidance', () => window.guidanceManager, ['Utils']],
            ['images', () => window.imagesManager, ['Utils']]
        ];

        moduleConfigs.forEach(([name, module, dependencies]) => {
            this.register(name, module, dependencies);
        });

        await this.initializeModules();
    }
}
```

### 2. **Module Dependencies**

#### **Dependency Graph**
```
AppLoader
├── Core Dependencies
│   ├── Utils
│   ├── StateManager
│   ├── API_ENDPOINTS
│   ├── apiService
│   ├── userApi
│   └── imageApi
├── UI Components
│   ├── authComponent
│   ├── headerComponent
│   └── transactionStatsComponent
└── Feature Modules
    ├── textAreaManager
    ├── feedManager
    ├── guidanceManager
    ├── imagesManager
    ├── searchManager
    ├── ratingManager
    ├── statsManager
    └── promptsManager
```

### 3. **Module Communication**

#### **Inter-Module Events**
```javascript
// Example: Image generation completion
class ImagesManager {
    async generateImage(prompt, providers) {
        const result = await this.apiService.generateImage(prompt, providers);

        // Notify other modules
        window.dispatchEvent(new CustomEvent('imageGenerated', {
            detail: { imageId: result.id, metadata: result }
        }));

        return result;
    }
}
```

---

## State Management

### 1. **Global State Architecture**

#### **State Manager Pattern**
```javascript
// Centralized state management
class StateManager {
    constructor() {
        this.state = {
            user: null,
            images: [],
            currentGeneration: null,
            ui: {
                fullscreen: false,
                loading: false
            }
        };
        this.listeners = new Map();
    }

    setState(key, value) {
        this.state[key] = value;
        this.notifyListeners(key, value);
    }

    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
    }
}
```

### 2. **Component State**

#### **Local State Management**
- **Component-level state** for UI interactions
- **Temporary data** that doesn't need persistence
- **Form state** and validation errors
- **Loading states** and progress indicators

#### **Global State**
- **User authentication** status and profile
- **Generated images** and metadata
- **Application settings** and preferences
- **API cache** and request state

---

## Security Architecture

### 1. **Authentication Security**

#### **Token Management**
```javascript
// Secure token handling
class ApiService {
    storeAuthToken(token) {
        // Store in secure, httpOnly storage when possible
        localStorage.setItem('authToken', token);
        this.scheduleTokenRefresh(token);
    }

    getAuthToken() {
        const token = localStorage.getItem('authToken');
        return this.isTokenValid(token) ? token : null;
    }
}
```

### 2. **Input Validation**

#### **Client-Side Validation**
```javascript
// Multi-layer validation
validateImageGeneration(prompt, providers) {
    // 1. Required field validation
    if (!prompt?.trim()) {
        throw new ValidationError('Prompt is required');
    }

    // 2. Length validation
    if (prompt.length > 500) {
        throw new ValidationError('Prompt too long');
    }

    // 3. Provider validation
    if (!Array.isArray(providers) || providers.length === 0) {
        throw new ValidationError('At least one provider required');
    }
}
```

### 3. **XSS Prevention**

#### **Content Sanitization**
- **Input sanitization** before display
- **HTML escaping** for user-generated content
- **CSP headers** for script execution control
- **DOM manipulation** through safe APIs

---

## Performance Optimization

### 1. **Loading Strategy**

#### **Progressive Loading**
```javascript
// Lazy loading pattern
class AppLoader {
    async loadCore() {
        // Load critical dependencies first
        await this.waitForDependencies([
            'Utils', 'StateManager', 'API_ENDPOINTS'
        ]);
    }

    async loadModules() {
        // Load non-critical modules asynchronously
        const modulePromises = moduleConfigs.map(config =>
            this.loadModule(config)
        );

        await Promise.allSettled(modulePromises);
    }
}
```

### 2. **Event Optimization**

#### **Event Delegation Benefits**
- **Reduced memory usage**: Fewer event listeners
- **Better performance**: Single event handler
- **Dynamic content support**: Auto-handles new elements

### 3. **API Optimization**

#### **Request Optimization**
```javascript
// Request batching and caching
class ApiService {
    constructor() {
        this.requestCache = new Map();
        this.pendingRequests = new Map();
    }

    async request(url, options) {
        // Check cache first
        if (this.requestCache.has(cacheKey)) {
            return this.requestCache.get(cacheKey);
        }

        // Prevent duplicate requests
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }

        // Make request and cache result
        const promise = this.makeRequest(url, options);
        this.pendingRequests.set(cacheKey, promise);

        return promise;
    }
}
```

---

## Error Handling & Monitoring

### 1. **Error Classification**

#### **Error Types & Handling**
```javascript
// Custom error classes
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.userFriendly = true;
    }
}

class NetworkError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = 'NetworkError';
        this.statusCode = statusCode;
        this.retryable = [408, 429, 500, 502, 503, 504].includes(statusCode);
    }
}
```

### 2. **Error Recovery**

#### **Graceful Degradation**
```javascript
// Fallback strategies
class FeedManager {
    async loadFeed() {
        try {
            return await this.apiService.getFeed();
        } catch (error) {
            if (error.retryable) {
                return this.retryWithBackoff(() => this.apiService.getFeed());
            }

            // Fallback to cached data
            return this.getCachedFeed();
        }
    }
}
```

### 3. **User Feedback**

#### **Error Communication**
- **User-friendly messages** for validation errors
- **Loading states** during API requests
- **Retry options** for recoverable errors
- **Fallback content** when services fail

---

## Testing Architecture

### 1. **Test Structure**

#### **Test Categories**
- **Unit Tests**: Individual component logic
- **Integration Tests**: Component interactions
- **E2E Tests**: Full user workflows
- **API Tests**: Backend integration

### 2. **Test Strategy**

#### **Frontend Testing Approach**
```javascript
// Component testing example
describe('ImageManager', () => {
    beforeEach(() => {
        // Mock dependencies
        this.mockApiService = new MockApiService();
        this.imageManager = new ImageManager(this.mockApiService);
    });

    it('should generate image with valid params', async () => {
        const result = await this.imageManager.generateImage(
            'test prompt',
            ['provider1']
        );

        expect(result).toBeDefined();
        expect(this.mockApiService.generateImage).toHaveBeenCalled();
    });
});
```

---

## Development Guidelines

### 1. **Code Organization**

#### **File Structure Principles**
- **Feature-based organization**: Group related functionality
- **Layer separation**: UI, logic, data separate
- **Clear naming conventions**: Descriptive, consistent names
- **Single responsibility**: One purpose per file/class

### 2. **Event Handling Best Practices**

#### **Event Management Rules**
```javascript
// ✅ Good: Event delegation
container.addEventListener('click', e => {
    if (e.target.matches('.btn-generate')) {
        this.handleGenerate(e);
    }
});

// ❌ Avoid: Individual listeners
document.querySelectorAll('.btn-generate').forEach(btn => {
    btn.addEventListener('click', this.handleGenerate);
});
```

### 3. **API Integration Patterns**

#### **Consistent API Usage**
```javascript
// ✅ Good: Centralized API calls
class ComponentManager {
    constructor(apiService) {
        this.apiService = apiService;
    }

    async loadData() {
        return this.apiService.getData('/api/endpoint');
    }
}

// ❌ Avoid: Direct fetch calls
async loadData() {
    const response = await fetch('/api/endpoint');
    return response.json();
}
```

---

## Conclusion

This architecture provides a robust, scalable foundation for the AutoImage frontend application. The modular design enables:

- **Maintainability**: Clear separation of concerns
- **Scalability**: Easy addition of new features
- **Testability**: Isolated, mockable components
- **Performance**: Optimized loading and event handling
- **Security**: Layered validation and authentication
- **User Experience**: Responsive, error-resilient interface

The event-driven, API-centric design ensures loose coupling between components while maintaining efficient communication and data flow throughout the application.
