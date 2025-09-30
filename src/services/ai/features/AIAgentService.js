/**
 * AI Agent Service
 *
 * Intelligent AI agent for image generation assistance using OpenAI tool calling.
 * Provides context-aware recommendations for prompts, models, and AutoImage features.
 */

import { BaseAIService } from '../core/BaseAIService.js';
import { ConversationService } from '../core/ConversationService.js';

export class AIAgentService extends BaseAIService {
    constructor() {
        super();
        this.conversationService = new ConversationService();

        console.log('🔧 AIAgentService constructor:', {
            hasOpenAI: !!this.openai,
            hasConversationService: !!this.conversationService,
            model: this.model
        });
    }

    /**
     * Process AI chat request with full context awareness
     */
    async processChatRequest(message, context, userId, conversationId = null) {
        try {
            console.log('🧠 AI Agent Processing:', {
                message: `${message?.substring(0, 50)}...`,
                hasContext: !!context,
                userId,
                conversationId
            });

            // Get conversation history
            const conversationHistory = await this.conversationService.getConversationHistory(conversationId, 2);

            // Build OpenAI messages array
            const messages = this.buildMessagesArray(message, context, conversationHistory);

            console.log('📝 OpenAI Messages:', {
                messageCount: messages.length,
                lastMessage: `${messages[messages.length - 1]?.content?.substring(0, 50)}...`
            });

            // Call OpenAI with tool calling
            const response = await this.makeRequest(messages, {
                model: 'gpt-4o',
                tools: this.getToolDefinitions(),
                tool_choice: 'auto',
                temperature: 0.7,
                max_tokens: 1000
            });

            console.log('🤖 OpenAI Response:', {
                success: response.success,
                hasMessage: !!response.response,
                hasToolCalls: !!(response.response?.tool_calls && response.response.tool_calls.length > 0),
                hasContent: !!response.response?.content
            });

            // Process the response
            const result = await this.processOpenAIResponse(response, context, userId, conversationId);

            console.log('✅ AI Agent Result:', {
                hasResponse: !!result.response,
                responseLength: result.response?.length || 0,
                buttonCount: result.buttons?.length || 0,
                hasNewPrompt: !!result.newPrompt
            });

            // Get or create conversation and save messages
            const conversation = await this.conversationService.getOrCreateConversation(userId, conversationId);

            if (conversation) {
                // Add conversation ID to response
                result.conversationId = conversation.id;

                // Save user message to database (non-blocking)
                this.conversationService.addMessage(
                    conversation.id,
                    'user',
                    message,
                    null
                ).catch(error => {
                    console.error('Failed to save user message (non-critical):', error);
                });

                // Save AI response to database (non-blocking)
                this.conversationService.addMessage(
                    conversation.id,
                    'assistant',
                    result.response,
                    {
                        buttons: result.buttons,
                        newPrompt: result.newPrompt
                    }
                ).catch(error => {
                    console.error('Failed to save AI response (non-critical):', error);
                });
            }

            return result;

        } catch (error) {
            console.error('❌ AI Agent Error:', error);

            return {
                response: 'Sorry, I encountered an error. Please try again.',
                buttons: [],
                newPrompt: null
            };
        }
    }

    /**
     * Build messages array for OpenAI
     */
    buildMessagesArray(message, context, conversationHistory) {
        const messages = [
            {
                role: 'system',
                content: this.getSystemPrompt(context)
            }
        ];

        // Add conversation history (last 2 messages)
        messages.push(...conversationHistory);

        // Add current user message
        messages.push({
            role: 'user',
            content: message
        });

        return messages;
    }

