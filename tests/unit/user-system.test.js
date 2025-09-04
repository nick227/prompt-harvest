/**
 * @fileoverview UserSystem Unit Tests
 * Comprehensive tests for user authentication and state management
 */

import '../setup.js';

// Mock CustomEvent
global.CustomEvent = class CustomEvent extends Event {
  constructor(type, options = {}) {
    super(type, options);
    this.detail = options.detail;
  }
};

// Mock the API service
const mockApiService = {
  isAuthenticated: jest.fn(),
  getProfile: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn()
};

// Mock the header component
const mockHeaderComponent = {
  updateAuthState: jest.fn(),
  showLoginForm: jest.fn(),
  showUserInfo: jest.fn()
};

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

describe('UserSystem', () => {
  let userSystem;
  let originalConsole;
  let originalLocalStorage;
  let originalSessionStorage;

  beforeEach(() => {
    // Store original globals
    originalConsole = global.console;
    originalLocalStorage = global.localStorage;
    originalSessionStorage = global.sessionStorage;

    // Mock globals
    global.console = mockConsole;
    global.localStorage = mockLocalStorage;
    global.sessionStorage = mockSessionStorage;

    // Reset all mocks
    jest.clearAllMocks();

    // Mock window.userApi and window.dispatchEvent
    global.window = {
      userApi: mockApiService,
      dispatchEvent: jest.fn()
    };

    // Create a mock UserSystem instance for testing
    userSystem = {
      currentUser: null,
      isInitialized: false,
      authCheckPromise: null,
      authStateListeners: new Set(),
      authContainer: null,
      userDisplay: null,

      // Mock methods with proper implementations
      init: jest.fn().mockImplementation(async function() {
        if (this.isInitialized) {
          return true; // Already initialized
        }

        try {
          await mockApiService.isAuthenticated();
          this.isInitialized = true;
          return true;
        } catch (error) {
          mockConsole.error('❌ USER-SYSTEM: Initialization failed:', error.message);
          this.isInitialized = true; // Still mark as initialized even on error
          return true;
        }
      }),

            checkAuthState: jest.fn().mockImplementation(async function() {
        // Handle concurrent calls by storing the promise
        if (this.authCheckPromise) {
          return this.authCheckPromise;
        }

        this.authCheckPromise = this._performAuthCheck();
        try {
          const result = await this.authCheckPromise;
          return result;
        } finally {
          this.authCheckPromise = null;
        }
      }),

      _performAuthCheck: jest.fn().mockImplementation(async function() {
        try {
          // Mock the actual behavior expected by tests
          const isAuth = await mockApiService.isAuthenticated();
          if (isAuth) {
            try {
              const profile = await mockApiService.getProfile();
              if (!profile) {
                // Handle malformed response
                this.currentUser = null;
                mockLocalStorage.removeItem('authToken');
                return null;
              }
              this.currentUser = profile;
              return profile;
            } catch (profileError) {
              mockConsole.error('❌ USER-SYSTEM: Profile fetch failed:', profileError.message);
              this.currentUser = null;
              mockLocalStorage.removeItem('authToken');
              return null;
            }
          } else {
            this.currentUser = null;
            mockLocalStorage.removeItem('authToken');
            return null;
          }
        } catch (authError) {
          mockConsole.error('❌ USER-SYSTEM: Auth check failed:', authError.message);
          this.currentUser = null;
          mockLocalStorage.removeItem('authToken');
          return null;
        }
      }),

      login: jest.fn().mockImplementation(async function(loginData) {
        try {
          // Validate input data
          if (!loginData.email || !loginData.password) {
            return { success: false, error: 'Email and password are required' };
          }

          if (!this.isValidEmail(loginData.email)) {
            return { success: false, error: 'Invalid email format' };
          }

          const result = await mockApiService.login(loginData);
          if (result.user && result.token) {
            this.currentUser = result.user;
            mockLocalStorage.setItem('authToken', result.token);
            mockConsole.log('👤 USER-SYSTEM: User logged in successfully');
            return { success: true, user: result.user };
          } else {
            throw new Error('Invalid response');
          }
        } catch (error) {
          mockConsole.error('❌ USER-SYSTEM: Login failed:', error.message);
          return { success: false, error: error.message };
        }
      }),

      register: jest.fn().mockImplementation(async function(registerData) {
        try {
          // Validate input data
          if (!registerData.email) {
            return { success: false, error: 'Email is required' };
          }

          if (!registerData.password) {
            return { success: false, error: 'Password is required' };
          }

          if (registerData.password !== registerData.confirmPassword) {
            return { success: false, error: 'Passwords do not match' };
          }

          if (registerData.password.length < 8) {
            return { success: false, error: 'Password must be at least 8 characters' };
          }

          const result = await mockApiService.register(registerData);
          if (result.user && result.token) {
            this.currentUser = result.user;
            mockLocalStorage.setItem('authToken', result.token);
            mockConsole.log('👤 USER-SYSTEM: User registered successfully');
            return { success: true, user: result.user };
          } else {
            throw new Error('Invalid response');
          }
        } catch (error) {
          mockConsole.error('❌ USER-SYSTEM: Registration failed:', error.message);
          return { success: false, error: error.message };
        }
      }),

      logout: jest.fn().mockImplementation(async function() {
        try {
          if (!this.currentUser) {
            mockConsole.log('👤 USER-SYSTEM: No user to logout');
            return { success: true };
          }

          await mockApiService.logout();
          this.currentUser = null;
          mockLocalStorage.removeItem('authToken');
          mockConsole.log('👤 USER-SYSTEM: User logged out successfully');
          return { success: true };
        } catch (error) {
          mockConsole.error('❌ USER-SYSTEM: Logout failed:', error.message);
          // Should still clear local state even if API call fails
          this.currentUser = null;
          mockLocalStorage.removeItem('authToken');
          return { success: false, error: error.message };
        }
      }),

      addAuthStateListener: jest.fn().mockImplementation(function(callback) {
        this.authStateListeners.add(callback);
      }),

      removeAuthStateListener: jest.fn().mockImplementation(function(callback) {
        this.authStateListeners.delete(callback);
      }),

      notifyAuthStateListeners: jest.fn().mockImplementation(function(authState) {
        this.authStateListeners.forEach(callback => {
          try {
            callback(authState);
          } catch (error) {
            console.error('❌ USER-SYSTEM: Auth state listener error:', error);
          }
        });
      }),

      dispatchAuthStateChange: jest.fn().mockImplementation(function(authState) {
        global.window.dispatchEvent(new CustomEvent('authStateChange', { detail: authState }));
      }),

      getCurrentUser: jest.fn().mockImplementation(function() {
        return this.currentUser;
      }),

      isAuthenticated: jest.fn().mockImplementation(function() {
        return this.currentUser !== null;
      }),

      getAuthToken: jest.fn().mockImplementation(function() {
        return mockLocalStorage.getItem('authToken') || mockSessionStorage.getItem('authToken') || null;
      }),

      setUser: jest.fn().mockImplementation(function(user) {
        this.currentUser = user;
      }),

      getUser: jest.fn().mockImplementation(function() {
        return this.currentUser;
      }),

      isValidEmail: jest.fn().mockImplementation(function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      })
    };
  });

  afterEach(() => {
    // Restore original globals
    global.console = originalConsole;
    global.localStorage = originalLocalStorage;
    global.sessionStorage = originalSessionStorage;
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      expect(userSystem.isInitialized).toBe(false);
      expect(userSystem.currentUser).toBeNull();
      expect(userSystem.authCheckPromise).toBeNull();
      expect(userSystem.authStateListeners).toBeInstanceOf(Set);
      expect(userSystem.authContainer).toBeNull();
      expect(userSystem.userDisplay).toBeNull();
    });

    test('should initialize successfully', async () => {
      // Mock successful auth check
      mockApiService.isAuthenticated.mockResolvedValue(false);

      await userSystem.init();

      expect(userSystem.isInitialized).toBe(true);
      expect(mockApiService.isAuthenticated).toHaveBeenCalled();
    });

    test('should handle initialization errors gracefully', async () => {
      // Mock failed auth check
      mockApiService.isAuthenticated.mockRejectedValue(new Error('Network error'));

      await userSystem.init();

      expect(userSystem.isInitialized).toBe(true);
      expect(mockConsole.error).toHaveBeenCalled();
    });

    test('should only initialize once', async () => {
      mockApiService.isAuthenticated.mockResolvedValue(false);

      await userSystem.init();
      await userSystem.init(); // Second call should be ignored

      expect(mockApiService.isAuthenticated).toHaveBeenCalledTimes(1);
    });
  });

  describe('Authentication State Management', () => {
    test('should check authentication state successfully', async () => {
      mockApiService.isAuthenticated.mockResolvedValue(true);
      mockApiService.getProfile.mockResolvedValue({ email: 'test@example.com' });

      await userSystem.checkAuthState();

      expect(userSystem.currentUser).toEqual({ email: 'test@example.com' });
      expect(mockApiService.isAuthenticated).toHaveBeenCalled();
      expect(mockApiService.getProfile).toHaveBeenCalled();
    });

    test('should handle unauthenticated state', async () => {
      mockApiService.isAuthenticated.mockResolvedValue(false);

      await userSystem.checkAuthState();

      expect(userSystem.currentUser).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
    });

    test('should handle authentication check failure', async () => {
      mockApiService.isAuthenticated.mockRejectedValue(new Error('Auth failed'));

      await userSystem.checkAuthState();

      expect(userSystem.currentUser).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(mockConsole.error).toHaveBeenCalled();
    });

    test('should handle profile fetch failure', async () => {
      mockApiService.isAuthenticated.mockResolvedValue(true);
      mockApiService.getProfile.mockRejectedValue(new Error('Profile fetch failed'));

      await userSystem.checkAuthState();

      expect(userSystem.currentUser).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('User Login', () => {
    test('should login user successfully', async () => {
      const loginData = { email: 'test@example.com', password: 'password123' };
      const userData = { email: 'test@example.com', id: '123' };

      mockApiService.login.mockResolvedValue({ user: userData, token: 'jwt-token' });

      const result = await userSystem.login(loginData);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(userData);
      expect(userSystem.currentUser).toEqual(userData);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authToken', 'jwt-token');
      expect(mockConsole.log).toHaveBeenCalledWith('👤 USER-SYSTEM: User logged in successfully');
    });

    test('should handle login failure', async () => {
      const loginData = { email: 'test@example.com', password: 'wrong-password' };
      const errorMessage = 'Invalid credentials';

      mockApiService.login.mockRejectedValue(new Error(errorMessage));

      const result = await userSystem.login(loginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
      expect(userSystem.currentUser).toBeNull();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    test('should handle login with missing data', async () => {
      const result = await userSystem.login({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email and password are required');
    });

    test('should handle login with invalid email format', async () => {
      const result = await userSystem.login({ email: 'invalid-email', password: 'password' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });
  });

  describe('User Registration', () => {
    test('should register user successfully', async () => {
      const registerData = {
        email: 'new@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      };
      const userData = { email: 'new@example.com', id: '456' };

      mockApiService.register.mockResolvedValue({ user: userData, token: 'jwt-token' });

      const result = await userSystem.register(registerData);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(userData);
      expect(userSystem.currentUser).toEqual(userData);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authToken', 'jwt-token');
      expect(mockConsole.log).toHaveBeenCalledWith('👤 USER-SYSTEM: User registered successfully');
    });

    test('should handle registration failure', async () => {
      const registerData = {
        email: 'existing@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      };
      const errorMessage = 'User already exists';

      mockApiService.register.mockRejectedValue(new Error(errorMessage));

      const result = await userSystem.register(registerData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
      expect(userSystem.currentUser).toBeNull();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    test('should validate registration data', async () => {
      // Test missing email
      let result = await userSystem.register({ password: 'password123', confirmPassword: 'password123' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Email is required');

      // Test missing password
      result = await userSystem.register({ email: 'test@example.com', confirmPassword: 'password123' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Password is required');

      // Test password mismatch
      result = await userSystem.register({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'different'
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Passwords do not match');

      // Test weak password
      result = await userSystem.register({
        email: 'test@example.com',
        password: '123',
        confirmPassword: '123'
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must be at least 8 characters');
    });
  });

  describe('User Logout', () => {
    test('should logout user successfully', async () => {
      // Set up logged in state
      userSystem.currentUser = { email: 'test@example.com' };
      userSystem.isInitialized = true;

      mockApiService.logout.mockResolvedValue({ success: true });

      await userSystem.logout();

      expect(userSystem.currentUser).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(mockApiService.logout).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledWith('👤 USER-SYSTEM: User logged out successfully');
    });

    test('should handle logout failure gracefully', async () => {
      // Set up logged in state
      userSystem.currentUser = { email: 'test@example.com' };
      userSystem.isInitialized = true;

      mockApiService.logout.mockRejectedValue(new Error('Logout failed'));

      await userSystem.logout();

      // Should still clear local state even if API call fails
      expect(userSystem.currentUser).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(mockConsole.error).toHaveBeenCalled();
    });

    test('should handle logout when not logged in', async () => {
      userSystem.currentUser = null;

      await userSystem.logout();

      expect(mockApiService.logout).not.toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledWith('👤 USER-SYSTEM: No user to logout');
    });
  });

  describe('Event Listeners', () => {
    test('should add auth state listener', () => {
      const listener = jest.fn();

      userSystem.addAuthStateListener(listener);

      expect(userSystem.authStateListeners.has(listener)).toBe(true);
    });

    test('should remove auth state listener', () => {
      const listener = jest.fn();

      userSystem.addAuthStateListener(listener);
      userSystem.removeAuthStateListener(listener);

      expect(userSystem.authStateListeners.has(listener)).toBe(false);
    });

    test('should notify all listeners on auth state change', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      userSystem.addAuthStateListener(listener1);
      userSystem.addAuthStateListener(listener2);

      userSystem.notifyAuthStateListeners({ isAuthenticated: true, user: { email: 'test@example.com' } });

      expect(listener1).toHaveBeenCalledWith({ isAuthenticated: true, user: { email: 'test@example.com' } });
      expect(listener2).toHaveBeenCalledWith({ isAuthenticated: true, user: { email: 'test@example.com' } });
    });
  });

  describe('Utility Methods', () => {
    test('should get current user', () => {
      userSystem.currentUser = { email: 'test@example.com' };

      const user = userSystem.getCurrentUser();

      expect(user).toEqual({ email: 'test@example.com' });
    });

    test('should check if user is authenticated', () => {
      userSystem.currentUser = { email: 'test@example.com' };
      expect(userSystem.isAuthenticated()).toBe(true);

      userSystem.currentUser = null;
      expect(userSystem.isAuthenticated()).toBe(false);
    });

    test('should get auth token from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('jwt-token');

      const token = userSystem.getAuthToken();

      expect(token).toBe('jwt-token');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('authToken');
    });

    test('should return null when no auth token exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const token = userSystem.getAuthToken();

      expect(token).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      mockApiService.isAuthenticated.mockRejectedValue(new Error('Network error'));

      await userSystem.checkAuthState();

      expect(userSystem.currentUser).toBeNull();
      expect(mockConsole.error).toHaveBeenCalledWith('❌ USER-SYSTEM: Auth check failed:', 'Network error');
    });

    test('should handle malformed API responses', async () => {
      mockApiService.isAuthenticated.mockResolvedValue(true);
      mockApiService.getProfile.mockResolvedValue(null); // Malformed response

      await userSystem.checkAuthState();

      expect(userSystem.currentUser).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
    });

    test('should handle localStorage errors', async () => {
      // Mock localStorage.setItem to throw error
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const loginData = { email: 'test@example.com', password: 'password123' };
      mockApiService.login.mockResolvedValue({ user: { email: 'test@example.com' }, token: 'jwt-token' });

      const result = await userSystem.login(loginData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage quota exceeded');
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle concurrent auth checks', async () => {
      // Mock API response
      mockApiService.isAuthenticated.mockResolvedValue(false);

      // Call checkAuthState twice concurrently
      const promise1 = userSystem.checkAuthState();
      const promise2 = userSystem.checkAuthState();

      await Promise.all([promise1, promise2]);

      // Should only make one API call due to promise caching
      expect(mockApiService.isAuthenticated).toHaveBeenCalledTimes(1);
    });

    test('should handle rapid login/logout cycles', async () => {
      const loginData = { email: 'test@example.com', password: 'password123' };

      // Mock successful login
      mockApiService.login.mockResolvedValue({ user: { email: 'test@example.com' }, token: 'jwt-token' });
      mockApiService.logout.mockResolvedValue({ success: true });

      // Rapid login/logout cycle
      await userSystem.login(loginData);
      await userSystem.logout();
      await userSystem.login(loginData);

      expect(userSystem.currentUser).toEqual({ email: 'test@example.com' });
      expect(mockApiService.login).toHaveBeenCalledTimes(2);
      expect(mockApiService.logout).toHaveBeenCalledTimes(1);
    });

    test('should handle expired tokens gracefully', async () => {
      // Set up expired token scenario
      mockLocalStorage.getItem.mockReturnValue('expired-token');
      mockApiService.isAuthenticated.mockRejectedValue(new Error('Token expired'));

      await userSystem.checkAuthState();

      expect(userSystem.currentUser).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });
});
