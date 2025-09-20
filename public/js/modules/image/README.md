# Image DOM Management System

A refactored, modular image DOM management system following SOLID principles with clear separation of concerns.

## Architecture Overview

The system is composed of several specialized classes that work together to handle image DOM operations:

```
ImageDOMManager (Orchestrator)
├── ImageElementFactory (Image Creation)
├── LoadingPlaceholderFactory (Loading States)
├── ImageViewManager (View Operations)
├── ImageDataManager (Data Operations)
└── ImageDOMContracts (Interfaces & Contracts)
```

## Core Components

### 1. ImageDOMManager (Main Orchestrator)
**File**: `image-dom-manager.js`
**Responsibility**: Orchestrates all image DOM operations using composition

**Key Methods**:
- `addImageToOutput(imageData, download)` - Main entry point for adding images
- `showLoadingPlaceholder(promptObj)` - Show loading state
- `removeLoadingPlaceholder()` - Remove loading state
- `toggleProcessingStyle(element)` - Toggle processing styles

**Usage**:
```javascript
const imageManager = new ImageDOMManager();
imageManager.addImageToOutput(imageData, false);
```

### 2. ImageElementFactory
**File**: `ImageElementFactory.js`
**Responsibility**: Creates and manages image elements with loading states

**Key Methods**:
- `createImageElement(imageData)` - Create image with loading/error handling
- `downloadImage(img, imageData)` - Handle image downloads

**Features**:
- Automatic loading state management
- Error handling with fallback placeholders
- Download functionality

### 3. LoadingPlaceholderFactory
**File**: `LoadingPlaceholderFactory.js`
**Responsibility**: Creates and manages loading placeholders

**Key Methods**:
- `createLoadingPlaceholder(promptObj)` - Create dual-view loading placeholder
- `showLoadingPlaceholder(promptObj)` - Show in container
- `removeLoadingPlaceholder()` - Remove from DOM

**Features**:
- Dual-view support (compact/list)
- Animated loading indicators
- Prompt preview display

### 4. ImageViewManager
**File**: `ImageViewManager.js`
**Responsibility**: Handles view operations and placeholder replacement

**Key Methods**:
- `replaceLoadingPlaceholder(placeholder, listItem)` - Replace with actual image
- `insertImageIntoContainer(img, data, container, placeholder)` - Insert image
- `toggleProcessingStyle(element)` - Toggle processing styles

**Features**:
- Dual-view placeholder replacement
- Lazy loading setup
- View state management

### 5. ImageDataManager
**File**: `ImageDataManager.js`
**Responsibility**: Manages data normalization, validation, and extraction

**Key Methods**:
- `normalizeImageData(imageData)` - Normalize to standard format
- `extractImageDataFromElement(img)` - Extract from DOM element
- `validateImageData(imageData)` - Validate data integrity

**Features**:
- Comprehensive data validation
- Flexible data extraction
- Default value handling

### 6. ImageDOMContracts
**File**: `ImageDOMContracts.js`
**Responsibility**: Defines interfaces and contracts for type safety

**Components**:
- Interface definitions for all services
- Configuration contracts
- Result and event contracts

## Configuration

The system uses a configuration object for customization:

```javascript
const config = {
    autoDownload: false,
    lazyLoading: true,
    errorHandling: true,
    loadingStates: true,
    dualViews: true,
    intersectionObserver: true
};

const imageManager = new ImageDOMManager(config);
```

## Usage Examples

### Basic Image Addition
```javascript
const imageData = {
    id: 'img_123',
    url: 'https://example.com/image.jpg',
    title: 'My Image',
    prompt: 'A beautiful landscape',
    provider: 'dalle'
};

const result = imageManager.addImageToOutput(imageData);
```

### With Auto Download
```javascript
const result = imageManager.addImageToOutput(imageData, true);
```

### Loading Placeholder
```javascript
const promptObj = {
    prompt: 'A cat sitting on a chair',
    original: 'cat chair',
    final: 'A photorealistic cat sitting on a wooden chair',
    providers: ['dalle']
};

const placeholder = imageManager.showLoadingPlaceholder(promptObj);
```

### Advanced Usage with Services
```javascript
const services = imageManager.getServices();

// Direct access to composed services
const img = services.elementFactory.createImageElement(imageData);
const placeholder = services.placeholderFactory.createLoadingPlaceholder(promptObj);
const normalizedData = services.dataManager.normalizeImageData(rawData);
```

## Error Handling

The system provides comprehensive error handling:

```javascript
const validation = services.dataManager.validateImageData(imageData);
if (!validation.isValid) {
    console.error('Validation errors:', validation.errors);
    console.warn('Warnings:', validation.warnings);
}
```

## Event System

Events are emitted for important operations:

```javascript
// Listen for image load events
document.addEventListener('image:load', (event) => {
    console.log('Image loaded:', event.data.img.src);
});

// Listen for placeholder events
document.addEventListener('placeholder:created', (event) => {
    console.log('Placeholder created:', event.data.placeholder);
});
```

## Best Practices

### 1. Data Validation
Always validate image data before processing:
```javascript
const validation = dataManager.validateImageData(imageData);
if (!validation.isValid) {
    // Handle validation errors
    return;
}
```

### 2. Error Handling
Use try-catch blocks for operations that might fail:
```javascript
try {
    const result = imageManager.addImageToOutput(imageData);
} catch (error) {
    console.error('Failed to add image:', error);
}
```

### 3. Configuration
Set appropriate configuration for your use case:
```javascript
const config = {
    lazyLoading: true,  // Enable for better performance
    errorHandling: true, // Enable for robustness
    dualViews: false    // Disable if not needed
};
```

### 4. Service Composition
Use the composed services for advanced operations:
```javascript
const services = imageManager.getServices();
// Use specific services for targeted operations
```

## Migration Guide

### From Old System
1. Replace direct method calls with the new orchestrated approach
2. Update data structures to use normalized format
3. Use configuration object instead of global variables
4. Leverage composed services for advanced operations

### Breaking Changes
- `createImageElement()` is now handled by `ImageElementFactory`
- `createLoadingPlaceholder()` is now handled by `LoadingPlaceholderFactory`
- Data extraction methods are now in `ImageDataManager`
- View operations are now in `ImageViewManager`

## Performance Considerations

1. **Lazy Loading**: Enabled by default for better performance
2. **Intersection Observer**: Used for efficient viewport detection
3. **Data Validation**: Cached validation results when possible
4. **Memory Management**: Proper cleanup of event listeners and observers

## Testing

The modular architecture makes testing easier:

```javascript
// Test individual components
const elementFactory = new ImageElementFactory();
const img = elementFactory.createImageElement(testData);

const dataManager = new ImageDataManager();
const validation = dataManager.validateImageData(testData);
```

## Future Enhancements

1. **Caching**: Add intelligent caching for frequently accessed data
2. **Virtual Scrolling**: Support for large image lists
3. **Progressive Loading**: Load images in batches
4. **Accessibility**: Enhanced ARIA support
5. **Performance Metrics**: Built-in performance monitoring