    /**
     * Get system prompt based on context
     */
    getSystemPrompt(context) {
        const currentPrompt = context.formData?.prompt || '';
        const availableModels = this.getAvailableModels(context);
        const userCredits = context.user?.creditBalance || 0;

        return `You are an expert AI assistant for AutoImage, an advanced AI image generation platform. Your role is to help users create perfect images by:

1. **Always respond with helpful text** - Even for simple greetings like "hi" or "hello", provide a friendly response
2. **Analyzing their current prompt and suggesting improvements**
3. **Recommending the best models for their specific needs**
4. **Suggesting AutoImage's unique features (mashup, mixup, photogenic, etc.)**
5. **Providing context-aware guidance based on their current settings**

**IMPORTANT: Always provide a text response. For simple greetings, respond with a friendly message and offer to help with image generation.**

**Current Context:**
- User Prompt: "${currentPrompt}"
- Available Models: ${availableModels.join(', ')}
- User Credits: ${userCredits}
- Mashup: ${context.formData?.mashup ? 'Enabled' : 'Disabled'}
- Mixup: ${context.formData?.mixup ? 'Enabled' : 'Disabled'}
- Auto Enhance: ${context.formData?.autoEnhance ? 'Enabled' : 'Disabled'}

**Model Recommendations:**
- **Flux**: Best for photorealistic images, portraits, landscapes
- **DALL-E**: Great for creative, artistic, and conceptual images
- **Midjourney**: Excellent for artistic styles and creative compositions
- **Stable Diffusion**: Good for general purpose and experimental images

**AutoImage Features:**
- **Photogenic**: Adds "photogenic 8k ultra-realism" keywords for realistic photos
- **Mashup**: Combines multiple prompts for creative results
- **Mixup**: Shuffles prompt elements for variety
- **Auto Enhance**: Automatically improves prompt quality

**Response Guidelines:**
- Always provide a helpful text response
- For greetings: Be friendly and offer assistance
- For prompts: Analyze and suggest improvements
- For questions: Provide specific, actionable advice
- Buttons are completely optional - only include if they genuinely add value
- newPrompt is optional - only suggest if it significantly improves the user's prompt
- For simple conversations, you may not need buttons at all

**Button Prompts:**
When generating buttons, include a "prompt" field with an AI-generated prompt that the user can click to send back to you. These prompts should:
- Be context-aware and reference the user's current prompt
- Predict what the user might want to ask next
- Be specific and actionable
- Reduce user typing by providing pre-written prompts

Examples:
- For "Enhance Prompt" button: prompt: "enhance my prompt 'a cat' with better keywords and style descriptors"
- For "Enable photogenic" button: prompt: "enable photogenic feature and add photogenic keywords to my prompt"
- For "Use Flux" button: prompt: "switch to Flux model and explain why it's better for photorealistic images"

Always provide helpful, specific advice tailored to their current prompt and goals.`;
    }

    /**
     * Get available models from context
     */
    getAvailableModels(context) {
        const models = context.models || [];

        return models.filter(m => m.checked).map(m => m.name);
    }

    /**
     * Process OpenAI response and extract tool calls
     */
    async processOpenAIResponse(response, context, userId, conversationId) {
        if (!response.success) {
            throw new Error(`OpenAI request failed: ${response.error}`);
        }

        const message = response.response;

        console.log('🔍 Processing OpenAI Response:', {
            hasToolCalls: !!(message.tool_calls && message.tool_calls.length > 0),
            toolCallCount: message.tool_calls?.length || 0,
            hasContent: !!message.content,
            contentLength: message.content?.length || 0
        });

        // Handle tool calls
        if (message.tool_calls && message.tool_calls.length > 0) {
            const toolResult = await this.handleToolCalls(message.tool_calls, context, userId, conversationId);

            console.log('🔧 Tool result:', {
                hasResponse: !!toolResult.response,
                responseLength: toolResult.response?.length || 0,
                buttonCount: toolResult.buttons?.length || 0,
                hasNewPrompt: !!toolResult.newPrompt
            });

            // Ensure we always have a response text
            if (!toolResult.response || toolResult.response.trim() === '') {
                toolResult.response = 'I can help you with your image generation! What would you like to create?';
            }

            return toolResult;
        }

        // Handle regular text response
        const responseText = message.content || 'Hello! I\'m here to help you create amazing images. What would you like to generate?';

        const result = {
            response: responseText,
            buttons: [], // Let AI decide if buttons are needed
            newPrompt: null
        };

        console.log('💬 Text result:', {
            hasResponse: !!result.response,
            responseLength: result.response?.length || 0,
            buttonCount: result.buttons?.length || 0
        });


        return result;
    }

    /**
     * Handle OpenAI tool calls
     */
    async handleToolCalls(toolCalls, context, userId, conversationId) {
        const results = {
            response: '',
            buttons: [],
            newPrompt: null
        };

        for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);

