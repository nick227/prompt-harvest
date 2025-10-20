/* eslint-disable */
/**
 * Example Usage of the Provider Interface
 *
 * This file demonstrates how to use the new provider interface and factory
 * NOTE: This file is for documentation purposes only and is not used in production
 */

import { createProvider, GrokProvider } from './index.js';

// ============================================================================
// Example 1: Using the Provider Factory
// ============================================================================

async function example1_UsingFactory() {
    console.log('\n=== Example 1: Using Provider Factory ===\n');

    try {
        // Create a Grok provider instance
        const provider = createProvider('grok');

        // Generate an image
        const result = await provider.generateImage(
            'A serene mountain landscape at sunset',
            7.5,
            'grok-2-image',
            'user123',
            {}  // Grok doesn't support size/quality options
        );

        if (result.success) {
            console.log('✅ Image generated successfully');
            console.log('Request ID:', result.meta.requestId);
            console.log('Duration:', result.meta.durationMs, 'ms');
            console.log('Base64 length:', result.data.length);
        } else {
            console.error('❌ Generation failed:', result.error);
            console.error('Error code:', result.errorCode);
            console.error('Retryable:', result.retryable);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// ============================================================================
// Example 2: Direct Provider Instantiation
// ============================================================================

async function example2_DirectInstantiation() {
    console.log('\n=== Example 2: Direct Provider Instantiation ===\n');

    try {
        // Directly instantiate the provider class
        const grokProvider = new GrokProvider();

        // Check availability
        const isAvailable = await grokProvider.testAvailability();

        console.log('Grok API available:', isAvailable);

        if (!isAvailable) {
            console.warn('⚠️ Grok API is not available. Check your GROK_API_KEY.');

            return;
        }

        // Get available models
        const models = await grokProvider.getAvailableModels();

        console.log('Available models:', models);

        // Get provider metadata
        const metadata = grokProvider.getMetadata();

        console.log('Provider metadata:', metadata);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// ============================================================================
// Example 3: Error Handling
// ============================================================================

async function example3_ErrorHandling() {
    console.log('\n=== Example 3: Error Handling ===\n');

    const provider = createProvider('grok');

    // Test with invalid parameters
    const result = await provider.generateImage(
        '', // Empty prompt should trigger validation error
        7.5,
        'grok-2-image'
    );

    if (!result.success) {
        console.log('Error handled properly:');
        console.log('  Error code:', result.errorCode);
        console.log('  Error message:', result.error);
        console.log('  Retryable:', result.retryable);
        console.log('  Details:', result.details);
        console.log('  Metadata:', result.meta);
    }
}

// ============================================================================
// Example 4: Cancellation Support
// ============================================================================

async function example4_Cancellation() {
    console.log('\n=== Example 4: Cancellation Support ===\n');

    const provider = createProvider('grok');
    const abortController = new AbortController();

    // Cancel after 5 seconds
    setTimeout(() => {
        console.log('⏱️  Cancelling request...');
        abortController.abort();
    }, 5000);

    try {
        const result = await provider.generateImage(
            'A complex scene that takes time to generate',
            7.5,
            'grok-2-image',
            'user123',
            {
                signal: abortController.signal
            }
        );

        if (result.success) {
            console.log('✅ Completed before cancellation');
        } else {
            console.log('❌ Request failed or was cancelled:', result.error);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('✅ Request was successfully cancelled');
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

// ============================================================================
// Example 5: Legacy Function-based Usage (Backward Compatibility)
// ============================================================================

async function example5_LegacyUsage() {
    console.log('\n=== Example 5: Legacy Function-based Usage ===\n');

    // Import the legacy function export
    const { generateImage } = await import('./GrokProvider.js');

    const result = await generateImage(
        'A futuristic city',
        7.5,
        'grok-2-image',
        'user123',
        {}
    );

    if (result.success) {
        console.log('✅ Legacy function interface still works');
    } else {
        console.error('❌ Error:', result.error);
    }
}

// ============================================================================
// Run Examples
// ============================================================================

async function runAllExamples() {
    console.log('🚀 Provider Interface Examples\n');
    console.log('These examples demonstrate the new provider interface.');
    console.log('Make sure GROK_API_KEY is set in your environment.\n');

    await example1_UsingFactory();
    await example2_DirectInstantiation();
    await example3_ErrorHandling();
    // await example4_Cancellation(); // Commented out to avoid long-running examples
    await example5_LegacyUsage();

    console.log('\n✅ All examples completed\n');
}

// Uncomment to run examples:
// runAllExamples().catch(console.error);

export {
    example1_UsingFactory,
    example2_DirectInstantiation,
    example3_ErrorHandling,
    example4_Cancellation,
    example5_LegacyUsage
};

