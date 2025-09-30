/**
 * MVPValidation - Essential validation for MVP
 *
 * Focuses on core security needs without over-engineering.
 */

export const validatePromptEnhanced = (req, res, next) => {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({
            error: 'Invalid prompt',
            message: 'Prompt is required and must be a string'
        });
    }

    const trimmed = prompt.trim();

    // Essential checks for MVP
    if (trimmed.length === 0) {
        return res.status(400).json({
            error: 'Invalid prompt',
            message: 'Prompt cannot be empty'
        });
    }

    if (trimmed.length > 1000) {
        return res.status(400).json({
            error: 'Invalid prompt',
            message: 'Prompt too long (max 1000 characters)'
        });
    }

    // Basic security check
    if ((/<script|javascript:|on\w+\s*=/i).test(trimmed)) {
        return res.status(400).json({
            error: 'Invalid prompt',
            message: 'Prompt contains potentially dangerous content'
        });
    }

    // Sanitize and update
    req.body.prompt = trimmed.replace(/[<>]/g, '');
    next();
};

export const validateProvidersEnhanced = (req, res, next) => {
    const { providers } = req.body;
    const allowedProviders = ['flux', 'dalle3', 'nano-banana', 'imagen'];

    if (!providers) {
        return res.status(400).json({
            error: 'Invalid providers',
            message: 'Providers are required'
        });
    }

    const providerArray = Array.isArray(providers) ? providers : [providers];

    if (providerArray.length === 0) {
        return res.status(400).json({
            error: 'Invalid providers',
            message: 'At least one provider must be specified'
        });
    }

    if (providerArray.length > 3) {
        return res.status(400).json({
            error: 'Invalid providers',
            message: 'Too many providers (max 3)'
        });
    }

    // Validate each provider
    for (const provider of providerArray) {
        if (!allowedProviders.includes(provider)) {
            return res.status(400).json({
                error: 'Invalid providers',
                message: `Invalid provider: ${provider}`
            });
        }
    }

    req.body.providers = providerArray;
    next();
};
