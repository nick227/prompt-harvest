/**
 * Queue Manager Factory
 *
 * Provides factory functions for creating QueueManager instances
 */

import { QueueManager } from './QueueManager.js';

// Factory function for creating QueueManager instances
export const createQueueManager = (options = {}) => new QueueManager(options);

// Lazy singleton - only created when first accessed
let _singletonInstance = null;

export const getQueueManager = () => (_singletonInstance ??= new QueueManager());
