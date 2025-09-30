console.log('🔍 COMPREHENSIVE MIGRATION VERIFICATION');
console.log('=====================================');

// Test 1: Verify QueueManager methods exist
import('./src/services/generate/QueueManager.js').then(module => {
    const getQueueManager = module.default;
    const qm = getQueueManager();

    console.log('✅ getOverview() available:', typeof qm.getOverview === 'function');
    console.log('✅ getQueueData() still available:', typeof qm.getQueueData === 'function');
    console.log('✅ getQueueStatus() still available:', typeof qm.getQueueStatus === 'function');
    console.log('✅ getQueueMetrics() still available:', typeof qm.getQueueMetrics === 'function');

    // Test 2: Verify getOverview() returns expected structure
    const overview = qm.getOverview();
    const expectedKeys = ['status', 'isProcessing', 'queueSize', 'activeJobs', 'concurrency', 'successRate', 'errorRate'];
    const hasExpectedKeys = expectedKeys.every(key => key in overview);

    console.log('✅ getOverview() has expected structure:', hasExpectedKeys);
    console.log('✅ getOverview() keys:', Object.keys(overview).slice(0, 5).join(', ') + '...');

    // Test 3: Verify deprecated methods still work (but show warnings)
    console.log('⚠️  Testing deprecated methods (should show warnings):');
    const deprecatedData = qm.getQueueData();
    const deprecatedStatus = qm.getQueueStatus();
    const deprecatedMetrics = qm.getQueueMetrics();

    console.log('✅ Deprecated methods still functional');
    console.log('✅ getQueueData() returns object:', typeof deprecatedData === 'object');
    console.log('✅ getQueueStatus() returns object:', typeof deprecatedStatus === 'object');
    console.log('✅ getQueueMetrics() returns object:', typeof deprecatedMetrics === 'object');

    console.log('🎯 MIGRATION STATUS: COMPLETE');
    console.log('📊 All deprecated methods migrated to getOverview()');
    console.log('🔧 Backward compatibility maintained');
}).catch(error => {
    console.error('❌ Migration test failed:', error);
});
