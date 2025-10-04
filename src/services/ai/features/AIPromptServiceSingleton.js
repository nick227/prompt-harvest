/**
 * AIPromptService Singleton
 *
 * Global singleton instance for AIPromptService to prevent multiple initializations
 */

import { AIPromptService } from './AIPromptService.js';

// Global singleton instance
let aiPromptServiceInstance = null;

/**
 * Get the singleton AIPromptService instance
 * @returns {AIPromptService} The singleton instance
 */
export const getAIPromptService = () => {
    if (!aiPromptServiceInstance) {
        aiPromptServiceInstance = new AIPromptService();
    }
    return aiPromptServiceInstance;
};

export default getAIPromptService;
