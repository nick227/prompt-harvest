/**
 * Unit tests for RateLimiter
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RateLimiter } from '../RateLimiter.js';

describe('RateLimiter', () => {
    let limiter;

    beforeEach(() => {
        limiter = new RateLimiter({
            windowMs: 1000,
            maxRequests: 3,
            cleanupThreshold: 5
        });
    });

    describe('Basic Rate Limiting', () => {
        it('should allow requests under limit', () => {
            expect(limiter.isRateLimited('user1')).toBe(false);
            expect(limiter.isRateLimited('user1')).toBe(false);
            expect(limiter.isRateLimited('user1')).toBe(false);
        });

        it('should block requests over limit', () => {
            limiter.isRateLimited('user1'); // 1
            limiter.isRateLimited('user1'); // 2
            limiter.isRateLimited('user1'); // 3
            expect(limiter.isRateLimited('user1')).toBe(true); // 4 - blocked!
        });

        it('should track different users separately', () => {
            limiter.isRateLimited('user1'); // 1
            limiter.isRateLimited('user1'); // 2
            limiter.isRateLimited('user1'); // 3

            // user1 is at limit, but user2 is fresh
            expect(limiter.isRateLimited('user1')).toBe(true);
            expect(limiter.isRateLimited('user2')).toBe(false);
        });

        it('should treat anonymous users as separate key', () => {
            limiter.isRateLimited(null);
            limiter.isRateLimited(null);
            limiter.isRateLimited(null);

            expect(limiter.isRateLimited(null)).toBe(true);
            expect(limiter.isRateLimited('user1')).toBe(false);
        });
    });

    describe('Time Window', () => {
        it('should allow requests after window expires', async () => {
            // Use fake timers for this test
            jest.useFakeTimers();

            limiter.isRateLimited('user1'); // 1
            limiter.isRateLimited('user1'); // 2
            limiter.isRateLimited('user1'); // 3
            expect(limiter.isRateLimited('user1')).toBe(true); // blocked

            // Advance time beyond window
            jest.advanceTimersByTime(1100);

            // Should allow again
            expect(limiter.isRateLimited('user1')).toBe(false);

            jest.useRealTimers();
        });
    });

    describe('Cleanup', () => {
        it('should periodically clean up stale entries', () => {
            // Make requests to trigger cleanup
            for (let i = 0; i < 10; i++) {
                limiter.isRateLimited(`user${i}`);
            }

            expect(limiter.cleanupCounter).toBeLessThan(limiter.cleanupThreshold);
        });

        it('should remove empty entries', () => {
            jest.useFakeTimers();

            limiter.isRateLimited('user1');

            // Advance time to expire the entry
            jest.advanceTimersByTime(2000);

            // Trigger cleanup
            limiter.cleanup(Date.now());

            expect(limiter.rateLimitMap.has('user1')).toBe(false);

            jest.useRealTimers();
        });
    });

    describe('Helper Methods', () => {
        it('should reset specific user', () => {
            limiter.isRateLimited('user1');
            limiter.isRateLimited('user1');
            limiter.isRateLimited('user1');
            expect(limiter.isRateLimited('user1')).toBe(true);

            limiter.reset('user1');

            expect(limiter.isRateLimited('user1')).toBe(false);
        });

        it('should reset all users', () => {
            limiter.isRateLimited('user1');
            limiter.isRateLimited('user2');

            limiter.resetAll();

            expect(limiter.rateLimitMap.size).toBe(0);
            expect(limiter.cleanupCounter).toBe(0);
        });

        it('should get request count', () => {
            limiter.isRateLimited('user1');
            limiter.isRateLimited('user1');

            expect(limiter.getRequestCount('user1')).toBe(2);
        });

        it('should return 0 count for unknown user', () => {
            expect(limiter.getRequestCount('unknown')).toBe(0);
        });
    });

    describe('Configuration', () => {
        it('should use default config if not provided', () => {
            const defaultLimiter = new RateLimiter();

            expect(defaultLimiter.windowMs).toBe(60000);
            expect(defaultLimiter.maxRequests).toBe(10);
            expect(defaultLimiter.cleanupThreshold).toBe(100);
        });

        it('should use custom config', () => {
            const customLimiter = new RateLimiter({
                windowMs: 5000,
                maxRequests: 20,
                cleanupThreshold: 50
            });

            expect(customLimiter.windowMs).toBe(5000);
            expect(customLimiter.maxRequests).toBe(20);
            expect(customLimiter.cleanupThreshold).toBe(50);
        });
    });
});

