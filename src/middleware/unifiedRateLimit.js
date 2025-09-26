import configManager from '../config/ConfigManager.js';
import { rateLimit, apiRateLimit, authRateLimit, imageGenerationRateLimit } from './rateLimit.js';

// Unified interface for all rate limiting needs
// Prefer these presets to reduce fragmentation across the codebase
export const unifiedRateLimit = {
    // General API traffic
    api: apiRateLimit,

    // Authentication-sensitive endpoints
    auth: authRateLimit,

    // Expensive image generation endpoints
    image: imageGenerationRateLimit,
};

// Factory for custom, per-route limits using the same underlying implementation
export const createUnifiedRateLimit = ({ windowMs, maxRequests } = {}) => {
    const w = windowMs ?? configManager.rateLimit.windowMs;
    const m = maxRequests ?? configManager.rateLimit.maxRequests;
    return rateLimit(w, m);
};

export default unifiedRateLimit;


