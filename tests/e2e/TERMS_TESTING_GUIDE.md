# Terms E2E Testing Guide

## Overview

This guide covers the comprehensive E2E testing setup for the terms functionality in the AI Image Generation platform. The tests cover all aspects of the terms page including word search, AI generation, API endpoints, and user interactions.

## Test Structure

### Test Files

1. **`terms.spec.js`** - Core terms functionality tests
2. **`terms-ai.spec.js`** - AI generation and advanced features tests
3. **`terms.config.js`** - Playwright configuration for terms testing

### Test Categories

#### Core Functionality Tests (`terms.spec.js`)
- Page loading and element visibility
- Word types list display
- Search functionality (existing and non-existent words)
- Keyboard interactions (Enter key)
- Clear functionality
- Loading states
- Error handling
- Special characters handling
- Case sensitivity
- Term count display
- Word type clicking

#### API Endpoint Tests (`terms.spec.js`)
- `/word/types/:word` endpoint
- `/words` endpoint
- `/ai/word/add/:word` endpoint
- `/word/examples/:word` endpoint
- `/word/type/:word` endpoint

#### AI Generation Tests (`terms-ai.spec.js`)
- AI word type generation
- Error handling for AI generation
- Concurrent AI requests
- Special characters in AI generation
- Integration with search functionality

#### Advanced Features Tests (`terms-ai.spec.js`)
- Limit parameters
- Pagination
- URL encoding
- Large datasets
- Rate limiting
- Concurrent requests
- Malformed requests

#### Integration Tests (`terms-ai.spec.js`)
- Full workflow testing
- Error recovery
- AI generation to search integration

## Running Tests

### Prerequisites

1. **Server Running**: Ensure the Node.js server is running on port 3200
2. **Database**: Ensure the `word-types.db` database exists and is accessible
3. **Dependencies**: Install Playwright dependencies

```bash
npm install
npx playwright install
```

### Test Commands

#### Run All Terms Tests
```bash
npm run test:e2e:terms-all
```

#### Run Core Terms Tests Only
```bash
npm run test:e2e:terms
```

#### Run AI Generation Tests Only
```bash
npm run test:e2e:terms-ai
```

#### Run Tests with UI Mode (Interactive)
```bash
npm run test:e2e:terms-all -- --ui
```

#### Run Tests in Headed Mode (Visible Browser)
```bash
npm run test:e2e:terms-all -- --headed
```

#### Run Tests in Debug Mode
```bash
npm run test:e2e:terms-all -- --debug
```

#### Run Tests with Custom Configuration
```bash
npx playwright test tests/e2e/terms*.spec.js --config=tests/e2e/terms.config.js
```

### Browser Support

Tests run on multiple browsers:
- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Chrome (Pixel 5), Safari (iPhone 12)

## Test Scenarios

### 1. Basic Search Functionality

**Test**: `should search for existing word and display results`
- **Steps**: 
  1. Navigate to terms page
  2. Enter "cat" in search field
  3. Click "find" button
  4. Verify results are displayed
- **Expected**: Results show with "Term Types Found" heading and list of types

**Test**: `should handle search for non-existent word and show add option`
- **Steps**:
  1. Enter non-existent word
  2. Click "find" button
  3. Verify "No term types found" message with add option
- **Expected**: "No term types found" message with "Add [word] as new term" button displayed

**Test**: `should allow adding new term when not found`
- **Steps**:
  1. Search for non-existent word
  2. Click "Add [word] as new term" button
  3. Verify loading state and AI generation
- **Expected**: Button shows loading state, AI generates term types, results appear after generation

### 2. AI Generation Workflow

**Test**: `should generate new word types via AI`
- **Steps**:
  1. Verify word doesn't exist in database
  2. Call AI generation endpoint
  3. Verify OpenAI response structure
- **Expected**: Valid OpenAI completion response

### 3. Add New Term Functionality

**Test**: `should allow adding new term when not found`
- **Steps**:
  1. Search for non-existent word
  2. Click "Add [word] as new term" button
  3. Verify loading state and AI generation
- **Expected**: Button shows loading state, AI generates term types, results appear after generation

**Test**: `should handle add new term error gracefully`
- **Steps**:
  1. Mock network failure for AI generation
  2. Attempt to add new term
  3. Verify error handling and button re-enabling
- **Expected**: Error message displayed, button re-enabled for retry

**Test**: `should add new term via UI and then find it`
- **Steps**:
  1. Add new term via UI button
  2. Wait for AI generation to complete
  3. Verify term types are now searchable
- **Expected**: New term types appear in search results after generation

**Test**: `should generate and then retrieve AI-generated types`
- **Steps**:
  1. Generate AI types for new word
  2. Wait for database update
  3. Retrieve types via API
  4. Verify types are available
- **Expected**: Types can be retrieved after generation

### 4. Error Handling

