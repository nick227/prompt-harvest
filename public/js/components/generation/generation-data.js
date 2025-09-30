
// Generation Data Layer - Data validation, transformation, and management for image generation

// PromptHelpersForm is available globally
class GenerationData {
    constructor() {
        this.validationRules = {
            maxPromptLength: 1000,
            minPromptLength: 1,
            maxAutoGeneration: 10,
            minAutoGeneration: 1,
            defaultGuidance: 10,
            maxGuidance: 20,
            minGuidance: 1
        };
    }

    // Data Validation Methods
    validatePrompt(promptObj) {
        const errors = [];

        if (!promptObj.prompt || promptObj.prompt.trim().length === 0) {
            errors.push('Prompt is required');
        }

        if (promptObj.prompt && promptObj.prompt.length > this.validationRules.maxPromptLength) {
            errors.push(`Prompt exceeds maximum length of ${this.validationRules.maxPromptLength} characters`);
        }

        if (promptObj.prompt && promptObj.prompt.trim().length < this.validationRules.minPromptLength) {
            errors.push(`Prompt must be at least ${this.validationRules.minPromptLength} character`);
        }

        if (!promptObj.providers || promptObj.providers.length === 0) {
            errors.push('At least one provider must be selected');
        }

        if (promptObj.guidance &&
            (promptObj.guidance < this.validationRules.minGuidance ||
             promptObj.guidance > this.validationRules.maxGuidance)) {
            const { minGuidance, maxGuidance } = this.validationRules;

            errors.push(`Guidance must be between ${minGuidance} and ${maxGuidance}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    validateAutoGenerationSettings(maxNum) {
        const errors = [];

        if (maxNum < this.validationRules.minAutoGeneration) {
            errors.push(`Auto-generation must be at least ${this.validationRules.minAutoGeneration}`);
        }

        if (maxNum > this.validationRules.maxAutoGeneration) {
            errors.push(`Auto-generation cannot exceed ${this.validationRules.maxAutoGeneration}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    validateGuidanceValues(top, bottom) {
        const errors = [];

        if (top && (top < this.validationRules.minGuidance ||
                   top > this.validationRules.maxGuidance)) {
            const { minGuidance, maxGuidance } = this.validationRules;

            errors.push(`Top guidance must be between ${minGuidance} and ${maxGuidance}`);
        }

        if (bottom && (bottom < this.validationRules.minGuidance ||
                      bottom > this.validationRules.maxGuidance)) {
            const { minGuidance, maxGuidance } = this.validationRules;

            errors.push(`Bottom guidance must be between ${minGuidance} and ${maxGuidance}`);
        }

        if (top && bottom && top < bottom) {
            errors.push('Top guidance must be greater than or equal to bottom guidance');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Data Transformation Methods
    normalizePromptData(rawData) {
        if (!rawData) {
            return null;
        }

        return {
            prompt: rawData.prompt?.trim() || '',
            providers: Array.isArray(rawData.providers) ? rawData.providers : [],
            guidance: parseInt(rawData.guidance) || this.validationRules.defaultGuidance,
            multiplier: rawData.multiplier || '',
            mixup: !!rawData.mixup,
            mashup: !!rawData.mashup,
            autoEnhance: !!rawData.autoEnhance,
            promptHelpers: rawData.promptHelpers || {},
            autoPublic: !!rawData.autoPublic,
            promptId: rawData.promptId || this.generatePromptId(),
            original: rawData.original?.trim() || rawData.prompt?.trim() || ''
        };
    }

    calculateGuidance(topValue, bottomValue) {
        // Handle empty values
        const top = topValue ? parseInt(topValue) : this.validationRules.defaultGuidance;
        const bottom = bottomValue ? parseInt(bottomValue) : this.validationRules.defaultGuidance;

        // Ensure we have valid numbers and top >= bottom
        const max = Math.max(top, bottom);
        const min = Math.min(top, bottom);

        // Generate random guidance value within the range
        const guidance = Math.abs(Math.floor(Math.random() * (max - min)) + min);

        return {
            guidance,
            top,
            bottom,
            max,
            min
        };
    }

    extractFormData() {
        const promptInput = document.querySelector('#prompt-textarea');
        const guidanceElmTop = document.querySelector('select[name="guidance-top"]');
        const guidanceElmBottom = document.querySelector('select[name="guidance-bottom"]');
        const checkedProviders = Array.from(document.querySelectorAll('input[name="providers"]:checked')).map(input => input.value);
        const multiplierInput = document.querySelector('#multiplier');
        const mixupCheckbox = document.querySelector('input[name="mixup"]');
        const mashupCheckbox = document.querySelector('input[name="mashup"]');
        const autoEnhanceCheckbox = document.querySelector('input[name="auto-enhance"]');
        const autoPublicCheckbox = document.querySelector('input[name="autoPublic"]');

        // Get prompt helpers using centralized system
        const promptHelpers = PromptHelpersForm.getFormValues();

        // Debug autoPublic checkbox
        console.log('🔍 FORM DEBUG: autoPublic checkbox found:', !!autoPublicCheckbox);
        if (autoPublicCheckbox) {
            console.log('🔍 FORM DEBUG: autoPublic checkbox checked:', autoPublicCheckbox.checked);
            console.log('🔍 FORM DEBUG: autoPublic checkbox value:', autoPublicCheckbox.value);
        } else {
            console.log('🔍 FORM DEBUG: autoPublic checkbox not found in DOM');
            // Try to find all checkboxes to debug
            const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');

            console.log('🔍 FORM DEBUG: All checkboxes found:', Array.from(allCheckboxes).map(cb => ({ name: cb.name, checked: cb.checked })));

            // Try to access from localStorage as fallback
            const persistedAutoPublic = localStorage.getItem('autoPublic');

            console.log('🔍 FORM DEBUG: Persisted autoPublic value:', persistedAutoPublic);
        }

        // Calculate guidance
        const guidanceData = this.calculateGuidance(guidanceElmTop?.value, guidanceElmBottom?.value);
        const rawData = {
            prompt: promptInput ? promptInput.value.trim() : '',
            providers: checkedProviders,
            guidance: guidanceData.guidance,
            multiplier: multiplierInput ? multiplierInput.value.trim() : '',
            mixup: mixupCheckbox ? mixupCheckbox.checked : false,
            mashup: mashupCheckbox ? mashupCheckbox.checked : false,
            autoEnhance: autoEnhanceCheckbox ? autoEnhanceCheckbox.checked : false,
            promptHelpers,
            autoPublic: autoPublicCheckbox ? autoPublicCheckbox.checked : (localStorage.getItem('autoPublic') === 'true'),
            original: promptInput ? promptInput.value.trim() : ''
        };

        const normalizedData = this.normalizePromptData(rawData);

        // Debug final autoPublic value
        console.log('🔍 FORM DEBUG: Final autoPublic value:', normalizedData.autoPublic);
        console.log('🔍 FORM DEBUG: Full normalized data:', normalizedData);

        return normalizedData;
    }

    extractAutoGenerationSettings() {
        const _autoGenerateCheckbox = document.querySelector('input[name="auto-generate"]');
        const maxNumInput = document.querySelector('input[name="maxNum"]');

        const isEnabled = _autoGenerateCheckbox ? _autoGenerateCheckbox.checked : false;
        const maxValue = maxNumInput ? parseInt(maxNumInput.value) : 1;
        const maxNum = Math.max(this.validationRules.minAutoGeneration,
            Math.min(this.validationRules.maxAutoGeneration, maxValue || 1));

        return {
            isEnabled,
            maxNum,
            currentValue: maxValue
        };
    }

    // Utility Methods
    generatePromptId() {
        return `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    sanitizePrompt(prompt) {
        if (!prompt) {
            return '';
        }

        // Remove excessive whitespace
        return prompt.trim().replace(/\s+/g, ' ');
    }

    // Data Export/Import Methods
    exportGenerationSettings() {
        return {
            validationRules: this.validationRules,
            timestamp: Date.now()
        };
    }

    importGenerationSettings(settings) {
        if (settings && settings.validationRules) {
            this.validationRules = { ...this.validationRules, ...settings.validationRules };

            return true;
        }

        return false;
    }

    // Statistics Methods
    getGenerationStats() {
        // This could track generation statistics over time
        return {
            totalGenerations: 0,
            successfulGenerations: 0,
            failedGenerations: 0,
            averageGenerationTime: 0,
            mostUsedProviders: [],
            mostUsedPrompts: []
        };
    }

    // Configuration Methods
    updateValidationRules(newRules) {
        this.validationRules = { ...this.validationRules, ...newRules };
    }

    getValidationRules() {
        return { ...this.validationRules };
    }

    // Provider Management
    validateProviders(_providers) {
        if (!Array.isArray(_providers)) {
            return { isValid: false, errors: ['Providers must be an array'] };
        }

        if (_providers.length === 0) {
            return { isValid: false, errors: ['At least one provider must be selected'] };
        }

        // Could add provider-specific validation here
        const validProviders = _providers.filter(provider => provider && typeof provider === 'string');

        if (validProviders.length !== _providers.length) {
            return { isValid: false, errors: ['Invalid provider format'] };
        }

        return { isValid: true, errors: [] };
    }

    // Prompt Analysis
    analyzePrompt(prompt) {
        if (!prompt) {
            return null;
        }

        return {
            length: prompt.length,
            wordCount: prompt.split(/\s+/).length,
            hasSpecialCharacters: (/[^a-zA-Z0-9\s]/).test(prompt),
            hasNumbers: (/\d/).test(prompt),
            estimatedTokens: Math.ceil(prompt.length / 4), // Rough estimate
            complexity: this.calculateComplexity(prompt)
        };
    }

    calculateComplexity(prompt) {
        if (!prompt) {
            return 'low';
        }

        const wordCount = prompt.split(/\s+/).length;
        const specialCharCount = (prompt.match(/[^a-zA-Z0-9\s]/g) || []).length;
        const numberCount = (prompt.match(/\d/g) || []).length;
        const complexityScore = wordCount + specialCharCount + numberCount;

        if (complexityScore < 10) {
            return 'low';
        }
        if (complexityScore < 20) {
            return 'medium';
        }

        return 'high';
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.GenerationData = GenerationData;
}
