import { PromptService } from '../services/PromptService.js';
import { generateRequestId, logRequestStart, logRequestSuccess, logRequestError } from '../utils/RequestLogger.js';

export class PromptController {
    constructor() {
        this.promptService = new PromptService();
    }

    /**
     * Get user prompts with pagination
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getUserPrompts(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            // Log request start
            logRequestStart(requestId, req, 'Get User Prompts', {
                userId: req.user?.id,
                query: req.query
            });

            // Extract pagination parameters from query
            const { limit, page } = req.query;

            // Only allow authenticated users
            if (!req.user?.id) {
                console.log('🔍 PROMPT CONTROLLER: User not authenticated, returning empty prompts');

                return res.json({
                    success: true,
                    data: {
                        prompts: [],
                        pagination: {
                            total: 0,
                            hasMore: false,
                            page: parseInt(page) || 0,
                            limit: parseInt(limit) || 10
                        }
                    },
                    requestId,
                    duration: Date.now() - startTime,
                    timestamp: new Date().toISOString()
                });
            }

            const actualUserId = req.user.id;

            console.log('🔍 PROMPT CONTROLLER: User details:', {
                isAuthenticated: !!req.user,
                userId: req.user.id,
                userEmail: req.user.email,
                actualUserId,
                query: req.query
            });

            // Get prompts from service
            const result = await this.promptService.getUserPrompts(actualUserId, { limit, page });

            // Log successful response
            logRequestSuccess(requestId, 'Get User Prompts', Date.now() - startTime, {
                promptsCount: result.prompts.length,
                total: result.pagination.total,
                hasMore: result.pagination.hasMore
            });

            // Return successful response
            res.json({
                success: true,
                data: result,
                requestId,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logRequestError(requestId, 'Get User Prompts', startTime, error);

            res.status(500).json({
                success: false,
                requestId,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                error: {
                    type: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to retrieve user prompts',
                    details: error.message
                },
                statusCode: 500
            });
        }
    }

    /**
     * Get a single prompt by ID
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getPromptById(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            // Log request start
            logRequestStart(requestId, req, 'Get Prompt By ID', {
                promptId: req.params.id,
                userId: req.user?.id
            });

            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: {
                        type: 'UNAUTHORIZED',
                        message: 'User must be logged in to access prompts'
                    },
                    statusCode: 401
                });
            }

            const promptId = req.params.id;

            // Get prompt from service
            const prompt = await this.promptService.getPromptById(promptId, userId);

            // Log successful response
            logRequestSuccess(requestId, 'Get Prompt By ID', Date.now() - startTime, {
                promptId: prompt.id
            });

            // Return successful response
            res.json({
                success: true,
                data: prompt,
                requestId,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logRequestError(requestId, 'Get Prompt By ID', startTime, error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('Unauthorized')) {
                statusCode = 403;
            }

            res.status(statusCode).json({
                success: false,
                requestId,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                error: {
                    type: statusCode === 404
                        ? 'NOT_FOUND' :
                        statusCode === 403 ? 'FORBIDDEN' : 'INTERNAL_SERVER_ERROR',
                    message: error.message,
                    resource: req.params.id
                },
                statusCode
            });
        }
    }

    /**
     * Create a new prompt
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async createPrompt(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            // Log request start
            logRequestStart(requestId, req, 'Create Prompt', {
                userId: req.user?.id,
                promptData: {
                    ...req.body,
                    prompt: `${req.body.prompt?.substring(0, 50)}...`
                }
            });

            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: {
                        type: 'UNAUTHORIZED',
                        message: 'User must be logged in to create prompts'
                    },
                    statusCode: 401
                });
            }

            // Extract prompt data from request body
            const { prompt, original, provider, guidance } = req.body;

            // Validate required fields
            if (!prompt) {
                return res.status(400).json({
                    success: false,
                    error: {
                        type: 'VALIDATION_ERROR',
                        message: 'Prompt is required'
                    },
                    statusCode: 400
                });
            }

            // Create prompt data object
            const promptData = {
                prompt,
                original: original || prompt,
                provider: provider || 'unknown',
                guidance: guidance || 10
            };

            // Create prompt via service
            const newPrompt = await this.promptService.createPrompt(promptData, userId);

            // Log successful response
            logRequestSuccess(requestId, 'Create Prompt', Date.now() - startTime, {
                promptId: newPrompt.id
            });

            // Return successful response
            res.status(201).json({
                success: true,
                data: newPrompt,
                requestId,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logRequestError(requestId, 'Create Prompt', startTime, error);

            res.status(500).json({
                success: false,
                requestId,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                error: {
                    type: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create prompt',
                    details: error.message
                },
                statusCode: 500
            });
        }
    }

    /**
     * Update a prompt
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async updatePrompt(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            // Log request start
            logRequestStart(requestId, req, 'Update Prompt', {
                promptId: req.params.id,
                userId: req.user?.id
            });

            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: {
                        type: 'UNAUTHORIZED',
                        message: 'User must be logged in to update prompts'
                    },
                    statusCode: 401
                });
            }

            const promptId = req.params.id;
            const updateData = req.body;

            // Update prompt via service
            const updatedPrompt = await this.promptService.updatePrompt(promptId, updateData, userId);

            // Log successful response
            logRequestSuccess(requestId, 'Update Prompt', Date.now() - startTime, {
                promptId: updatedPrompt.id
            });

            // Return successful response
            res.json({
                success: true,
                data: updatedPrompt,
                requestId,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logRequestError(requestId, 'Update Prompt', startTime, error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('Unauthorized')) {
                statusCode = 403;
            }

            res.status(statusCode).json({
                success: false,
                requestId,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                error: {
                    type: statusCode === 404
                        ? 'NOT_FOUND' :
                        statusCode === 403 ? 'FORBIDDEN' : 'INTERNAL_SERVER_ERROR',
                    message: error.message,
                    resource: req.params.id
                },
                statusCode
            });
        }
    }

    /**
     * Delete a prompt
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async deletePrompt(req, res) {
        const requestId = req.id || generateRequestId();
        const startTime = Date.now();

        try {
            // Log request start
            logRequestStart(requestId, req, 'Delete Prompt', {
                promptId: req.params.id,
                userId: req.user?.id
            });

            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: {
                        type: 'UNAUTHORIZED',
                        message: 'User must be logged in to delete prompts'
                    },
                    statusCode: 401
                });
            }

            const promptId = req.params.id;

            // Delete prompt via service
            const result = await this.promptService.deletePrompt(promptId, userId);

            // Log successful response
            logRequestSuccess(requestId, 'Delete Prompt', Date.now() - startTime, {
                promptId
            });

            // Return successful response
            res.json({
                success: true,
                data: result,
                requestId,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logRequestError(requestId, 'Delete Prompt', startTime, error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('Unauthorized')) {
                statusCode = 403;
            }

            res.status(statusCode).json({
                success: false,
                requestId,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                error: {
                    type: statusCode === 404
                        ? 'NOT_FOUND' :
                        statusCode === 403 ? 'FORBIDDEN' : 'INTERNAL_SERVER_ERROR',
                    message: error.message,
                    resource: req.params.id
                },
                statusCode
            });
        }
    }
}
