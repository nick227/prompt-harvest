// Backend test for prompt enhancement flow - testing API endpoints
const request = require('supertest');
const express = require('express');

// Mock the server setup
const app = express();

app.use(express.json());

// Mock the feed module
const mockFeed = {
    prompt: {
        build: jest.fn()
    },
    image: {
        generate: jest.fn()
    }
};

// Mock the routes
app.post('/image/generate', async(req, res) => {
    const { prompt, providers, guidance, promptId, original, multiplier, mixup, mashup, customVariables } = req.body;

    // Check if prompt needs processing (variables, multiplier, mixup, mashup)
    const hasVariables = (/\$\{[^}]+\}/).test(prompt);
    const needsProcessing = hasVariables || multiplier || mixup || mashup || customVariables;

    let processedPrompt = prompt;
    let processedPromptId = promptId;

    if (needsProcessing) {
        try {
            // Build the enhanced prompt using the same logic as /prompt/build
            const processedResult = await mockFeed.prompt.build(prompt, multiplier || false, mixup || false, mashup || false, customVariables || '', req);

            processedPrompt = processedResult.prompt;
            processedPromptId = processedResult.promptId;
        } catch (error) {
            console.error('Error processing prompt:', error);
        }
    }

    const response = await mockFeed.image.generate(processedPrompt, original, processedPromptId, providers, guidance, req);

    res.json(response);
});

app.get('/prompt/build', async(req, res) => {
    const { prompt, multiplier, mixup, mashup, customVariables } = req.query;
    const response = await mockFeed.prompt.build(prompt, multiplier, mixup, mashup, customVariables, req);

    res.json(response);
});

