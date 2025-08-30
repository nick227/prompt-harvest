# API Contracts Documentation

## Overview

This document defines the contracts between the frontend and backend APIs, ensuring consistent data exchange and error handling across the application.

## Base Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  },
  "timestamp": "2025-08-28T13:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "type": "ERROR_TYPE",
    "message": "Human-readable error message",
    "details": "Additional error details (optional)"
  },
  "timestamp": "2025-08-28T13:00:00.000Z"
}
```

## Authentication

### JWT Token Format
- **Header**: `Authorization: Bearer <token>`
- **Token Expiry**: 7 days
- **Algorithm**: HS256

### Authentication Middleware
- **Global**: Applied to all routes via `authenticateToken`
- **Optional**: Routes can allow anonymous access
- **Required**: Routes can require authentication via `requireAuth`

---

## User Management APIs

### 1. User Registration

**Endpoint**: `POST /api/auth/register`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Validation Rules**:
- Email: Valid email format, required
- Password: Minimum 6 characters, required

**Response**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "username": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Cases**:
- `400`: Invalid email format
- `400`: Password too short
- `400`: Email already exists
- `400`: Missing required fields

### 2. User Login

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "username": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Cases**:
- `400`: Invalid email format
- `401`: Invalid credentials
- `400`: Missing required fields

### 3. Get User Profile

**Endpoint**: `GET /api/auth/profile`

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "username": "user",
      "createdAt": "2025-08-28T13:00:00.000Z",
      "updatedAt": "2025-08-28T13:00:00.000Z"
    }
  }
}
```

**Error Cases**:
- `401`: Authentication required

### 4. Update User Profile

**Endpoint**: `PUT /api/auth/profile`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "username": "newusername",
  "email": "newemail@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "user_123",
      "email": "newemail@example.com",
      "username": "newusername",
      "createdAt": "2025-08-28T13:00:00.000Z",
      "updatedAt": "2025-08-28T13:00:00.000Z"
    }
  }
}
```

### 5. Change Password

**Endpoint**: `POST /api/auth/change-password`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### 6. Request Password Reset

**Endpoint**: `POST /api/auth/forgot-password`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent"
}
```

### 7. Reset Password

**Endpoint**: `POST /api/auth/reset-password`

**Request Body**:
```json
{
  "token": "reset_token_here",
  "newPassword": "newpassword123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### 8. User Logout

**Endpoint**: `POST /api/auth/logout`

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Image Management APIs

### 1. Generate Image

**Endpoint**: `POST /api/image/generate`

**Headers**: `Authorization: Bearer <token>` (optional)

**Request Body**:
```json
{
  "prompt": "a beautiful sunset over mountains",
  "providers": ["flux", "dalle"],
  "guidance": 10,
  "multiplier": false,
  "mixup": false,
  "mashup": false,
  "promptId": "prompt_123",
  "original": "original prompt text"
}
```

**Validation Rules**:
- Prompt: Required, 3-1000 characters
- Providers: Array, at least one provider
- Guidance: Number, 1-20
- Optional fields: multiplier, mixup, mashup, promptId, original

**Response**:
```json
{
  "success": true,
  "requestId": "req_1234567890_abc123",
  "data": {
    "id": "img_123",
    "prompt": "a beautiful sunset over mountains",
    "original": "original prompt text",
    "imageUrl": "uploads/image_123.jpg",
    "provider": "flux",
    "guidance": 10,
    "model": "flux-xl",
    "rating": null,
    "createdAt": "2025-08-28T13:00:00.000Z"
  },
  "duration": 15000,
  "timestamp": "2025-08-28T13:00:00.000Z"
}
```

**Error Cases**:
- `400`: Invalid prompt
- `400`: No providers selected
- `400`: Invalid guidance value
- `429`: Rate limit exceeded
- `500`: Image generation failed

### 2. Get Images

**Endpoint**: `GET /api/images`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `rating`: Filter by rating (1-5 or 'all')
- `provider`: Filter by provider

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "img_123",
      "userId": "user_123",
      "prompt": "a beautiful sunset",
      "original": "original prompt",
      "imageUrl": "uploads/image_123.jpg",
      "provider": "flux",
      "guidance": 10,
      "model": "flux-xl",
      "rating": 5,
      "createdAt": "2025-08-28T13:00:00.000Z",
      "updatedAt": "2025-08-28T13:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 3. Get Image by ID

**Endpoint**: `GET /api/images/:id`

**Response**:
```json
{
  "success": true,
  "data": {
    "image": {
      "id": "img_123",
      "userId": "user_123",
      "prompt": "a beautiful sunset",
      "original": "original prompt",
      "imageUrl": "uploads/image_123.jpg",
      "provider": "flux",
      "guidance": 10,
      "model": "flux-xl",
      "rating": 5,
      "createdAt": "2025-08-28T13:00:00.000Z",
      "updatedAt": "2025-08-28T13:00:00.000Z"
    }
  }
}
```

**Error Cases**:
- `404`: Image not found

### 4. Rate Image

**Endpoint**: `POST /api/images/:id/rating`

**Headers**: `Authorization: Bearer <token>` (optional)

**Request Body**:
```json
{
  "rating": 5
}
```

**Validation Rules**:
- Rating: Required, 1-5

**Response**:
```json
{
  "success": true,
  "message": "Image rated successfully",
  "data": {
    "image": {
      "id": "img_123",
      "prompt": "a beautiful sunset",
      "imageUrl": "uploads/image_123.jpg",
      "provider": "flux",
      "rating": 5,
      "createdAt": "2025-08-28T13:00:00.000Z"
    }
  }
}
```

**Error Cases**:
- `400`: Invalid rating value
- `404`: Image not found

### 5. Get Image Statistics

**Endpoint**: `GET /api/images/stats`

**Headers**: `Authorization: Bearer <token>` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "count": 1000,
    "userCount": 50,
    "ratingDistribution": {
      "1": 10,
      "2": 20,
      "3": 30,
      "4": 40,
      "5": 50
    },
    "averageRating": 4.2
  }
}
```

