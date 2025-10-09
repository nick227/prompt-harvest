/**
 * Body Size Limit Middleware
 *
 * Provides per-route body size limits for better DoS protection.
 * Default global limit is 2mb. Use these for routes that need more.
 */

import express from 'express';

/**
 * Middleware for routes that handle large JSON payloads (e.g., bulk operations)
 * Limit: 5mb
 */
export const largeJsonLimit = express.json({ limit: '5mb' });

/**
 * Middleware for routes that handle very large payloads (e.g., base64 images)
 * Limit: 10mb
 * Use sparingly - only for routes that truly need it
 */
export const extraLargeJsonLimit = express.json({ limit: '10mb' });

/**
 * Middleware for routes with small payloads (e.g., simple forms)
 * Limit: 100kb
 * Use for tight security on simple routes
 */
export const smallJsonLimit = express.json({ limit: '100kb' });

/**
 * Middleware for URL-encoded form data (large)
 * Limit: 5mb
 */
export const largeUrlEncodedLimit = express.urlencoded({ extended: true, limit: '5mb' });

/**
 * Default limits (already applied globally in server.js)
 * - JSON: 2mb
 * - URL-encoded: 2mb
 *
 * Usage:
 *
 * // For routes needing larger limits:
 * router.post('/api/bulk-import', largeJsonLimit, handler);
 *
 * // For routes with base64 images in JSON:
 * router.post('/api/upload-avatar', extraLargeJsonLimit, handler);
 *
 * // For simple routes:
 * router.post('/api/simple-form', smallJsonLimit, handler);
 */

