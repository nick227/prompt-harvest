/**
 * Queue Constants
 *
 * Centralized constants for the queue system.
 */

// Priority range constants
export const PRIORITY_MIN = -1000;
export const PRIORITY_MAX = 1000;

/**
 * Get priority bounds for validation (prevents duplication of range values)
 * @returns {{min: number, max: number}} Priority bounds
 */
export function getPriorityBounds() {
    return { min: PRIORITY_MIN, max: PRIORITY_MAX };
}
