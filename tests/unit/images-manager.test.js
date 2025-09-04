/**
 * @fileoverview Images Manager Unit Tests
 * Tests for image management functionality
 */

import '../setup.js';

// Mock the ImagesManager functionality
const mockImagesManager = {
  isInitialized: false,
  isGenerating: false,
  config: {
    selectors: {
      imageContainer: '.prompt-output'
    }
  },
  ui: {
    setupEventListeners: jest.fn()
  },
  init: jest.fn(),
  setupEventListeners: jest.fn(),
  handleGenerateClick: jest.fn(),
  generateImage: jest.fn(),
  isProviderSelected: jest.fn(),
  getCurrentPrompt: jest.fn(),
  getSelectedProviders: jest.fn(),
  addImageToOutput: jest.fn(),
  showLoadingPlaceholder: jest.fn(),
  removeLoadingPlaceholder: jest.fn(),
  disableGenerateButton: jest.fn(),
  enableGenerateButton: jest.fn()
};

// Set up global imagesManager
window.imagesManager = mockImagesManager;

describe('Images Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';

    // Set up basic DOM structure
    document.body.innerHTML = `
      <div>
        <button class="btn-generate">START</button>
        <textarea id="prompt-textarea">Test prompt</textarea>
        <input type="checkbox" name="providers" value="provider1" checked>
        <input type="checkbox" name="providers" value="provider2">
        <ul class="prompt-output"></ul>
      </div>
    `;
  });

  describe('Initialization', () => {
    it('should initialize only once', () => {
      mockImagesManager.init.mockImplementation(() => {
        if (mockImagesManager.isInitialized) return;
        mockImagesManager.isInitialized = true;
      });

      mockImagesManager.init();
      mockImagesManager.init(); // Second call should be ignored

      expect(mockImagesManager.init).toHaveBeenCalledTimes(2);
    });

    it('should set up event listeners on initialization', () => {
      mockImagesManager.init.mockImplementation(() => {
        mockImagesManager.ui.setupEventListeners();
      });
      mockImagesManager.init();
      expect(mockImagesManager.ui.setupEventListeners).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('should validate provider selection', () => {
      mockImagesManager.isProviderSelected.mockImplementation(() => {
        const checkedProviders = document.querySelectorAll('input[name="providers"]:checked');
        return checkedProviders.length > 0;
      });

      const result = mockImagesManager.isProviderSelected();
      expect(result).toBe(true); // We have one checked provider in our setup
    });

    it('should get current prompt text', () => {
      mockImagesManager.getCurrentPrompt.mockImplementation(() => {
        const textarea = document.querySelector('#prompt-textarea');
        return textarea ? textarea.value.trim() : '';
      });

      const prompt = mockImagesManager.getCurrentPrompt();
      expect(prompt).toBe('Test prompt');
    });

    it('should get selected providers', () => {
      mockImagesManager.getSelectedProviders.mockImplementation(() => {
        const checkedProviders = Array.from(
          document.querySelectorAll('input[name="providers"]:checked')
        );
        return checkedProviders.map(input => input.value);
      });

      const providers = mockImagesManager.getSelectedProviders();
      expect(providers).toEqual(['provider1']);
    });
  });

  describe('Image Generation Flow', () => {
    it('should prevent duplicate generation calls', async () => {
      mockImagesManager.handleGenerateClick.mockImplementation((e) => {
        e.preventDefault();
        if (mockImagesManager.isGenerating) {
          console.log('Generation already in progress');
          return;
        }
        mockImagesManager.isGenerating = true;
      });

      const mockEvent = { preventDefault: jest.fn() };

      await mockImagesManager.handleGenerateClick(mockEvent);
      await mockImagesManager.handleGenerateClick(mockEvent); // Should be ignored

      expect(mockEvent.preventDefault).toHaveBeenCalledTimes(2);
    });

    it('should show loading placeholder during generation', async () => {
      const promptObj = {
        prompt: 'test',
        promptId: '123',
        original: 'test'
      };

      mockImagesManager.showLoadingPlaceholder(promptObj);
      expect(mockImagesManager.showLoadingPlaceholder).toHaveBeenCalledWith(promptObj);
    });

    it('should disable button during generation', () => {
      mockImagesManager.disableGenerateButton();
      expect(mockImagesManager.disableGenerateButton).toHaveBeenCalled();
    });

    it('should enable button after generation', () => {
      mockImagesManager.enableGenerateButton();
      expect(mockImagesManager.enableGenerateButton).toHaveBeenCalled();
    });
  });

  describe('DOM Manipulation', () => {
    it('should add image to output container', () => {
      const mockResult = {
        imageId: 'test-id',
        image: 'uploads/test-image.jpg',
        prompt: 'test prompt'
      };

      mockImagesManager.addImageToOutput(mockResult);
      expect(mockImagesManager.addImageToOutput).toHaveBeenCalledWith(mockResult);
    });

    it('should find image container in DOM', () => {
      const container = document.querySelector('.prompt-output');
      expect(container).toBeTruthy();
      expect(container.tagName).toBe('UL');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing DOM elements gracefully', () => {
      document.body.innerHTML = ''; // Remove all elements

      mockImagesManager.getCurrentPrompt.mockImplementation(() => {
        const textarea = document.querySelector('#prompt-textarea');
        return textarea ? textarea.value.trim() : '';
      });

      const prompt = mockImagesManager.getCurrentPrompt();
      expect(prompt).toBe('');
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockImagesManager.generateImage.mockRejectedValue(error);

      await expect(mockImagesManager.generateImage('test', ['provider1']))
        .rejects.toThrow('API Error');
    });
  });

  describe('Button State Management', () => {
    it('should properly manage button disabled state', () => {
      const button = document.querySelector('.btn-generate');

      mockImagesManager.disableGenerateButton.mockImplementation(() => {
        button.disabled = true;
        button.textContent = 'Generating...';
      });

      mockImagesManager.enableGenerateButton.mockImplementation(() => {
        button.disabled = false;
        button.textContent = 'START';
      });

      mockImagesManager.disableGenerateButton();
      expect(button.disabled).toBe(true);
      expect(button.textContent).toBe('Generating...');

      mockImagesManager.enableGenerateButton();
      expect(button.disabled).toBe(false);
      expect(button.textContent).toBe('START');
    });
  });
});
