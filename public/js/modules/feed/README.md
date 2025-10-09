# Feed Module System

## Overview
Modular infinite scroll system with IntersectionObserver, rate limiting, and comprehensive browser support.

---

## Module Loading Order

**Critical**: Load modules in this exact order:

```html
<!-- 1. Constants -->
<script src="js/modules/feed/feed-constants.js"></script>

<!-- 2. Data layer -->
<script src="js/modules/feed/feed-cache-manager.js"></script>
<script src="js/modules/feed/feed-api-manager.js"></script>

<!-- 3. DOM layer -->
<script src="js/modules/feed/feed-dom-operations.js"></script>
<script src="js/modules/feed/feed-image-handler.js"></script>
<script src="js/modules/feed/feed-download-manager.js"></script>

<!-- 4. Feed UI Dependencies (load BEFORE feed-ui-manager) -->
<script src="js/modules/feed/feed-ui-helpers.js"></script>
<script src="js/modules/feed/feed-ui-event-factory.js"></script>
<script src="js/modules/feed/feed-transition-manager.js"></script>
<script src="js/modules/feed/feed-tag-ui.js"></script>
<script src="js/modules/feed/feed-ui-static-helpers.js"></script>
<script src="js/modules/feed/feed-ui-lifecycle.js"></script>

<!-- 5. Feed UI Manager (core IntersectionObserver logic) -->
<script src="js/modules/feed/feed-ui-manager.js"></script>

<!-- 6. Feed orchestration -->
<script src="js/modules/feed/feed-filter-manager.js"></script>
<script src="js/modules/feed/feed-view-manager.js"></script>
<script src="js/modules/feed/hybrid-tab-service.js"></script>
<script src="js/modules/feed/fill-to-bottom-manager.js"></script>
<script src="js/modules/feed/image-count-manager.js"></script>
<script src="js/modules/feed/feed-manager-core.js"></script>
```

---

## Helper Modules & Fallbacks

### FeedUIStaticHelpers & FeedUILifecycle
These modules are **recommended but optional**. FeedUIManager includes inline fallbacks for graceful degradation.

#### With Helpers (Recommended) ✅
- Full feature set
- Memoized capability detection
- Optimized lifecycle management
- Better diagnostics and metrics

#### Without Helpers (Fallback Mode) ✅
- Core functionality preserved
- Basic capability detection
- Essential cleanup operations
- Old browser compatibility

**Recommendation**: Always ship both helper modules for best performance and diagnostics, but the system will work without them.

---

## Quick Start

### Basic Setup
```javascript
// Create domManager (handles actual DOM operations)
const domManager = new FeedDOMOperations();
domManager.init();

// Create UI manager (handles infinite scroll)
const uiManager = new FeedUIManager(domManager);
uiManager.init();

// Listen for pagination events
FeedUIManager.subscribe(event => {
    console.log('Load more images!', event.detail);
});
```

### With Configuration
```javascript
const uiManager = new FeedUIManager(domManager, null, {
    rootMargin: '300px 0px',      // Pre-load 300px before viewport
    threshold: 0.1,                // Trigger at 10% visibility
    debounceMs: 100,               // 100ms debounce
    debug: true,                   // Enable logging
    pauseOnHidden: true            // Auto-pause on hidden tab
});
```

---

## Breaking Changes (Recent Refactor)

### Removed Methods
The following convenience wrappers were removed. Use domManager directly:

| Removed Method | Replacement |
|----------------|-------------|
| `uiManager.showLoading()` | `uiManager.setLoading(true)` |
| `uiManager.hideLoading()` | `uiManager.setLoading(false)` |
| `uiManager.showLoginPrompt()` | `domManager.showLoginPrompt()` |
| `uiManager.showNoImagesMessage()` | `domManager.showNoImagesMessage()` |
| `uiManager.showErrorMessage(msg)` | `domManager.showErrorMessage(msg)` |
| `uiManager.removeImageFromFeed(id)` | `domManager.removeImageFromFeed(id)` |
| `uiManager.getLastImageElement()` | `domManager.getLastImageElement()` |
| `uiManager.updateFilterButtonStates()` | `domManager.updateFilterButtonStates()` |
| `uiManager.setFilterButtonActive()` | `domManager.setFilterButtonActive()` |
| `uiManager.getScrollPosition()` | `domManager.getScrollPosition()` |
| `uiManager.setScrollPosition()` | `domManager.setScrollPosition()` |

**Why**: Eliminated redundant wrapper layer - more direct, cleaner code.

---

## Module Descriptions

### Core Modules

**feed-ui-manager.js** (1,477 lines)
- IntersectionObserver management
- Infinite scroll coordination
- Viewport detection
- Event dispatching
- Includes inline fallbacks for graceful degradation

**feed-manager-core.js** (632 lines)
- Main orchestrator
- Pagination control
- Filter switching
- Rate limiting (3s every 6 pages)

