/**
 * AIAgentService Singleton
 *
 * Global singleton instance for AIAgentService to prevent multiple initializations
 */

import { AIAgentService } from './AIAgentService.js';

// Global singleton instance
let aiAgentServiceInstance = null;

/**
 * Get the singleton AIAgentService instance
 * @returns {AIAgentService} The singleton instance
 */
export const getAIAgentService = () => {
    if (!aiAgentServiceInstance) {
        aiAgentServiceInstance = new AIAgentService();
    }

    return aiAgentServiceInstance;
};

export default getAIAgentService;
