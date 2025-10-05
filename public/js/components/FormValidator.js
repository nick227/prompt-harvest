/**
 * FormValidator - Handles form validation logic
 * Single Responsibility: Form validation and user feedback
 */

class FormValidator {
    constructor(formId) {
        this.form = document.getElementById(formId);
        this.validators = new Map();
        this.callbacks = new Map();
        this.isValid = false;

        this.init();
    }

    init() {
        if (!this.form) {
            console.error('FormValidator: Form not found');
            return;
        }

        this.setupValidation();
    }

    setupValidation() {
        // Debounced validation to prevent excessive calls
        const debouncedValidation = PerformanceUtils.debounce((e) => {
            this.validateField(e.target);
            this.updateFormState();
        }, 300);

        // Add real-time validation to form inputs
        this.form.addEventListener('input', debouncedValidation);

        // Initial validation
        this.updateFormState();
    }

    addValidator(fieldName, validator, callback) {
        this.validators.set(fieldName, validator);
        this.callbacks.set(fieldName, callback);
    }

    validateField(field) {
        const fieldName = field.name;
        const validator = this.validators.get(fieldName);
        const callback = this.callbacks.get(fieldName);

        if (validator && callback) {
            const isValid = validator(field.value);
            callback(isValid, field);
        }
    }

    updateFormState() {
        const allValid = Array.from(this.validators.entries()).every(([fieldName, validator]) => {
            const field = this.form.querySelector(`[name="${fieldName}"]`);
            return field ? validator(field.value) : false;
        });

        this.isValid = allValid;
        this.notifyStateChange(allValid);
    }

    notifyStateChange(isValid) {
        // Dispatch custom event for form state changes
        this.form.dispatchEvent(new CustomEvent('formStateChange', {
            detail: { isValid }
        }));
    }

    validate() {
        this.updateFormState();
        return this.isValid;
    }

    getFieldValue(fieldName) {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        return field ? field.value.trim() : '';
    }

    clearValidation() {
        this.validators.clear();
        this.callbacks.clear();
    }
}

// Export for use in other modules
window.FormValidator = FormValidator;
