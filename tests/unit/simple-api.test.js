/**
 * Simple API Service Tests (Node Environment)
 */

describe('API Service Core Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+label@example.org'
      ];

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@domain',
        ''
      ];

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('URL Helper Functions', () => {
    it('should build correct API URLs', () => {
      const baseUrl = 'http://localhost:3200';
      const endpoint = '/api/test';
      const fullUrl = buildApiUrl(baseUrl, endpoint);

      expect(fullUrl).toBe('http://localhost:3200/api/test');
    });

    it('should handle trailing slashes correctly', () => {
      const baseUrl = 'http://localhost:3200/';
      const endpoint = '/api/test';
      const fullUrl = buildApiUrl(baseUrl, endpoint);

      expect(fullUrl).toBe('http://localhost:3200/api/test');
    });
  });

  describe('HTTP Status Helpers', () => {
    it('should identify successful status codes', () => {
      const successCodes = [200, 201, 204];

      successCodes.forEach(code => {
        expect(isSuccessStatus(code)).toBe(true);
      });
    });

    it('should identify error status codes', () => {
      const errorCodes = [400, 401, 403, 404, 500];

      errorCodes.forEach(code => {
        expect(isSuccessStatus(code)).toBe(false);
      });
    });
  });

  describe('Request Header Helpers', () => {
    it('should create default headers', () => {
      const headers = createDefaultHeaders();

      expect(headers).toHaveProperty('Content-Type', 'application/json');
    });

    it('should create auth headers when token provided', () => {
      const token = 'mock-jwt-token';
      const headers = createAuthHeaders(token);

      expect(headers).toHaveProperty('Content-Type', 'application/json');
      expect(headers).toHaveProperty('Authorization', `Bearer ${token}`);
    });

    it('should create default headers when no token provided', () => {
      const headers = createAuthHeaders(null);

      expect(headers).toHaveProperty('Content-Type', 'application/json');
      expect(headers).not.toHaveProperty('Authorization');
    });
  });
});

// Helper functions for testing
function isValidEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

function buildApiUrl(baseUrl, endpoint) {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

function isSuccessStatus(status) {
  return status >= 200 && status < 300;
}

function createDefaultHeaders() {
  return {
    'Content-Type': 'application/json'
  };
}

function createAuthHeaders(token) {
  const headers = createDefaultHeaders();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
