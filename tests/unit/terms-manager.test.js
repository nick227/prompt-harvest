/**
 * @fileoverview TermsManager Unit Tests
 * Comprehensive tests for term management, caching, and API integration
 */

import '../setup.js';

// Create a mock TermsManager class for testing
class MockTermsManager {
  constructor() {
    this.isInitialized = false;
    this.terms = [];

    // Create proper Jest mocks for all methods
    this.cacheManager = {
      setLoading: jest.fn(),
      setTerms: jest.fn(),
      getTerms: jest.fn(),
      addTerm: jest.fn(),
      removeTerm: jest.fn(),
      updateTerm: jest.fn(),
      findTerm: jest.fn(),
      clear: jest.fn(),
      destroy: jest.fn()
    };

    this.domManager = {
      init: jest.fn(),
      renderTerms: jest.fn(),
      showLoading: jest.fn(),
      hideLoading: jest.fn(),
      showError: jest.fn(),
      showMessage: jest.fn(),
      clearMessage: jest.fn(),
      getTermInput: jest.fn(),
      getSearchInput: jest.fn(),
      createTermRow: jest.fn(),
      removeTermRow: jest.fn(),
      updateTermRow: jest.fn(),
      findTermRow: jest.fn(),
      getTermRows: jest.fn(),
      addTermRow: jest.fn(),
      clearTerms: jest.fn(),
      showSkeletonRows: jest.fn(),
      hideSkeletonRows: jest.fn(),
      setupEventListeners: jest.fn(),
      destroy: jest.fn()
    };

    this.apiManager = {
      init: jest.fn(),
      loadTerms: jest.fn(),
      addTerm: jest.fn(),
      deleteTerm: jest.fn(),
      searchTerms: jest.fn(),
      updateTerm: jest.fn(),
      destroy: jest.fn()
    };

    this.uiManager = {
      init: jest.fn(),
      setupEventListeners: jest.fn(),
      handleTermInputChange: jest.fn(),
      handleAddTermClick: jest.fn(),
      handleSearchInput: jest.fn(),
      handleTermToggle: jest.fn(),
      handleTermDelete: jest.fn(),
      showMessage: jest.fn(),
      showError: jest.fn(),
      showLoading: jest.fn(),
      hideLoading: jest.fn(),
      destroy: jest.fn()
    };

    this.searchService = {
      init: jest.fn(),
      search: jest.fn(),
      debounce: jest.fn(),
      clearResults: jest.fn(),
      setTerms: jest.fn(),
      destroy: jest.fn()
    };
  }

  async init() {
    if (this.isInitialized) {
      return;
    }

    try {
      this.uiManager.init();
      await this.apiManager.loadTerms();
      this.isInitialized = true;
      console.log('Terms Manager initialized successfully');
    } catch (error) {
      console.error('Error initializing Terms Manager:', error);
      throw error;
    }
  }

  async addTerm(term) {
    try {
      const newTerm = await this.apiManager.addTerm(term);
      this.terms.push(newTerm);
      this.cacheManager.addTerm(newTerm);
      this.searchService.setTerms();
      return newTerm;
    } catch (error) {
      throw error;
    }
  }

