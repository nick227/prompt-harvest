/**
 * AI Services Index
 *
 * Centralized exports for all AI-related services
 * Now organized by layers: core (data/base) and features (business logic)
 */

// Core services (data layer and base functionality)
export * from './core/index.js';

// Feature services (business logic layer)
export * from './features/index.js';

// Legacy AIService (to be deprecated)
export { AIService } from './AIService.js';
