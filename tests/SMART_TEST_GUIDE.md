# 🧪 Smart Image Generation Test Suite

## Overview

The Smart Image Generation Test Suite is designed to comprehensively test individual image creation segments and the full end-to-end process. It provides detailed diagnostics to identify exactly where issues occur in the image generation pipeline.

## 🚀 Quick Start

### Run the Complete Test Suite
```bash
npm run test:smart
```

### Run with Verbose Output
```bash
npm run test:smart:verbose
```

## 📋 Test Categories

### 1. Individual Segment Tests

These tests verify each component of the image generation system independently:

#### 🔍 **Server Health Check**
- **Purpose**: Verifies the server is running and responding
- **Endpoint**: `GET /api/health`
- **Expected**: 200 status with system health data

#### 🗄️ **Database Connection**
- **Purpose**: Tests MySQL database connectivity and health
- **Endpoint**: `GET /api/health`
- **Expected**: Database status "healthy" with response time < 100ms

#### 📁 **File System Manager**
- **Purpose**: Verifies file system operations and upload directory
- **Endpoint**: `GET /api/health`
- **Expected**: File system status "healthy" with writable upload directory

#### ⚡ **Circuit Breaker Status**
- **Purpose**: Checks if any circuit breakers are open (indicating service issues)
- **Endpoint**: `GET /api/health/image-service`
- **Expected**: All circuit breakers in "CLOSED" state

#### 🔧 **Enhanced Image Service Health**
- **Purpose**: Verifies the enhanced image service is operational
- **Endpoint**: `GET /api/health/image-service`
- **Expected**: Service status "healthy"

#### 💾 **File System Operations**
- **Purpose**: Tests actual file creation, writing, and cleanup
- **Method**: Direct file system operations
- **Expected**: Can create, verify, and delete test files

#### 🖼️ **Image Repository Access**
- **Purpose**: Tests database access for image operations
- **Endpoint**: `GET /api/images`
- **Expected**: Can retrieve image data from database

#### 🚦 **Rate Limiting**
- **Purpose**: Tests rate limiting functionality
- **Method**: Multiple rapid requests
- **Expected**: Either all succeed or some are rate limited (429)

### 2. Full Process Tests

These tests verify the complete image generation workflow:

#### 🎯 **Complete Image Generation Flow**
- **Purpose**: Tests the entire image generation process
- **Endpoint**: `POST /api/image/generate`
- **Expected**:
  - 200 status response
  - Valid image data (id, prompt, imageUrl)
  - Generated image file exists on disk
  - Response time < 30 seconds

#### 🔄 **Image Generation with Variables**
- **Purpose**: Tests prompt variable processing
- **Input**: `'a ${animals} in ${colors}'`
- **Expected**: Variables replaced with actual words

#### ❌ **Error Handling - Invalid Provider**
- **Purpose**: Tests error handling for invalid providers
- **Input**: `providers: ['invalid-provider']`
- **Expected**: 400 status with appropriate error message

#### ❌ **Error Handling - Empty Prompt**
- **Purpose**: Tests validation for empty prompts
- **Input**: `prompt: ''`
- **Expected**: 400 status with validation error

#### ⚡ **Performance - Single Generation**
- **Purpose**: Tests generation performance
- **Expected**: Generation completes within reasonable time

#### 🤖 **Prompt Processing**
- **Purpose**: Tests AI prompt enhancement (if configured)
- **Expected**: Variables processed and replaced

## 📊 Test Results

### Success Metrics
- **Total Tests**: 13 comprehensive tests
- **Success Rate**: Percentage of passed tests
- **Duration**: Total test execution time
- **Performance**: Individual test timing

### Failure Analysis
When tests fail, the suite provides:
- **Specific Error Messages**: Exact failure reasons
- **Stack Traces**: For debugging
- **Duration Data**: Performance insights
- **Component Isolation**: Identifies which system component failed

## 🔧 Configuration