describe('Prompt Enhancement API Flow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Variable Replacement via API', () => {
        test('should process variables in /image/generate endpoint', async() => {
            const testPrompt = 'A ${cat} in ${hip chill scenes} art style';
            const mockResult = {
                prompt: 'A Maine Coon in Urban rooftop party art style',
                original: testPrompt,
                promptId: 'test-123'
            };

            mockFeed.prompt.build.mockResolvedValue(mockResult);
            mockFeed.image.generate.mockResolvedValue({ success: true });

            const response = await request(app)
                .post('/image/generate')
                .send({
                    prompt: testPrompt,
                    providers: ['flux'],
                    guidance: 10,
                    promptId: 'test-123',
                    original: testPrompt
                });

            expect(response.status).toBe(200);
            expect(mockFeed.prompt.build).toHaveBeenCalledWith(
                testPrompt, false, false, false, '', expect.any(Object)
            );
            expect(mockFeed.image.generate).toHaveBeenCalledWith(
                'A Maine Coon in Urban rooftop party art style',
                testPrompt,
                'test-123', ['flux'],
                10,
                expect.any(Object)
            );
        });

        test('should handle multiple variables in same prompt', async() => {
            const testPrompt = 'test cats ${nba basketball teams} ${famous broadway plays} ${flower blooms}';
            const mockResult = {
                prompt: 'test cats Los Angeles Lakers Hamilton Rose blooms',
                original: testPrompt,
                promptId: 'test-456'
            };

            mockFeed.prompt.build.mockResolvedValue(mockResult);
            mockFeed.image.generate.mockResolvedValue({ success: true });

            const response = await request(app)
                .post('/image/generate')
                .send({
                    prompt: testPrompt,
                    providers: ['juggernaut'],
                    guidance: 10,
                    promptId: 'test-456',
                    original: testPrompt
                });

            expect(response.status).toBe(200);
            expect(mockFeed.prompt.build).toHaveBeenCalled();
            expect(mockFeed.image.generate).toHaveBeenCalledWith(
                'test cats Los Angeles Lakers Hamilton Rose blooms',
                testPrompt,
                'test-456', ['juggernaut'],
                10,
                expect.any(Object)
            );
        });

        test('should skip processing when no variables present', async() => {
            const testPrompt = 'A simple cat image';

            mockFeed.image.generate.mockResolvedValue({ success: true });

            const response = await request(app)
                .post('/image/generate')
                .send({
                    prompt: testPrompt,
                    providers: ['flux'],
                    guidance: 10,
                    promptId: 'test-789',
                    original: testPrompt
                });

            expect(response.status).toBe(200);
            expect(mockFeed.prompt.build).not.toHaveBeenCalled();
            expect(mockFeed.image.generate).toHaveBeenCalledWith(
                testPrompt,
                testPrompt,
                'test-789', ['flux'],
                10,
                expect.any(Object)
            );
        });
    });

    describe('Enhancement Parameters via API', () => {
        test('should process multiplier parameter', async() => {
            const testPrompt = 'A cat';
            const multiplier = '${brass instruments} lighting';
            const mockResult = {
                prompt: 'A cat, Fanfare Trumpet lighting',
                original: testPrompt,
                promptId: 'test-mult'
            };

            mockFeed.prompt.build.mockResolvedValue(mockResult);
            mockFeed.image.generate.mockResolvedValue({ success: true });

            const response = await request(app)
                .post('/image/generate')
                .send({
                    prompt: testPrompt,
                    providers: ['flux'],
                    guidance: 10,
                    promptId: 'test-mult',
                    original: testPrompt,
                    multiplier
                });

            expect(response.status).toBe(200);
            expect(mockFeed.prompt.build).toHaveBeenCalledWith(
                testPrompt, multiplier, false, false, '', expect.any(Object)
            );
        });

        test('should process mixup parameter', async() => {
            const testPrompt = 'A cat, A dog';
            const mockResult = {
                prompt: 'A dog, A cat',
                original: testPrompt,
                promptId: 'test-mixup'
            };

            mockFeed.prompt.build.mockResolvedValue(mockResult);
            mockFeed.image.generate.mockResolvedValue({ success: true });

            const response = await request(app)
                .post('/image/generate')
                .send({
                    prompt: testPrompt,
                    providers: ['flux'],
                    guidance: 10,
                    promptId: 'test-mixup',
                    original: testPrompt,
                    mixup: true
                });

            expect(response.status).toBe(200);
            expect(mockFeed.prompt.build).toHaveBeenCalledWith(
                testPrompt, false, true, false, '', expect.any(Object)
            );
        });

        test('should process mashup parameter', async() => {
            const testPrompt = 'A cat, A dog';
            const mockResult = {
                prompt: 'A dog cat A',
                original: testPrompt,
                promptId: 'test-mashup'
            };

            mockFeed.prompt.build.mockResolvedValue(mockResult);
            mockFeed.image.generate.mockResolvedValue({ success: true });

            const response = await request(app)
                .post('/image/generate')
                .send({
                    prompt: testPrompt,
                    providers: ['flux'],
                    guidance: 10,
                    promptId: 'test-mashup',
                    original: testPrompt,
                    mashup: true
                });

            expect(response.status).toBe(200);
            expect(mockFeed.prompt.build).toHaveBeenCalledWith(
                testPrompt, false, false, true, '', expect.any(Object)
            );
        });

        test('should process all enhancement parameters together', async() => {
            const testPrompt = 'A ${cat}';
            const multiplier = '${brass instruments} lighting';
            const mockResult = {
                prompt: 'A Maine Coon Fanfare Trumpet lighting',
                original: testPrompt,
                promptId: 'test-all'
            };

            mockFeed.prompt.build.mockResolvedValue(mockResult);
            mockFeed.image.generate.mockResolvedValue({ success: true });

            const response = await request(app)
                .post('/image/generate')
                .send({
                    prompt: testPrompt,
                    providers: ['flux'],
                    guidance: 10,
                    promptId: 'test-all',
                    original: testPrompt,
                    multiplier,
                    mixup: true,
                    mashup: true,
                    customVariables: 'custom_color=red,blue,green'
                });

            expect(response.status).toBe(200);
            expect(mockFeed.prompt.build).toHaveBeenCalledWith(
                testPrompt, multiplier, true, true, 'custom_color=red,blue,green', expect.any(Object)
            );
        });
    });

    describe('Error Handling', () => {
        test('should handle prompt building errors gracefully', async() => {
            const testPrompt = 'A ${cat}';

            mockFeed.prompt.build.mockRejectedValue(new Error('Database error'));
            mockFeed.image.generate.mockResolvedValue({ success: true });

            const response = await request(app)
                .post('/image/generate')
                .send({
                    prompt: testPrompt,
                    providers: ['flux'],
                    guidance: 10,
                    promptId: 'test-error',
                    original: testPrompt
                });

            expect(response.status).toBe(200);
            // Should still call image generation with original prompt
            expect(mockFeed.image.generate).toHaveBeenCalledWith(
                testPrompt,
                testPrompt,
                'test-error', ['flux'],
                10,
                expect.any(Object)
            );
        });
    });
});
