// ============================================================================
// TEXT UTILITIES - Pure Text Manipulation Functions
// ============================================================================

/**
 * Get text before cursor position
 * @param {string} value - The text value
 * @param {number} cursorPosition - Current cursor position
 * @returns {string} Text before cursor
 */
const getTextBeforeCursor = (value, cursorPosition) => value.substring(0, cursorPosition);

/**
 * Get text after cursor position
 * @param {string} value - The text value
 * @param {number} cursorPosition - Current cursor position
 * @returns {string} Text after cursor
 */
const getTextAfterCursor = (value, cursorPosition) => value.substring(cursorPosition);

/**
 * Insert text at cursor position
 * @param {string} value - The text value
 * @param {number} start - Selection start position
 * @param {number} end - Selection end position
 * @param {string} textToInsert - Text to insert
 * @returns {Object} New value and cursor position
 */
const insertTextAtPosition = (value, start, end, textToInsert) => {
    const newValue = value.substring(0, start) + textToInsert + value.substring(end);
    const newCursorPosition = start + textToInsert.length;

    return {
        value: newValue,
        cursorPosition: newCursorPosition
    };
};

/**
 * Replace text in a string
 * @param {string} value - The text value
 * @param {string} searchTerm - Text to find
 * @param {string} replacement - Text to replace with
 * @returns {Object} New value and match count
 */
const replaceText = (value, searchTerm, replacement) => {
    const regex = new RegExp(escapeRegex(searchTerm), 'g');
    const matches = value.match(regex);
    const newValue = value.replace(regex, replacement);
    const matchCount = matches ? matches.length : 0;

    return {
        value: newValue,
        matchCount,
        hasChanged: newValue !== value
    };
};

/**
 * Find word at cursor position
 * @param {string} value - The text value
 * @param {number} cursorPosition - Current cursor position
 * @returns {string} Word at cursor
 */
const getWordAtCursor = (value, cursorPosition) => {
    const words = value.split(/\s+/);
    let currentPos = 0;

    for (const word of words) {
        const wordStart = currentPos;
        const wordEnd = currentPos + word.length;

        if (cursorPosition >= wordStart && cursorPosition <= wordEnd) {
            return word;
        }

        currentPos = wordEnd + 1; // +1 for the space
    }

    return '';
};

/**
 * Replace word at cursor position
 * @param {string} value - The text value
 * @param {number} cursorPosition - Current cursor position
 * @param {string} newWord - New word to replace with
 * @returns {Object} New value and cursor position
 */
const replaceWordAtCursor = (value, cursorPosition, newWord) => {
    const words = value.split(/\s+/);
    let currentPos = 0;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const wordStart = currentPos;
        const wordEnd = currentPos + word.length;

        if (cursorPosition >= wordStart && cursorPosition <= wordEnd) {
            words[i] = newWord;
            const newValue = words.join(' ');
            const newCursorPosition = wordStart + newWord.length;

            return {
                value: newValue,
                cursorPosition: newCursorPosition
            };
        }

        currentPos = wordEnd + 1; // +1 for the space
    }

    return { value, cursorPosition };
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if text is empty
 * @param {string} value - The text value
 * @returns {boolean} True if empty
 */
const isEmpty = value => value.trim() === '';

/**
 * Check if text exceeds maximum length
 * @param {string} value - The text value
 * @param {number} maxLength - Maximum allowed length
 * @returns {boolean} True if too long
 */
const isTooLong = (value, maxLength) => value.length > maxLength;

/**
 * Get character count
 * @param {string} value - The text value
 * @returns {number} Character count
 */
const getCharacterCount = value => value.length;

/**
 * Get word count
 * @param {string} value - The text value
 * @returns {number} Word count
 */
const getWordCount = value => {
    const trimmed = value.trim();

    if (trimmed === '') {
        return 0;
    }

    const words = trimmed.split(/\s+/);

    return words.length;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Escape regex special characters
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
const escapeRegex = string => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Get last word from text
 * @param {string} text - The text
 * @returns {string} Last word
 */
const getLastWord = text => {
    const words = text.trim().split(/\s+/);

    return words[words.length - 1] || '';
};

/**
 * Get words before cursor
 * @param {string} textBeforeCursor - Text before cursor
 * @returns {Array} Array of words
 */
const getWordsBeforeCursor = textBeforeCursor => textBeforeCursor.trim().split(/\s+/);

/**
 * Check if word is long enough for matching
 * @param {string} word - The word to check
 * @param {number} minLength - Minimum length (default: 2)
 * @returns {boolean} True if long enough
 */
const isWordLongEnough = (word, minLength = 2) => word.length >= minLength;

// ============================================================================
// HISTORY FUNCTIONS
// ============================================================================

/**
 * Add item to history
 * @param {Array} history - Current history array
 * @param {string} value - Value to add
 * @param {number} maxSize - Maximum history size
 * @returns {Array} Updated history
 */
const addToHistory = (history, value, maxSize = 10) => {
    if (isEmpty(value)) {
        return history;
    }

    // Remove existing entry if it exists
    const filteredHistory = history.filter(item => item !== value);

    // Add to beginning and limit size
    const newHistory = [value, ...filteredHistory];

    return newHistory.slice(0, maxSize);
};

/**
 * Get history item by index
 * @param {Array} history - History array
 * @param {number} index - Index to retrieve
 * @returns {string|null} History item or null
 */
const getHistoryItem = (history, index) => history[index] || null;

// ============================================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================================

// Make functions available globally
window.TextUtils = {
    getTextBeforeCursor,
    getTextAfterCursor,
    insertTextAtPosition,
    replaceText,
    getWordAtCursor,
    replaceWordAtCursor,
    isEmpty,
    isTooLong,
    getCharacterCount,
    getWordCount,
    escapeRegex,
    getLastWord,
    getWordsBeforeCursor,
    isWordLongEnough,
    addToHistory,
    getHistoryItem
};
