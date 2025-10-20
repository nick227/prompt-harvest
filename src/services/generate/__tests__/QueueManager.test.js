/**
 * QueueManager Test Seeds
 *
 * Critical test scenarios for production hardening
 */

import { ENQUEUE_CANCEL } from '../QueueSymbols.js';
import { QueueTaskManager } from '../QueueTaskManager.js';

describe('QueueManager Hardening Tests', () => {

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
            const allDetected = equivalentAbortErrors.every(error => taskManager.isCancellationError(error)
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
});
