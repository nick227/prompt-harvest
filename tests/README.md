# Frontend Testing Documentation

## Overview

This project uses a comprehensive testing strategy with multiple layers:

- **Unit Tests** - Individual component and function testing with Jest
- **Integration Tests** - Component interaction testing with Jest + jsdom
- **End-to-End Tests** - Full user workflow testing with Playwright

## Test Structure

```
tests/
├── setup.js                    # Jest test setup and mocks
├── unit/                      # Unit tests
│   ├── api-service.test.js    # API service functionality
│   └── images-manager.test.js # Image generation logic
├── integration/               # Integration tests
│   └── image-generation-flow.test.js # Complete user flows
├── e2e/                      # End-to-end tests
│   ├── auth-flow.spec.js     # Authentication workflows
│   └── image-generation.spec.js # Image generation workflows
└── README.md                 # This documentation
```

## Configuration Files

- `jest.config.js` - Jest configuration for unit/integration tests
- `playwright.config.js` - Playwright configuration for E2E tests
- `babel.config.js` - Babel transpilation for ES modules

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Integration Tests
```bash
# Run integration tests
npm run test:integration

# Run all Jest tests (unit + integration)
npm test
```

### End-to-End Tests
```bash
# Run E2E tests headless
npm run test:e2e

# Run E2E tests with browser UI
npm run test:e2e:headed

# Run E2E tests with Playwright UI
npm run test:e2e:ui
```

### All Tests
```bash
# Run complete test suite
npm run test:all
```

## Test Categories

### Unit Tests

**API Service Tests** (`tests/unit/api-service.test.js`)
- Authentication token management
- HTTP request/response handling
- Error handling and validation
- Email format validation

**Images Manager Tests** (`tests/unit/images-manager.test.js`)
- Component initialization
- Form validation (prompt, providers)
- Button state management
- DOM manipulation
- Error handling

### Integration Tests

**Image Generation Flow** (`tests/integration/image-generation-flow.test.js`)
- Complete generation workflow
- Authentication integration
- UI state management
- Validation error handling
- Duplicate request prevention

### End-to-End Tests

**Authentication Flow** (`tests/e2e/auth-flow.spec.js`)
- User registration
- User login/logout
- Form validation
- Session management
- Protected route access

**Image Generation Flow** (`tests/e2e/image-generation.spec.js`)
- Complete image generation workflow
- Provider selection
- Auto-generation features
- Image interactions
- Session persistence
- Transaction stats display

## Test Coverage

Coverage reports are generated in the `coverage/` directory with:
- **Lines**: 80% minimum
- **Functions**: 75% minimum
- **Branches**: 70% minimum
- **Statements**: 80% minimum

View coverage reports:
```bash
# Generate and view coverage
npm run test:coverage
open coverage/lcov-report/index.html
```

## Mocking Strategy

### Global Mocks (setup.js)
- `fetch` - HTTP requests
- `localStorage/sessionStorage` - Browser storage
- `window.location` - Navigation
- `IntersectionObserver` - Image lazy loading
- `ResizeObserver` - UI resize detection
- Console methods - Cleaner test output

### Component Mocks
- UserAPI - Authentication and user management
- ImagesManager - Image generation logic
- DOM elements - Simulated user interface

## Best Practices

### Writing Tests

1. **Descriptive Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Structure tests clearly
3. **Single Responsibility**: One assertion per test when possible
4. **Clean Setup**: Use beforeEach for consistent state
5. **Mock External Dependencies**: Isolate units under test

### E2E Test Guidelines

1. **Unique Test Data**: Generate unique emails/usernames
2. **Generous Timeouts**: Account for async operations
3. **Stable Selectors**: Use reliable element selectors
4. **Clean State**: Clear cookies/storage between tests
5. **Real User Scenarios**: Test actual user workflows

### Performance

1. **Parallel Execution**: Tests run in parallel where possible
2. **Shared Browser Context**: Reuse browser instances
3. **Selective Testing**: Run specific test suites during development
4. **CI Optimization**: Different settings for CI vs local

## Debugging Tests

### Jest Tests
```bash
# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Verbose output
npm test -- --verbose

# Specific test file
npm test -- --testNamePattern="API Service"
```

### Playwright Tests
```bash
# Debug mode
npm run test:e2e -- --debug

# Headed mode (see browser)
npm run test:e2e:headed

# Specific test
npm run test:e2e -- --grep "should register"
```

## Continuous Integration

Tests are configured to run in CI with:
- Headless browser execution
- Retry on failure (E2E only)
- Artifact collection (screenshots, videos)
- Coverage reporting
- Multiple browser testing

## Common Issues

### Test Failures

1. **Timing Issues**: Increase timeouts for async operations
2. **DOM Not Ready**: Use proper wait conditions
3. **Mock Leakage**: Ensure proper cleanup in afterEach
4. **Browser Context**: Clear state between E2E tests

### Performance Issues

1. **Slow Tests**: Profile with `--detectOpenHandles`
2. **Memory Leaks**: Monitor test memory usage
3. **Flaky Tests**: Improve wait conditions and selectors

## Contributing

When adding new features:

1. **Write Tests First**: TDD approach recommended
2. **Update Coverage**: Maintain coverage thresholds
3. **Test All Browsers**: Verify E2E tests across browsers
4. **Document Changes**: Update this README for new patterns

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
- [Frontend Testing Strategy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
