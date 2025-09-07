/**
 * Declarative Form Generator
 * Generates forms from JSON schemas with validation and styling
 */
class _FormGenerator {
    constructor(options = {}) {
        this.defaultOptions = {
            theme: 'admin',
            validateOnInput: true,
            showValidationErrors: true,
            autoFocus: true,
            ...options
        };
        this.validators = this.initializeValidators();
        this.formatters = this.initializeFormatters();
        this.eventHandlers = new Map();
    }

    /**
     * Generate form from schema
     * @param {Object} schema - Form schema definition
     * @param {HTMLElement} container - Container element
     * @param {Object} data - Initial form data
     * @returns {Object} Form instance with methods
     */

    generateForm(schema, container, data = {}) {
        this.validateSchema(schema);
        const formElement = this.createFormElement(schema);
        const fields = this.generateFields(schema.fields, data);
        const actions = this.generateActions(schema.actions || []);

        // Build form structure
        if (schema.title) {
            formElement.appendChild(this.createTitle(schema.title));
        }
        if (schema.description) {
            formElement.appendChild(this.createDescription(schema.description));
        }
        const fieldsContainer = this.createFieldsContainer(schema.layout);

        fields.forEach(field => fieldsContainer.appendChild(field.element));
        formElement.appendChild(fieldsContainer);
        if (actions.length > 0) {
            const actionsContainer = this.createActionsContainer();

            actions.forEach(action => actionsContainer.appendChild(action));
            formElement.appendChild(actionsContainer);
        }
        // Add to container
        container.innerHTML = '';
        container.appendChild(formElement);
        // Create form instance
        const formInstance = this.createFormInstance(schema, formElement, fields);

        // Setup event listeners
        this.setupEventListeners(formInstance);

        return formInstance;
    }

    createFormElement(schema) {
        const form = document.createElement('form');

        form.className = `form-generator ${schema.theme || this.defaultOptions.theme}`;
        form.setAttribute('data-form-id', schema.id || 'generated-form');
        if (schema.noValidate) {
            form.setAttribute('novalidate', '');
        }

        return form;
    }

    generateFields(fieldsSchema, data) {
        return fieldsSchema.map(fieldSchema => {
            const field = this.createField(fieldSchema, data[fieldSchema.name]);

            return {

                schema: fieldSchema,

                element: field.element,

                input: field.input,

                validate: field.validate,

                getValue: field.getValue,

                setValue: field.setValue,

                setError: field.setError,

                clearError: field.clearError
            };
        });
    }

    createField(fieldSchema, initialValue) {
        const fieldContainer = document.createElement('div');

        fieldContainer.className = `field-container field-${fieldSchema.type}`;
        if (fieldSchema.required) {
            fieldContainer.classList.add('required');
        }
        // Label
        if (fieldSchema.label) {
            const label = this.createLabel(fieldSchema);

            fieldContainer.appendChild(label);
        }
        // Input element
        const input = this.createInput(fieldSchema, initialValue);

        fieldContainer.appendChild(input);
        // Help text
        if (fieldSchema.help) {
            const help = this.createHelpText(fieldSchema.help);

            fieldContainer.appendChild(help);
        }
        // Error container
        const errorContainer = document.createElement('div');

        errorContainer.className = 'field-error';
        errorContainer.style.display = 'none';
        fieldContainer.appendChild(errorContainer);

        return {
            element: fieldContainer,
            input,
            validate: () => this.validateField(fieldSchema, input.value),
            getValue: () => this.getFieldValue(fieldSchema, input),
            setValue: value => this.setFieldValue(fieldSchema, input, value),
            setError: message => this.showFieldError(errorContainer, message),
            clearError: () => this.hideFieldError(errorContainer)
        };
    }