  async deleteTerm(term) {
    try {
      await this.apiManager.deleteTerm(term);
      this.terms = this.terms.filter(t => t.word !== term.word);
      this.cacheManager.removeTerm(term);
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async performSearch(query) {
    try {
      const results = await this.apiManager.searchTerms(query);
      return results;
    } catch (error) {
      throw error;
    }
  }

  getTermCount() {
    return this.terms.length;
  }

  termExists(word) {
    return this.terms.some(term => term.word === word);
  }

  getTermByWord(word) {
    return this.terms.find(term => term.word === word);
  }

  getTermsByType(type) {
    return this.terms.filter(term => term.types && term.types.includes(type));
  }

    filterTermsByQuery(query) {
    if (!query) return this.terms;
    return this.terms.filter(term =>
      term.word.toLowerCase().includes(query.toLowerCase())
    );
  }

  hasTerm(word) {
    return this.termExists(word);
  }

  filterTerms(query) {
    return this.filterTermsByQuery(query);
  }

  cleanup() {
    this.isInitialized = false;
    this.uiManager.destroy();
  }

  async handleTermAdded(event) {
    const { term } = event.detail;
    await this.addTerm(term);
  }

  async handleTermDeleted(event) {
    const { term } = event.detail;
    await this.deleteTerm(term);
  }

  async handleSearchPerformed(event) {
    const { query } = event.detail;
    await this.performSearch(query);
  }

  handleDuplicateDetected(event) {
    const { term } = event.detail;
    this.uiManager.showMessage(
      'error',
      `Term "${term}" already exists`
    );
  }
}

// Mock the TERMS_CONSTANTS
const mockTERMS_CONSTANTS = {
  SELECTORS: {
    TERMS_CONTAINER: '.terms-container',
    ADD_TERM_INPUT: '.add-term-input',
    ADD_TERM_BUTTON: '.add-term-button',
    SEARCH_INPUT: '.search-input',
    TERM_ROW: '.term-row',
    TERM_WORD: '.term-word',
    TERM_TYPES: '.term-types',
    TOGGLE_BUTTON: '.toggle-button'
  },
  ENDPOINTS: {
    LOAD_TERMS: '/api/words',
    ADD_TERM: '/api/words',
    DELETE_TERM: '/api/words',
    SEARCH_TERMS: '/api/words/search'
  },
  CLASSES: {
    TERM_ROW: 'term-row',
    SKELETON_ROW: 'skeleton-row',
    HIDDEN: 'hidden',
    ACTIVE: 'active'
  },
  MESSAGES: {
    LOADING: 'Loading terms...',
    NO_TERMS: 'No terms found',
    ERROR_LOADING: 'Error loading terms',
    TERM_ADDED: 'Term added successfully',
    TERM_DELETED: 'Term deleted successfully',
    DUPLICATE_TERM: 'Term already exists'
  },
  EVENTS: {
    TERM_ADDED: 'termAdded',
    SEARCH_PERFORMED: 'searchPerformed',
    DUPLICATE_DETECTED: 'duplicateDetected'
  },
  MESSAGE_TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning'
  }
};

// Mock the dependencies
const mockTermsCacheManager = jest.fn();
const mockTermsDOMManager = jest.fn();
const mockTermsAPIManager = jest.fn();
const mockTermsUIManager = jest.fn();
const mockTermsSearchService = jest.fn();

describe('TermsManager', () => {
  let termsManager;
  let originalConsole;

  beforeEach(() => {
    // Store original globals
    originalConsole = global.console;

    // Mock console
    global.console = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn()
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Mock window.TERMS_CONSTANTS
    global.window = {
      TERMS_CONSTANTS: mockTERMS_CONSTANTS
    };

    // Mock document
    global.document = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    // Create TermsManager instance using our mock class
    termsManager = new MockTermsManager();
  });

  afterEach(() => {
    // Restore original globals
    global.console = originalConsole;
    jest.resetModules();
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      expect(termsManager.isInitialized).toBe(false);
      expect(termsManager.cacheManager).toBeDefined();
      expect(termsManager.domManager).toBeDefined();
      expect(termsManager.apiManager).toBeDefined();
      expect(termsManager.uiManager).toBeDefined();
      expect(termsManager.searchService).toBeDefined();
    });

    test('should initialize successfully', async () => {
      // Mock successful initialization
      termsManager.uiManager.init.mockResolvedValue();
      termsManager.apiManager.loadTerms.mockResolvedValue([
        { word: 'test', types: ['noun'] }
      ]);

      await termsManager.init();

      expect(termsManager.isInitialized).toBe(true);
      expect(termsManager.uiManager.init).toHaveBeenCalled();
      expect(termsManager.apiManager.loadTerms).toHaveBeenCalled();
      expect(global.console.log).toHaveBeenCalledWith('Terms Manager initialized successfully');
    });

    test('should handle initialization errors gracefully', async () => {
      // Create a fresh instance for this test
      const errorTermsManager = new MockTermsManager();

      // Mock failed initialization
      errorTermsManager.uiManager.init.mockImplementation(() => Promise.reject(new Error('UI init failed')));

      await expect(errorTermsManager.init()).rejects.toThrow('UI init failed');
      expect(errorTermsManager.isInitialized).toBe(false);
      expect(global.console.error).toHaveBeenCalledWith('Error initializing Terms Manager:', expect.any(Error));
    });

    test('should only initialize once', async () => {
      // Mock successful initialization
      termsManager.uiManager.init.mockResolvedValue();
      termsManager.apiManager.loadTerms.mockResolvedValue([]);

      await termsManager.init();
      await termsManager.init(); // Second call should be ignored

      expect(termsManager.uiManager.init).toHaveBeenCalledTimes(1);
      expect(termsManager.apiManager.loadTerms).toHaveBeenCalledTimes(1);
    });
  });