---

## Error Types

### ValidationError
- **Status**: 400
- **Type**: `VALIDATION_ERROR`
- **Use**: Input validation failures

### AuthenticationError
- **Status**: 401
- **Type**: `AUTHENTICATION_ERROR`
- **Use**: Authentication failures

### AuthorizationError
- **Status**: 403
- **Type**: `AUTHORIZATION_ERROR`
- **Use**: Permission denied

### NotFoundError
- **Status**: 404
- **Type**: `NOT_FOUND_ERROR`
- **Use**: Resource not found

### ConflictError
- **Status**: 409
- **Type**: `CONFLICT_ERROR`
- **Use**: Resource conflicts

### RateLimitError
- **Status**: 429
- **Type**: `RATE_LIMIT_ERROR`
- **Use**: Rate limiting

### DatabaseError
- **Status**: 500
- **Type**: `DATABASE_ERROR`
- **Use**: Database operation failures

### ExternalServiceError
- **Status**: 502
- **Type**: `EXTERNAL_SERVICE_ERROR`
- **Use**: External service failures

### ImageGenerationError
- **Status**: 500
- **Type**: `IMAGE_GENERATION_ERROR`
- **Use**: Image generation failures

---

## Rate Limiting

### Image Generation
- **Window**: 15 minutes
- **Limit**: 50 requests
- **Headers**: `Retry-After: <seconds>`

### Authentication
- **Window**: 5 minutes
- **Limit**: 10 requests
- **Headers**: `Retry-After: <seconds>`

### General API
- **Window**: 1 minute
- **Limit**: 200 requests
- **Headers**: `Retry-After: <seconds>`

---

## Frontend Integration

### API Service Usage

```javascript
// User operations
const user = await userApi.register(email, password);
const user = await userApi.login(email, password);
const profile = await userApi.getProfile();
await userApi.logout();

// Image operations
const image = await imageApi.generateImage(prompt, providers, guidance);
const images = await imageApi.getImages(page, limit, filters);
const image = await imageApi.getImage(id);
await imageApi.rateImage(id, rating);
const stats = await imageApi.getImageStats();
```

### Error Handling

```javascript
try {
  const result = await userApi.login(email, password);
  // Handle success
} catch (error) {
  // Handle specific error types
  if (error.status === 401) {
    // Authentication error
  } else if (error.status === 429) {
    // Rate limit error
  } else {
    // Other errors
  }
}
```

### Circuit Breaker

The frontend API service includes circuit breaker functionality:
- **Threshold**: 5 failures
- **Timeout**: 60 seconds
- **States**: CLOSED, OPEN, HALF_OPEN

---

## Testing

### Test Scripts
- `npm run test:frontend-api`: Test frontend API integration
- `npm run test:smart`: Test smart image generation
- `npm test`: Run unit tests

### Test Coverage
- User authentication flows
- Image generation and management
- Error handling and validation
- Rate limiting
- Circuit breaker functionality

---

## Security Considerations

1. **JWT Tokens**: Stored securely, auto-refresh on expiry
2. **Password Hashing**: bcrypt with 12 salt rounds
3. **Input Validation**: Client and server-side validation
4. **Rate Limiting**: Prevents abuse and DoS attacks
5. **CORS**: Configured for specific origins
6. **Error Messages**: No sensitive information in error responses

---

## Performance Considerations

1. **Database Indexing**: Optimized queries with proper indexes
2. **Caching**: In-memory caching for frequently accessed data
3. **Pagination**: Efficient data retrieval with pagination
4. **Circuit Breakers**: Prevents cascading failures
5. **Request Timeouts**: 30-second timeout for all requests
6. **Retry Logic**: Exponential backoff for transient errors

---

## Monitoring

### Health Checks
- `GET /api/health`: Overall system health
- `GET /api/health/image-service`: Image service health
- `GET /api/monitoring/metrics`: System metrics
- `GET /api/circuit-breakers/status`: Circuit breaker status

### Metrics
- Request/response times
- Error rates
- Circuit breaker states
- Database performance
- File system usage

---

## Versioning

Current API version: **v1**

Future versions will be handled through:
- URL versioning: `/api/v2/...`
- Header versioning: `Accept: application/vnd.api+json;version=2`
- Content negotiation for backward compatibility