### Helper Modules

**feed-ui-static-helpers.js** (169 lines) - **Recommended**
- Event subscription/unsubscription
- Capability detection (memoized)
- Instance management
- Provides optimized implementations

**feed-ui-lifecycle.js** (189 lines) - **Recommended**
- Cleanup coordination
- Pause/resume logic
- Batch mutation wrapper
- Complete lifecycle management

**feed-ui-helpers.js** (126 lines) - **Required**
- Pure utility functions
- Margin parsing
- Threshold coercion
- Validation helpers

**feed-ui-event-factory.js** (46 lines) - **Required**
- Custom event creation
- Event payload formatting

**feed-transition-manager.js** (139 lines) - **Required**
- Smooth transitions
- Animation coordination

**feed-tag-ui.js** (167 lines) - **Required**
- Tag overlays
- Tag filtering UI
- Tag chips

### Data & DOM Modules

**feed-dom-operations.js** (293 lines)
- DOM element caching
- DOM manipulation
- Enhanced viewport detection
- Message displays

**feed-cache-manager.js** (198 lines)
- Client-side caching
- Pagination state
- Filter-aware caching

**feed-api-manager.js** (222 lines)
- API calls
- Request deduplication
- Response normalization

**feed-image-handler.js** (155 lines)
- Image rendering
- Image addition logic

### Supporting Modules

**feed-filter-manager.js** (421 lines)
- Filter state management
- Filter switching

**feed-view-manager.js** (375 lines)
- View switching (grid/compact)
- Layout management

**hybrid-tab-service.js** (232 lines)
- Tab management
- Tag filtering

**fill-to-bottom-manager.js** (174 lines)
- Auto-fill viewport
- Bottom detection

**image-count-manager.js** (331 lines)
- Image counting
- Stats tracking

**feed-download-manager.js** (118 lines)
- Bulk downloads
- Download queue

---

## Features

### ✅ Infinite Scroll
- Automatic pagination
- IntersectionObserver (with scroll fallback)
- Configurable margins and thresholds
- Debounced triggers

### ✅ Rate Limiting
- Client-side throttle (3s every 6 pages)
- Prevents abuse
- Discreet loading spinner
- Auto-resume after cooldown

### ✅ Performance
- Gzip compression (~60-80% reduction)
- Browser caching (60-70% bandwidth savings)
- Native lazy loading
- Async image decoding
- Unified resize throttle
- Memoized capability checks

### ✅ Robustness
- Graceful degradation with fallbacks
- Zero memory leaks
- Race condition guards
- SSR-safe
- Cross-browser compatible (IE11+)

---

## Browser Support

### Modern Browsers (Full Feature Set)
- Chrome 72+
- Firefox 75+
- Safari 14.1+
- Edge 79+

### Legacy Browsers (With Fallbacks)
- Chrome 60+
- Firefox 60+
- Safari 6+ (with fallback implementations)
- IE 11 (with polyfills: IntersectionObserver, Promise, WeakMap)

### Fallback Behavior
When helper modules (`feed-ui-static-helpers.js`, `feed-ui-lifecycle.js`) are missing:
- ✅ Core functionality works via inline fallbacks
- ✅ Event subscription uses basic addEventListener
- ✅ Cleanup uses manual listener removal
- ✅ Capability detection returns essential features
- ⚠️ Slightly reduced diagnostic info
- ⚠️ No memoization of capabilities

**Recommendation**: Always ship helper modules for optimal performance and diagnostics.

---

## Configuration Options

```javascript
{
    rootMargin: '300px 0px',          // IO root margin
    threshold: 0.1,                    // IO threshold (0-1 or array)
    debounceMs: 100,                   // Pagination debounce
    resizeThrottleMs: 200,             // Resize throttle
    transitionDuration: 300,           // Transition duration
    eventTarget: window,               // Event dispatch target
    debug: false,                      // Enable debug logging
    disconnectOnPause: false,          // IO-off during pause
    forceCheckOnMutation: false,       // Force check after DOM changes
    pauseOnHidden: true                // Auto-pause on hidden tab
}
```

---

## API Reference

### Instance Methods

**Core**:
- `init()` - Initialize manager (idempotent)
- `cleanup()` - Cleanup all resources
- `destroy()` - Alias for cleanup()

**State**:
- `setLoading(boolean)` - Set loading state
- `getLoading()` - Get loading state
- `pause(disconnectIO)` - Pause triggers
- `resume()` - Resume triggers
- `isReady()` - Check if initialized
- `getObserverState()` - Get observer state (frozen)

**Configuration**:
- `updateConfig(config)` - Update configuration
- `setScrollRoot(element)` - Change scroll container

**Observers**:
- `updateIntersectionObserver()` - Update observed element
- `checkNow(force)` - Manual pagination check
- `notifyFeedChanged()` - Notify of DOM mutations
- `batchMutations(callback)` - Auto-pause/resume wrapper

