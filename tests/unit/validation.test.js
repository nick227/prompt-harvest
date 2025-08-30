/**
 * Input Validation Tests
 */

describe('Input Validation Functions', () => {
  describe('Prompt Validation', () => {
    it('should validate non-empty prompts', () => {
      const validPrompts = [
        'A beautiful sunset',
        'Generate an image of a cat',
        'Abstract art with vibrant colors'
      ];

      validPrompts.forEach(prompt => {
        expect(isValidPrompt(prompt)).toBe(true);
      });
    });

    it('should reject empty or whitespace-only prompts', () => {
      const invalidPrompts = [
        '',
        '   ',
        '\t\n',
        null,
        undefined
      ];

      invalidPrompts.forEach(prompt => {
        expect(isValidPrompt(prompt)).toBe(false);
      });
    });

    it('should validate prompt length constraints', () => {
      const shortPrompt = 'Ok';
      const longPrompt = 'A'.repeat(1001); // Assuming 1000 char limit
      const validPrompt = 'A perfect length prompt for image generation';

      expect(isValidPromptLength(shortPrompt)).toBe(false);
      expect(isValidPromptLength(longPrompt)).toBe(false);
      expect(isValidPromptLength(validPrompt)).toBe(true);
    });
  });

  describe('Provider Validation', () => {
    it('should validate provider arrays', () => {
      const validProviders = [
        ['openai', 'stability'],
        ['midjourney'],
        ['dalle', 'stable-diffusion', 'firefly']
      ];

      validProviders.forEach(providers => {
        expect(isValidProviderArray(providers)).toBe(true);
      });
    });

    it('should reject invalid provider arrays', () => {
      const invalidProviders = [
        [],
        null,
        undefined,
        [''],
        ['invalid-provider-name-that-does-not-exist']
      ];

      invalidProviders.forEach(providers => {
        expect(isValidProviderArray(providers)).toBe(false);
      });
    });
  });

  describe('Password Validation', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'MyStrongPass123!',
        'P@ssw0rd2024',
        'ComplexP@ssw0rd!'
      ];

      strongPasswords.forEach(password => {
        expect(isStrongPassword(password)).toBe(true);
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        '123',
        'password',
        'abc',
        'PASSWORD',
        '12345678',
        'weakpass'
      ];

      weakPasswords.forEach(password => {
        expect(isStrongPassword(password)).toBe(false);
      });
    });
  });

  describe('Image Settings Validation', () => {
    it('should validate image dimensions', () => {
      const validDimensions = [
        { width: 512, height: 512 },
        { width: 1024, height: 768 },
        { width: 768, height: 1024 }
      ];

      validDimensions.forEach(dims => {
        expect(isValidImageDimensions(dims)).toBe(true);
      });
    });

    it('should reject invalid dimensions', () => {
      const invalidDimensions = [
        { width: 0, height: 512 },
        { width: 512, height: 0 },
        { width: -100, height: 512 },
        { width: 512, height: 10000 },
        { width: 'invalid', height: 512 }
      ];

      invalidDimensions.forEach(dims => {
        expect(isValidImageDimensions(dims)).toBe(false);
      });
    });
  });
});

// Helper validation functions
function isValidPrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return false;
  }
  return prompt.trim().length > 0;
}

function isValidPromptLength(prompt) {
  if (!isValidPrompt(prompt)) return false;
  const trimmed = prompt.trim();
  return trimmed.length >= 3 && trimmed.length <= 1000;
}

function isValidProviderArray(providers) {
  if (!Array.isArray(providers) || providers.length === 0) return false;

  const validProviders = ['openai', 'stability', 'midjourney', 'dalle', 'stable-diffusion', 'firefly'];

  return providers.every(provider =>
    typeof provider === 'string' &&
    provider.trim().length > 0 &&
    validProviders.includes(provider.toLowerCase())
  );
}

function isStrongPassword(password) {
  if (!password || typeof password !== 'string' || password.length < 8) {
    return false;
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return hasLower && hasUpper && hasNumber && hasSpecial;
}

function isValidImageDimensions(dims) {
  if (!dims || typeof dims !== 'object') return false;

  const { width, height } = dims;

  return (
    typeof width === 'number' &&
    typeof height === 'number' &&
    width > 0 &&
    height > 0 &&
    width <= 2048 &&
    height <= 2048
  );
}
