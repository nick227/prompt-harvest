// Terms Manager - Dedicated JavaScript for Terms Library Management
class TermsManager {
    constructor() {
        this.terms = [];
        this.isInitialized = false;
        this.init();
    }

    init() {
        console.log('TermsManager initializing...');
        this.loadTerms();
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('TermsManager initialized');
    }

    setupEventListeners() {
        // Add term button
        const addBtn = document.getElementById('addTerm');

        if (addBtn) {
            addBtn.addEventListener('click', () => this.addTerm());
        }

        // Search functionality
        const searchBtn = document.getElementById('searchBtn');
        const clearBtn = document.getElementById('clearSearch');
        const searchInput = document.getElementById('searchInput');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.searchTerms());
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSearch());
        }

        if (searchInput) {
            // Search on Enter key
            searchInput.addEventListener('keypress', e => {
                if (e.key === 'Enter') {
                    this.searchTerms();
                }
            });

            // Real-time search as you type (with debouncing)
            let searchTimeout;

            searchInput.addEventListener('input', e => {
                clearTimeout(searchTimeout);
                const searchTerm = e.target.value.trim();

                if (searchTerm.length === 0) {
                    this.clearSearch();

                    return;
                }

                // Debounce search to avoid too many API calls
                searchTimeout = setTimeout(() => {
                    this.performSearch(searchTerm);
                }, 300);
            });
        }

        // Modal close button
        const closeModal = document.getElementById('closeModal');

        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeModal());
        }

        // Close modal when clicking outside
        const modal = document.getElementById('termDetailsModal');

        if (modal) {
            modal.addEventListener('click', e => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
    }

    async loadTerms() {
        try {
            this.showLoading();
            console.log('Loading terms from API...');

            // Load terms from /words endpoint
            const response = await fetch('/words', {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.terms = await response.json();
            console.log('Loaded terms:', this.terms.length, 'terms');
            console.log('First few terms:', this.terms.slice(0, 5));

            this.renderTerms();
            this.updateTermCount();

        } catch (error) {
            console.error('Error loading terms:', error);
            this.showError(`Failed to load terms: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    async addTerm() {
        const termInput = document.getElementById('newTerm');
        const term = termInput && termInput.value ? termInput.value.trim() : '';

        if (!term) {
            this.showError('Term is required');

            return;
        }

        // Check for duplicates at client side
        const normalizedTerm = term.toLowerCase();
        const isDuplicate = this.terms.some(existingTerm => {
            // Ensure existingTerm is a string and not null/undefined
            if (typeof existingTerm !== 'string' || !existingTerm) {
                return false;
            }

            return existingTerm.toLowerCase() === normalizedTerm;
        });

        if (isDuplicate) {
            this.showError(`Term "${term}" already exists`);

            return;
        }

        try {
            this.showLoading();

            // Add term using AI endpoint
            const response = await fetch(`/ai/word/add/${encodeURIComponent(term)}`);
            const result = await response.json();

            if (result.error) {
                this.showError(`Failed to add term: ${result.error}`);

                return;
            }

            // Reload terms to get the updated list
            await this.loadTerms();

            // Clear input
            if (termInput) {
                termInput.value = '';
            }

            this.showSuccess(`Term "${term}" added successfully`);

        } catch (error) {
            console.error('Error adding term:', error);
            this.showError('Failed to add term');
        } finally {
            this.hideLoading();
        }
    }

    async searchTerms() {
        const searchInput = document.getElementById('searchInput');
        const searchTerm = searchInput && searchInput.value ? searchInput.value.trim() : '';

        if (!searchTerm) {
            this.showError('Please enter a search term');

            return;
        }

        await this.performSearch(searchTerm);
    }

    async performSearch(searchTerm) {
        try {
            this.showLoading();

            // Search for the term in the existing terms (case-insensitive)
            const normalizedSearchTerm = searchTerm.toLowerCase();
            const matchingTerms = this.terms.filter(term => {
                // Ensure term is a string and not null/undefined
                if (typeof term !== 'string' || !term) {
                    return false;
                }

                return term.toLowerCase().includes(normalizedSearchTerm);
            });

            this.displaySearchResults(matchingTerms, searchTerm);

        } catch (error) {
            console.error('Error searching terms:', error);
            this.showError('Search failed');
        } finally {
            this.hideLoading();
        }
    }

    displaySearchResults(results, searchTerm) {
        const resultsContainer = document.getElementById('searchResults');
        const contentContainer = document.getElementById('searchResultsContent');

        if (!resultsContainer || !contentContainer) {
            return;
        }

        if (results.length === 0) {
            contentContainer.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-blue-300">No terms found matching "${searchTerm}"</p>
                    <p class="text-blue-400 text-sm mt-1">Try a different search term</p>
                </div>
            `;
        } else {
            const resultsHtml = results.map(term => `
                <div class="mb-3 p-3 bg-blue-800 rounded-md cursor-pointer hover:bg-blue-700 transition-colors" onclick="termsManager.showTermDetails('${term}')">
                    <div class="font-medium text-blue-200">${term}</div>
                    <div class="text-blue-300 text-sm mt-1">Click to view details</div>
                </div>
            `).join('');

            contentContainer.innerHTML = `
                <div class="mb-2">
                    <p class="text-blue-200 text-sm">Found ${results.length} matching term${results.length === 1 ? '' : 's'}</p>
                </div>
                ${resultsHtml}
            `;
        }

        resultsContainer.classList.remove('hidden');
    }

    clearSearch() {
        const searchInput = document.getElementById('searchInput');
        const resultsContainer = document.getElementById('searchResults');

        if (searchInput) {
            searchInput.value = '';
        }
        if (resultsContainer) {
            resultsContainer.classList.add('hidden');
        }

        // Re-render the main terms list
        this.renderTerms();
    }

    async showTermDetails(term) {
        try {
            this.showLoading();

            // Get term types from API
            const response = await fetch(`/word/types/${encodeURIComponent(term)}`);
            const types = await response.json();

            this.displayTermDetails(term, types);

        } catch (error) {
            console.error('Error loading term details:', error);
            this.showError('Failed to load term details');
        } finally {
            this.hideLoading();
        }
    }

    displayTermDetails(term, types) {
        const modal = document.getElementById('termDetailsModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');

        if (!modal || !modalTitle || !modalContent) {
            return;
        }

        modalTitle.textContent = `Term: ${term}`;

        if (types && types.length > 0) {
            const typesHtml = types.map(type => `
                <span class="inline-block bg-blue-600 text-white text-sm px-3 py-1 rounded-full mr-2 mb-2">
                    ${type}
                </span>
            `).join('');

            modalContent.innerHTML = `
                <div class="mb-4">
                    <h4 class="text-lg font-medium text-gray-200 mb-2">Related Types (${types.length})</h4>
                    <div class="flex flex-wrap">
                        ${typesHtml}
                    </div>
                </div>
                <div class="text-sm text-gray-400">
                    <p>This term has ${types.length} related types that can be used in prompt generation.</p>
                </div>
            `;
        } else {
            modalContent.innerHTML = `
                <div class="text-center py-8">
                    <svg class="mx-auto h-12 w-12 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p class="text-gray-400">No related types found for this term.</p>
                    <p class="text-sm text-gray-500 mt-2">The AI will generate types when you add this term.</p>
                </div>
            `;
        }

        modal.classList.remove('hidden');
    }

    closeModal() {
        const modal = document.getElementById('termDetailsModal');

        if (modal) {
            modal.classList.add('hidden');
        }
    }

    renderTerms() {
        console.log('Rendering terms...', this.terms.length, 'terms');
        const container = document.getElementById('termsList');

        if (!container) {
            console.error('Terms container not found!');

            return;
        }

        if (this.terms.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    <p class="mt-2">No terms found</p>
                    <p class="text-sm">Add your first term above to get started</p>
                </div>
            `;

            return;
        }

        const termsHtml = this.terms
            .filter(term => typeof term === 'string' && term) // Filter out non-string and empty values
            .map(term => `
                <div class="bg-gray-600 rounded-lg p-4 cursor-pointer whitespace-nowrap" onclick="termsManager.showTermDetails('${term}')">
                    <h3 class="text-lg font-medium text-gray-200">${term}</h3>
                </div>
            `).join('');

        container.innerHTML = termsHtml;
    }

    updateTermCount() {
        const countElement = document.getElementById('termCount');

        if (countElement) {
            // Count only valid string terms
            const validTermsCount = this.terms.filter(term => typeof term === 'string' && term).length;

            countElement.textContent = validTermsCount;
        }
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');

        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');

        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    showSuccess(message) {
        const toast = document.getElementById('successToast');
        const messageEl = document.getElementById('successMessage');

        if (toast && messageEl) {
            messageEl.textContent = message;
            toast.classList.remove('translate-x-full');

            setTimeout(() => {
                toast.classList.add('translate-x-full');
            }, 3000);
        }
    }

    showError(message) {
        const toast = document.getElementById('errorToast');
        const messageEl = document.getElementById('errorMessage');

        if (toast && messageEl) {
            messageEl.textContent = message;
            toast.classList.remove('translate-x-full');

            setTimeout(() => {
                toast.classList.add('translate-x-full');
            }, 3000);
        }
    }
}

// Initialize Terms Manager
const termsManager = new TermsManager();

// Export for global access
window.termsManager = termsManager;
