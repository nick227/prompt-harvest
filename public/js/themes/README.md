# Theme System

A clean, simplified theme system with palette-based color management.

## Architecture

```
📁 /themes/
├── 📄 managers/ColorPaletteManager.js    # Color palette definitions
├── 📄 composers/ThemeComposer.js         # Theme building from palettes
├── 📄 SimpleThemeService.js              # Main theme service (150 lines)
└── 📄 README.md                          # This file
```

## Components

### ColorPaletteManager
- **5 Comprehensive Theme Palettes**: default-dark, apple-light, monokai, high-contrast, discord
- **80+ Color Variables per Theme**: background, surface, border, text, accent, interactive, status, component-specific
- **Special Label Colors**: auto-label and enhance-label with complementary color pairs
- **Granular Control**: Fine-grained color customization for every UI element

### ThemeComposer
- Combines palettes into complete themes
- Provides theme definitions and building logic
- Supports custom theme creation

### SimpleThemeService
- Main theme management (150 lines vs 1000+ in old system)
- Direct palette integration
- Clean CSS generation
- Theme switching and persistence

## Usage

```javascript
// Switch theme
const themeService = new SimpleThemeService();
themeService.applyTheme('apple');

// Get current theme
const themeService = new SimpleThemeService();
const current = themeService.getCurrentTheme();

// Get all themes
const themes = themeService.themes;

// Test theme functionality
themeService.testAutoEnhanceLabels();
themeService.testThemeDropdownSync();
```

## Benefits

- ✅ **90% less code** while maintaining functionality
- ✅ **Direct palette integration** without abstraction layers
- ✅ **Easy to maintain** and understand
- ✅ **Better performance** with fewer object creations
- ✅ **Clean architecture** focused on actual needs
