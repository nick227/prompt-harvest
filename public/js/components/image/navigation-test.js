// Navigation System Test
// Simple test to verify unified navigation works correctly

class NavigationTest {
    constructor() {
        this.testResults = [];
    }

    // Test basic navigation functionality
    testNavigation() {
        console.log('🧪 Testing Unified Navigation System...');

        // Test 1: Check if UnifiedNavigation is available
        if (typeof window.UnifiedNavigation === 'undefined') {
            this.addResult('❌ UnifiedNavigation not available', false);
            return false;
        }
        this.addResult('✅ UnifiedNavigation available', true);

        // Test 2: Create navigation instance
        try {
            const navigation = new window.UnifiedNavigation();
            this.addResult('✅ Navigation instance created', true);
        } catch (error) {
            this.addResult('❌ Failed to create navigation instance: ' + error.message, false);
            return false;
        }

        // Test 3: Check if image container exists
        const container = document.querySelector('.prompt-output');
        if (!container) {
            this.addResult('❌ Image container not found', false);
            return false;
        }
        this.addResult('✅ Image container found', true);

        // Test 4: Check if images exist
        const images = container.querySelectorAll('img[data-id], img[data-image-id]');
        if (images.length === 0) {
            this.addResult('⚠️ No images found for testing', true);
        } else {
            this.addResult(`✅ Found ${images.length} images`, true);
        }

        return true;
    }

    // Test circular navigation logic
    testCircularNavigation() {
        console.log('🧪 Testing Circular Navigation Logic...');

        const navigation = new window.UnifiedNavigation();
        const images = navigation.getAllVisibleImageElements();

        if (images.length === 0) {
            this.addResult('⚠️ No images to test circular navigation', true);
            return true;
        }

        // Test navigation from first to last image
        navigation.currentImageElement = images[0];
        const nextFromFirst = navigation.getNextImageElement();
        const prevFromFirst = navigation.getPreviousImageElement();

        if (nextFromFirst === images[1]) {
            this.addResult('✅ Next navigation from first image works', true);
        } else {
            this.addResult('❌ Next navigation from first image failed', false);
        }

        if (prevFromFirst === images[images.length - 1]) {
            this.addResult('✅ Previous navigation from first image (circular) works', true);
        } else {
            this.addResult('❌ Previous navigation from first image (circular) failed', false);
        }

        // Test navigation from last to first image
        navigation.currentImageElement = images[images.length - 1];
        const nextFromLast = navigation.getNextImageElement();

        if (nextFromLast === images[0]) {
            this.addResult('✅ Next navigation from last image (circular) works', true);
        } else {
            this.addResult('❌ Next navigation from last image (circular) failed', false);
        }

        return true;
    }

    // Add test result
    addResult(message, success) {
        this.testResults.push({ message, success });
        console.log(message);
    }

    // Run all tests
    runAllTests() {
        console.log('🚀 Starting Navigation System Tests...');

        this.testNavigation();
        this.testCircularNavigation();

        const passed = this.testResults.filter(r => r.success).length;
        const total = this.testResults.length;

        console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);

        if (passed === total) {
            console.log('🎉 All navigation tests passed!');
        } else {
            console.log('⚠️ Some navigation tests failed');
        }

        return passed === total;
    }
}

// Export for global access
window.NavigationTest = NavigationTest;

// Auto-run tests when page loads (for development)
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            const tester = new NavigationTest();
            tester.runAllTests();
        }, 1000);
    });
}
