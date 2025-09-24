import {
    apiRateLimit,
    sanitizeInput,
    authenticateToken,
    authenticateTokenRequired
} from '../middleware/index.js';

export const setupPromptRoutes = (app, promptController) => {
    // Get user prompts with pagination (authenticated users only)
    app.get('/api/prompts',
        apiRateLimit,
        authenticateTokenRequired,
        sanitizeInput,
        promptController.getUserPrompts.bind(promptController)
    );

    // Get a single prompt by ID
    app.get('/api/prompts/:id',
        apiRateLimit,
        authenticateToken,
        sanitizeInput,
        promptController.getPromptById.bind(promptController)
    );

    // Create a new prompt
    app.post('/api/prompts',
        apiRateLimit,
        authenticateToken,
        sanitizeInput,
        promptController.createPrompt.bind(promptController)
    );

    // Update a prompt
    app.put('/api/prompts/:id',
        apiRateLimit,
        authenticateToken,
        sanitizeInput,
        promptController.updatePrompt.bind(promptController)
    );

    // Delete a prompt
    app.delete('/api/prompts/:id',
        apiRateLimit,
        authenticateToken,
        sanitizeInput,
        promptController.deletePrompt.bind(promptController)
    );
};
