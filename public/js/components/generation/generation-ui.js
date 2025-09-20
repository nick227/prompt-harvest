// Generation UI Layer - Pure UI rendering and styling for image generation
class GenerationUI {
    constructor() {
        this.setupStyles();
    }

    setupStyles() {
        // Add CSS animations if not already present
        if (!document.querySelector('#generation-ui-styles')) {
            const style = document.createElement('style');

            style.id = 'generation-ui-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%);
        opacity: 0; }
                    to { transform: translateX(0);
        opacity: 1; }
                }

                @keyframes slideOut {
                    from { transform: translateX(0);
        opacity: 1; }
                    to { transform: translateX(100%);
        opacity: 0; }
                }

                .notification {
                    position: fixed;
        top: 20px;
                    right: 20px;
        padding: 15px 20px;
                    border-radius: 5px;
        color: white;
                    font-weight: bold;
        z-index: 10000;
                    max-width: 300px;
        word-wrap: break-word;
                    animation: slideIn 0.3s ease-out;
                }

                .notification.error {
                    background-color: #dc3545;
                }

                .notification.success {
                    background-color: #28a745;
                }

                .notification.warning {
                    background-color: #ffc107;
        color: #212529;
                }

                .notification.info {
                    background-color: #17a2b8;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // UI State Management
    updateButtonState(button, disabled, title) {
        if (button) {
            button.disabled = disabled;
            button.title = title;
        }
    }

    setGeneratingState(button, isGenerating) {
        if (button) {
            if (isGenerating) {
                button.textContent = 'Generating...';
                button.classList.add('processing');
            } else {
                button.textContent = 'START';
                button.classList.remove('processing');
            }
        }
    }

    // Notification System
    showNotification(message, type = 'info') {
        // Use the new notification service if available
        if (window.notificationService) {
            window.notificationService.show(message, type);
        } else {
            // Fallback to console logging
            console.log(`Notification: ${message}`);
        }
    }


    showError(message) {
        console.error('❌ Error:', message);
        this.showNotification(message, 'error');
    }

    showValidationError(errors) {
        const message = `Validation failed:\n${errors.join('\n')}`;

        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    // Form Element Access
    getGenerateButton() {
        return document.querySelector('.btn-generate');
    }

    getPromptTextarea() {
        return document.querySelector('#prompt-textarea');
    }

    getGuidanceTopSelect() {
        return document.querySelector('select[name="guidance-top"]');
    }

    getGuidanceBottomSelect() {
        return document.querySelector('select[name="guidance-bottom"]');
    }

    getProviderCheckboxes() {
        return document.querySelectorAll('input[name="providers"]:checked');
    }

    getAutoGenerateCheckbox() {
        return document.querySelector('input[name="auto-generate"]');
    }

    getMaxNumInput() {
        return document.querySelector('input[name="maxNum"]');
    }

    getMultiplierInput() {
        return document.querySelector('#multiplier');
    }

    getMixupCheckbox() {
        return document.querySelector('input[name="mixup"]');
    }

    getMashupCheckbox() {
        return document.querySelector('input[name="mashup"]');
    }

    // Form Validation UI
    highlightError(element, hasError) {
        if (element) {
            if (hasError) {
                element.classList.add('error');
            } else {
                element.classList.remove('error');
            }
        }
    }

    // Loading States
    showLoadingState() {
        const button = this.getGenerateButton();

        this.setGeneratingState(button, true);
    }

    hideLoadingState() {
        const button = this.getGenerateButton();

        this.setGeneratingState(button, false);
    }

    // Auto-generation UI
    updateAutoGenerationStatus(isAutoGenerating, counter, max) {
        const checkbox = this.getAutoGenerateCheckbox();
        const _maxInput = this.getMaxNumInput();

        // Never disable the auto checkbox - users must be able to toggle it off during generation
        if (checkbox) {
            checkbox.disabled = false;
        }

        // Could add visual indicators for auto-generation progress
        if (isAutoGenerating && counter > 0) {
            this.showNotification(`Auto-generating: ${counter}/${max}`, 'info');
        }
    }

}

// Export for global access
if (typeof window !== 'undefined') {
    window.GenerationUI = GenerationUI;
}
