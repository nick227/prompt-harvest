export const validateImageGeneration = (req, res, next) => {
    const { prompt, providers, guidance } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({
            error: 'Invalid prompt',
            message: 'Prompt is required and must be a non-empty string'
        });
    }

    if (!providers || typeof providers !== 'string' || providers.trim().length === 0) {
        return res.status(400).json({
            error: 'Invalid providers',
            message: 'Providers are required and must be a non-empty string'
        });
    }

    if (guidance !== undefined && (isNaN(guidance) || guidance < 0 || guidance > 20)) {
        return res.status(400).json({
            error: 'Invalid guidance',
            message: 'Guidance must be a number between 0 and 20'
        });
    }

    next();
};

export const validateRating = (req, res, next) => {
    const { rating } = req.body;
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({
            error: 'Missing image ID',
            message: 'Image ID is required'
        });
    }

    if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({
            error: 'Invalid rating',
            message: 'Rating must be a number between 1 and 5'
        });
    }

    next();
};

export const validatePagination = (req, res, next) => {
    const { limit, page } = req.query;

    if (limit !== undefined) {
        const limitNum = parseInt(limit);

        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({
                error: 'Invalid limit',
                message: 'Limit must be a number between 1 and 100'
            });
        }
    }

    if (page !== undefined) {
        const pageNum = parseInt(page);

        if (isNaN(pageNum) || pageNum < 0) {
            return res.status(400).json({
                error: 'Invalid page',
                message: 'Page must be a non-negative number'
            });
        }
    }

    next();
};

export const validateTag = (req, res, next) => {
    const { tag } = req.body;
    const { imageId } = req.body;

    if (!imageId) {
        return res.status(400).json({
            error: 'Missing image ID',
            message: 'Image ID is required'
        });
    }

    if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
        return res.status(400).json({
            error: 'Invalid tag',
            message: 'Tag is required and must be a non-empty string'
        });
    }

    if (tag.length > 50) {
        return res.status(400).json({
            error: 'Tag too long',
            message: 'Tag must be 50 characters or less'
        });
    }

    next();
};

export const validateWord = (req, res, next) => {
    // Handle both GET (params) and POST (body) requests
    const word = req.params.word || req.body.word;

    if (!word || typeof word !== 'string' || word.trim().length === 0) {
        return res.status(400).json({
            error: 'Invalid word',
            message: 'Word is required and must be a non-empty string'
        });
    }

    if (word.length > 100) {
        return res.status(400).json({
            error: 'Word too long',
            message: 'Word must be 100 characters or less'
        });
    }

    next();
};

export const sanitizeInput = (req, res, next) => {
    // Sanitize string inputs to prevent XSS
    const sanitizeString = str => {
        if (typeof str !== 'string') {
            return str;
        }

        return str
            .replace(/[<>]/g, '') // Remove < and >
            .trim();
    };

    // Sanitize body
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeString(req.body[key]);
            }
        });
    }

    // Sanitize query parameters
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = sanitizeString(req.query[key]);
            }
        });
    }

    next();
};
