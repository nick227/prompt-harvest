/**
 * Request Context Types
 *
 * Ensures authentication context is preserved throughout the request lifecycle
 */

export class RequestContext {
    constructor(req, userId, userEmail = null) {
        if (!req) {
            throw new Error('RequestContext: req is required');
        }
        if (!userId) {
            throw new Error('RequestContext: userId is required');
        }

        this.req = req;
        this.userId = userId;
        this.userEmail = userEmail;
        this.promptId = null;
        this.requestId = null;
        this.timestamp = Date.now();
    }

    /**
     * Create context from authenticated request
     */
    static fromAuthenticatedRequest(req) {
        if (!req?.user?.id) {
            throw new Error('RequestContext: No authenticated user found in request');
        }

        return new RequestContext(
            req,
            req.user.id,
            req.user.email
        );
    }

    /**
     * Set prompt ID for tracking
     */
    setPromptId(promptId) {
        this.promptId = promptId;
    }

    /**
     * Set request ID for tracking
     */
    setRequestId(requestId) {
        this.requestId = requestId;
    }

    /**
     * Get user info for database operations
     */
    getUserInfo() {
        return {
            userId: this.userId,
            userEmail: this.userEmail,
            isAdmin: this.req.user?.isAdmin || false
        };
    }

    /**
     * Validate context is still valid
     */
    validate() {
        if (!this.userId) {
            throw new Error('RequestContext: userId is missing');
        }
        if (!this.req) {
            throw new Error('RequestContext: req is missing');
        }

        return true;
    }

    /**
     * Create a copy for safe passing
     */
    clone() {
        const context = new RequestContext(this.req, this.userId, this.userEmail);

        context.promptId = this.promptId;
        context.requestId = this.requestId;

        return context;
    }
}

/**
 * Guard function to ensure context is valid
 */
export function validateRequestContext(context, operation) {
    if (!context) {
        throw new Error(`${operation}: RequestContext is required`);
    }
    if (!context.userId) {
        throw new Error(`${operation}: userId is required in context`);
    }
    context.validate();

    return true;
}
