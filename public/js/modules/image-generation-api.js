/**
 * Image Generation API Handler
 * Extracted from images.js - handles API communication for image generation
 */

// PromptHelpersForm is available globally

class ImageGenerationAPI {
    constructor() {
        this.isGenerating = false;
    }

    async generateImage(prompt, providers = [], options = {}) {

        if (this.isGenerating) {
            console.warn('⚠️ Generation already in progress');

            return;
        }

        const promptObj = {
            prompt,
            promptId: Date.now().toString(),
            original: prompt,
            ...options // Include all form data options
        };

        try {
            this.isGenerating = true;
            const resultData = await this.callImageGenerationAPI(prompt, promptObj, providers);


            // Extract the actual image data from the response
            const imageData = resultData.data || resultData;

            // Image data extracted from response

            return imageData;
        } catch (error) {
            // Only log the error here if it's not a 500 server error (will be logged by manager)
            if (error.status !== 500) {
                console.error('❌ API ERROR: Generation failed', error);
            }
            throw error;
        } finally {
            this.isGenerating = false;
        }
    }

    async callImageGenerationAPI(prompt, promptObj, providers) {
        const formData = this.createFormData(prompt, promptObj, providers);
        const jsonData = this.convertFormDataToJSON(formData);


        // Get auth headers for authenticated request
        const authHeaders = this.getAuthHeaders();


        const response = await fetch(API_ENDPOINTS.IMAGE_GENERATE, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(jsonData)
        });


        if (!response.ok) {
            console.error('❌ HTTP ERROR: Bad response', response.status, response.statusText);

            // Try to get error details from response
            let errorData = null;

            try {
                errorData = await response.json();
                console.error('❌ HTTP ERROR: Response data', errorData);
            } catch (e) {
                console.error('❌ HTTP ERROR: Could not parse error response');
            }

            // Create error with status and data for proper handling
            const error = new Error(`HTTP error! status: ${response.status}`);

            error.status = response.status;
            error.data = errorData;
            throw error;
        }

        const responseData = await response.json();

        // Response data received

        return responseData;
    }

    createFormData(prompt, promptObj, providers) {
        // Creating form data for API call
        const formData = new FormData();

        formData.append('prompt', prompt);
        formData.append('providers', providers.join(','));
        formData.append('promptId', promptObj.promptId);
        formData.append('original', prompt);

        this.addGuidanceValues(formData);
        this.addEnhancementParameters(formData, promptObj);

        return formData;
    }

    addEnhancementParameters(formData, promptObj = {}) {

        // Use values from promptObj if available, otherwise fall back to DOM queries
        const autoEnhance = promptObj.autoEnhance || false;
        const mixup = promptObj.mixup || false;
        const mashup = promptObj.mashup || false;
        const promptHelpers = promptObj.promptHelpers || PromptHelpersForm.getFormValues();
        const autoPublic = promptObj.autoPublic || false;
        const multiplier = promptObj.multiplier || '';
        const guidance = promptObj.guidance || 10;

        // Add multiplier if provided
        if (multiplier && multiplier.trim()) {
            formData.append('multiplier', multiplier.trim());
        }

        // Add mixup if enabled
        if (mixup) {
            formData.append('mixup', 'true');
        }

        // Add mashup if enabled
        if (mashup) {
            formData.append('mashup', 'true');
        }

        // Add auto-enhance if enabled
        if (autoEnhance) {
            formData.append('auto-enhance', 'true');
        }

        // Add prompt helpers as JSON object
        if (Object.keys(promptHelpers).length > 0) {
            formData.append('promptHelpers', JSON.stringify(promptHelpers));
        }

        // Add guidance if provided
        if (guidance && guidance !== 10) {
            formData.append('guidance', guidance.toString());
        }

        // Add autoPublic if enabled
        if (autoPublic) {
            formData.append('autoPublic', 'true');
        }
    }

    addGuidanceValues(formData) {
        // Get form values from the unified drawer component
        let drawerValues = {};

        if (window.unifiedDrawerComponent) {
            drawerValues = window.unifiedDrawerComponent.getFormValues('desktop');
        }

        // Use drawer values for guidance if available, otherwise fall back to document query
        if (drawerValues['guidance-top']) {
            formData.append('guidance', drawerValues['guidance-top']);
        } else if (drawerValues['guidance-bottom']) {
            formData.append('guidance', drawerValues['guidance-bottom']);
        } else {
            // Fallback to document query
            const guidanceTop = document.querySelector('select[name="guidance-top"]');
            const guidanceBottom = document.querySelector('select[name="guidance-bottom"]');

            if (guidanceTop && guidanceTop.value) {
                formData.append('guidance', guidanceTop.value);
            }
            if (guidanceBottom && guidanceBottom.value) {
                formData.append('guidance', guidanceBottom.value);
            }
        }
    }

    convertFormDataToJSON(formData) {
        const jsonData = {};

        for (const [key, value] of formData.entries()) {
            // Convert data types to match backend expectations
            switch (key) {
                case 'guidance':
                    jsonData[key] = parseInt(value) || 10;
                    break;
                case 'multiplier':
                    jsonData[key] = value || '';
                    break;
                case 'mixup':
                case 'mashup':
                case 'auto-enhance':
                case 'autoPublic':
                    jsonData[key] = value === 'true' || value === true;
                    break;
                case 'promptHelpers':
                    // Parse promptHelpers JSON object
                    try {
                        jsonData[key] = JSON.parse(value);
                    } catch (error) {
                        console.warn('Failed to parse promptHelpers:', error);
                        jsonData[key] = {};
                    }
                    break;
                case 'providers':
                    // Ensure providers is always an array
                    jsonData[key] = Array.isArray(value) ? value : value.split(',').map(p => p.trim());
                    break;
                default:
                    jsonData[key] = value;
            }
        }

        // FormData converted to JSON

        return jsonData;
    }

    getCustomVariables() {
        const variablesString = localStorage.getItem('variables');

        if (!variablesString) {
            return [];
        }

        const variablesArr = JSON.parse(variablesString);

        return variablesArr.map(variable => {
            const values = variable.values.split(',').map(v => v.trim());
            const randomValue = values[Math.floor(Math.random() * values.length)];

            return { name: variable.name, value: randomValue };
        });
    }

    getAuthHeaders() {
        const headers = { 'Content-Type': 'application/json' };

        // Use existing userApi for authentication if available
        if (window.userApi && window.userApi.isAuthenticated()) {
            const token = window.userApi.getAuthToken();

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    getAuthToken() {
        const localToken = localStorage.getItem('authToken');
        const sessionToken = sessionStorage.getItem('authToken');


        // Check all possible token storage keys
        const allKeys = Object.keys(localStorage);


        return localToken || sessionToken;
    }

}

// Export for global access
window.ImageGenerationAPI = ImageGenerationAPI;


// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageGenerationAPI;
}
