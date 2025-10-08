/**
 * Mock pageRoutes for Jest tests
 * This mock is automatically used by Jest when pageRoutes.js is imported
 */

export const setupPageRoutes = jest.fn(app => {
    // Mock implementation - just record that it was called
    return app;
});

