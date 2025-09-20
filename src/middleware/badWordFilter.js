import databaseClient from '../database/PrismaClient.js';
import { ValidationError } from '../errors/CustomErrors.js';

// Get Prisma client instance
const getPrismaClient = () => {
    try {
        return databaseClient.getClient();
    } catch (error) {
        console.error('❌ Failed to get Prisma client:', error);

        return null;
    }
};

// Comprehensive bad word list - categorized by severity
const BAD_WORDS = {
    critical: [
        // Explicit sexual content
        'porn', 'pornography', 'xxx', 'sex', 'sexual', 'nude', 'naked', 'nudity',
        'blowjob', 'cunt', 'nsfw', 'fetish', 'bdsm', 'masturbate', 'nigger',
        'penis', 'vagina', 'breast', 'sex', 'ass', 'penis', 'cock', 'dick',
        'pussy', 'tits', 'titties', 'fuck', 'vagina', 'fucked', 'shit',
        'testicles', 'piss', 'puke', 'anal', 'panties', 'masturbation'
    ],

    high: [
        // Moderate profanity
        'damn', 'hell', 'crap', 'piss', 'pissed', 'bastard', 'asshole', 'orgy',
        'dumbass', 'idiot', 'moron', 'stupid', 'retard', 'retarded',

        // Mild sexual references
        'sexy', 'hot', 'attractive', 'seductive', 'tempting',

        // Violence (mild)
        'fight', 'fighting', 'punch', 'kick', 'hit', 'strike', 'attack',
        'battle', 'war', 'weapon', 'gun', 'knife', 'sword',

        // Drugs and illegal substances
        'cocaine', 'heroin', 'marijuana', 'weed', 'drug', 'drugs', 'overdose',
        'addiction', 'dealer', 'trafficking',

        // Violence and gore
        'kill', 'murder', 'death', 'suicide', 'bomb', 'terrorist', 'terrorism',
        'violence', 'blood', 'gore', 'torture', 'rape', 'abuse', 'assault',

        // Hate speech and discrimination
        'nazi', 'hitler', 'fascist', 'racist', 'racism', 'sexist', 'sexism',
        'homophobic', 'transphobic', 'discrimination', 'hate', 'hateful'
    ],

    medium: [
        // Mild profanity
        'stupid', 'dumb', 'silly', 'crazy', 'insane', 'weird', 'strange',
        'ugly', 'gross', 'disgusting', 'nasty', 'awful', 'terrible',

        // Body parts (non-sexual)
        'body', 'skin', 'flesh', 'muscle', 'bone', 'head', 'face',
        'hand', 'foot', 'leg', 'arm', 'chest', 'back', 'stomach'
    ],

    low: [
        // Very mild content
        'bad', 'wrong', 'evil', 'sin', 'sinful', 'wicked', 'naughty',
        'mischief', 'trouble', 'problem', 'issue', 'concern'
    ]
};

// Create a flat list for quick lookup
const ALL_BAD_WORDS = new Set();

Object.values(BAD_WORDS).forEach(words => {
    words.forEach(word => ALL_BAD_WORDS.add(word.toLowerCase()));
});

/**
 * Find violation severity for a word
 * @param {string} cleanWord - The cleaned word
 * @param {string} originalWord - The original word
 * @returns {Object|null} - Violation object or null
 */
const findViolationSeverity = (cleanWord, originalWord) => {
    for (const [severity, wordList] of Object.entries(BAD_WORDS)) {
        if (wordList.some(badWord => cleanWord.includes(badWord) || badWord.includes(cleanWord))) {
            return {
                word: cleanWord,
                severity,
                originalWord
            };
        }
    }

    return null;
};

/**
 * Update maximum severity
 * @param {string} severity - Current severity
 * @param {string} maxSeverity - Current max severity
 * @returns {string} - Updated max severity
 */
const updateMaxSeverity = (severity, maxSeverity) => {
    const severityOrder = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };

    return severityOrder[severity] > severityOrder[maxSeverity] ? severity : maxSeverity;
};

/**
 * Check if content contains bad words
 * @param {string} content - The content to check
 * @returns {Object} - { hasViolations: boolean, violations: Array, severity: string }
 */
const checkContent = content => {
    if (!content || typeof content !== 'string') {
        return { hasViolations: false, violations: [], severity: 'none' };
    }

    const lowerContent = content.toLowerCase();
    const violations = [];
    let maxSeverity = 'none';

    // Check each word in the content
    const words = lowerContent.split(/\s+/);

    for (const word of words) {
        // Remove punctuation for better matching
        const cleanWord = word.replace(/[^\w]/g, '');

        if (!ALL_BAD_WORDS.has(cleanWord)) {
            continue;
        }

        // Find which category this word belongs to
        const violation = findViolationSeverity(cleanWord, word);

        if (violation) {
            violations.push(violation);
            maxSeverity = updateMaxSeverity(violation.severity, maxSeverity);
        }
    }

    return {
        hasViolations: violations.length > 0,
        violations,
        severity: maxSeverity
    };
};

/**
 * Sanitize content by removing bad words
 * @param {string} content - The content to sanitize
 * @param {Array} violations - The violations found
 * @returns {string} - Sanitized content
 */
const sanitizeContent = (content, violations) => {
    if (!violations || violations.length === 0) {
        return content;
    }

    let sanitized = content;

    violations.forEach(violation => {
        const regex = new RegExp(`\\b${violation.word}\\b`, 'gi');

        sanitized = sanitized.replace(regex, '[FILTERED]');
    });

    return sanitized;
};

/**
 * Log violation to database
 * @param {Object} violationData - The violation data to log
 */