            switch (functionName) {
                case 'analyze_prompt':
                    results.response = this.buildAnalysisResponse(args, context);
                    results.buttons = args.buttons || [];
                    break;

                case 'generate_enhanced_prompt':
                    results.newPrompt = args.enhancedPrompt;
                    results.response = `Here's an enhanced version of your prompt: "${args.enhancedPrompt}"\n\n${args.changes}`;
                    results.buttons = args.buttons || [];
                    break;

                case 'suggest_settings':
                    results.response = this.buildSettingsResponse(args, context);
                    results.buttons = args.buttons || [];
                    break;
            }
        }

        // Ensure we always have a response
        if (!results.response || results.response.trim() === '') {
            results.response = 'Hello! I\'m here to help you create amazing images. What would you like to generate?';
        }


        return results;
    }

    /**
     * Get tool definitions for OpenAI
     */
    getToolDefinitions() {
        return [
            {
                type: 'function',
                function: {
                    name: 'analyze_prompt',
                    description: 'Analyze the user\'s current prompt and suggest improvements',
                    parameters: {
                        type: 'object',
                        properties: {
                            analysis: {
                                type: 'string',
                                description: 'Analysis of the current prompt'
                            },
                            improvements: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'List of specific improvements'
                            },
                            recommendedModel: {
                                type: 'string',
                                description: 'Best model for this prompt (flux, dalle, midjourney, etc.)'
                            },
                            suggestedFeatures: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'AutoImage features to suggest (photogenic, mashup, mixup, etc.)'
                            },
                            buttons: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        text: { type: 'string' },
                                        action: { type: 'string' },
                                        value: { type: 'string' },
                                        prompt: { type: 'string', description: 'AI-generated prompt for one-click interaction' }
                                    },
                                    required: ['text', 'action', 'value']
                                },
                                description: 'Optional buttons - only include if they genuinely add value to the conversation'
                            }
                        },
                        required: ['analysis', 'improvements', 'recommendedModel']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'generate_enhanced_prompt',
                    description: 'Generate an enhanced version of the user\'s prompt',
                    parameters: {
                        type: 'object',
                        properties: {
                            enhancedPrompt: {
                                type: 'string',
                                description: 'The enhanced prompt with better keywords and structure'
                            },
                            changes: {
                                type: 'string',
                                description: 'Explanation of what was improved'
                            },
                            keywords: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Key improvements made'
                            },
                            buttons: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        text: { type: 'string' },
                                        action: { type: 'string' },
                                        value: { type: 'string' },
                                        prompt: { type: 'string', description: 'AI-generated prompt for one-click interaction' }
                                    },
                                    required: ['text', 'action', 'value']
                                },
                                description: 'Optional buttons - only include if they genuinely add value to the conversation'
                            }
                        },
                        required: ['enhancedPrompt', 'changes']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'suggest_settings',
                    description: 'Suggest optimal settings for the user\'s goals',
                    parameters: {
                        type: 'object',
                        properties: {
                            modelRecommendation: {
                                type: 'string',
                                description: 'Recommended model'
                            },
                            featureSuggestions: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Suggested AutoImage features'
                            },
                            guidance: {
                                type: 'number',
                                description: 'Recommended guidance value (1-20)'
                            },
                            reasoning: {
                                type: 'string',
                                description: 'Why these settings are recommended'
                            },
                            buttons: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        text: { type: 'string' },
                                        action: { type: 'string' },
                                        value: { type: 'string' },
                                        prompt: { type: 'string', description: 'AI-generated prompt for one-click interaction' }
                                    },
                                    required: ['text', 'action', 'value']
                                },
                                description: 'Optional buttons - only include if they genuinely add value to the conversation'
                            }
                        },
                        required: ['modelRecommendation', 'reasoning']
                    }
                }
            }
        ];
    }

    /**
     * Build analysis response
     */
    buildAnalysisResponse(args, context) {
        return `**Prompt Analysis:**\n${args.analysis}\n\n**Recommended Model:** ${args.recommendedModel}\n\n**Improvements:**\n${args.improvements.map(imp => `• ${imp}`).join('\n')}`;
    }

    /**
     * Build settings response
     */
    buildSettingsResponse(args, context) {
        return `**Recommended Settings:**\n\n**Model:** ${args.modelRecommendation}\n**Guidance:** ${args.guidance || '7.5'}\n\n**Reasoning:** ${args.reasoning}`;
    }

    /**
     * Get conversation history (delegated to conversation service)
     */
    async getConversationHistory(conversationId, limit = 5, page = 0) {
        return await this.conversationService.getConversationHistory(conversationId, limit, page);
    }

    /**
     * Get user conversations (delegated to conversation service)
     */
    async getUserPrompts(userId, limit = 10) {
        return await this.conversationService.getUserConversations(userId, limit);
    }

    /**
     * Get application prompts (no longer needed with new conversation model)
     */
    async getApplicationPrompts(limit = 10) {
        // Application prompts are now stored as metadata in chat messages
        return [];
    }
}
