# 🛡️ Reliability & Error Handling Guide

## Overview

This guide documents the enhanced reliability system implemented for the Image Harvest application, focusing on **conservative retry logic** and **resource failure handling**.

## 🚨 **Critical Principle: Conservative Retries**

### **Why Conservative Retries?**

- **API Costs**: Each retry costs money and consumes API quotas
- **Resource Exhaustion**: Retries can overwhelm external services
- **User Experience**: Users expect fast feedback, not endless retries
- **System Stability**: Prevents cascade failures

### **Retry Policy**

| Error Type | Retry? | Reason |
|------------|--------|---------|
| Network timeout | ✅ Yes (1x) | Transient network issue |
| Temporary server error | ✅ Yes (1x) | Server temporarily unavailable |
| Content policy violation | ❌ No | User input issue, won't change |
| Billing quota exceeded | ❌ No | Resource limit, needs user action |
| Invalid parameters | ❌ No | Bad input, won't succeed |
| Authentication failed | ❌ No | Credential issue, needs admin |
| File system error | ❌ No | Infrastructure issue |
| Database error | ❌ No | Data integrity issue |

## 🔧 **Circuit Breaker Configuration**

### **Conservative Thresholds**

```javascript
// Frontend Circuit Breaker
failureThreshold: 3,        // Reduced from 5
maxRetries: 1,             // Reduced from 3
retryDelay: 3000,          // 3 seconds

// Backend Circuit Breaker
aiService: { failureThreshold: 2, timeout: 30000 },
imageGeneration: { failureThreshold: 3, timeout: 120000 },
database: { failureThreshold: 2, timeout: 10000 },
fileSystem: { failureThreshold: 1, timeout: 15000 }
```

### **Circuit Breaker States**

1. **CLOSED**: Normal operation
2. **OPEN**: Service blocked, immediate failure
3. **HALF_OPEN**: Testing recovery, limited requests

## 🚫 **Resource Failure Detection**

### **Non-Retryable Errors**

```javascript
const resourceFailurePatterns = [
    'content_policy_violation',    // User content issue
    'invalid_prompt',              // Bad user input
    'billing_quota_exceeded',      // API quota limit
    'model_not_found',             // Provider issue
    'invalid_parameters',          // Bad request
    'file_system_error',           // Infrastructure
    'database_error',              // Data issue
    'authentication_failed'        // Credential issue
];
```

### **Retryable Errors**

```javascript
const retryableErrors = [
    'Request timeout',             // Network timeout
    'Network error',               // Connection issue
    'ECONNRESET',                  // Connection reset
    'ETIMEDOUT',                   // Timeout
    'ENOTFOUND',                   // DNS issue
    'Temporary server error'       // 5xx errors
];
```

## 📊 **Error Response Format**

### **Success Response**
```json
{
    "success": true,
    "requestId": "req_1234567890_abc123",
    "data": { /* image data */ },
    "duration": 1500,
    "timestamp": "2025-08-28T11:05:18.739Z"
}
```

### **Error Response**
```json
{
    "success": false,
    "requestId": "req_1234567890_abc123",
    "error": {
        "type": "PROVIDER_ERROR",
        "message": "Provider temporarily unavailable",
        "provider": "flux",
        "reason": "Rate limit exceeded"
    },
    "duration": 5000,
    "timestamp": "2025-08-28T11:05:18.739Z"
}
```

## 🔍 **Error Types**

### **Frontend Error Types**
- `VALIDATION_ERROR`: Input validation failed
- `TIMEOUT_ERROR`: Request timeout
- `PROVIDER_ERROR`: External provider issue
- `SERVICE_UNAVAILABLE`: Circuit breaker open
- `CONTENT_POLICY_VIOLATION`: Inappropriate content
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `RESOURCE_FAILURE`: Non-retryable resource issue