const logViolation = async violationData => {
    try {
        const prisma = getPrismaClient();

        if (!prisma) {
            console.error('❌ Cannot log violation - Prisma client not available');

            return;
        }

        await prisma.violations.create({
            data: {
                id: violationData.id,
                userId: violationData.userId || null,
                userEmail: violationData.userEmail || null,
                username: violationData.username || null,
                violationType: 'bad_word',
                detectedWords: JSON.stringify(violationData.detectedWords),
                originalContent: violationData.originalContent,
                sanitizedContent: violationData.sanitizedContent || null,
                severity: violationData.severity,
                ipAddress: violationData.ipAddress || null,
                userAgent: violationData.userAgent || null,
                endpoint: violationData.endpoint,
                requestId: violationData.requestId || null,
                isBlocked: violationData.isBlocked
            }
        });

        console.log(`🚨 Bad word violation logged: ${violationData.severity} severity for user ${violationData.userId || 'anonymous'}`);
    } catch (error) {
        console.error('❌ Failed to log violation:', error);
        // Don't throw error - we don't want to break the request flow
    }
};

/**
 * Bad word filter middleware
 * @param {Object} options - Configuration options
 * @param {boolean} options.blockCritical - Whether to block critical violations (default: true)
 * @param {boolean} options.sanitize - Whether to sanitize content instead of blocking (default: false)
 * @param {Array} options.fields - Fields to check (default: ['prompt', 'content', 'text'])
 */
/**
 * Extract content from request
 */
const extractContent = (req, fields) => {
    const contentToCheck = [];

    fields.forEach(field => {
        if (req.body[field]) {
            contentToCheck.push(req.body[field]);
        }
    });

    if (req.method === 'GET') {
        Object.values(req.query).forEach(value => {
            if (typeof value === 'string' && value.trim()) {
                contentToCheck.push(value);
            }
        });
    }

    return contentToCheck;
};

/**
 * Process violations and determine blocking
 */
const processViolations = (contentToCheck, options) => {
    const { blockCritical } = options;
    let hasBlockingViolations = false;
    const allViolations = [];
    let maxSeverity = 'none';

    for (const content of contentToCheck) {
        const result = checkContent(content);

        if (result.hasViolations) {
            allViolations.push(...result.violations);
            // Only block critical violations, silently log others
            const shouldBlock = result.severity === 'critical' && blockCritical;

            if (shouldBlock) { hasBlockingViolations = true; }
            maxSeverity = updateMaxSeverity(result.severity, maxSeverity);
        }
    }

    return { hasBlockingViolations, allViolations, maxSeverity };
};

/**
 * Handle violation response
 */
const handleViolationResponse = async (req, violationData, allViolations, maxSeverity, hasBlockingViolations, sanitize, fields, contentToCheck) => {
    await logViolation(violationData);

    if (hasBlockingViolations && !sanitize) {
        const errorMessage = `Content policy violation detected. Severity: ${maxSeverity}. Detected words: ${allViolations.map(v => v.word).join(', ')}`;

        console.error(`🚨 BLOCKED: ${errorMessage}`, {
            userId: req.user?.id || 'anonymous',
            endpoint: req.originalUrl,
            violations: allViolations
        });
        return next(new ValidationError(errorMessage, {
            code: 'CONTENT_POLICY_VIOLATION',
            severity: maxSeverity,
            detectedWords: allViolations.map(v => v.word),
            violationId: violationData.id
        }));
    }

    if (sanitize) {
        fields.forEach(field => {
            if (req.body[field]) {
                req.body[field] = sanitizeContent(req.body[field], allViolations);
            }
        });
        violationData.sanitizedContent = contentToCheck.map(content => sanitizeContent(content, allViolations)).join(' | ');
        await logViolation(violationData);
    }
};

export const badWordFilter = (options = {}) => {
    const {
        blockCritical = true,
        sanitize = false,
        fields = ['prompt', 'content', 'text', 'message', 'description']
    } = options;

    return async (req, res, next) => {
        try {
            const contentToCheck = extractContent(req, fields);

            if (contentToCheck.length === 0) { return next(); }

            const { hasBlockingViolations, allViolations, maxSeverity } = processViolations(contentToCheck, options);

            if (allViolations.length > 0) {
                const violationData = {
                    id: `viol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    userId: req.user?.id || null,
                    userEmail: req.user?.email || null,
                    username: req.user?.username || null,
                    detectedWords: allViolations.map(v => v.word),
                    originalContent: contentToCheck.join(' | '),
                    severity: maxSeverity,
                    ipAddress: req.ip || req.connection?.remoteAddress || null,
                    userAgent: req.get('User-Agent') || null,
                    endpoint: req.originalUrl || req.url,
                    requestId: req.id || null,
                    isBlocked: hasBlockingViolations
                };

                await handleViolationResponse(req, violationData, allViolations, maxSeverity, hasBlockingViolations, sanitize, fields, contentToCheck);
            }

            next();
        } catch (error) {
            if (error instanceof ValidationError) { throw error; }
            console.error('❌ Bad word filter error:', error);
            next(error);
        }
    };
};

/**
 * Strict bad word filter - blocks critical violations, silently logs others
 */
export const strictBadWordFilter = badWordFilter({
    blockCritical: true
});

/**
 * Moderate bad word filter - blocks only critical violations, silently logs others
 */
export const moderateBadWordFilter = badWordFilter({
    blockCritical: true
});

/**
 * Lenient bad word filter - allows all violations, only logs them
 */
export const lenientBadWordFilter = badWordFilter({
    blockCritical: false
});

/**
 * Sanitizing bad word filter - removes bad words instead of blocking
 */
export const sanitizingBadWordFilter = badWordFilter({
    blockCritical: false,
    sanitize: true
});

export default badWordFilter;
