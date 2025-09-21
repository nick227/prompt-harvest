// Input validation and helper functions for form controls

/**
 * Validates the maxNum input field
 * Enforces numeric input and value constraints (1-10)
 * @param {HTMLInputElement} input - The input element to validate
 */
function validateMaxNum(input) {
    const value = parseInt(input.value);

    // Clear any non-numeric characters
    input.value = input.value.replace(/[^0-9]/g, '');

    // Enforce maximum value of 10
    if (value > 10) {
        input.value = '10';
    }

    // Enforce minimum value of 1
    if (value < 1 && input.value !== '') {
        input.value = '1';
    }
}

/**
 * Prevents invalid characters from being entered in numeric input fields
 * Allows navigation keys, control keys, and digits 0-9
 * @param {KeyboardEvent} event - The keyboard event
 * @returns {boolean} - Returns false if the character should be prevented
 */
function preventInvalidChars(event) {
    const char = String.fromCharCode(event.which);

    // Allow: backspace, delete, tab, escape, enter, home, end, left, right, up, down
    if ([8, 9, 27, 13, 46, 35, 36, 37, 38, 39, 40].indexOf(event.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (event.keyCode === 65 && event.ctrlKey === true) ||
        (event.keyCode === 67 && event.ctrlKey === true) ||
        (event.keyCode === 86 && event.ctrlKey === true) ||
        (event.keyCode === 88 && event.ctrlKey === true)) {
        return;
    }

    // Only allow digits 0-9
    if (!/[0-9]/.test(char)) {
        event.preventDefault();
        return false;
    }
}

/**
 * Handles paste events for numeric input fields
 * Extracts only digits and enforces value constraints
 * @param {ClipboardEvent} event - The paste event
 */
function handleMaxNumPaste(event) {
    event.preventDefault();

    // Get pasted text
    const paste = (event.clipboardData || window.clipboardData).getData('text');

    // Extract only digits
    const digitsOnly = paste.replace(/[^0-9]/g, '');

    // Limit to maximum value of 10
    const numValue = parseInt(digitsOnly);
    const finalValue = numValue > 10 ? '10' : (numValue < 1 ? '1' : digitsOnly);

    // Set the value
    event.target.value = finalValue;

    // Trigger validation
    validateMaxNum(event.target);
}
