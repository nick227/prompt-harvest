/**
 * E2E Tests for Authentication Persistence
 * Tests the complete login flow and persistence across page refreshes
 */

import { test, expect } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
    baseUrl: 'http://localhost:3200',
    testUser: {
        email: 'test@example.com',
        password: 'testpassword123'
    },
    timeout: 30000
};

test.describe('Authentication Persistence E2E Tests', () => {
    let page;

    test.beforeEach(async ({ browser }) => {
        page = await browser.newPage();

        // Set viewport
        await page.setViewportSize({ width: 1280, height: 720 });

        // Enable console logging
        page.on('console', msg => {
            console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
        });

        // Enable request/response logging
        page.on('request', request => {
            console.log(`[REQUEST] ${request.method()} ${request.url()}`);
        });

        page.on('response', response => {
            console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
        });
    });

    test.afterEach(async () => {
        if (page) {
            await page.close();
        }
    });

    test('Complete Login Flow and Persistence Test', async () => {
        console.log('🧪 Starting complete login flow and persistence test...');

        // Step 1: Navigate to homepage and verify unauthenticated state
        await page.goto(TEST_CONFIG.baseUrl);
        console.log('✅ Navigated to homepage');

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Verify unauthenticated state
        await expect(page.locator('#auth-links')).toBeVisible();
        await expect(page.locator('#user-info')).not.toBeVisible();
        console.log('✅ Verified unauthenticated state');

        // Step 2: Navigate to login page
        await page.click('a[href="/login.html"]');
        await page.waitForLoadState('networkidle');
        console.log('✅ Navigated to login page');

        // Step 3: Fill login form
        await page.fill('input[name="email"]', TEST_CONFIG.testUser.email);
        await page.fill('input[name="password"]', TEST_CONFIG.testUser.password);
        console.log('✅ Filled login form');

        // Step 4: Submit login form
        await page.click('button[type="submit"]');
        console.log('✅ Submitted login form');

        // Step 5: Wait for login response and redirect
        await page.waitForURL(TEST_CONFIG.baseUrl, { timeout: 10000 });
        console.log('✅ Redirected to homepage after login');

        // Step 6: Verify authenticated state on homepage
        await page.waitForLoadState('networkidle');

        // Check if user info is visible
        const userInfo = page.locator('#user-info');
        await expect(userInfo).toBeVisible({ timeout: 5000 });
        console.log('✅ User info section is visible');

        // Verify auth links are hidden
        await expect(page.locator('#auth-links')).not.toBeVisible();
        console.log('✅ Auth links are hidden');

        // Step 7: Check localStorage for auth token
        const authToken = await page.evaluate(() => {
            return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        });

        expect(authToken).toBeTruthy();
        console.log('✅ Auth token found in storage');

        // Step 8: Verify token format (JWT)
        expect(authToken).toMatch(/^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
        console.log('✅ Token is valid JWT format');

        // Step 9: Check user email display
        const userEmail = await page.locator('#user-info span').textContent();
        expect(userEmail).toBe(TEST_CONFIG.testUser.email);
        console.log('✅ User email displayed correctly:', userEmail);

        // Step 10: Test page refresh persistence
        console.log('🔄 Testing page refresh persistence...');
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Verify state persists after refresh
        await expect(page.locator('#user-info')).toBeVisible();
        await expect(page.locator('#auth-links')).not.toBeVisible();
        console.log('✅ Authentication state persisted after refresh');

        // Step 11: Verify token still exists after refresh
        const tokenAfterRefresh = await page.evaluate(() => {
            return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        });

        expect(tokenAfterRefresh).toBe(authToken);
        console.log('✅ Token unchanged after refresh');

        console.log('🎉 Complete login flow and persistence test PASSED!');
    });

    test('API Profile Endpoint Test', async () => {
        console.log('🧪 Starting API profile endpoint test...');

        // Step 1: Login first
        await page.goto(TEST_CONFIG.baseUrl + '/login.html');
        await page.waitForLoadState('networkidle');

        await page.fill('input[name="email"]', TEST_CONFIG.testUser.email);
        await page.fill('input[name="password"]', TEST_CONFIG.testUser.password);
        await page.click('button[type="submit"]');

        await page.waitForURL(TEST_CONFIG.baseUrl);
        await page.waitForLoadState('networkidle');

        console.log('✅ Logged in successfully');

        // Step 2: Test profile API endpoint directly
        const profileResponse = await page.evaluate(async () => {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

            if (!token) {
                throw new Error('No auth token found');
            }

            const response = await fetch('/api/auth/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            return {
                status: response.status,
                statusText: response.statusText,
                data: data,
                headers: Object.fromEntries(response.headers.entries())
            };
        });

        console.log('📊 Profile API Response:', profileResponse);

        // Verify successful response
        expect(profileResponse.status).toBe(200);
        expect(profileResponse.data.success).toBe(true);
        expect(profileResponse.data.data.user.email).toBe(TEST_CONFIG.testUser.email);

        console.log('✅ Profile API endpoint working correctly');
    });

    test('Authentication State Management Test', async () => {
        console.log('🧪 Starting authentication state management test...');

        // Step 1: Navigate to homepage
        await page.goto(TEST_CONFIG.baseUrl);
        await page.waitForLoadState('networkidle');

        // Step 2: Check initial state
        let isAuthenticated = await page.evaluate(() => {
            return window.userSystem ? window.userSystem.isAuthenticated() : false;
        });

        expect(isAuthenticated).toBe(false);
        console.log('✅ Initial state: not authenticated');

        // Step 3: Login
        await page.goto(TEST_CONFIG.baseUrl + '/login.html');
        await page.waitForLoadState('networkidle');

        await page.fill('input[name="email"]', TEST_CONFIG.testUser.email);
        await page.fill('input[name="password"]', TEST_CONFIG.testUser.password);
        await page.click('button[type="submit"]');

        await page.waitForURL(TEST_CONFIG.baseUrl);
        await page.waitForLoadState('networkidle');

        // Step 4: Check authenticated state
        isAuthenticated = await page.evaluate(() => {
            return window.userSystem ? window.userSystem.isAuthenticated() : false;
        });

        expect(isAuthenticated).toBe(true);
        console.log('✅ After login: authenticated');

        // Step 5: Get user data
        const userData = await page.evaluate(() => {
            return window.userSystem ? window.userSystem.getUser() : null;
        });

        expect(userData).toBeTruthy();
        expect(userData.email).toBe(TEST_CONFIG.testUser.email);
        console.log('✅ User data retrieved:', userData.email);

        // Step 6: Test refresh persistence
        await page.reload();
        await page.waitForLoadState('networkidle');

        isAuthenticated = await page.evaluate(() => {
            return window.userSystem ? window.userSystem.isAuthenticated() : false;
        });

        expect(isAuthenticated).toBe(true);
        console.log('✅ After refresh: still authenticated');

        const userDataAfterRefresh = await page.evaluate(() => {
            return window.userSystem ? window.userSystem.getUser() : null;
        });

        expect(userDataAfterRefresh).toBeTruthy();
        expect(userDataAfterRefresh.email).toBe(TEST_CONFIG.testUser.email);
        console.log('✅ User data persisted after refresh');

        console.log('🎉 Authentication state management test PASSED!');
    });

    test('Header Component State Test', async () => {
        console.log('🧪 Starting header component state test...');

        // Step 1: Navigate to homepage
        await page.goto(TEST_CONFIG.baseUrl);
        await page.waitForLoadState('networkidle');

        // Step 2: Verify unauthenticated header state
        await expect(page.locator('#auth-links')).toBeVisible();
        await expect(page.locator('#user-info')).not.toBeVisible();
        console.log('✅ Header shows unauthenticated state');

        // Step 3: Login
        await page.goto(TEST_CONFIG.baseUrl + '/login.html');
        await page.waitForLoadState('networkidle');

        await page.fill('input[name="email"]', TEST_CONFIG.testUser.email);
        await page.fill('input[name="password"]', TEST_CONFIG.testUser.password);
        await page.click('button[type="submit"]');

        await page.waitForURL(TEST_CONFIG.baseUrl);
        await page.waitForLoadState('networkidle');

        // Step 4: Verify authenticated header state
        await expect(page.locator('#user-info')).toBeVisible();
        await expect(page.locator('#auth-links')).not.toBeVisible();

        const userEmail = await page.locator('#user-info span').textContent();
        expect(userEmail).toBe(TEST_CONFIG.testUser.email);
        console.log('✅ Header shows authenticated state:', userEmail);

        // Step 5: Test header state persistence on refresh
        await page.reload();
        await page.waitForLoadState('networkidle');

        await expect(page.locator('#user-info')).toBeVisible();
        await expect(page.locator('#auth-links')).not.toBeVisible();

        const userEmailAfterRefresh = await page.locator('#user-info span').textContent();
        expect(userEmailAfterRefresh).toBe(TEST_CONFIG.testUser.email);
        console.log('✅ Header state persisted after refresh');

        console.log('🎉 Header component state test PASSED!');
    });

    test('Token Storage and Retrieval Test', async () => {
        console.log('🧪 Starting token storage and retrieval test...');

        // Step 1: Navigate to homepage
        await page.goto(TEST_CONFIG.baseUrl);
        await page.waitForLoadState('networkidle');

        // Step 2: Check no token initially
        let token = await page.evaluate(() => {
            return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        });

        expect(token).toBeNull();
        console.log('✅ No token initially');

        // Step 3: Login
        await page.goto(TEST_CONFIG.baseUrl + '/login.html');
        await page.waitForLoadState('networkidle');

        await page.fill('input[name="email"]', TEST_CONFIG.testUser.email);
        await page.fill('input[name="password"]', TEST_CONFIG.testUser.password);
        await page.click('button[type="submit"]');

        await page.waitForURL(TEST_CONFIG.baseUrl);
        await page.waitForLoadState('networkidle');

        // Step 4: Check token stored
        token = await page.evaluate(() => {
            return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        });

        expect(token).toBeTruthy();
        console.log('✅ Token stored after login');

        // Step 5: Verify token format and decode payload
        const tokenPayload = await page.evaluate((token) => {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return {
                    userId: payload.userId,
                    iat: payload.iat,
                    exp: payload.exp,
                    isValid: true
                };
            } catch (error) {
                return { isValid: false, error: error.message };
            }
        }, token);

        expect(tokenPayload.isValid).toBe(true);
        expect(tokenPayload.userId).toBeTruthy();
        expect(tokenPayload.exp).toBeGreaterThan(Date.now() / 1000);
        console.log('✅ Token payload decoded successfully:', tokenPayload);

        // Step 6: Test token persistence on refresh
        await page.reload();
        await page.waitForLoadState('networkidle');

        const tokenAfterRefresh = await page.evaluate(() => {
            return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        });

        expect(tokenAfterRefresh).toBe(token);
        console.log('✅ Token persisted after refresh');

        console.log('🎉 Token storage and retrieval test PASSED!');
    });

    test('Logout and State Reset Test', async () => {
        console.log('🧪 Starting logout and state reset test...');

        // Step 1: Login first
        await page.goto(TEST_CONFIG.baseUrl + '/login.html');
        await page.waitForLoadState('networkidle');

        await page.fill('input[name="email"]', TEST_CONFIG.testUser.email);
        await page.fill('input[name="password"]', TEST_CONFIG.testUser.password);
        await page.click('button[type="submit"]');

        await page.waitForURL(TEST_CONFIG.baseUrl);
        await page.waitForLoadState('networkidle');

        // Verify logged in
        await expect(page.locator('#user-info')).toBeVisible();
        console.log('✅ Logged in successfully');

        // Step 2: Click logout
        await page.click('.logout-btn');
        console.log('✅ Clicked logout button');

        // Step 3: Wait for redirect and state change
        await page.waitForURL(TEST_CONFIG.baseUrl);
        await page.waitForLoadState('networkidle');

        // Step 4: Verify logged out state
        await expect(page.locator('#auth-links')).toBeVisible();
        await expect(page.locator('#user-info')).not.toBeVisible();
        console.log('✅ Header shows logged out state');

        // Step 5: Check token cleared
        const token = await page.evaluate(() => {
            return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        });

        expect(token).toBeNull();
        console.log('✅ Token cleared after logout');

        // Step 6: Check authentication state
        const isAuthenticated = await page.evaluate(() => {
            return window.userSystem ? window.userSystem.isAuthenticated() : false;
        });

        expect(isAuthenticated).toBe(false);
        console.log('✅ Authentication state reset after logout');

        console.log('🎉 Logout and state reset test PASSED!');
    });
});

// Helper function to wait for authentication state
async function waitForAuthState(page, expectedState, timeout = 10000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const isAuthenticated = await page.evaluate(() => {
            return window.userSystem ? window.userSystem.isAuthenticated() : false;
        });

        if (isAuthenticated === expectedState) {
            return true;
        }

        await page.waitForTimeout(100);
    }

    throw new Error(`Authentication state did not become ${expectedState} within ${timeout}ms`);
}
