# SearchRouter Usage Guide

## Overview
`SearchRouter` provides URL-based search routing for the Image Harvest application, allowing users to bookmark, share, and navigate searches using URL parameters like `?q=cat`.

## Features
- ✅ Automatic URL updates when searches are performed
- ✅ Browser back/forward button support (popstate)
- ✅ Deep linking support (share search URLs)
- ✅ Automatic integration with SearchManager
- ✅ Clean URL parameter management

## URL Pattern
```
https://your-site.com/?q=search+term
https://your-site.com/?q=cat
https://your-site.com/?q=portrait+photography
```

## How It Works

### 1. Automatic Integration
The router automatically initializes when the page loads:
```javascript
// Automatically created at page load
window.searchRouter = new SearchRouter();
```

### 2. URL → Search
When a user visits a URL with `?q=` parameter:
```javascript
// User visits: /?q=cat
// SearchRouter automatically:
// 1. Detects the 'q' parameter
// 2. Waits for SearchManager to initialize
// 3. Triggers search for "cat"
```

### 3. Search → URL
When a user performs a search manually:
```javascript
// User types "dog" in search box
// SearchManager automatically:
// 1. Performs the search
// 2. Notifies SearchRouter
// 3. Updates URL to /?q=dog
```

### 4. Browser Navigation
When a user uses back/forward buttons:
```javascript
// User clicks back button
// SearchRouter automatically:
// 1. Detects URL change
// 2. Triggers appropriate search or clear
```

## Programmatic API

### Get Current Search Query
```javascript
const query = window.searchRouter.getQuery();
console.log(query); // "cat"
```

### Set Search Query
```javascript
// This will update URL and trigger search
window.searchRouter.setQuery('dog');
```

### Clear Search
```javascript
// This will clear URL parameter and search
window.searchRouter.clearQuery();
```

### Check If Search Active
```javascript
if (window.searchRouter.isSearchActive()) {
    console.log('Search is active');
}
```

### Get Shareable URL
```javascript
const shareableURL = window.searchRouter.getShareableURL();
// Returns: "https://your-site.com/?q=cat"
```

### Navigate with Query
```javascript
// Navigate to specific path with search query
window.searchRouter.navigateWithQuery('/search', 'cat');
// Goes to: /search?q=cat
```

## Integration with SearchManager

The `SearchRouter` automatically integrates with `SearchManager`:

### In SearchManager.performSearch()
```javascript
async performSearch(query, forceRefresh = false) {
    // Update URL via SearchRouter if available
    if (window.searchRouter && window.searchRouter.isInitialized) {
        const currentRouterQuery = window.searchRouter.getQuery();

        if (currentRouterQuery !== query) {
            window.searchRouter.currentQuery = query;
            window.searchRouter.updateURL();
        }
    }
    // ... rest of search logic
}
```

### In SearchManager.clearSearch()
```javascript
async clearSearch() {
    // Clear URL via SearchRouter if available
    if (window.searchRouter && window.searchRouter.isInitialized) {
        window.searchRouter.currentQuery = '';
        window.searchRouter.updateURL();
    }
    // ... rest of clear logic
}
```

## Use Cases

### 1. Share Search Results
```javascript
// User searches for "cat"
// They can copy URL: /?q=cat
// Share with friend
// Friend opens link → sees cat search results
```

### 2. Bookmark Searches
```javascript
// User searches for "portrait photography"
// Bookmarks the page
// Browser saves: /?q=portrait+photography
// Opens bookmark later → search loads automatically
```

### 3. Deep Linking from Other Pages
```javascript
// From blog post, link to:
<a href="/?q=landscape">View Landscape Images</a>

// When clicked, automatically searches for "landscape"
```

### 4. Email/Social Media Links
```javascript
// Send email with link:
"Check out these cat images: https://your-site.com/?q=cat"

// Recipient clicks → automatically shows cat search results
```

## Initialization Order

The proper loading order is critical:

```html
<!-- 1. Load search modules -->
<script src="js/modules/search/search-*.js"></script>

<!-- 2. Load SearchManager (creates searchManager instance) -->
<script src="js/modules/search.js"></script>

<!-- 3. Load SearchRouter (waits for searchManager) -->
<script src="js/utils/search-router.js"></script>
```

## Error Handling

The router includes robust error handling:

```javascript
// If SearchManager not available
console.warn('⚠️ SEARCH ROUTER: SearchManager not ready');

// If URL parsing fails
console.warn('⚠️ SEARCH ROUTER: Error handling initial URL:', error);

// If navigation fails
console.warn('⚠️ SEARCH ROUTER: Error navigating with query:', error);
```

## Browser Compatibility

Uses standard browser APIs:
- `URLSearchParams` (all modern browsers)
- `history.pushState()` (all modern browsers)
- `popstate` event (all modern browsers)

## Example Flow

```
1. User visits: /?q=cat
   ↓
2. SearchRouter.init()
   ↓
3. SearchRouter.handleInitialURL()
   - Parses "?q=cat"
   - Stores as pendingQuery
   ↓
4. SearchRouter.waitForSearchManager()
   - Waits for window.searchManager
   ↓
5. SearchManager ready
   ↓
6. SearchRouter.executeSearch('cat')
   ↓
7. SearchManager.triggerSearch('cat')
   ↓
8. Search results displayed
   ↓
9. User types "dog" in search box
   ↓
10. SearchManager.performSearch('dog')
    ↓
11. SearchRouter.updateURL()
    - URL changes to: /?q=dog
    ↓
12. User clicks browser back button
    ↓
13. popstate event fires
    ↓
14. SearchRouter.handleURLChange()
    - Detects URL is now: /?q=cat
    ↓
15. SearchRouter.executeSearch('cat')
    ↓
16. Cat results shown again
```

## Related Files

- `public/js/utils/search-router.js` - SearchRouter implementation
- `public/js/modules/search.js` - SearchManager integration
- `public/js/utils/tag-router.js` - Similar pattern for tag routing
- `public/js/modules/admin/services/admin-router.js` - Similar pattern for admin routing
- `public/index.html` - Script loading order

## Testing

Test the router manually:

1. **Direct URL access:**
   - Visit: `/?q=cat`
   - Expected: Search results for "cat" appear

2. **Manual search:**
   - Type "dog" in search box
   - Expected: URL updates to `/?q=dog`

3. **Clear search:**
   - Click clear or empty search box
   - Expected: URL updates to `/` (no query param)

4. **Browser navigation:**
   - Search for "cat" → URL shows `?q=cat`
   - Search for "dog" → URL shows `?q=dog`
   - Click back button → URL shows `?q=cat`, cat results appear
   - Click forward button → URL shows `?q=dog`, dog results appear

5. **Shareable links:**
   - Copy URL after search
   - Open in new tab/incognito
   - Expected: Same search results appear