    createInput(fieldSchema, initialValue) {
        let input;

        switch (fieldSchema.type) {
            case 'text':
            case 'email':
            case 'password':
            case 'url':

                input = this.createTextInput(fieldSchema, initialValue);

                break;
            case 'number':
            case 'currency':

                input = this.createNumberInput(fieldSchema, initialValue);

                break;
            case 'textarea':

                input = this.createTextArea(fieldSchema, initialValue);

                break;
            case 'select':

                input = this.createSelect(fieldSchema, initialValue);

                break;
            case 'checkbox':

                input = this.createCheckbox(fieldSchema, initialValue);

                break;
            case 'radio':

                input = this.createRadioGroup(fieldSchema, initialValue);

                break;
            case 'date':
            case 'datetime-local':

                input = this.createDateInput(fieldSchema, initialValue);

                break;
            case 'file':

                input = this.createFileInput(fieldSchema, initialValue);

                break;
            case 'range':

                input = this.createRangeInput(fieldSchema, initialValue);

                break;
            default:

                input = this.createTextInput(fieldSchema, initialValue);
        }
        // Add common attributes
        if (fieldSchema.name) {
            input.name = fieldSchema.name;
            input.id = `field-${fieldSchema.name}`;
        }
        if (fieldSchema.required) {
            input.required = true;
        }
        if (fieldSchema.readonly) {
            input.readOnly = true;
        }
        if (fieldSchema.disabled) {
            input.disabled = true;
        }
        // Add CSS classes
        input.className = `form-input ${fieldSchema.className || ''}`;

        return input;
    }

    createTextInput(fieldSchema, initialValue) {
        const input = document.createElement('input');

        input.type = fieldSchema.type || 'text';
        input.placeholder = fieldSchema.placeholder || '';
        if (initialValue !== undefined) {
            input.value = initialValue;
        }
        if (fieldSchema.validation) {
            if (fieldSchema.validation.minLength) {

                input.minLength = fieldSchema.validation.minLength;
            }
            if (fieldSchema.validation.maxLength) {

                input.maxLength = fieldSchema.validation.maxLength;
            }
            if (fieldSchema.validation.pattern) {

                input.pattern = fieldSchema.validation.pattern;
            }
        }

        return input;
    }

    createNumberInput(fieldSchema, initialValue) {
        const input = document.createElement('input');

        input.type = 'number';
        input.placeholder = fieldSchema.placeholder || '';
        if (initialValue !== undefined) {
            input.value = initialValue;
        }
        if (fieldSchema.validation) {
            if (fieldSchema.validation.min !== undefined) {

                input.min = fieldSchema.validation.min;
            }
            if (fieldSchema.validation.max !== undefined) {

                input.max = fieldSchema.validation.max;
            }
            if (fieldSchema.validation.step !== undefined) {

                input.step = fieldSchema.validation.step;
            }
        }
        // Special handling for currency
        if (fieldSchema.type === 'currency') {
            input.step = '0.01';
            input.min = '0';
            // Add currency formatting on blur
            input.addEventListener('blur', () => {

                const value = parseFloat(input.value);

                if (!isNaN(value)) {

                    input.value = value.toFixed(2);

                }
            });
        }

        return input;
    }

    createTextArea(fieldSchema, initialValue) {
        const textarea = document.createElement('textarea');

        textarea.placeholder = fieldSchema.placeholder || '';
        textarea.rows = fieldSchema.rows || 4;
        if (initialValue !== undefined) {
            textarea.value = initialValue;
        }
        if (fieldSchema.validation) {
            if (fieldSchema.validation.minLength) {

                textarea.minLength = fieldSchema.validation.minLength;
            }
            if (fieldSchema.validation.maxLength) {

                textarea.maxLength = fieldSchema.validation.maxLength;
            }
        }

        return textarea;
    }

