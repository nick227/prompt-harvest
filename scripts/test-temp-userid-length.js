#!/usr/bin/env node

/**
 * Test Temporary User ID Length
 *
 * This script tests the actual length of temporary user IDs
 */

console.log('🔍 TESTING TEMPORARY USER ID LENGTH');
console.log('==========================================');

// Test the current pattern
function generateAnonymousUserId() {
    return `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Test multiple generations
console.log('Testing anonymous user ID generation:');
for (let i = 0; i < 5; i++) {
    const id = generateAnonymousUserId();
    console.log(`  ${i + 1}. Length: ${id.length}, ID: ${id}`);
}

console.log('');
console.log('Testing edge cases:');

// Test with very long timestamp (future dates)
const futureTimestamp = Date.now() + (365 * 24 * 60 * 60 * 1000); // 1 year from now
const futureId = `anonymous_${futureTimestamp}_${Math.random().toString(36).substr(2, 9)}`;
console.log(`  Future timestamp: Length: ${futureId.length}, ID: ${futureId}`);

// Test with maximum random string
const maxRandomId = `anonymous_${Date.now()}_${'z'.repeat(9)}`;
console.log(`  Max random: Length: ${maxRandomId.length}, ID: ${maxRandomId}`);

console.log('');
console.log('Database column constraints:');
console.log('  - prompts.userId: VARCHAR(50)');
console.log('  - Current max length observed:', Math.max(
    generateAnonymousUserId().length,
    generateAnonymousUserId().length,
    generateAnonymousUserId().length,
    generateAnonymousUserId().length,
    generateAnonymousUserId().length
));

console.log('');
console.log('Recommendations:');
console.log('  - If length > 50: Increase column size or use shorter pattern');
console.log('  - If length <= 50: Check for other temporary ID patterns');

console.log('==========================================');
console.log('✅ TEMPORARY USER ID LENGTH TEST COMPLETED');
console.log('==========================================');
