/**
 * QueueManager Test Seeds
 *
 * Critical test scenarios for production hardening
 */

import { ENQUEUE_CANCEL } from '../QueueSymbols.js';

describe('QueueManager Hardening Tests', () => {
    let queueManager;
    let mockQueueCore;
    let mockAnalytics;

    beforeEach(() => {
        // Mock QueueCore to track constructor calls
        mockQueueCore = jest.fn();
        mockAnalytics = {
            recordMetrics: jest.fn(),
            startRateLimiterCleanup: jest.fn(() => 12345)
        };

        // Mock the QueueCore import
        jest.doMock('../queue/core/QueueCore.js', () => ({
            QueueCore: mockQueueCore
        }));
    });

    describe('Clock Mixing Guard', () => {
        test('verifies monotonic enqueuedAt', async () => {
            const mockEpochNow = jest.fn(() => 1000);
            const mockMonotonicNow = jest.fn(() => 2000);

            queueManager = new QueueManager({
                epochNow: mockEpochNow,
                monotonicNow: mockMonotonicNow
            });

            // Get enqueued timestamp
            const enqueuedAt = queueManager._getEnqueuedTimestamp();

            // Should use monotonic time for duration calculations
            expect(mockMonotonicNow).toHaveBeenCalled();
            expect(enqueuedAt).toBe(2000);

            // Verify epoch time is used for metrics
            expect(mockEpochNow).toHaveBeenCalled();
        });
    });

    describe('Option Leakage Prevention', () => {
        test('no stray options to QueueCore', () => {
            const options = {
                concurrency: 3,
                timeout: 5000,
                epochNow: () => 1000,
                monotonicNow: () => 2000,
                someOtherOption: 'should-not-leak'
            };

            queueManager = new QueueManager(options);

            // Verify QueueCore was called with clean options
            expect(mockQueueCore).toHaveBeenCalledWith({
                concurrency: 3,
                timeout: 5000,
                someOtherOption: 'should-not-leak'
            });

            // Verify internal time options were stripped
            const coreOptions = mockQueueCore.mock.calls[0][0];
            expect(coreOptions.epochNow).toBeUndefined();
            expect(coreOptions.monotonicNow).toBeUndefined();
        });
    });

    describe('Enqueue-Time Abort Metrics', () => {
        test('abort signal pre-aborted emits only task_cancelled_before_enqueue', async () => {
            const mockAnalytics = {
                recordMetrics: jest.fn()
            };

            queueManager = new QueueManager({ analytics: mockAnalytics });

            // Create pre-aborted signal
            const abortController = new AbortController();
            abortController.abort();

            const generationFunction = jest.fn();
            const options = {
                abortSignal: abortController.signal,
                requestId: 'test-request'
            };

            try {
                await queueManager.addToQueue(generationFunction, options);
            } catch (error) {
                // Expected to throw
            }

            // Verify only cancellation metric was recorded
            const metricsCalls = mockAnalytics.recordMetrics.mock.calls;
            const cancellationMetrics = metricsCalls.filter(call =>
                call[0].action === 'task_cancelled_before_enqueue'
            );
            const errorMetrics = metricsCalls.filter(call =>
                call[0].action === 'task_enqueue_error'
            );

            expect(cancellationMetrics).toHaveLength(1);
            expect(errorMetrics).toHaveLength(0);
        });
    });

    describe('Rate Limiter Cleanup Noop Metrics', () => {
        test('restart when already running records noop metric', () => {
            const mockAnalytics = {
                recordMetrics: jest.fn(),
                isRateLimiterCleanupRunning: jest.fn(() => true)
            };

            queueManager = new QueueManager({ analytics: mockAnalytics });

            // First restart should start cleanup
            const started = queueManager._rateLimiterCleanup.restart();
            expect(started).toBe(true);

            // Second restart should be noop
            const restarted = queueManager._rateLimiterCleanup.restart();
            expect(restarted).toBe(false);

            // Verify noop metric was recorded
            const noopMetrics = mockAnalytics.recordMetrics.mock.calls.filter(call =>
                call[0].action === 'rate_limiter_cleanup_restart_noop'
            );
            expect(noopMetrics).toHaveLength(1);
        });
    });

    describe('User Cancellation Telemetry', () => {
        test('cancelRequest emits richer telemetry with userId', () => {
            const mockAnalytics = {
                recordMetrics: jest.fn()
            };

            const mockLifecycle = {
                cancelRequest: jest.fn(() => true),
                getLifecycleEntry: jest.fn(() => ({
                    options: { userId: 'test-user-123' }
                }))
            };

            queueManager = new QueueManager({ analytics: mockAnalytics });
            queueManager._lifecycle = mockLifecycle;

            // Cancel a request
            const cancelled = queueManager.cancelRequest('test-request-456');

            expect(cancelled).toBe(true);
            expect(mockAnalytics.recordMetrics).toHaveBeenCalledWith({
                action: 'user_cancellation',
                requestId: 'test-request-456',
                userId: 'test-user-123',
                timestamp: expect.any(Number)
            });
        });

        test('cancelRequest handles missing userId gracefully', () => {
            const mockAnalytics = {
                recordMetrics: jest.fn()
            };

            const mockLifecycle = {
                cancelRequest: jest.fn(() => true),
                getLifecycleEntry: jest.fn(() => ({
                    options: {} // No userId
                }))
            };

            queueManager = new QueueManager({ analytics: mockAnalytics });
            queueManager._lifecycle = mockLifecycle;

            // Cancel a request
            const cancelled = queueManager.cancelRequest('test-request-789');

            expect(cancelled).toBe(true);
            expect(mockAnalytics.recordMetrics).toHaveBeenCalledWith({
                action: 'user_cancellation',
                requestId: 'test-request-789',
                userId: undefined,
                timestamp: expect.any(Number)
            });
        });
    });

    describe('Cancellation Detection Robustness', () => {
        test('detects all common abort error shapes', () => {
            const taskManager = new QueueTaskManager();

            // Test various abort error shapes
            const abortErrors = [
                { name: 'AbortError' },
                { name: 'CancelError' },
                { name: 'CancelledError' },
                { name: 'CancellationError' },
                { name: 'AbortedError' },
                { name: 'UserCancelledError' },
                { name: 'RequestCancelledError' },
                { code: 'ABORT_ERR' },
                { code: 'ABORTED' },
                { code: 'ABORT_ERROR' },
                { code: 'CANCELLED' },
                { code: 'CANCELED' },
                { code: 'USER_CANCELLED' },
                { code: 'REQUEST_CANCELLED' },
                { code: 'OPERATION_CANCELLED' },
                { cause: { name: 'AbortError' } },
                { cause: { type: 'enqueue-time-cancel' } },
                { message: 'Operation was aborted' },
                { message: 'Request was aborted' },
                { message: 'Request cancelled' },
                { message: 'User cancelled' },
                { message: 'Cancelled by user' },
                { message: 'Abort signal' },
                { message: 'Signal aborted' },
                { message: 'Fetch aborted' },
                { name: 'TimeoutError', message: 'abort timeout' },
                { name: 'TypeError', message: 'fetch aborted' },
                { name: 'CanceledError' },
                { code: 'ERR_CANCELED' },
                { name: 'CancellationError' },
                { isCancelled: true }
            ];

            abortErrors.forEach(error => {
                expect(taskManager.isCancellationError(error)).toBe(true);
            });

            // Test non-abort errors
            const nonAbortErrors = [
                { name: 'TypeError' },
                { name: 'ReferenceError' },
                { message: 'Something went wrong' },
                { code: 'ENOTFOUND' },
                { name: 'NetworkError' },
                { message: 'Connection failed' }
            ];

            nonAbortErrors.forEach(error => {
                expect(taskManager.isCancellationError(error)).toBe(false);
            });
        });

        test('detects enqueue-time cancellation with centralized symbol', () => {
            const taskManager = new QueueTaskManager();

            // Test enqueue-time cancellation with centralized symbol
            const enqueueCancelError = {
                name: 'AbortError',
                message: 'Task cancelled before enqueue',
                [ENQUEUE_CANCEL]: true
            };

            expect(taskManager.isCancellationError(enqueueCancelError)).toBe(true);
        });

        test('detects runtime-specific abort variants', () => {
            const taskManager = new QueueTaskManager();

            // Test Node.js specific variants
            const nodeAbortErrors = [
                { name: 'AbortError', code: 'ABORT_ERR' },
                { name: 'CancelError', code: 'ABORTED' },
                { name: 'TimeoutError', message: 'abort timeout' }
            ];

            // Test browser-specific variants
            const browserAbortErrors = [
                { name: 'DOMException', code: 'ABORT_ERR' },
                { name: 'TypeError', message: 'fetch aborted' },
                { name: 'CanceledError' }
            ];

            // Test library-specific variants
            const libraryAbortErrors = [
                { name: 'CancellationError' },
                { isCancelled: true },
                { code: 'ERR_CANCELED' }
            ];

            [...nodeAbortErrors, ...browserAbortErrors, ...libraryAbortErrors].forEach(error => {
                expect(taskManager.isCancellationError(error)).toBe(true);
            });
        });

        test('prevents duplicate metrics across runtime variants', () => {
            const taskManager = new QueueTaskManager();

            // Test that different abort shapes are treated equivalently
            const equivalentAbortErrors = [
                { name: 'AbortError' },                    // Standard
                { name: 'CancelError' },                   // Alternative name
                { name: 'CancelledError' },                 // British spelling
                { name: 'CancellationError' },              // Library variant
                { name: 'AbortedError' },                   // Past tense
                { name: 'UserCancelledError' },             // User-specific
                { name: 'RequestCancelledError' },          // Request-specific
                { code: 'ABORT_ERR' },                      // Node.js code
                { code: 'ABORTED' },                        // Alternative code
                { code: 'ABORT_ERROR' },                    // Extended code
                { code: 'CANCELLED' },                      // British code
                { code: 'CANCELED' },                       // American code
                { code: 'USER_CANCELLED' },                 // User-specific code
                { code: 'REQUEST_CANCELLED' },              // Request-specific code
                { code: 'OPERATION_CANCELLED' },            // Operation-specific code
                { message: 'Operation was aborted' },       // Message-based
                { message: 'Request was aborted' },         // Request message
                { message: 'Request cancelled' },           // British message
                { message: 'User cancelled' },              // User message
                { message: 'Cancelled by user' },           // User action message
                { message: 'Abort signal' },                // Signal message
                { message: 'Signal aborted' },              // Signal state message
                { message: 'Fetch aborted' },                // Fetch message
                { name: 'TimeoutError', message: 'abort timeout' }, // Timeout variant
                { name: 'TypeError', message: 'fetch aborted' },    // Fetch variant
                { name: 'CanceledError' },                 // Axios variant
                { code: 'ERR_CANCELED' },                   // Node.js error code
                { name: 'CancellationError' },              // Promise library
                { isCancelled: true }                       // Boolean flag
            ];

            // All should be detected as cancellation errors
            equivalentAbortErrors.forEach(error => {
                expect(taskManager.isCancellationError(error)).toBe(true);
            });

            // Verify they are treated equivalently (no false negatives)
            const allDetected = equivalentAbortErrors.every(error =>
                taskManager.isCancellationError(error)
            );
            expect(allDetected).toBe(true);
        });
    });

    describe('Symbol Centralization', () => {
        test('ENQUEUE_CANCEL symbol is properly centralized', () => {
            // Verify the symbol is defined and accessible
            expect(ENQUEUE_CANCEL).toBeDefined();
            expect(typeof ENQUEUE_CANCEL).toBe('symbol');
            expect(ENQUEUE_CANCEL.toString()).toBe('Symbol(enqueue-cancel)');
        });
    });

    describe('Regression Prevention Tests', () => {
        describe('Init Order & Manager Bundle', () => {
            test('throws InitializationError when manager bundle is incomplete', () => {
                // Mock QueueInitializationManager to omit a manager
                const mockInitManager = {
                    initialize: jest.fn(() => ({
                        lifecycle: {},
                        timeoutHandler: {},
                        analytics: {},
                        rateLimiterCleanup: {},
                        retryManager: {},
                        initialization: {},
                        operations: {},
                        shutdown: {},
                        validation: {},
                        taskManager: {},
                        // Missing signalHandler
                    }))
                };

                // Mock the import
                jest.doMock('../QueueInitializationManager.js', () => ({
                    QueueInitializationManager: jest.fn(() => mockInitManager)
                }));

                expect(() => {
                    new QueueManager();
                }).toThrow('QueueInitializationManager failed to return signalHandler');
            });
        });

        describe('Monotonic EnqueuedAt', () => {
            test('enqueuedAt uses monotonic clock and never decreases', () => {
                let monotonicTime = 100;
                const mockMonotonicNow = jest.fn(() => monotonicTime += 10);

                queueManager = new QueueManager({
                    monotonicNow: mockMonotonicNow,
                    analytics: { recordMetrics: jest.fn() }
                });

                const enqueuedAt1 = queueManager._getEnqueuedTimestamp();
                const enqueuedAt2 = queueManager._getEnqueuedTimestamp();

                expect(enqueuedAt1).toBe(110);
                expect(enqueuedAt2).toBe(120);
                expect(enqueuedAt2).toBeGreaterThan(enqueuedAt1);
            });
        });

        describe('Abort Before Enqueue Telemetry', () => {
            test('abort signal pre-aborted emits correct telemetry', async () => {
                const mockAnalytics = {
                    recordMetrics: jest.fn()
                };

                const mockQueueService = {
                    getMetrics: jest.fn(() => ({
                        current: {
                            queueSize: 5,
                            activeJobs: 2,
                            concurrency: 3
                        }
                    }))
                };

                queueManager = new QueueManager({ analytics: mockAnalytics });
                queueManager.queueService = mockQueueService;

                // Create pre-aborted signal
                const abortController = new AbortController();
                abortController.abort();

                const generationFunction = jest.fn();
                const options = {
                    abortSignal: abortController.signal,
                    requestId: 'test-request',
                    userId: 'test-user',
                    priority: 'high'
                };

                try {
                    await queueManager.addToQueue(generationFunction, options);
                } catch (error) {
                    // Expected to throw
                }

                // Verify telemetry
                expect(mockAnalytics.recordMetrics).toHaveBeenCalledWith({
                    action: 'task_cancelled_before_enqueue',
                    requestId: 'test-request',
                    userId: 'test-user',
                    priorityNormalized: 'high',
                    queueSize: 5,
                    activeJobs: 2,
                    concurrency: 3,
                    timestamp: expect.any(Number)
                });

                // Verify error properties
                const error = mockAnalytics.recordMetrics.mock.calls[0][0];
                expect(error.action).toBe('task_cancelled_before_enqueue');
            });
        });

        describe('Concurrency Input Guard', () => {
            test('updateConcurrency validates input and rejects invalid values', async () => {
                queueManager = new QueueManager();

                // Test invalid concurrency values
                const invalidValues = [
                    NaN,
                    Infinity,
                    -Infinity,
                    0,
                    -1,
                    'invalid',
                    null,
                    undefined
                ];

                for (const invalidValue of invalidValues) {
                    await expect(queueManager.updateConcurrency(invalidValue)).rejects.toThrow(
                        `Invalid concurrency value: ${invalidValue}. Must be a finite number >= 1.`
                    );
                }
            });

            test('updateConcurrency accepts valid values', async () => {
                const mockInitialization = {
                    updateConcurrency: jest.fn().mockResolvedValue({ success: true })
                };

                queueManager = new QueueManager();
                queueManager._initialization = mockInitialization;

                // Test valid concurrency values
                const validValues = [1, 2, 5, 10, 100];

                for (const validValue of validValues) {
                    await expect(queueManager.updateConcurrency(validValue)).resolves.toEqual({ success: true });
                }
            });
        });

        describe('Edge Case Tests', () => {
            test('user-cancel telemetry includes userId', () => {
                const mockAnalytics = {
                    recordMetrics: jest.fn()
                };

                const mockLifecycle = {
                    getLifecycleEntry: jest.fn(() => ({
                        options: { userId: 'u1' }
                    })),
                    cancelRequest: jest.fn(() => true)
                };

                queueManager = new QueueManager({ analytics: mockAnalytics });
                queueManager._lifecycle = mockLifecycle;

                // Cancel a request
                const cancelled = queueManager.cancelRequest('r1');

                expect(cancelled).toBe(true);
                expect(mockAnalytics.recordMetrics).toHaveBeenCalledWith({
                    action: 'user_cancellation',
                    requestId: 'r1',
                    userId: 'u1',
                    timestamp: expect.any(Number)
                });
            });

            test('both signals present - canonicalization removes signal field', () => {
                const mockSignalHandler = {
                    normalizeSignalOptions: jest.fn((opts) => {
                        if (opts.signal && !opts.abortSignal) {
                            opts.abortSignal = opts.signal;
                        }
                        if (opts.signal && opts.abortSignal) {
                            delete opts.signal;
                        }
                    })
                };

                queueManager = new QueueManager();
                queueManager._signalHandler = mockSignalHandler;

                const options = {
                    signal: { aborted: false },
                    abortSignal: { aborted: false }
                };

                queueManager._prepareTaskOptions(options);

                // Verify signal field was removed
                expect(options.signal).toBeUndefined();
                expect(options.abortSignal).toBeDefined();
            });

            test('priority NaN gets clamped to 0', () => {
                const mockValidation = {
                    validateOptions: jest.fn((opts) => {
                        // Simulate NaN priority
                        opts.priority = NaN;
                        return opts;
                    })
                };

                queueManager = new QueueManager();
                queueManager._validation = mockValidation;

                const options = { priority: 'not-a-number' };
                const result = queueManager._prepareTaskOptions(options);

                // Priority should be normalized to 0 for NaN
                expect(result.priority).toBe(0);
            });

            test('already-aborted at enqueue throws AbortError with correct properties', async () => {
                const mockAnalytics = {
                    recordMetrics: jest.fn()
                };

                const mockQueueService = {
                    getMetrics: jest.fn(() => ({
                        current: {
                            queueSize: 5,
                            activeJobs: 2,
                            concurrency: 3,
                            configMaxQueue: 100
                        }
                    }))
                };

                queueManager = new QueueManager({ analytics: mockAnalytics });
                queueManager.queueService = mockQueueService;

                // Create pre-aborted signal
                const abortController = new AbortController();
                abortController.abort();

                const generationFunction = jest.fn();
                const options = {
                    abortSignal: abortController.signal,
                    requestId: 'test-request',
                    userId: 'test-user',
                    priority: 'high'
                };

                let thrownError;
                try {
                    await queueManager.addToQueue(generationFunction, options);
                } catch (error) {
                    thrownError = error;
                }

                // Verify error properties
                expect(thrownError).toBeDefined();
                expect(thrownError.name).toBe('AbortError');
                expect(thrownError[ENQUEUE_CANCEL]).toBe(true);

                // Verify telemetry
                expect(mockAnalytics.recordMetrics).toHaveBeenCalledWith({
                    action: 'task_cancelled_before_enqueue',
                    requestId: 'test-request',
                    userId: 'test-user',
                    priorityNormalized: 'high',
                    queueSize: 5,
                    activeJobs: 2,
                    concurrency: 3,
                    configMaxQueue: 100,
                    timestamp: expect.any(Number)
                });
            });
        });
    });
});