    createSelect(fieldSchema, initialValue) {
        const select = document.createElement('select');

        if (fieldSchema.multiple) {
            select.multiple = true;
        }
        // Add placeholder option
        if (fieldSchema.placeholder) {
            const placeholderOption = document.createElement('option');

            placeholderOption.value = '';
            placeholderOption.textContent = fieldSchema.placeholder;
            placeholderOption.disabled = true;
            placeholderOption.selected = initialValue === undefined;
            select.appendChild(placeholderOption);
        }
        // Add options
        if (fieldSchema.options) {
            fieldSchema.options.forEach(option => {

                const optionElement = document.createElement('option');

                optionElement.value = option.value;

                optionElement.textContent = option.label || option.value;

                if (initialValue === option.value) {

                    optionElement.selected = true;

                }

                select.appendChild(optionElement);
            });
        }

        return select;
    }

    createCheckbox(fieldSchema, initialValue) {
        const container = document.createElement('div');

        container.className = 'checkbox-container';
        const input = document.createElement('input');

        input.type = 'checkbox';
        input.checked = Boolean(initialValue);
        const label = document.createElement('label');

        label.textContent = fieldSchema.checkboxLabel || 'Enable';
        label.prepend(input);
        container.appendChild(label);
        // Return the input for consistent interface
        container._input = input;

        return container;
    }

    createLabel(fieldSchema) {
        const label = document.createElement('label');

        label.textContent = fieldSchema.label;
        label.htmlFor = `field-${fieldSchema.name}`;
        label.className = 'field-label';
        if (fieldSchema.required) {
            const asterisk = document.createElement('span');

            asterisk.textContent = ' *';
            asterisk.className = 'required-marker';
            label.appendChild(asterisk);
        }

        return label;
    }

    createHelpText(helpText) {
        const help = document.createElement('div');

        help.className = 'field-help';
        help.textContent = helpText;

        return help;
    }

    createFieldsContainer(layout) {
        const container = document.createElement('div');

        container.className = `fields-container layout-${layout || 'default'}`;

        return container;
    }

    generateActions(actionsSchema) {
        return actionsSchema.map(actionSchema => {
            const button = document.createElement('button');

            button.type = actionSchema.type || 'button';
            button.textContent = actionSchema.label;
            button.className = `btn btn-${actionSchema.variant || 'primary'}`;
            if (actionSchema.icon) {

                const icon = document.createElement('i');

                icon.className = actionSchema.icon;

                button.prepend(icon);
            }
            if (actionSchema.onclick) {

                button.addEventListener('click', actionSchema.onclick);
            }

            return button;
        });
    }

    createActionsContainer() {
        const container = document.createElement('div');

        container.className = 'form-actions';

        return container;
    }

