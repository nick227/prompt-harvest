import puppeteer from 'puppeteer';

async function testRecursionFix() {
    console.log('🧪 Testing recursion fix...');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null
    });

    const page = await browser.newPage();

    try {
        // Listen for console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('❌ Console error:', msg.text());
            }
        });

        // Listen for page errors
        page.on('pageerror', error => {
            console.log('❌ Page error:', error.message);
        });

        // Navigate to the application
        await page.goto('http://localhost:3200', { waitUntil: 'networkidle2' });

        console.log('✅ Page loaded successfully');

        // Wait a moment for initialization
        await page.waitForTimeout(3000);

        // Check if the generation component initialized without recursion
        const componentStatus = await page.evaluate(() => {
            return {
                componentExists: !!window.generationComponent,
                isInitialized: window.generationComponent?.isInitialized,
                managerExists: !!window.generationComponent?.manager,
                managerInitialized: window.generationComponent?.manager?.isInitialized
            };
        });

        console.log('🔍 Component status:', componentStatus);

        if (componentStatus.componentExists && componentStatus.isInitialized) {
            console.log('✅ Generation component initialized successfully without recursion');
        } else {
            console.error('❌ Generation component failed to initialize properly');
        }

        // Test the button functionality
        const buttonTest = await page.evaluate(() => {
            const btn = document.querySelector('.btn-generate');
            return {
                buttonExists: !!btn,
                text: btn?.textContent,
                disabled: btn?.disabled
            };
        });

        console.log('🔍 Button test:', buttonTest);

        if (buttonTest.buttonExists) {
            console.log('✅ Generate button found and accessible');
        } else {
            console.error('❌ Generate button not found');
        }

        console.log('✅ Recursion fix test completed successfully');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

// Run the test
testRecursionFix().catch(console.error);