### **Backend Error Types**
- `CircuitBreakerOpenError`: Circuit breaker is open
- `ProviderUnavailableError`: Provider not available
- `ImageGenerationTimeoutError`: Generation timeout
- `ContentPolicyViolationError`: Content policy violation
- `FileSystemError`: File system operation failed
- `DatabaseTransactionError`: Database transaction failed

## 🛠️ **Implementation Details**

### **Frontend Retry Logic**

```javascript
async generateWithConservativeRetry(promptObj) {
    try {
        return await this.makeGenerationRequest(promptObj);
    } catch (error) {
        // Only retry on specific transient errors
        if (this.isRetryableError(error) && this.retryCount < this.maxRetries) {
            this.retryCount++;
            await this.delay(this.retryDelay);
            return await this.makeGenerationRequest(promptObj);
        }
        throw error; // Don't retry, fail fast
    }
}
```

### **Backend Resource Failure Detection**

```javascript
isResourceFailure(error) {
    const resourceFailurePatterns = [
        'content_policy_violation',
        'billing_quota_exceeded',
        'invalid_parameters'
        // ... more patterns
    ];

    const errorString = error.toString().toLowerCase();
    return resourceFailurePatterns.some(pattern =>
        errorString.includes(pattern)
    );
}
```

## 📈 **Monitoring & Health Checks**

### **Health Check Endpoints**

- `GET /api/health/image-service`: Service health
- `GET /api/circuit-breakers/status`: Circuit breaker status (admin)
- `POST /api/circuit-breakers/reset`: Reset circuit breakers (admin)

### **Health Metrics**

```json
{
    "service": "EnhancedImageService",
    "status": "healthy",
    "circuitBreakers": {
        "imageGeneration": {
            "state": "CLOSED",
            "successRate": "95.2%",
            "averageResponseTime": "2.3s"
        }
    },
    "database": "connected",
    "aiService": "available"
}
```

## 🚀 **Best Practices**

### **For Developers**

1. **Always check error types** before implementing retry logic
2. **Use circuit breakers** for external service calls
3. **Implement timeouts** for all async operations
4. **Log request IDs** for debugging
5. **Fail fast** on resource failures

### **For Operations**

1. **Monitor circuit breaker states**
2. **Track error rates** by type
3. **Set up alerts** for high failure rates
4. **Review retry patterns** regularly
5. **Update error patterns** as APIs change

### **For Users**

1. **Clear error messages** explain what went wrong
2. **No endless retries** - users get immediate feedback
3. **Helpful suggestions** for common issues
4. **Retry buttons** for transient errors only

## 🔄 **Migration from Old System**

### **Changes Made**

1. **Reduced retry attempts**: 3 → 1
2. **Added resource failure detection**
3. **Implemented circuit breakers**
4. **Enhanced error messages**
5. **Added health monitoring**

### **Backward Compatibility**

- Old endpoints still work
- New endpoints provide enhanced features
- Gradual migration path available

## 📝 **Troubleshooting**

### **Common Issues**

1. **Circuit breaker stuck OPEN**
   - Check service health
   - Reset circuit breaker (admin)
   - Review error logs

2. **High retry rates**
   - Check for resource failures
   - Review retryable error patterns
   - Monitor external service health

3. **Timeout errors**
   - Check network connectivity
   - Review timeout configurations
   - Monitor provider response times

### **Debug Commands**

```bash
# Check service health
curl http://localhost:3200/api/health/image-service

# Check circuit breaker status (requires auth)
curl http://localhost:3200/api/circuit-breakers/status

# Reset circuit breakers (requires admin auth)
curl -X POST http://localhost:3200/api/circuit-breakers/reset
```

## 🎯 **Success Metrics**

- **Reduced API costs**: Fewer unnecessary retries
- **Better user experience**: Faster error feedback
- **Improved reliability**: Circuit breakers prevent cascade failures
- **Easier debugging**: Request IDs and structured errors
- **Better monitoring**: Health checks and metrics

---

**Remember**: When in doubt, **fail fast** rather than retry. It's better to show an error immediately than to waste resources on doomed retries.