    validateField(fieldSchema, value) {
        const errors = [];

        // Required validation
        if (fieldSchema.required && (!value || value.trim() === '')) {
            errors.push(`${fieldSchema.label || fieldSchema.name} is required`);
        }
        // Type-specific validation
        if (value && fieldSchema.validation) {
            const { validation } = fieldSchema;

            // Length validation
            if (validation.minLength && value.length < validation.minLength) {

                errors.push(`Minimum length is ${validation.minLength} characters`);
            }
            if (validation.maxLength && value.length > validation.maxLength) {

                errors.push(`Maximum length is ${validation.maxLength} characters`);
            }
            // Numeric validation
            if ((fieldSchema.type === 'number' || fieldSchema.type === 'currency') && value !== '') {

                const numValue = parseFloat(value);

                if (isNaN(numValue)) {

                    errors.push('Must be a valid number');

                } else {

                    if (validation.min !== undefined && numValue < validation.min) {


                        errors.push(`Minimum value is ${validation.min}`);

                    }

                    if (validation.max !== undefined && numValue > validation.max) {


                        errors.push(`Maximum value is ${validation.max}`);

                    }

                }
            }
            // Pattern validation
            if (validation.pattern && !new RegExp(validation.pattern).test(value)) {

                errors.push(validation.patternMessage || 'Invalid format');
            }
            // Custom validation
            if (validation.custom && typeof validation.custom === 'function') {

                const customResult = validation.custom(value);

                if (customResult !== true) {

                    errors.push(customResult || 'Invalid value');

                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    getFieldValue(fieldSchema, input) {
        if (fieldSchema.type === 'checkbox') {
            return input._input ? input._input.checked : input.checked;
        } else if (fieldSchema.type === 'number' || fieldSchema.type === 'currency') {
            const { value } = input;

            return value === '' ? null : parseFloat(value);
        } else {
            return input.value;
        }
    }

    setFieldValue(fieldSchema, input, value) {
        if (fieldSchema.type === 'checkbox') {
            const checkbox = input._input || input;

            checkbox.checked = Boolean(value);
        } else {
            input.value = value;
        }
    }

    showFieldError(errorContainer, message) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        errorContainer.parentElement.classList.add('has-error');
    }

    hideFieldError(errorContainer) {
        errorContainer.style.display = 'none';
        errorContainer.parentElement.classList.remove('has-error');
    }

    createFormInstance(schema, formElement, fields) {
        return {
            schema,
            element: formElement,
            fields,
            validate: () => {

                let isValid = true;

                const errors = {};

                fields.forEach(field => {

                    const validation = field.validate();

                    if (!validation.isValid) {


                        isValid = false;


                        errors[field.schema.name] = validation.errors;


                        field.setError(validation.errors[0]);

                    } else {


                        field.clearError();

                    }

                });

                return { isValid, errors };
            },
            getData: () => {

                const data = {};

                fields.forEach(field => {

                    data[field.schema.name] = field.getValue();

                });

                return data;
            },
            setData: data => {

                fields.forEach(field => {

                    if (Object.prototype.hasOwnProperty.call(data, field.schema.name)) {


                        field.setValue(data[field.schema.name]);

                    }

                });
            },
            reset: () => {

                formElement.reset();

                fields.forEach(field => field.clearError());
            },
            destroy: () => {

                formElement.remove();
            }
        };
    }

    setupEventListeners(formInstance) {
        if (this.defaultOptions.validateOnInput) {
            formInstance.fields.forEach(field => {

                const input = field.input._input || field.input;

                input.addEventListener('blur', () => {

                    const validation = field.validate();

                    if (!validation.isValid) {


                        field.setError(validation.errors[0]);

                    } else {


                        field.clearError();

                    }

                });
            });
        }
    }

    validateSchema(schema) {
        if (!schema || typeof schema !== 'object') {
            throw new Error('Form schema must be an object');
        }
        if (!Array.isArray(schema.fields)) {
            throw new Error('Form schema must have a fields array');
        }
        schema.fields.forEach((field, index) => {
            if (!field.name) {

                throw new Error(`Field at index ${index} must have a name`);
            }
            if (!field.type) {

                throw new Error(`Field "${field.name}" must have a type`);
            }
        });
    }

    initializeValidators() {
        return {
            email: value => {

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                return emailRegex.test(value) || 'Please enter a valid email address';
            },
            url: value => {

                try {

                    new URL(value);

                    return true;

                } catch {

                    return 'Please enter a valid URL';

                }
            },
            phone: value => {

                const phoneRegex = /^\+?[\d\s\-()]{10,}$/;

                return phoneRegex.test(value) || 'Please enter a valid phone number';
            }
        };
    }

    initializeFormatters() {
        return {
            currency: value => {

                const num = parseFloat(value);

                return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
            },
            percentage: value => {

                const num = parseFloat(value);

                return isNaN(num) ? '0%' : `${num}%`;
            },
            date: value => {

                const date = new Date(value);

                return isNaN(date) ? '' : date.toLocaleDateString();
            }
        };
    }

    createTitle(title) {
        const titleElement = document.createElement('h2');

        titleElement.className = 'form-title';
        titleElement.textContent = title;

        return titleElement;
    }

    createDescription(description) {
        const descElement = document.createElement('p');

        descElement.className = 'form-description';
        descElement.textContent = description;

        return descElement;
    }
}// Export for usewindow.FormGenerator = FormGenerator;
