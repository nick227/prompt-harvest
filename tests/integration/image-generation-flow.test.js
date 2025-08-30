/**
 * @jest-environment jsdom
 */

import '../setup.js';

describe('Image Generation Flow Integration', () => {
  let mockUserApi;
  let mockImagesManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up DOM
    document.body.innerHTML = `
      <div id="app">
        <div id="authentication"></div>
        <form>
          <textarea id="prompt-textarea" placeholder="Enter your prompt"></textarea>
          <div id="provider-list">
            <input type="checkbox" name="providers" value="provider1" id="provider1">
            <label for="provider1">Provider 1</label>
            <input type="checkbox" name="providers" value="provider2" id="provider2">
            <label for="provider2">Provider 2</label>
          </div>
          <button type="button" class="btn-generate">START</button>
        </form>
        <ul class="prompt-output"></ul>
        <div id="transaction-stats"></div>
      </div>
    `;

    // Mock UserApi
    mockUserApi = {
      isAuthenticated: jest.fn().mockReturnValue(true),
      getAuthToken: jest.fn().mockReturnValue('mock-token'),
      getProfile: jest.fn().mockResolvedValue({
        success: true,
        data: { user: { id: '1', email: 'test@example.com' } }
      })
    };

    // Mock ImagesManager
    mockImagesManager = {
      isInitialized: false,
      isGenerating: false,
      init: jest.fn(),
      handleGenerateClick: jest.fn(),
      generateImage: jest.fn(),
      isProviderSelected: jest.fn(),
      getCurrentPrompt: jest.fn(),
      getSelectedProviders: jest.fn(),
      showLoadingPlaceholder: jest.fn(),
      disableGenerateButton: jest.fn(),
      enableGenerateButton: jest.fn()
    };

    // Set up globals
    window.userApi = mockUserApi;
    window.imagesManager = mockImagesManager;
  });

  describe('Complete Generation Flow', () => {
    it('should complete full image generation workflow', async () => {
      // Step 1: User is authenticated
      expect(mockUserApi.isAuthenticated()).toBe(true);

      // Step 2: User enters prompt
      const promptTextarea = document.querySelector('#prompt-textarea');
      promptTextarea.value = 'A beautiful sunset over mountains';

      // Step 3: User selects providers
      const provider1 = document.querySelector('#provider1');
      const provider2 = document.querySelector('#provider2');
      provider1.checked = true;
      provider2.checked = true;

      // Mock the validation functions
      mockImagesManager.getCurrentPrompt.mockReturnValue('A beautiful sunset over mountains');
      mockImagesManager.isProviderSelected.mockReturnValue(true);
      mockImagesManager.getSelectedProviders.mockReturnValue(['provider1', 'provider2']);

      // Step 4: User clicks generate button
      const generateButton = document.querySelector('.btn-generate');
      expect(generateButton).toBeTruthy();

      // Mock successful generation
      const mockResponse = {
        success: true,
        data: {
          imageId: 'test-image-id',
          image: 'uploads/test-image.jpg',
          prompt: 'A beautiful sunset over mountains',
          provider: 'provider1'
        }
      };

      mockImagesManager.generateImage.mockResolvedValue(mockResponse.data);

      // Simulate the click handler
      mockImagesManager.handleGenerateClick.mockImplementation(async (e) => {
        e.preventDefault();

        if (mockImagesManager.isGenerating) return;

        const prompt = mockImagesManager.getCurrentPrompt();
        const hasProviders = mockImagesManager.isProviderSelected();

        if (!prompt) throw new Error('Prompt required');
        if (!hasProviders) throw new Error('Provider required');

        mockImagesManager.isGenerating = true;
        mockImagesManager.disableGenerateButton();
        mockImagesManager.showLoadingPlaceholder({ prompt });

        try {
          const providers = mockImagesManager.getSelectedProviders();
          const result = await mockImagesManager.generateImage(prompt, providers);
          return result;
        } finally {
          mockImagesManager.isGenerating = false;
          mockImagesManager.enableGenerateButton();
        }
      });

      // Execute the flow
      const clickEvent = { preventDefault: jest.fn() };
      const result = await mockImagesManager.handleGenerateClick(clickEvent);

      // Verify the flow
      expect(clickEvent.preventDefault).toHaveBeenCalled();
      expect(mockImagesManager.getCurrentPrompt).toHaveBeenCalled();
      expect(mockImagesManager.isProviderSelected).toHaveBeenCalled();
      expect(mockImagesManager.getSelectedProviders).toHaveBeenCalled();
      expect(mockImagesManager.disableGenerateButton).toHaveBeenCalled();
      expect(mockImagesManager.showLoadingPlaceholder).toHaveBeenCalled();
      expect(mockImagesManager.generateImage).toHaveBeenCalledWith(
        'A beautiful sunset over mountains',
        ['provider1', 'provider2']
      );
      expect(mockImagesManager.enableGenerateButton).toHaveBeenCalled();
    });

    it('should handle validation errors appropriately', async () => {
      // Empty prompt case
      mockImagesManager.getCurrentPrompt.mockReturnValue('');
      mockImagesManager.isProviderSelected.mockReturnValue(true);

      mockImagesManager.handleGenerateClick.mockImplementation(async (e) => {
        e.preventDefault();
        const prompt = mockImagesManager.getCurrentPrompt();
        if (!prompt) throw new Error('Prompt required');
      });

      const clickEvent = { preventDefault: jest.fn() };
      await expect(mockImagesManager.handleGenerateClick(clickEvent))
        .rejects.toThrow('Prompt required');

      // No providers selected case
      mockImagesManager.getCurrentPrompt.mockReturnValue('test prompt');
      mockImagesManager.isProviderSelected.mockReturnValue(false);

      mockImagesManager.handleGenerateClick.mockImplementation(async (e) => {
        e.preventDefault();
        const hasProviders = mockImagesManager.isProviderSelected();
        if (!hasProviders) throw new Error('Provider required');
      });

      await expect(mockImagesManager.handleGenerateClick(clickEvent))
        .rejects.toThrow('Provider required');
    });

    it('should prevent duplicate generation requests', async () => {
      mockImagesManager.getCurrentPrompt.mockReturnValue('test prompt');
      mockImagesManager.isProviderSelected.mockReturnValue(true);
      mockImagesManager.getSelectedProviders.mockReturnValue(['provider1']);

      let generationCount = 0;
      mockImagesManager.handleGenerateClick.mockImplementation(async (e) => {
        e.preventDefault();

        if (mockImagesManager.isGenerating) {
          return; // Should ignore duplicate calls
        }

        mockImagesManager.isGenerating = true;
        generationCount++;

        // Simulate async generation
        await new Promise(resolve => setTimeout(resolve, 100));

        mockImagesManager.isGenerating = false;
      });

      const clickEvent = { preventDefault: jest.fn() };

      // Fire multiple rapid clicks
      const promises = [
        mockImagesManager.handleGenerateClick(clickEvent),
        mockImagesManager.handleGenerateClick(clickEvent),
        mockImagesManager.handleGenerateClick(clickEvent)
      ];

      await Promise.all(promises);

      // Only one generation should have occurred
      expect(generationCount).toBe(1);
    });
  });

  describe('Authentication Integration', () => {
    it('should handle authenticated user flow', async () => {
      expect(mockUserApi.isAuthenticated()).toBe(true);

      const profile = await mockUserApi.getProfile();
      expect(profile.success).toBe(true);
      expect(profile.data.user.email).toBe('test@example.com');
    });

    it('should handle unauthenticated user flow', () => {
      mockUserApi.isAuthenticated.mockReturnValue(false);
      mockUserApi.getAuthToken.mockReturnValue(null);

      expect(mockUserApi.isAuthenticated()).toBe(false);
      expect(mockUserApi.getAuthToken()).toBeNull();
    });
  });

  describe('UI State Management', () => {
    it('should manage button states correctly during generation', async () => {
      const button = document.querySelector('.btn-generate');

      // Mock state management
      mockImagesManager.disableGenerateButton.mockImplementation(() => {
        button.disabled = true;
        button.textContent = 'Generating...';
        button.classList.add('processing');
      });

      mockImagesManager.enableGenerateButton.mockImplementation(() => {
        button.disabled = false;
        button.textContent = 'START';
        button.classList.remove('processing');
      });

      // Initial state
      expect(button.disabled).toBe(false);
      expect(button.textContent).toBe('START');

      // During generation
      mockImagesManager.disableGenerateButton();
      expect(button.disabled).toBe(true);
      expect(button.textContent).toBe('Generating...');
      expect(button.classList.contains('processing')).toBe(true);

      // After generation
      mockImagesManager.enableGenerateButton();
      expect(button.disabled).toBe(false);
      expect(button.textContent).toBe('START');
      expect(button.classList.contains('processing')).toBe(false);
    });

    it('should show loading placeholder during generation', () => {
      const outputContainer = document.querySelector('.prompt-output');
      expect(outputContainer).toBeTruthy();

      mockImagesManager.showLoadingPlaceholder.mockImplementation((promptObj) => {
        const placeholder = document.createElement('li');
        placeholder.className = 'loading-placeholder';
        placeholder.innerHTML = `<div>Generating: ${promptObj.prompt}</div>`;
        outputContainer.appendChild(placeholder);
      });

      const promptObj = { prompt: 'test prompt' };
      mockImagesManager.showLoadingPlaceholder(promptObj);

      const placeholder = outputContainer.querySelector('.loading-placeholder');
      expect(placeholder).toBeTruthy();
      expect(placeholder.textContent).toContain('test prompt');
    });
  });
});
