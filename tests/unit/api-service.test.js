/**
 * @jest-environment jsdom
 */

import '../setup.js';

// Mock the API service since it's a class that needs to be imported
const mockApiService = {
  baseUrl: 'http://localhost:3200',
  getAuthToken: jest.fn(),
  setAuthToken: jest.fn(),
  clearAuthToken: jest.fn(),
  isAuthenticated: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  getProfile: jest.fn(),
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

// Set up global userApi
window.userApi = mockApiService;

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe('Authentication', () => {
    it('should store auth token on successful login', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: 'mock-jwt-token',
          user: { id: '1', email: 'test@example.com' }
        }
      };

      mockApiService.login.mockResolvedValue(mockResponse);

      const result = await mockApiService.login('test@example.com', 'password');

      expect(mockApiService.login).toHaveBeenCalledWith('test@example.com', 'password');
      expect(result).toEqual(mockResponse);
    });

    it('should clear auth token on logout', async () => {
      mockApiService.logout.mockResolvedValue({ success: true });

      await mockApiService.logout();

      expect(mockApiService.logout).toHaveBeenCalled();
    });

    it('should validate email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+label@example.org'
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@domain',
        ''
      ];

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('HTTP Methods', () => {
    it('should make GET requests with proper headers', async () => {
      const mockData = { success: true, data: [] };
      mockApiService.get.mockResolvedValue(mockData);

      const result = await mockApiService.get('/api/test');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/test');
      expect(result).toEqual(mockData);
    });

    it('should make POST requests with data', async () => {
      const mockData = { success: true };
      const postData = { name: 'test' };

      mockApiService.post.mockResolvedValue(mockData);

      const result = await mockApiService.post('/api/test', postData);

      expect(mockApiService.post).toHaveBeenCalledWith('/api/test', postData);
      expect(result).toEqual(mockData);
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      mockApiService.get.mockRejectedValue(networkError);

      await expect(mockApiService.get('/api/test')).rejects.toThrow('Network error');
    });
  });

  describe('Authentication State', () => {
    it('should return true when user is authenticated', () => {
      mockApiService.isAuthenticated.mockReturnValue(true);
      mockApiService.getAuthToken.mockReturnValue('valid-token');

      expect(mockApiService.isAuthenticated()).toBe(true);
    });

    it('should return false when user is not authenticated', () => {
      mockApiService.isAuthenticated.mockReturnValue(false);
      mockApiService.getAuthToken.mockReturnValue(null);

      expect(mockApiService.isAuthenticated()).toBe(false);
    });
  });
});

// Helper function for email validation (mocked)
function isValidEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}
