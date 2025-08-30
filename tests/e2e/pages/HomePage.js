import { BasePage } from './BasePage.js';

export class HomePage extends BasePage {
    constructor(page) {
        super(page);
        
        // Selectors
        this.selectors = {
            promptInput: '#prompt-input',
            generateButton: '#generate-button',
            providerSelect: '#provider-select',
            guidanceInput: '#guidance-input',
            imageGrid: '.image-grid',
            imageCard: '.image-card',
            fullscreenButton: '.fullscreen-button',
            likeButton: '.like-button',
            ratingInput: '.rating-input',
            tagInput: '.tag-input',
            addTagButton: '.add-tag-button',
            searchInput: '#search-input',
            filterDropdown: '#filter-dropdown',
            paginationNext: '.pagination-next',
            paginationPrev: '.pagination-prev',
            loadingSpinner: '.loading-spinner',
            errorMessage: '.error-message',
            successMessage: '.success-message'
        };
    }

    async navigateToHome() {
        await this.goto('/');
    }

    async enterPrompt(prompt) {
        await this.fill(this.selectors.promptInput, prompt);
    }

    async selectProvider(provider) {
        await this.click(this.selectors.providerSelect);
        await this.click(`option[value="${provider}"]`);
    }

    async setGuidance(guidance) {
        await this.fill(this.selectors.guidanceInput, guidance.toString());
    }

    async generateImage() {
        await this.click(this.selectors.generateButton);
    }

    async waitForImageGeneration() {
        await this.waitForResponse('/image/generate');
        await this.waitForElement(this.selectors.imageCard, 30000);
    }

    async getImageCount() {
        const images = await this.page.$$(this.selectors.imageCard);
        return images.length;
    }

    async likeImage(imageIndex = 0) {
        const likeButtons = await this.page.$$(this.selectors.likeButton);
        if (likeButtons[imageIndex]) {
            await likeButtons[imageIndex].click();
        }
    }

    async rateImage(rating, imageIndex = 0) {
        const ratingInputs = await this.page.$$(this.selectors.ratingInput);
        if (ratingInputs[imageIndex]) {
            await ratingInputs[imageIndex].fill(rating.toString());
        }
    }

    async addTag(tag, imageIndex = 0) {
        const tagInputs = await this.page.$$(this.selectors.tagInput);
        const addButtons = await this.page.$$(this.selectors.addTagButton);
        
        if (tagInputs[imageIndex] && addButtons[imageIndex]) {
            await tagInputs[imageIndex].fill(tag);
            await addButtons[imageIndex].click();
        }
    }

    async searchImages(searchTerm) {
        await this.fill(this.selectors.searchInput, searchTerm);
        await this.page.keyboard.press('Enter');
    }

    async openFullscreen(imageIndex = 0) {
        const fullscreenButtons = await this.page.$$(this.selectors.fullscreenButton);
        if (fullscreenButtons[imageIndex]) {
            await fullscreenButtons[imageIndex].click();
        }
    }

    async isImageGenerated() {
        return await this.isVisible(this.selectors.imageCard);
    }

    async isErrorVisible() {
        return await this.isVisible(this.selectors.errorMessage);
    }

    async isSuccessVisible() {
        return await this.isVisible(this.selectors.successMessage);
    }

    async getErrorMessage() {
        return await this.getText(this.selectors.errorMessage);
    }

    async getSuccessMessage() {
        return await this.getText(this.selectors.successMessage);
    }
}
