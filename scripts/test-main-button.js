import puppeteer from 'puppeteer';

async function testMainButton() {
    console.log('🧪 Testing main page button...');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();

    try {
        // Listen for console messages
        page.on('console', msg => {
            console.log(`[${msg.type()}] ${msg.text()}`);
        });

        // Listen for page errors
        page.on('pageerror', error => {
            console.log('❌ Page error:', error.message);
        });

        // Navigate to the main page
        await page.goto('http://localhost:3200', { waitUntil: 'networkidle2' });

        console.log('✅ Main page loaded');

        // Wait for the page to fully load
        await page.waitForTimeout(3000);

        // Check if the button exists
        const buttonExists = await page.evaluate(() => {
            const btn = document.querySelector('.btn-generate');
            return {
                exists: !!btn,
                text: btn?.textContent,
                disabled: btn?.disabled,
                className: btn?.className,
                cursor: btn ? window.getComputedStyle(btn).cursor : null
            };
        });

        console.log('🔍 Button status:', buttonExists);

        if (!buttonExists.exists) {
            console.error('❌ Generate button not found on main page');
            return;
        }

        // Check if generation component is available
        const componentStatus = await page.evaluate(() => {
            return {
                componentExists: !!window.generationComponent,
                isInitialized: window.generationComponent?.isInitialized,
                managerExists: !!window.generationComponent?.manager,
                managerInitialized: window.generationComponent?.manager?.isInitialized
            };
        });

        console.log('🔍 Component status:', componentStatus);

        // Test button click
        console.log('🔧 Testing button click...');

        await page.evaluate(() => {
            const btn = document.querySelector('.btn-generate');
            if (btn) {
                console.log('Clicking button...');
                btn.click();
            }
        });

        // Wait a moment to see what happens
        await page.waitForTimeout(2000);

        // Check button state after click
        const buttonStateAfter = await page.evaluate(() => {
            const btn = document.querySelector('.btn-generate');
            return {
                text: btn?.textContent,
                disabled: btn?.disabled,
                className: btn?.className,
                cursor: btn ? window.getComputedStyle(btn).cursor : null,
                hasProcessingClass: btn?.classList.contains('processing')
            };
        });

        console.log('🔍 Button state after click:', buttonStateAfter);

        // Check for any errors in console
        const errors = await page.evaluate(() => {
            return window.testErrors || [];
        });

        if (errors.length > 0) {
            console.error('❌ Errors found:', errors);
        } else {
            console.log('✅ No errors detected');
        }

        console.log('✅ Main button test completed');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

// Run the test
testMainButton().catch(console.error);