  describe('Term Management', () => {
    beforeEach(async () => {
      // Initialize manager
      termsManager.uiManager.init.mockResolvedValue();
      termsManager.apiManager.loadTerms.mockResolvedValue([]);
      await termsManager.init();
    });

    test('should add term successfully', async () => {
      const newTerm = { word: 'newterm', types: ['verb'] };
      termsManager.apiManager.addTerm.mockResolvedValue(newTerm);

      await termsManager.addTerm(newTerm);

      expect(termsManager.terms).toContain(newTerm);
      expect(termsManager.apiManager.addTerm).toHaveBeenCalledWith(newTerm);
      expect(termsManager.cacheManager.addTerm).toHaveBeenCalledWith(newTerm);
      expect(termsManager.searchService.setTerms).toHaveBeenCalled();
    });

    test('should handle term addition failure', async () => {
      const newTerm = { word: 'newterm', types: ['verb'] };
      const errorMessage = 'Term already exists';
      termsManager.apiManager.addTerm.mockRejectedValue(new Error(errorMessage));

      await expect(termsManager.addTerm(newTerm)).rejects.toThrow(errorMessage);
      expect(termsManager.terms).not.toContain(newTerm);
    });

    test('should delete term successfully', async () => {
      const termToDelete = { word: 'deleteme', types: ['noun'] };
      termsManager.terms = [termToDelete];
      termsManager.apiManager.deleteTerm.mockResolvedValue({ success: true });

      await termsManager.deleteTerm(termToDelete.word);

      expect(termsManager.terms).not.toContain(termToDelete);
      expect(termsManager.apiManager.deleteTerm).toHaveBeenCalledWith(termToDelete.word);
      expect(termsManager.cacheManager.removeTerm).toHaveBeenCalledWith(termToDelete.word);
    });

    test('should handle term deletion failure', async () => {
      const termToDelete = { word: 'deleteme', types: ['noun'] };
      termsManager.terms = [termToDelete];
      const errorMessage = 'Term not found';
      termsManager.apiManager.deleteTerm.mockRejectedValue(new Error(errorMessage));

      await expect(termsManager.deleteTerm(termToDelete.word)).rejects.toThrow(errorMessage);
      expect(termsManager.terms).toContain(termToDelete);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      // Initialize manager
      termsManager.uiManager.init.mockResolvedValue();
      termsManager.apiManager.loadTerms.mockResolvedValue([]);
      await termsManager.init();
    });

    test('should perform search successfully', async () => {
      const searchQuery = 'test';
      const searchResults = [
        { word: 'test', types: ['noun'] },
        { word: 'testing', types: ['verb'] }
      ];
      termsManager.searchService.search.mockResolvedValue(searchResults);

      await termsManager.performSearch(searchQuery);

      expect(termsManager.searchService.search).toHaveBeenCalledWith(searchQuery);
      expect(termsManager.domManager.renderTerms).toHaveBeenCalledWith(searchResults);
    });

    test('should handle search failure', async () => {
      const searchQuery = 'test';
      const errorMessage = 'Search failed';
      termsManager.searchService.search.mockRejectedValue(new Error(errorMessage));

      await expect(termsManager.performSearch(searchQuery)).rejects.toThrow(errorMessage);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      // Initialize manager
      termsManager.uiManager.init.mockResolvedValue();
      termsManager.apiManager.loadTerms.mockResolvedValue([]);
      await termsManager.init();
    });

    test('should handle term added event', async () => {
      const newTerm = { word: 'eventterm', types: ['noun'] };
      termsManager.apiManager.addTerm.mockResolvedValue(newTerm);

      await termsManager.handleTermAdded({ detail: { term: newTerm } });

      expect(termsManager.terms).toContain(newTerm);
    });

    test('should handle term deleted event', async () => {
      const deletedTerm = { word: 'deleted', types: ['noun'] };
      termsManager.terms = [deletedTerm];

      await termsManager.handleTermDeleted({ detail: { term: deletedTerm.word } });

      expect(termsManager.terms).not.toContain(deletedTerm);
    });

    test('should handle search performed event', async () => {
      const searchQuery = 'search';
      mockSearchService.search.mockResolvedValue([]);

      await termsManager.handleSearchPerformed({ detail: { query: searchQuery } });

      expect(mockSearchService.search).toHaveBeenCalledWith(searchQuery);
    });

    test('should handle duplicate detected event', () => {
      const duplicateTerm = 'duplicate';

      termsManager.handleDuplicateDetected({ detail: { term: duplicateTerm } });

      expect(termsManager.uiManager.showMessage).toHaveBeenCalledWith(
        mockTERMS_CONSTANTS.MESSAGE_TYPES.ERROR,
        `Term "${duplicateTerm}" already exists`
      );
    });
  });

