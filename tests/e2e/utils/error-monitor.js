/**
 * JavaScript Error Monitoring Utility for E2E Tests
 * Automatically captures and validates JavaScript errors across all tests
 */

export class ErrorMonitor {
  constructor(page) {
    this.page = page;
    this.consoleErrors = [];
    this.uncaughtExceptions = [];
    this.networkErrors = [];
    this.isMonitoring = false;
  }

  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.reset();

    // Monitor console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.consoleErrors.push({
          type: 'console.error',
          text: msg.text(),
          location: msg.location(),
          timestamp: new Date().toISOString(),
          url: this.page.url()
        });
      }
    });

    // Monitor uncaught exceptions
    this.page.on('pageerror', error => {
      this.uncaughtExceptions.push({
        type: 'uncaught_exception',
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        url: this.page.url()
      });
    });

    // Monitor network errors
    this.page.on('response', response => {
      if (response.status() >= 400) {
        this.networkErrors.push({
          type: 'network_error',
          status: response.status(),
          url: response.url(),
          statusText: response.statusText(),
          timestamp: new Date().toISOString()
        });
      }
    });

    // Monitor request failures
    this.page.on('requestfailed', request => {
      this.networkErrors.push({
        type: 'request_failed',
        url: request.url(),
        method: request.method(),
        failure: request.failure(),
        timestamp: new Date().toISOString()
      });
    });
  }

  stopMonitoring() {
    this.isMonitoring = false;
    // Note: Playwright doesn't provide a way to remove specific listeners
    // so we rely on the isMonitoring flag
  }

  reset() {
    this.consoleErrors = [];
    this.uncaughtExceptions = [];
    this.networkErrors = [];
  }

  hasErrors() {
    return this.consoleErrors.length > 0 ||
           this.uncaughtExceptions.length > 0;
  }

  hasNetworkErrors() {
    return this.networkErrors.length > 0;
  }

  getCriticalErrors() {
    return this.uncaughtExceptions.filter(error =>
      error.name === 'ReferenceError' ||
      error.name === 'SyntaxError' ||
      error.name === 'TypeError'
    );
  }

  getVariableReferenceErrors() {
    const patterns = [
      'is not defined',
      'Cannot read properties of undefined',
      'Cannot read property',
      'undefined is not a function'
    ];

    return [...this.consoleErrors, ...this.uncaughtExceptions].filter(error =>
      patterns.some(pattern => error.message?.includes(pattern) || error.text?.includes(pattern))
    );
  }

  getSyntaxErrors() {
    return this.uncaughtExceptions.filter(error =>
      error.name === 'SyntaxError' ||
      error.message?.includes('string literal') ||
      error.message?.includes('Unterminated')
    );
  }

  getErrorSummary() {
    return {
      total: this.consoleErrors.length + this.uncaughtExceptions.length,
      consoleErrors: this.consoleErrors.length,
      uncaughtExceptions: this.uncaughtExceptions.length,
      networkErrors: this.networkErrors.length,
      critical: this.getCriticalErrors().length,
      variableReference: this.getVariableReferenceErrors().length,
      syntax: this.getSyntaxErrors().length
    };
  }

  getAllErrors() {
    return {
      consoleErrors: this.consoleErrors,
      uncaughtExceptions: this.uncaughtExceptions,
      networkErrors: this.networkErrors
    };
  }

  // Assertion helpers for tests
  async assertNoJavaScriptErrors() {
    const summary = this.getErrorSummary();

    if (summary.total > 0) {
      const errorDetails = JSON.stringify(this.getAllErrors(), null, 2);
      throw new Error(`JavaScript errors detected: ${summary.total} total (${summary.consoleErrors} console, ${summary.uncaughtExceptions} uncaught)\nDetails: ${errorDetails}`);
    }
  }

  async assertNoVariableReferenceErrors() {
    const varErrors = this.getVariableReferenceErrors();

    if (varErrors.length > 0) {
      const errorDetails = JSON.stringify(varErrors, null, 2);
      throw new Error(`Variable reference errors detected: ${varErrors.length}\nDetails: ${errorDetails}`);
    }
  }

  async assertNoSyntaxErrors() {
    const syntaxErrors = this.getSyntaxErrors();

    if (syntaxErrors.length > 0) {
      const errorDetails = JSON.stringify(syntaxErrors, null, 2);
      throw new Error(`Syntax errors detected: ${syntaxErrors.length}\nDetails: ${errorDetails}`);
    }
  }

  async assertNoCriticalErrors() {
    const criticalErrors = this.getCriticalErrors();

    if (criticalErrors.length > 0) {
      const errorDetails = JSON.stringify(criticalErrors, null, 2);
      throw new Error(`Critical JavaScript errors detected: ${criticalErrors.length}\nDetails: ${errorDetails}`);
    }
  }

  // Wait for application to be ready
  async waitForApplicationReady(timeout = 10000) {
    await this.page.waitForFunction(() => {
      return window.document.readyState === 'complete' &&
             typeof window.Utils !== 'undefined' &&
             typeof window.apiService !== 'undefined';
    }, { timeout });

    // Additional wait for modules to initialize
    await this.page.waitForTimeout(2000);
  }

  // Log errors for debugging
  logErrors() {
    const summary = this.getErrorSummary();

    if (summary.total > 0) {
      console.log('\n🚨 JavaScript Errors Detected:');
      console.log('Summary:', summary);

      if (this.consoleErrors.length > 0) {
        console.log('\nConsole Errors:');
        this.consoleErrors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.text} (${error.url})`);
        });
      }

      if (this.uncaughtExceptions.length > 0) {
        console.log('\nUncaught Exceptions:');
        this.uncaughtExceptions.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.name}: ${error.message} (${error.url})`);
        });
      }
    }
  }
}

// Test fixture helper
export async function setupErrorMonitoring(page) {
  const errorMonitor = new ErrorMonitor(page);
  errorMonitor.startMonitoring();

  // Clear any existing state
  await page.context().clearCookies();

  // Try to clear storage, but don't fail if it's not accessible
  try {
    await page.evaluate(() => {
      if (typeof localStorage !== 'undefined') localStorage.clear();
      if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
    });
  } catch (error) {
    // Ignore storage access errors - they happen in some browsers during tests
    console.log('Note: Could not clear browser storage (this is normal in some test environments)');
  }

  return errorMonitor;
}
