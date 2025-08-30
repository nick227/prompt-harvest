import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { calculateCost, calculateBatchCost, calculateUserCosts, formatCost, getCostSummary } from '../src/config/costMatrix.js';
import { TransactionService } from '../src/services/TransactionService.js';

describe('Transaction Accounting', () => {
    let transactionService;

    beforeEach(() => {
        transactionService = new TransactionService();
    });

    afterEach(async () => {
        // Clean up any test data if needed
    });

    describe('Cost Matrix', () => {
        it('should calculate correct cost for individual providers', () => {
            expect(calculateCost('dalle')).toBe(0.02);
            expect(calculateCost('flux')).toBe(0.015);
            expect(calculateCost('dreamshaper')).toBe(0.005);
            expect(calculateCost('tshirt')).toBe(0.003);
        });

        it('should return default cost for unknown providers', () => {
            expect(calculateCost('unknown_provider')).toBe(0.005);
        });

        it('should calculate batch costs correctly', () => {
            const providers = ['dalle', 'flux', 'dreamshaper'];
            const expectedCost = 0.02 + 0.015 + 0.005; // 0.04
            expect(calculateBatchCost(providers)).toBe(expectedCost);
        });

        it('should handle empty provider arrays', () => {
            expect(calculateBatchCost([])).toBe(0);
            expect(calculateBatchCost(null)).toBe(0);
            expect(calculateBatchCost(undefined)).toBe(0);
        });
    });

    describe('User Cost Calculation', () => {
        it('should calculate user costs from image data', () => {
            const mockImages = [
                { provider: 'dalle', createdAt: new Date('2024-01-01') },
                { provider: 'flux', createdAt: new Date('2024-01-02') },
                { provider: 'dreamshaper', createdAt: new Date('2024-01-03') }
            ];

            const result = calculateUserCosts(mockImages);
            
            expect(result.generationCount).toBe(3);
            expect(result.totalCost).toBe(0.02 + 0.015 + 0.005); // 0.04
            expect(result.providerBreakdown.dalle).toBe(0.02);
            expect(result.providerBreakdown.flux).toBe(0.015);
            expect(result.providerBreakdown.dreamshaper).toBe(0.005);
        });

        it('should filter by date range', () => {
            const mockImages = [
                { provider: 'dalle', createdAt: new Date('2024-01-01') },
                { provider: 'flux', createdAt: new Date('2024-01-15') },
                { provider: 'dreamshaper', createdAt: new Date('2024-02-01') }
            ];

            const startDate = new Date('2024-01-10');
            const endDate = new Date('2024-01-20');

            const result = calculateUserCosts(mockImages, startDate, endDate);
            
            expect(result.generationCount).toBe(1);
            expect(result.totalCost).toBe(0.015); // Only flux
            expect(result.providerBreakdown.flux).toBe(0.015);
        });
    });

    describe('TransactionService', () => {
        it('should estimate generation cost correctly', async () => {
            const providers = ['dalle', 'flux'];
            const result = await transactionService.estimateGenerationCost(providers);
            
            expect(result.providers).toEqual(providers);
            expect(result.estimatedCost).toBe(0.02 + 0.015); // 0.035
            expect(result.costBreakdown).toHaveLength(2);
            expect(result.costBreakdown[0].provider).toBe('dalle');
            expect(result.costBreakdown[0].cost).toBe(0.02);
            expect(result.costBreakdown[1].provider).toBe('flux');
            expect(result.costBreakdown[1].cost).toBe(0.015);
        });

        it('should handle empty provider arrays in cost estimation', async () => {
            const result = await transactionService.estimateGenerationCost([]);
            
            expect(result.estimatedCost).toBe(0);
            expect(result.costBreakdown).toHaveLength(0);
        });
    });

    describe('Cost Matrix Coverage', () => {
        it('should have costs defined for all known providers', () => {
            const knownProviders = [
                'flux', 'dalle', 'juggernaut', 'juggernautReborn', 'redshift',
                'absolute', 'realisticvision', 'icbinp', 'icbinp_seco', 'hasdx',
                'dreamshaper', 'nightmareshaper', 'openjourney', 'analogmadness',
                'portraitplus', 'tshirt', 'abyssorange', 'cyber', 'disco',
                'synthwave', 'lowpoly', 'bluepencil', 'ink'
            ];

            knownProviders.forEach(provider => {
                const cost = calculateCost(provider);
                expect(cost).toBeGreaterThan(0);
                expect(typeof cost).toBe('number');
            });
        });
    });

    describe('Cost Formatting', () => {
        it('should format costs correctly', () => {
            expect(formatCost(0.02)).toBe('$0.020');
            expect(formatCost(0.015)).toBe('$0.015');
            expect(formatCost(0.005)).toBe('$0.005');
        });

        it('should handle cost summary correctly', () => {
            const providers = ['dalle', 'flux'];
            const summary = getCostSummary(providers);
            
            expect(summary.totalCost).toBe(0.035);
            expect(summary.formattedCost).toBe('$0.035');
            expect(summary.providerCount).toBe(2);
            expect(summary.breakdown).toHaveLength(2);
        });
    });

    describe('Edge Cases', () => {
        it('should handle null and undefined providers', () => {
            expect(calculateBatchCost(null)).toBe(0);
            expect(calculateBatchCost(undefined)).toBe(0);
            expect(calculateBatchCost([])).toBe(0);
        });

        it('should handle invalid provider names', () => {
            expect(calculateCost('invalid_provider')).toBe(0.005); // Default cost
            expect(calculateCost('')).toBe(0.005);
            expect(calculateCost(null)).toBe(0.005);
        });

        it('should handle date filtering edge cases', () => {
            const mockImages = [
                { provider: 'dalle', createdAt: new Date('2024-01-01') },
                { provider: 'flux', createdAt: new Date('2024-01-15') }
            ];

            // Test with invalid dates
            const result1 = calculateUserCosts(mockImages, 'invalid-date');
            expect(result1.generationCount).toBe(0);

            // Test with future end date
            const result2 = calculateUserCosts(mockImages, null, new Date('2025-01-01'));
            expect(result2.generationCount).toBe(2);
        });
    });
});