### Test Configuration (`TEST_CONFIG`)
```javascript
{
    timeout: 30000,                    // 30 second timeout per test
    testPrompt: 'a beautiful sunset over mountains, digital art',
    testProviders: ['flux'],           // Test provider
    testGuidance: 10,                  // Guidance value
    testUserId: 'test-user-123',       // Test user ID
    baseUrl: 'http://localhost:3200'   // Server URL
}
```

### Customizing Tests
You can modify the test configuration by editing `tests/smart-image-generation-simple.js`:

1. **Change Test Prompt**: Modify `testPrompt`
2. **Add Providers**: Add to `testProviders` array
3. **Adjust Timeouts**: Modify `timeout` value
4. **Change Server URL**: Update `baseUrl`

## 🐛 Troubleshooting

### Common Issues

#### Server Not Running
```
❌ Server Health Check failed: connect ECONNREFUSED
```
**Solution**: Start the server with `npm start`

#### Database Connection Issues
```
❌ Database Connection failed: Database health check failed
```
**Solution**:
1. Check MySQL is running
2. Verify `.env` DATABASE_URL
3. Run `npm run db:setup`

#### File System Issues
```
❌ File System Operations failed: Upload directory does not exist
```
**Solution**:
1. Create `public/uploads` directory
2. Check file permissions

#### Circuit Breaker Open
```
❌ Circuit Breaker Status failed: Circuit breakers are open
```
**Solution**:
1. Check external service availability
2. Wait for circuit breaker reset
3. Check service configuration

### Debug Mode
For detailed debugging, run with verbose output:
```bash
npm run test:smart:verbose
```

## 📈 Performance Benchmarks

### Expected Performance
- **Health Checks**: < 100ms each
- **Database Operations**: < 50ms
- **File System Operations**: < 10ms
- **Image Generation**: < 30 seconds
- **Total Test Suite**: < 2 minutes

### Performance Warnings
- Tests taking > 2x expected time trigger warnings
- Circuit breaker failures indicate service degradation
- High error rates suggest system instability

## 🔄 Continuous Integration

### Automated Testing
The test suite can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Smart Tests
  run: npm run test:smart
```

### Exit Codes
- **0**: All tests passed
- **1**: One or more tests failed

## 📝 Test Reports

### Console Output
The test suite provides detailed console output with:
- ✅ Pass indicators
- ❌ Fail indicators with error details
- ⏱️ Timing information
- 📊 Summary statistics

### Sample Output
```
🚀 Starting Smart Image Generation Test Suite
🌐 Testing against: http://localhost:3200
============================================================
🧪 [2025-08-28T11:42:42.692Z] Running test: Server Health Check
✅ [2025-08-28T11:42:42.795Z] Server Health Check passed (103ms)
🧪 [2025-08-28T11:42:42.796Z] Running test: Database Connection
✅ [2025-08-28T11:42:42.845Z] Database Connection passed (49ms)
...

============================================================
🧪 SMART IMAGE GENERATION TEST SUMMARY
============================================================
📊 Total Tests: 13
✅ Passed: 13
❌ Failed: 0
📈 Success Rate: 100.0%
⏱️  Total Duration: 45234ms
============================================================
```

## 🎯 Best Practices

### Running Tests
1. **Ensure Server Running**: Start with `npm start`
2. **Check Dependencies**: Verify MySQL and file system
3. **Monitor Resources**: Ensure adequate memory/CPU
4. **Review Results**: Analyze any failures carefully

### Interpreting Results
1. **Green Tests**: System components working correctly
2. **Red Tests**: Specific component needs attention
3. **Performance Data**: Identify bottlenecks
4. **Error Messages**: Guide debugging efforts

### Maintenance
1. **Regular Testing**: Run tests after deployments
2. **Update Prompts**: Keep test prompts relevant
3. **Monitor Trends**: Track performance over time
4. **Document Changes**: Update test documentation

## 🔗 Related Documentation

- [Reliability Guide](../docs/reliability-guide.md)
- [Testing Guide](../TESTING_GUIDE.md)
- [E2E Testing](../tests/e2e/)
- [API Documentation](../docs/api.md)

---

**Last Updated**: 2025-08-28
**Version**: 1.0.0
