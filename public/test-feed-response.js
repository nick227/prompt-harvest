/**
 * Test Feed Response - Check feed API and image URLs
 */

// Test function to check feed response
async function testFeedResponse() {
    console.log('🧪 Testing Feed Response...');

    try {
        // Test site feed (no auth required)
        console.log('📡 Testing site feed...');
        const siteResponse = await fetch('/api/feed/site');
        console.log('📥 Site Feed Status:', siteResponse.status);

        if (siteResponse.ok) {
            const siteData = await siteResponse.json();
            console.log('📊 Site Feed Response:', siteData);

            if (siteData.images && siteData.images.length > 0) {
                console.log('🖼️ Sample Site Image:', siteData.images[0]);
                console.log('🔗 Sample Image URL:', siteData.images[0].url || siteData.images[0].image || siteData.images[0].imageUrl);

                // Test if the image URL is accessible
                const imageUrl = siteData.images[0].url || siteData.images[0].image || siteData.images[0].imageUrl;
                if (imageUrl) {
                    console.log('🔍 Testing image URL accessibility...');
                    const imageResponse = await fetch(imageUrl);
                    console.log('🖼️ Image Response Status:', imageResponse.status);
                    console.log('🖼️ Image Response Headers:', Object.fromEntries(imageResponse.headers.entries()));
                }
            } else {
                console.log('⚠️ No images in site feed');
            }
        } else {
            console.log('❌ Site feed failed:', siteResponse.status, siteResponse.statusText);
        }

        // Test main feed endpoint
        console.log('\n📡 Testing main feed endpoint...');
        const mainResponse = await fetch('/api/feed');
        console.log('📥 Main Feed Status:', mainResponse.status);

        if (mainResponse.ok) {
            const mainData = await mainResponse.json();
            console.log('📊 Main Feed Response:', mainData);
        } else {
            console.log('❌ Main feed failed:', mainResponse.status, mainResponse.statusText);
        }

        // Test images endpoint (legacy)
        console.log('\n📡 Testing legacy images endpoint...');
        const imagesResponse = await fetch('/api/images');
        console.log('📥 Images Endpoint Status:', imagesResponse.status);

        if (imagesResponse.ok) {
            const imagesData = await imagesResponse.json();
            console.log('📊 Images Endpoint Response:', imagesData);
        } else {
            console.log('❌ Images endpoint failed:', imagesResponse.status, imagesResponse.statusText);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Test function to check current feed DOM
function testFeedDOM() {
    console.log('\n🧪 Testing Feed DOM...');

    const promptOutput = document.querySelector('.prompt-output');
    console.log('📋 Prompt Output Element:', promptOutput);

    if (promptOutput) {
        const images = promptOutput.querySelectorAll('img');
        console.log('🖼️ Found Images:', images.length);

        images.forEach((img, index) => {
            console.log(`🖼️ Image ${index + 1}:`, {
                src: img.src,
                alt: img.alt,
                title: img.title,
                classes: img.className,
                dataset: Object.fromEntries(Object.entries(img.dataset))
            });
        });

        const imageWrappers = promptOutput.querySelectorAll('.image-wrapper');
        console.log('📦 Image Wrappers:', imageWrappers.length);

        const loadingPlaceholders = document.querySelectorAll('.loading-placeholder');
        console.log('⏳ Loading Placeholders:', loadingPlaceholders.length);
    } else {
        console.log('❌ Prompt output element not found');
    }
}

// Test function to check image URL construction
function testImageURLConstruction() {
    console.log('\n🧪 Testing Image URL Construction...');

    // Test different URL formats
    const testCases = [
        { imageUrl: 'uploads/test.jpg', expected: 'uploads/test.jpg' },
        { image: 'uploads/test.jpg', expected: 'uploads/test.jpg' },
        { url: 'uploads/test.jpg', expected: 'uploads/test.jpg' },
        { imageName: 'test.jpg', expected: 'uploads/test.jpg' },
        { imageUrl: 'https://example.com/image.jpg', expected: 'https://example.com/image.jpg' },
        { image: 'https://example.com/image.jpg', expected: 'https://example.com/image.jpg' }
    ];

    testCases.forEach((testCase, index) => {
        const result = testCase.imageUrl || testCase.image || testCase.url || `uploads/${testCase.imageName}`;
        console.log(`🔗 Test ${index + 1}:`, {
            input: testCase,
            result: result,
            matches: result === testCase.expected
        });
    });
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Feed Response Tests...\n');

    await testFeedResponse();
    testFeedDOM();
    testImageURLConstruction();

    console.log('\n✅ All tests completed!');
}

// Export for global access
if (typeof window !== 'undefined') {
    window.testFeedResponse = testFeedResponse;
    window.testFeedDOM = testFeedDOM;
    window.testImageURLConstruction = testImageURLConstruction;
    window.runAllTests = runAllTests;
}

// Auto-run if this script is loaded directly
if (typeof window !== 'undefined' && document.readyState === 'complete') {
    setTimeout(runAllTests, 1000);
}