**Test**: `should handle network errors gracefully`
- **Steps**:
  1. Mock network failure
  2. Attempt search
  3. Verify graceful error handling
- **Expected**: Page remains functional, no crashes

**Test**: `should handle AI generation errors gracefully`
- **Steps**:
  1. Test with problematic input (very long words)
  2. Verify error handling
- **Expected**: Appropriate error response, no server crashes

**Test**: `should handle add new term error gracefully`
- **Steps**:
  1. Mock network failure for AI generation
  2. Attempt to add new term
  3. Verify error handling and button re-enabling
- **Expected**: Error message displayed, button re-enabled for retry

### 5. User Interface

**Test**: `should show loading state during search`
- **Steps**:
  1. Enter search term
  2. Click find
  3. Verify loading indicator appears
  4. Wait for results
  5. Verify loading disappears
- **Expected**: Loading state properly managed

**Test**: `should clear search input and results`
- **Steps**:
  1. Perform search
  2. Click clear button
  3. Verify input and results cleared
- **Expected**: Clean state after clear

**Test**: `should show add new term button with proper styling`
- **Steps**:
  1. Search for non-existent word
  2. Verify add button appears with proper styling
  3. Verify button hover effects
- **Expected**: Styled button with hover effects and loading states

## API Endpoint Testing

### Endpoint Coverage

| Endpoint | Method | Test Coverage |
|----------|--------|---------------|
| `/word/types/:word` | GET | ✅ Full coverage |
| `/words` | GET | ✅ Full coverage |
| `/ai/word/add/:word` | GET | ✅ Full coverage |
| `/word/examples/:word` | GET | ✅ Basic coverage |
| `/word/type/:word` | GET | ✅ Basic coverage |

### Response Validation

- **Status Codes**: All endpoints return appropriate HTTP status codes
- **Response Format**: JSON responses with expected structure
- **Error Handling**: Graceful handling of invalid requests
- **Data Types**: Proper data type validation

## Performance Testing

### Concurrent Requests
- Multiple simultaneous API calls
- Rapid search requests
- AI generation under load

### Large Datasets
- Handling large word lists
- Memory usage validation
- Response time monitoring

### Rate Limiting
- Rapid request handling
- Server stability under load

## Debugging Tests

### Common Issues

1. **Server Not Running**
   - Error: `ECONNREFUSED`
   - Solution: Start server with `node server.js`

2. **Database Issues**
   - Error: Empty results or crashes
   - Solution: Check `word-types.db` exists and is accessible

3. **AI Generation Failures**
   - Error: OpenAI API errors
   - Solution: Check API key and rate limits

4. **Timing Issues**
   - Error: Element not found
   - Solution: Increase timeouts or add explicit waits

### Debug Commands

```bash
# Run single test with debug
npx playwright test tests/e2e/terms.spec.js --debug

# Run with trace
npx playwright test tests/e2e/terms.spec.js --trace on

# Run with video recording
npx playwright test tests/e2e/terms.spec.js --video on
```

### Test Reports

After running tests, view reports:
- **HTML Report**: `test-results/terms/index.html`
- **JSON Report**: `test-results/terms/results.json`
- **JUnit Report**: `test-results/terms/results.xml`

## Continuous Integration

### CI Configuration

Tests are configured for CI environments:
- **Retries**: 2 retries on CI
- **Workers**: Single worker on CI
- **Timeouts**: Extended timeouts for CI
- **Reports**: Multiple report formats

### Environment Variables

- `CI`: Set to `true` in CI environments
- `PLAYWRIGHT_BROWSERS_PATH`: Custom browser path
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD`: Skip browser download

## Maintenance

### Regular Tasks

1. **Update Test Data**: Ensure test words are available in database
2. **Monitor API Changes**: Update tests when API endpoints change
3. **Review Test Coverage**: Ensure new features are covered
4. **Update Dependencies**: Keep Playwright and test dependencies current

### Test Data Management

- Use unique test words with timestamps
- Clean up test data after tests
- Avoid conflicts with production data

## Troubleshooting

### Test Failures

1. **Check Server Status**: Ensure server is running on port 3200
2. **Verify Database**: Check `word-types.db` exists and is accessible
3. **Check Network**: Ensure no firewall blocking localhost:3200
4. **Review Logs**: Check server logs for errors
5. **Update Dependencies**: Ensure all packages are current

### Performance Issues

1. **Increase Timeouts**: Adjust timeout values in config
2. **Reduce Concurrency**: Run fewer parallel tests
3. **Optimize Database**: Check database performance
4. **Monitor Resources**: Check CPU/memory usage

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Clean up test data after tests
3. **Reliability**: Use stable selectors and waits
4. **Maintainability**: Keep tests simple and readable
5. **Documentation**: Document complex test scenarios
6. **Monitoring**: Monitor test execution times and failures
