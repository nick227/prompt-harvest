export class BasePage {
    constructor(page) {
        this.page = page;
    }

    async goto(path) {
        await this.page.goto(path);
        await this.page.waitForLoadState('networkidle');
    }

    async waitForElement(selector, timeout = 5000) {
        await this.page.waitForSelector(selector, { timeout });
    }

    async click(selector) {
        await this.waitForElement(selector);
        await this.page.click(selector);
    }

    async fill(selector, text) {
        await this.waitForElement(selector);
        await this.page.fill(selector, text);
    }

    async type(selector, text) {
        await this.waitForElement(selector);
        await this.page.type(selector, text);
    }

    async getText(selector) {
        await this.waitForElement(selector);
        return await this.page.textContent(selector);
    }

    async isVisible(selector) {
        try {
            await this.waitForElement(selector, 2000);
            return await this.page.isVisible(selector);
        } catch {
            return false;
        }
    }

    async waitForResponse(urlPattern) {
        return await this.page.waitForResponse(response => 
            response.url().includes(urlPattern)
        );
    }

    async takeScreenshot(name) {
        await this.page.screenshot({ path: `tests/e2e/screenshots/${name}.png` });
    }
}
