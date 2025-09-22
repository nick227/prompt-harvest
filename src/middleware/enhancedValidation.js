import { ValidationError as _ValidationError } from '../errors/CustomErrors.js';
import modelInterface from '../services/ModelInterface.js';

// Enhanced validation middleware with detailed error reporting
// eslint-disable-next-line max-lines-per-function, max-statements
export const validateImageGenerationEnhanced = async (req, res, next) => {
    const errors = [];
    const warnings = [];

    try {
        // Required fields validation
        if (!req.body.prompt) {
            errors.push('Prompt is required');
        } else if (typeof req.body.prompt !== 'string') {
            errors.push('Prompt must be a string');
        } else if (req.body.prompt.trim().length === 0) {
            errors.push('Prompt cannot be empty');
        } else if (req.body.prompt.length > 1000) {
            errors.push('Prompt exceeds maximum length of 1000 characters');
        }

        // Providers validation
        if (!req.body.providers) {
            errors.push('At least one provider must be selected');
        } else {
            const providers = Array.isArray(req.body.providers)
                ? req.body.providers
                : req.body.providers.split(',').map(p => p.trim());

            if (providers.length === 0) {
                errors.push('At least one provider must be selected');
            } else {
                // Get valid providers from dynamic model system
                let validProviders;

                try {
                    const allModels = await modelInterface.getAllModels();

                    validProviders = allModels.map(model => model.name);
                } catch (error) {
                    console.warn('⚠️ VALIDATION: Failed to get models from database, using fallback list:', error.message);
                    // Fallback to static list if database fails
                    validProviders = [
                        'flux', 'dalle2', 'dalle3', 'juggernaut', 'juggernautReborn', 'redshift',
                        'absolute', 'realisticvision', 'icbinp', 'icbinp_seco', 'hasdx',
                        'dreamshaper', 'dreamshaperLighting', 'nightmareshaper', 'openjourney', 'analogmadness',
                        'portraitplus', 'tshirt', 'abyssorange', 'cyber', 'disco',
                        'synthwave', 'lowpoly', 'bluepencil', 'ink', 'nanoBanana'
                    ];
                }

                const invalidProviders = providers.filter(p => !validProviders.includes(p));

                if (invalidProviders.length > 0) {
                    errors.push(`Invalid providers: ${invalidProviders.join(', ')}`);
                }
            }
        }

        // Guidance validation
        if (req.body.guidance !== undefined) {
            const guidance = parseInt(req.body.guidance);

            if (isNaN(guidance)) {
                errors.push('Guidance must be a number');
            } else if (guidance < 1 || guidance > 20) {
                errors.push('Guidance must be between 1 and 20');
            }
        }

        // Optional fields validation
        if (req.body.multiplier !== undefined) {
            if (typeof req.body.multiplier !== 'boolean') {
                warnings.push('Multiplier should be a boolean value');
            }
        }

        if (req.body.mixup !== undefined) {
            if (typeof req.body.mixup !== 'boolean') {
                warnings.push('Mixup should be a boolean value');
            }
        }

        if (req.body.mashup !== undefined) {
            if (typeof req.body.mashup !== 'boolean') {
                warnings.push('Mashup should be a boolean value');
            }
        }

        if (req.body['auto-enhance'] !== undefined) {
            if (typeof req.body['auto-enhance'] !== 'boolean' && typeof req.body['auto-enhance'] !== 'string') {
                warnings.push('Auto-enhance should be a boolean or string value');
            }
        }

        if (req.body.autoPublic !== undefined) {
            if (typeof req.body.autoPublic !== 'boolean' && typeof req.body.autoPublic !== 'string') {
                warnings.push('AutoPublic should be a boolean or string value');
            }
        }

        if (req.body.photogenic !== undefined) {
            if (typeof req.body.photogenic !== 'boolean' && typeof req.body.photogenic !== 'string') {
                warnings.push('Photogenic should be a boolean or string value');
            }
        }

        if (req.body.artistic !== undefined) {
            if (typeof req.body.artistic !== 'boolean' && typeof req.body.artistic !== 'string') {
                warnings.push('Artistic should be a boolean or string value');
            }
        }

        // Content policy check (basic)
        if (req.body.prompt) {
            const sensitiveWords = ['nude', 'naked', 'explicit', 'porn', 'adult', 'nsfw'];
            const lowerPrompt = req.body.prompt.toLowerCase();
            const foundSensitiveWords = sensitiveWords.filter(word => lowerPrompt.includes(word));

            if (foundSensitiveWords.length > 0) {
                warnings.push(`Content may violate policy. Sensitive words detected: ${foundSensitiveWords.join(', ')}`);
            }
        }

        // Request size validation
        const requestSize = JSON.stringify(req.body).length;

        if (requestSize > 10000) { // 10KB limit
            errors.push('Request payload too large');
        }

        // Rate limiting check (basic)
        const clientIP = req.ip || req.connection.remoteAddress;
        const _userAgent = req.get('User-Agent');

        if (!clientIP) {
            warnings.push('Unable to determine client IP for rate limiting');
        }

        // If there are errors, return them
        if (errors.length > 0) {
            const errorResponse = {
                error: 'Validation failed',
                details: errors,
                warnings,
                timestamp: new Date().toISOString(),
                requestId: req.id || 'unknown'
            };

            console.error('❌ Image generation validation failed:', errorResponse);

            return res.status(400).json(errorResponse);
        }

        // Add warnings to request for logging
        if (warnings.length > 0) {
            req.validationWarnings = warnings;
            console.warn('⚠️ Image generation validation warnings:', warnings);
        }

        // Add validated data to request
        req.validatedData = {
            prompt: req.body.prompt.trim(),
            providers: Array.isArray(req.body.providers)
                ? req.body.providers
                : req.body.providers.split(',').map(p => p.trim()),
            guidance: req.body.guidance ? parseInt(req.body.guidance) : 10,
            multiplier: req.body.multiplier || '',
            mixup: req.body.mixup === 'true' || req.body.mixup === true,
            mashup: req.body.mashup === 'true' || req.body.mashup === true,
            'auto-enhance': req.body['auto-enhance'] === 'true' || req.body['auto-enhance'] === true,
            customVariables: req.body.customVariables || '',
            promptId: req.body.promptId || null,
            original: req.body.original || req.body.prompt,
            autoPublic: req.body.autoPublic === 'true' || req.body.autoPublic === true,
            photogenic: req.body.photogenic === 'true' || req.body.photogenic === true,
            artistic: req.body.artistic === 'true' || req.body.artistic === true
        };

        // eslint-disable-next-line no-console
        console.log('✅ Image generation validation passed:', {
            prompt: `${req.validatedData.prompt.substring(0, 50)}...`,
            providers: req.validatedData.providers,
            guidance: req.validatedData.guidance
        });

        next();
    } catch (error) {
        console.error('❌ Validation middleware error:', error);
        res.status(500).json({
            error: 'Validation system error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// Enhanced rate limiting with detailed feedback
export const enhancedRateLimit = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        maxRequests = 100,
        message = 'Too many requests',
        skipSuccessfulRequests: _skipSuccessfulRequests = false,
        skipFailedRequests: _skipFailedRequests = false
    } = options;

    const requests = new Map();

    return (req, res, next) => {
        const clientId = req.user?.id || req.ip || 'anonymous';
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old entries
        if (!requests.has(clientId)) {
            requests.set(clientId, []);
        }

        const clientRequests = requests.get(clientId);
        const recentRequests = clientRequests.filter(timestamp => timestamp > windowStart);

        requests.set(clientId, recentRequests);

        // Check rate limit
        if (recentRequests.length >= maxRequests) {
            const oldestRequest = Math.min(...recentRequests);
            const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);

            console.warn(`⚠️ Rate limit exceeded for ${clientId}: ${recentRequests.length}/${maxRequests} requests`);

            return res.status(429).json({
                error: 'Rate limit exceeded',
                message,
                retryAfter,
                limit: maxRequests,
                windowMs,
                timestamp: new Date().toISOString()
            });
        }

        // Add current request
        recentRequests.push(now);
        requests.set(clientId, recentRequests);

        // Add rate limit headers
        res.set({
            'X-RateLimit-Limit': maxRequests,
            'X-RateLimit-Remaining': maxRequests - recentRequests.length,
            'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
        });

        next();
    };
};

// Enhanced authentication validation
export const validateAuthentication = (req, res, next) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'User must be logged in to perform this action',
                timestamp: new Date().toISOString()
            });
        }

        // Validate user object
        if (!req.user.id) {
            return res.status(401).json({
                error: 'Invalid user session',
                message: 'User session is corrupted',
                timestamp: new Date().toISOString()
            });
        }

        // Add user info to request for logging
        req.userInfo = {
            id: req.user.id,
            email: req.user.email,
            isAdmin: req.user.isAdmin || false
        };

        // eslint-disable-next-line no-console
        console.log('✅ Authentication validated for user:', req.userInfo.id);
        next();
    } catch (error) {
        console.error('❌ Authentication validation error:', error);
        res.status(500).json({
            error: 'Authentication system error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};