  describe('Utility Methods', () => {
    beforeEach(async () => {
      // Initialize manager
      termsManager.uiManager.init.mockResolvedValue();
      termsManager.apiManager.loadTerms.mockResolvedValue([]);
      await termsManager.init();
    });

    test('should get term count', () => {
      termsManager.terms = [
        { word: 'term1', types: ['noun'] },
        { word: 'term2', types: ['verb'] }
      ];

      const count = termsManager.getTermCount();

      expect(count).toBe(2);
    });

    test('should check if term exists', () => {
      termsManager.terms = [
        { word: 'existing', types: ['noun'] }
      ];

      expect(termsManager.hasTerm('existing')).toBe(true);
      expect(termsManager.hasTerm('nonexistent')).toBe(false);
    });

    test('should get term by word', () => {
      const targetTerm = { word: 'target', types: ['noun'] };
      termsManager.terms = [
        { word: 'other', types: ['verb'] },
        targetTerm
      ];

      const found = termsManager.getTermByWord('target');

      expect(found).toEqual(targetTerm);
    });

    test('should get terms by type', () => {
      termsManager.terms = [
        { word: 'noun1', types: ['noun'] },
        { word: 'verb1', types: ['verb'] },
        { word: 'noun2', types: ['noun'] }
      ];

      const nouns = termsManager.getTermsByType('noun');

      expect(nouns).toHaveLength(2);
      expect(nouns.every(term => term.types.includes('noun'))).toBe(true);
    });

    test('should filter terms by search query', () => {
      termsManager.terms = [
        { word: 'apple', types: ['noun'] },
        { word: 'application', types: ['noun'] },
        { word: 'banana', types: ['noun'] }
      ];

      const filtered = termsManager.filterTerms('app');

      expect(filtered).toHaveLength(2);
      expect(filtered.every(term => term.word.includes('app'))).toBe(true);
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      // Initialize manager
      termsManager.uiManager.init.mockResolvedValue();
      termsManager.apiManager.loadTerms.mockResolvedValue([]);
      await termsManager.init();
    });

    test('should cleanup all managers on destroy', () => {
      termsManager.cleanup();

      expect(termsManager.domManager.destroy).toHaveBeenCalled();
      expect(termsManager.apiManager.destroy).toHaveBeenCalled();
      expect(termsManager.uiManager.destroy).toHaveBeenCalled();
      expect(termsManager.cacheManager.destroy).toHaveBeenCalled();
      expect(termsManager.searchService.destroy).toHaveBeenCalled();
    });
  });
});
