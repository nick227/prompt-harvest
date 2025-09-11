# Image UI Components

This directory contains the modular UI components for the image system, broken down into logical layers for better maintainability and separation of concerns.

## File Structure

### Core Components

- **`ui-config.js`** - Configuration and utility functions
  - `UIConfig` class with element creation helpers
  - CSS class and selector definitions
  - Utility methods for DOM manipulation

- **`image-elements.js`** - Basic image element creation
  - `ImageElements` class for creating image elements and wrappers
  - Image styling and data attribute handling
  - Rating display creation

- **`image-placeholder.js`** - Image placeholder and error handling
  - `ImagePlaceholderHandler` class for error handling
  - Placeholder creation and styling
  - Loading state management

### Fullscreen Components

- **`fullscreen-components.js`** - Fullscreen view components
  - `FullscreenComponents` class for fullscreen UI
  - Fullscreen container and image creation
  - Info box with image details

- **`navigation-controls.js`** - Navigation and control elements
  - `NavigationControls` class for UI controls
  - Button creation with hover effects
  - Public status toggle (checkbox)
  - Rating display and navigation elements

### Main Orchestrator

- **`image-ui-main.js`** - Main ImageUI class
  - `ImageUI` class that orchestrates all components
  - Delegates method calls to appropriate components
  - Maintains backward compatibility

- **`index.js`** - Central export file
  - Exports all UI components for easy importing
  - Single entry point for UI modules

## Usage

### Import Individual Components
```javascript
import { UIConfig } from './ui/ui-config.js';
import { ImageElements } from './ui/image-elements.js';
import { NavigationControls } from './ui/navigation-controls.js';
```

### Import All Components
```javascript
import { ImageUI, UIConfig, ImageElements } from './ui/index.js';
```

### Use Main ImageUI Class
```javascript
import { ImageUI } from './ui/image-ui-main.js';

const ui = new ImageUI();
const imageElement = ui.createImageElement(imageData);
const fullscreenImage = ui.createFullscreenImage(imageData);
```

## Benefits of Modular Structure

1. **Separation of Concerns** - Each file handles a specific aspect of UI
2. **Maintainability** - Easier to locate and modify specific functionality
3. **Reusability** - Components can be used independently
4. **Testing** - Individual components can be tested in isolation
5. **Performance** - Only load the components you need
6. **Code Organization** - Clear structure and responsibilities

## Component Responsibilities

- **UIConfig**: Configuration, element creation, utility functions
- **ImageElements**: Basic image creation, wrappers, rating displays
- **ImagePlaceholderHandler**: Error handling, placeholder creation, loading states
- **FullscreenComponents**: Fullscreen view, info boxes, image containers
- **NavigationControls**: Buttons, toggles, navigation elements
- **ImageUI**: Main orchestrator, method delegation, backward compatibility

## Migration Notes

The original `image-ui.js` file now acts as a thin wrapper that delegates to the modular implementation, ensuring backward compatibility while providing the benefits of the new modular structure.
