import {
    validateWord,
    apiRateLimit,
    sanitizeInput
} from '../middleware/index.js';

export const setupAIRoutes = (app, aiController) => {
    // Word Type Operations with validation
    app.get('/word/type/:word',
        validateWord,
        aiController.getWordType.bind(aiController)
    );

    app.get('/word/examples/:word',
        validateWord,
        aiController.getWordExamples.bind(aiController)
    );

    // Removed conflicting word/types route - handled by wordRoutes.js

    app.get('/ai/word/add/:word',
        validateWord,
        apiRateLimit,
        aiController.addWordType.bind(aiController)
    );

    // POST endpoint for adding words (frontend compatibility)
    app.post('/ai/word/add',
        validateWord,
        apiRateLimit,
        aiController.addWordTypePost.bind(aiController)
    );

    // DELETE endpoint for removing words
    app.delete('/ai/word/delete/:word',
        validateWord,
        apiRateLimit,
        aiController.deleteWordType.bind(aiController)
    );

    // Simple stats endpoint (no cache)
    app.get('/api/word/stats', aiController.getWordStats.bind(aiController));

    // Prompt Processing with validation
    app.get('/prompt/build',
        sanitizeInput,
        aiController.processPrompt.bind(aiController)
    );

    // Sample Clauses for Textarea Autocomplete
    app.get('/prompt/clauses',
        aiController.getSampleClauses.bind(aiController)
    );
};