**Transitions** (delegates):
- `startSmoothTransition()`
- `completeSmoothTransition(promptOutput)`
- `waitForTransition(element, duration)`

**Tags** (delegates):
- `setupTagOverlays()`
- `updateTagFilterIndicator(activeTags)`
- `updateTagsInUseContainer(activeTags)`
- `createRemovableTagChip(tag)`
- `removeTag(tagToRemove)`

**Feed Operations**:
- `clearFeedContent()` - Clear feed (with IO reset)
- `addImageToFeed(imageData, filter)` - Add image (with IO update)

### Static Methods

- `subscribe(handler, options)` - Subscribe to lastImageVisible
- `unsubscribe(handler, target)` - Unsubscribe from events
- `triggerCheck(manager)` - Trigger pagination check
- `getCapabilities()` - Get browser capabilities (memoized)
- `getAllInstances()` - Get all active instances
- `cleanupAllInstances()` - Cleanup all instances
- `installGlobalTidyHook()` - Install SPA/BFCache cleanup

---

## Event System

### lastImageVisible Event
Dispatched when the last image enters viewport:

```javascript
// Subscribe
const unsubscribe = FeedUIManager.subscribe(event => {
    console.log('Last image visible!', event.detail);
    // Load more images...
});

// Unsubscribe
unsubscribe();

// With options
const controller = new AbortController();
FeedUIManager.subscribe(handler, {
    target: window,
    signal: controller.signal,
    passive: true
});

// Cleanup via signal (recommended)
controller.abort();
```

---

## Testing

### E2E Tests
```bash
npm run test:infinite-scroll:headed
```

### Enable Debug Mode
```javascript
// Constructor
const manager = new FeedUIManager(domManager, null, { debug: true });

// Runtime
feedManager.uiManager.config.debug = true;
```

### Disable Helper Modules (Test Fallbacks)
```javascript
// Temporarily undefine helpers
const tempStatic = window.FeedUIStaticHelpers;
const tempLifecycle = window.FeedUILifecycle;
delete window.FeedUIStaticHelpers;
delete window.FeedUILifecycle;

// Create manager (will use fallbacks)
const manager = new FeedUIManager(domManager);
manager.init();

// Restore
window.FeedUIStaticHelpers = tempStatic;
window.FeedUILifecycle = tempLifecycle;
```

---

## Performance Tips

1. **Use helper modules** - Memoized capabilities, optimized lifecycle
2. **Enable pauseOnHidden** - Battery saver for background tabs
3. **Tune rootMargin** - Balance pre-loading vs. bandwidth
4. **Use AbortSignal** - Clean event listener management
5. **Batch DOM mutations** - Use `batchMutations()` for heavy work

---

## Troubleshooting

### Images not loading
- Check domManager has `getLastImageElement()`
- Verify IntersectionObserver is supported (or fallback works)
- Enable debug mode: `config.debug = true`

### Memory leaks
- Ensure `cleanup()` is called on page unload
- Use `installGlobalTidyHook()` for SPAs
- Check manual listeners are removed (old browsers)

### Events not firing
- Verify helper modules loaded before feed-ui-manager
- Check event listener binding in console
- Use `getObserverState()` to inspect state

---

## Migration from Previous Versions

### Breaking Changes
- Removed wrapper methods (use domManager directly)
- `showLoading/hideLoading` → `setLoading(true/false)`
- Requires helper modules (or uses fallbacks)

### Migration Steps
1. Update script tags (add helper modules)
2. Replace removed method calls (see table above)
3. Test thoroughly in target browsers
4. Enable debug mode during migration

---

## Documentation

- `FEED_UI_MANAGER_REFACTORING.md` - Initial refactor
- `FEED_UI_FINAL_REFINEMENTS.md` - Final polish
- `FEED_UI_FALLBACKS_COMPLETE.md` - Fallback implementation
- `INFINITE_SCROLL_COMPLETE.md` - Complete feature guide
- `CACHING_AND_COMPRESSION.md` - Performance optimizations
- `INFINITE_SCROLL_RATE_LIMITING.md` - Rate limit details

---

## Support

### Browser Compatibility
- Modern browsers: Full support with all optimizations
- Legacy browsers: Fallback mode with core functionality
- IE11: Requires polyfills (IntersectionObserver, Promise, WeakMap)

### Helper Module Status
- **Required**: feed-ui-helpers, feed-ui-event-factory, feed-transition-manager, feed-tag-ui
- **Recommended**: feed-ui-static-helpers, feed-ui-lifecycle (fallbacks available)
- **Optional**: All other modules (can be lazy-loaded)

---

**Version**: 2.0.0 (Modular Refactor)
**Last Updated**: October 8, 2025
**Status**: ✅ Production Ready

