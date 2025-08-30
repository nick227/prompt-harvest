const puppeteer = require('puppeteer');

async function testButtonGeneration() {
    console.log('🧪 Testing button generation functionality...');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();

    try {
        // Navigate to the application
        await page.goto('http://localhost:3200', { waitUntil: 'networkidle2' });

        console.log('✅ Page loaded successfully');

        // Wait for the generation component to initialize
        await page.waitForFunction(() => {
            return window.generationComponent && window.generationComponent.isInitialized;
        }, { timeout: 10000 });

        console.log('✅ Generation component initialized');

        // Check if the generate button exists
        const buttonExists = await page.evaluate(() => {
            const btn = document.querySelector('.btn-generate');
            return {
                exists: !!btn,
                text: btn?.textContent,
                disabled: btn?.disabled,
                className: btn?.className
            };
        });

        console.log('🔍 Button status:', buttonExists);

        if (!buttonExists.exists) {
            console.error('❌ Generate button not found');
            return;
        }

        // Test button click
        console.log('🔧 Testing button click...');

        await page.evaluate(() => {
            const btn = document.querySelector('.btn-generate');
            if (btn) {
                console.log('Clicking button...');
                btn.click();
            }
        });

        // Wait a moment to see if any errors occur
        await page.waitForTimeout(2000);

        // Check for any console errors
        const errors = await page.evaluate(() => {
            return window.testErrors || [];
        });

        if (errors.length > 0) {
            console.error('❌ Errors found:', errors);
        } else {
            console.log('✅ No errors detected');
        }

        // Check if the button is in processing state
        const buttonState = await page.evaluate(() => {
            const btn = document.querySelector('.btn-generate');
            return {
                hasProcessingClass: btn?.classList.contains('processing'),
                disabled: btn?.disabled,
                text: btn?.textContent
            };
        });

        console.log('🔍 Button state after click:', buttonState);

        console.log('✅ Button generation test completed');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

// Run the test
testButtonGeneration().catch(console.error);
