/**
 * Image View Prompts Utilities
 * Handles prompt formatting and display
 */

(function() {
    'use strict';

    /**
     * Add prompt to section with label and styling
     * @param {HTMLElement} section - Prompt section element
     * @param {string} label - Prompt label text
     * @param {string} text - Prompt text content
     * @param {string} borderColor - Border color for the prompt
     */
    const addPromptToSection = (section, label, text, borderColor) => {
        const promptLabel = document.createElement('span');

        promptLabel.className = 'list-prompt-label';
        promptLabel.textContent = `${label}:`;
        promptLabel.style.cssText = `
        color: #9ca3af;
        font-size: 12px;
        font-weight: bold;
        margin-right: 8px;
    `;

        const promptText = document.createElement('div');

        promptText.className = 'list-prompt-text';
        promptText.textContent = text;
        promptText.style.cssText = `
        color: #d1d5db;
        font-size: 14px;
        line-height: 1.5;
        margin-top: 4px;
        padding: 8px;
        background: rgba(55, 65, 81, 0.3);
        border-radius: 4px;
        border-left: 3px solid ${borderColor};
    `;

        section.appendChild(promptLabel);
        section.appendChild(promptText);
    };

    /**
 * Add fallback prompt when no prompts are available
 * @param {HTMLElement} section - Prompt section element
 */
    const addFallbackPrompt = section => {
        const fallbackLabel = document.createElement('span');

        fallbackLabel.className = 'list-prompt-label';
        fallbackLabel.textContent = 'Prompt:';
        fallbackLabel.style.cssText = `
        color: #9ca3af;
        font-size: 12px;
        font-weight: bold;
        margin-right: 8px;
    `;

        const fallbackText = document.createElement('div');

        fallbackText.className = 'list-prompt-text';
        fallbackText.textContent = 'No prompt available';
        fallbackText.style.cssText = `
        color: #d1d5db;
        font-size: 14px;
        margin-top: 4px;
    `;

        section.appendChild(fallbackLabel);
        section.appendChild(fallbackText);
    };

    // Export to window
    if (typeof window !== 'undefined') {
        window.ImageViewPrompts = {
            addPromptToSection,
            addFallbackPrompt
        };
    }
})();

