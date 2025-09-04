# Unified User System

## Overview

The Unified User System replaces the complex, redundant user management across multiple files with a single, consistent approach to authentication and user state management.

## Problems Solved

### ❌ Before (Complex & Redundant)
- Multiple user state managers: `user.js`, `auth-component.js`, `auth-state-manager.js`
- Different methods for getting user data: `getProfile()`, `getUser()`, `getCurrentUser()`
- Inconsistent authentication checks across components
- Billing page calling non-existent `apiService.getCurrentUser()`
- Complex dependency chains causing initialization issues

### ✅ After (Unified & Simple)
- Single source of truth: `UserManager` class
- Consistent API: `userManager.getUser()`, `userManager.isAuthenticated()`
- Simplified auth component using unified manager
- Proper dependency management with automatic waiting
- Clean separation of concerns

## Architecture

### Core Components

#### 1. UserManager (`public/js/core/user-manager.js`)
**Single source of truth for user authentication and state**

```javascript
// Main API
userManager.getUser()           // Get current user object
userManager.isAuthenticated()   // Check if user is logged in
userManager.getUserId()         // Get user ID
userManager.getEmail()          // Get user email

// Authentication methods
userManager.login(email, password)
userManager.logout()
userManager.register(email, password, confirmPassword)

// State management
userManager.addAuthStateListener(callback)
userManager.refreshUser()
userManager.requireAuth()       // Redirect to login if not authenticated

// Backward compatibility
userManager.getCurrentUser()    // Alias for getUser()
userManager.getProfile()        // Alias for getUser()
```

#### 2. SimplifiedAuthComponent (`public/js/components/simplified-auth-component.js`)
**Clean UI component using unified UserManager**

- Automatically displays login/register buttons when not authenticated
- Shows user email and logout button when authenticated
- Uses `userManager.addAuthStateListener()` for real-time updates
- Backward compatible with existing `window.authComponent` references

#### 3. Updated Billing Page
**Fixed authentication using unified system**

```javascript
// Before (broken)
const user = await apiService.getCurrentUser(); // ❌ Method doesn't exist

// After (working)
if (!window.userManager.isAuthenticated()) {
    this.redirectToLogin();
    return;
}
const user = window.userManager.getUser(); // ✅ Works correctly
```

## Implementation Details

### Dependency Management
- UserManager waits for `window.userApi` to be available
- Components wait for UserManager to be initialized
- Automatic retry with timeout (5 seconds max)
- Prevents race conditions with promise caching

### Event System
```javascript
// Listen for auth state changes
userManager.addAuthStateListener((user) => {
    if (user) {
        console.log('User logged in:', user.email);
    } else {
        console.log('User logged out');
    }
});

// Custom events for backward compatibility
window.addEventListener('authStateChanged', (event) => {
    const user = event.detail;
    // Handle auth state change
});
```

### Error Handling
- Graceful fallbacks when dependencies aren't available
- Automatic retry for failed auth checks
- Clear error messages for debugging
- Silent failures for background operations

## Migration Guide

### For Existing Code

#### Replace Direct API Calls
```javascript
// Old way
const user = await userApi.getProfile();
const isAuth = userApi.isAuthenticated();

// New way
const user = userManager.getUser();
const isAuth = userManager.isAuthenticated();
```

#### Replace Auth Component References
```javascript
// Old way
const user = window.authComponent.getUser();

// New way (still works for backward compatibility)
const user = window.authComponent.getUser();

// Or use unified manager directly
const user = window.userManager.getUser();
```

#### Replace Authentication Checks
```javascript
// Old way
if (!userApi.isAuthenticated()) {
    window.location.href = '/login.html';
}

// New way
if (!userManager.requireAuth()) {
    return; // Already redirected
}
```

### For New Pages

#### Add to HTML
```html
<!-- Load dependencies in order -->
<script src="js/core/api-service.js"></script>
<script src="js/core/user-manager.js"></script>
<script src="js/components/simplified-auth-component.js"></script>
```

#### Use in JavaScript
```javascript
// Wait for user manager to be ready
await userManager.waitForUserApi();

// Check authentication
if (!userManager.requireAuth()) {
    return; // Redirected to login
}

// Get user data
const user = userManager.getUser();
console.log('Current user:', user.email);
```

## Benefits

### 🎯 **Consistency**
- Same authentication logic across all pages
- Unified API for user operations
- Consistent error handling

### 🚀 **Performance**
- Single auth check instead of multiple
- Cached user state to prevent redundant API calls
- Efficient event system

### 🛠️ **Maintainability**
- Single file to update for user logic changes
- Clear separation of concerns
- Easy to debug and test

### 🔄 **Reliability**
- Proper dependency management
- Automatic retry mechanisms
- Graceful error handling

## Testing

### Manual Testing
1. **Billing Page**: Should not redirect to login when authenticated
2. **Homepage**: Should show correct auth state in header
3. **Login/Logout**: Should update all components consistently
4. **Page Refresh**: Should maintain auth state

### Automated Testing
```javascript
// Test user manager availability
assert(window.userManager, 'UserManager should be available');

// Test authentication methods
assert(typeof window.userManager.isAuthenticated === 'function', 'isAuthenticated method should exist');

// Test auth component
assert(window.authComponent, 'Auth component should be available for backward compatibility');
```

## Future Enhancements

### Planned Improvements
- [ ] Add user preferences management
- [ ] Implement session timeout handling
- [ ] Add multi-factor authentication support
- [ ] Create user activity tracking
- [ ] Add user roles and permissions

### Migration Path
- [ ] Remove old `auth-state-manager.js`
- [ ] Update remaining components to use unified system
- [ ] Add comprehensive unit tests
- [ ] Create migration scripts for existing data

## Troubleshooting

### Common Issues

#### "UserManager not available"
- Ensure `api-service.js` loads before `user-manager.js`
- Check for JavaScript errors preventing initialization
- Verify script loading order in HTML

#### "Authentication not working"
- Check browser console for API errors
- Verify userApi is properly initialized
- Check network requests to `/api/auth/profile`

#### "Auth component not updating"
- Ensure `addAuthStateListener` is called
- Check for JavaScript errors in event handlers
- Verify DOM elements exist before rendering

### Debug Commands
```javascript
// Check user manager state
console.log('UserManager:', window.userManager);
console.log('Is initialized:', window.userManager?.isInitialized);
console.log('Current user:', window.userManager?.getUser());

// Check auth component state
console.log('Auth component:', window.authComponent);
console.log('Is authenticated:', window.authComponent?.isAuthenticated());

// Check API service
console.log('UserApi:', window.userApi);
console.log('API authenticated:', window.userApi?.isAuthenticated());
```
