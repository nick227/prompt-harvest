/**
 * Speech-to-Text Service
 * Handles voice recording and transcription using Chrome's built-in speech recognition
 */
class SpeechToTextService {
    constructor() {
        this.isRecording = false;
        this.recognition = null;
        this.recordButton = null;
        this.promptTextarea = null;
        this.isSupported = false;

        this.init();
    }

    init() {
        this.setupElements();
        this.setupSpeechRecognition();
        this.bindEvents();
    }

    setupElements() {
        this.recordButton = document.querySelector('.btn-record');
        this.promptTextarea = document.querySelector('#prompt-textarea');

        if (!this.recordButton) {
            console.warn('Speech-to-text: Record button not found');

            return;
        }

        if (!this.promptTextarea) {
            console.warn('Speech-to-text: Prompt textarea not found');

            return;
        }
    }

    setupSpeechRecognition() {
        // Check for speech recognition support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            return;
        }

        this.isSupported = true;
        this.recognition = new SpeechRecognition();

        // Configure recognition settings
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        // Set up event handlers
        this.recognition.onstart = () => {
            this.isRecording = true;
            this.updateButtonState();
        };

        this.recognition.onresult = event => {
            this.handleRecognitionResult(event);
        };

        this.recognition.onerror = event => {
            this.handleRecognitionError(event);
        };

        this.recognition.onend = () => {
            this.isRecording = false;
            this.updateButtonState();
        };
    }

    bindEvents() {
        if (!this.recordButton) {
            return;
        }

        this.recordButton.addEventListener('click', () => {
            this.toggleRecording();
        });
    }

    toggleRecording() {
        if (!this.isSupported) {
            this.showUnsupportedMessage();

            return;
        }

        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    startRecording() {
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            this.showErrorMessage('Failed to start recording. Please try again.');
        }
    }

    stopRecording() {
        if (this.recognition && this.isRecording) {
            this.recognition.stop();
        }
    }

    handleRecognitionResult(event) {
        let finalTranscript = '';
        let interimTranscript = '';

        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const { transcript } = event.results[i][0];

            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        // Update textarea with final results
        if (finalTranscript) {
            this.insertTextIntoPrompt(finalTranscript);
        }
    }

    insertTextIntoPrompt(text) {
        if (!this.promptTextarea) {
            return;
        }

        // Use TextAreaManager if available for proper auto-resize handling
        if (window.textAreaManager) {
            window.textAreaManager.insertAtCursor(text);

            return;
        }

        // Fallback: direct manipulation (should trigger auto-resize via input event)
        const currentValue = this.promptTextarea.value;
        const cursorPosition = this.promptTextarea.selectionStart;

        // Insert text at cursor position
        const newValue = currentValue.slice(0, cursorPosition) + text + currentValue.slice(cursorPosition);

        this.promptTextarea.value = newValue;

        // Update cursor position
        const newCursorPosition = cursorPosition + text.length;

        this.promptTextarea.setSelectionRange(newCursorPosition, newCursorPosition);

        // Trigger input event to notify other components and trigger auto-resize
        this.promptTextarea.dispatchEvent(new Event('input', { bubbles: true }));

        // Focus the textarea
        this.promptTextarea.focus();
    }

    handleRecognitionError(event) {
        console.error('Speech recognition error:', event.error);

        let errorMessage = 'Speech recognition error occurred.';

        switch (event.error) {
            case 'no-speech':
                errorMessage = 'No speech detected. Please try again.';
                break;
            case 'audio-capture':
                errorMessage = 'Microphone not found or not accessible.';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone permission denied. Please allow microphone access.';
                break;
            case 'network':
                errorMessage = 'Network error occurred during speech recognition.';
                break;
            case 'service-not-allowed':
                errorMessage = 'Speech recognition service not allowed.';
                break;
        }

        this.showErrorMessage(errorMessage);
        this.stopRecording();
    }

    updateButtonState() {
        if (!this.recordButton) {
            return;
        }

        const icon = this.recordButton.querySelector('i');

        if (this.isRecording) {
            // Recording state - red color
            this.recordButton.classList.remove('bg-gray-700', 'hover:bg-gray-600');
            this.recordButton.classList.add('bg-red-600', 'hover:bg-red-700');

            if (icon) {
                icon.classList.remove('fa-microphone');
                icon.classList.add('fa-stop');
            }

            // Add pulsing animation
            this.recordButton.classList.add('animate-pulse');
        } else {
            // Idle state - gray color
            this.recordButton.classList.remove('bg-red-600', 'hover:bg-red-700', 'animate-pulse');
            this.recordButton.classList.add('bg-gray-700', 'hover:bg-gray-600');

            if (icon) {
                icon.classList.remove('fa-stop');
                icon.classList.add('fa-microphone');
            }
        }
    }

    showUnsupportedMessage() {
        if (window.notificationService) {
            window.notificationService.show('Speech recognition is not supported in this browser. Please use Chrome or Edge.', 'warning');
        } else {
            alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
        }
    }

    showErrorMessage(message) {
        if (window.notificationService) {
            window.notificationService.show(message, 'error');
        } else {
            console.error(message);
        }
    }

    // Public methods for external control
    start() {
        if (this.isSupported && !this.isRecording) {
            this.startRecording();
        }
    }

    stop() {
        if (this.isRecording) {
            this.stopRecording();
        }
    }

    isActive() {
        return this.isRecording;
    }

    destroy() {
        if (this.recognition) {
            this.recognition.stop();
            this.recognition = null;
        }

        if (this.recordButton) {
            this.recordButton.removeEventListener('click', this.toggleRecording);
        }
    }
}

// Initialize the service when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.speechToTextService = new SpeechToTextService();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpeechToTextService;
}
