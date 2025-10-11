/**
 * ID Generation Utilities
 * Secure random ID generation using crypto.randomUUID
 */

import { randomUUID } from 'crypto';

/**
 * Generate a unique request ID
 * @returns {string} Request ID in format: req_{uuid}
 */
export const generateRequestId = () => `req_${randomUUID()}`;

/**
 * Generate a unique generic ID
 * @returns {string} UUID
 */
export const generateId = () => randomUUID();

