/**
 * Admin Terms Manager - Handles term management operations
 * Single Responsibility: Manage word types and terms in admin dashboard
 */

class AdminTermsManager {
    constructor(uiRenderer) {
        this.uiRenderer = uiRenderer;
        this.currentTerms = [];
        this.isLoading = false;
        this.duplicateCheckCache = new Set();
    }

    init() {
        console.log('📚 ADMIN-TERMS: Initializing terms manager...');
        this.setupEventListeners();

        // Ensure global instance is set
        window.adminTermsManager = this;

        console.log('✅ ADMIN-TERMS: Terms manager initialized');
    }

    async renderTermsTab() {
        const termsTab = document.getElementById('terms-tab');

        if (!termsTab) {
            console.error('❌ ADMIN-TERMS: Terms tab not found');
            return;
        }

        try {
            termsTab.innerHTML = `
                <div class="admin-section">
                    <div class="admin-section-header">
                        <div class="admin-header-actions">
                            <button id="add-term-btn" class="admin-add-button" title="Add new term">
                                <i class="fas fa-plus"></i>
                                <span>Add Term</span>
                            </button>
                            <button id="refresh-terms-btn" class="btn btn-outline">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                        </div>
                    </div>

                    <div class="terms-controls">
                        <div class="search-controls">
                            <input type="text" id="terms-search" placeholder="Search terms..." class="form-control">
                            <button id="clear-search-btn" class="btn btn-outline btn-sm">
                                <i class="fas fa-times"></i> Clear
                            </button>
                        </div>
                        <div class="filter-controls">
                            <select id="terms-sort" class="form-control">
                                <option value="word">Sort by Word</option>
                                <option value="types">Sort by Types Count</option>
                                <option value="created">Sort by Created Date</option>
                            </select>
                        </div>
                    </div>

                    <div id="terms-table-container" class="table-container">
                        <div class="loading">Loading terms...</div>
                    </div>
                </div>
            `;

            // Setup event listeners
            this.setupTermsEventListeners();

            // Load terms data
            await this.loadTermsData();
        } catch (error) {
            console.error('❌ ADMIN-TERMS: Failed to render terms tab:', error);
            termsTab.innerHTML = '<div class="error-message">Failed to load terms. Please refresh the page.</div>';
        }
    }

    setupEventListeners() {
        // Listen for table action events
        window.addEventListener('admin-table-action', e => {
            const { dataType, action, id } = e.detail;
            if (dataType === 'terms') {
                this.handleTermAction(action, id);
            }
        });
    }

    setupTableEventListeners() {
        const container = document.getElementById('terms-table-container');
        if (!container) {
            return;
        }

        // Use event delegation for action buttons
        container.addEventListener('click', e => {
            const actionBtn = e.target.closest('.term-action-btn');
            if (!actionBtn) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const { action, termId } = actionBtn.dataset;

            if (action && termId) {
                this.handleTermAction(action, termId);
            }
        });
    }

    setupTermsEventListeners() {
        // Add term button
        const addTermBtn = document.getElementById('add-term-btn');
        if (addTermBtn) {
            addTermBtn.addEventListener('click', () => {
                this.showAddTermModal();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-terms-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadTermsData();
            });
        }

        // Search functionality
        const searchInput = document.getElementById('terms-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', e => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filterTerms(e.target.value);
                }, 300);
            });
        }

        // Clear search button
        const clearSearchBtn = document.getElementById('clear-search-btn');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                const searchInput = document.getElementById('terms-search');
                if (searchInput) {
                    searchInput.value = '';
                    this.filterTerms('');
                }
            });
        }

        // Sort functionality
        const sortSelect = document.getElementById('terms-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', e => {
                this.sortTerms(e.target.value);
            });
        }
    }

    async loadTermsData() {
        if (this.isLoading) {
            return;
        }

        this.isLoading = true;
        const container = document.getElementById('terms-table-container');

        try {
            container.innerHTML = '<div class="loading">Loading terms...</div>';

            const response = await fetch('/words');
            const data = await response.json();

            if (Array.isArray(data)) {
                this.currentTerms = data.map(term => ({
                    id: term.word || term.id,
                    word: term.word,
                    types: Array.isArray(term.types) ? term.types : [],
                    typesCount: Array.isArray(term.types) ? term.types.length : 0,
                    created: term.created || new Date().toISOString()
                }));

                // Update duplicate check cache
                this.duplicateCheckCache.clear();
                this.currentTerms.forEach(term => {
                    this.duplicateCheckCache.add(term.word.toLowerCase());
                });

                this.renderTermsTable();
            } else {
                throw new Error('Invalid data format received');
            }
        } catch (error) {
            console.error('❌ ADMIN-TERMS: Error loading terms:', error);
            container.innerHTML = `<div class="error-message">Failed to load terms: ${error.message}</div>`;
        } finally {
            this.isLoading = false;
        }
    }

    renderTermsTable() {
        const container = document.getElementById('terms-table-container');

        if (!this.currentTerms || this.currentTerms.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-book"></i>
                    <h3>No Terms Found</h3>
                    <p>No terms have been added yet. Click "Add Term" to get started.</p>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <div class="table-responsive">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Word</th>
                            <th>Types Count</th>
                            <th>Types Preview</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.currentTerms.map(term => `
                            <tr data-term-id="${term.id}">
                                <td>
                                    <strong>${this.escapeHtml(term.word)}</strong>
                                </td>
                                <td>
                                    <span class="badge badge-info">${term.typesCount}</span>
                                </td>
                                <td>
                                    <div class="types-preview">
                                        <span class="types-count">${term.typesCount} types</span>
                                        <div class="types-tooltip" title="${term.types.map(t => this.escapeHtml(t)).join(', ')}">
                                            <i class="fas fa-info-circle"></i>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span class="timestamp">${this.formatTimestamp(term.created)}</span>
                                </td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="btn btn-sm btn-outline term-action-btn" data-action="view" data-term-id="${term.id}" title="View Details">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-sm btn-primary term-action-btn" data-action="edit" data-term-id="${term.id}" title="Edit">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-sm btn-danger term-action-btn" data-action="delete" data-term-id="${term.id}" title="Delete">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;

        // Setup event delegation for action buttons
        this.setupTableEventListeners();
    }

    filterTerms(searchTerm) {
        if (!searchTerm.trim()) {
            this.renderTermsTable();
            return;
        }

        const filteredTerms = this.currentTerms.filter(term =>
            term.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
            term.types.some(type => type.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        // Temporarily replace current terms for rendering
        const originalTerms = this.currentTerms;
        this.currentTerms = filteredTerms;
        this.renderTermsTable();
        this.currentTerms = originalTerms;
    }

    sortTerms(sortBy) {
        switch (sortBy) {
            case 'word':
                this.currentTerms.sort((a, b) => a.word.localeCompare(b.word));
                break;
            case 'types':
                this.currentTerms.sort((a, b) => b.typesCount - a.typesCount);
                break;
            case 'created':
                this.currentTerms.sort((a, b) => new Date(b.created) - new Date(a.created));
                break;
        }
        this.renderTermsTable();
    }

    showAddTermModal() {
        const modalContent = `
            <form id="add-term-form">
                <div class="form-group">
                    <label for="new-term-word">Term Word:</label>
                    <input type="text" id="new-term-word" class="form-control" placeholder="Enter term word..." required>
                    <small class="form-text">Enter a single word or phrase to generate related terms.</small>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" id="cancel-add-term-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-magic"></i> Generate AI Terms
                    </button>
                </div>
            </form>
            <div id="add-term-status" class="status-message hidden"></div>
        `;

        window.adminModal.show('Add New Term', modalContent, { size: 'md' });

        // Setup form submission
        setTimeout(() => {
            const form = document.getElementById('add-term-form');
            if (form) {
                // Remove any existing event listeners to prevent duplicates
                form.removeEventListener('submit', this.handleFormSubmit);

                // Add new event listener
                this.handleFormSubmit = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🎭 ADMIN-TERMS: Form submitted');
                    const word = document.getElementById('new-term-word').value.trim();
                    if (word) {
                        // Close modal immediately and show progress in main section
                        window.adminModal.close();
                        this.showMainSectionProgress(word);
                        this.addNewTerm(word);
                    }
                };

                form.addEventListener('submit', this.handleFormSubmit);
            }

            // Setup cancel button
            const cancelBtn = document.getElementById('cancel-add-term-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🎭 ADMIN-TERMS: Cancel button clicked');
                    window.adminModal.close();
                });
            }

            // Focus on input
            const input = document.getElementById('new-term-word');
            if (input) {
                input.focus();
            }
        }, 100);
    }

    showMainSectionProgress(word) {
        // Find the terms section header
        const sectionHeader = document.querySelector('.admin-section .section-header');
        if (!sectionHeader) {
            console.error('❌ ADMIN-TERMS: Section header not found');
            return;
        }

        // Create progress indicator after the header
        const progressContainer = document.createElement('div');
        progressContainer.id = 'main-section-progress';
        progressContainer.className = 'main-progress-container';
        progressContainer.innerHTML = `
            <div class="main-progress-content">
                <div class="main-progress-header">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Generating AI types for "${word}"...</span>
                </div>
                <div class="main-progress-steps">
                    <div class="main-progress-step active">
                        <i class="fas fa-check-circle"></i>
                        <span>Validating term</span>
                    </div>
                    <div class="main-progress-step">
                        <i class="fas fa-brain"></i>
                        <span>Calling AI service</span>
                    </div>
                    <div class="main-progress-step">
                        <i class="fas fa-cogs"></i>
                        <span>Processing response</span>
                    </div>
                    <div class="main-progress-step">
                        <i class="fas fa-database"></i>
                        <span>Saving to database</span>
                    </div>
                    <div class="main-progress-step">
                        <i class="fas fa-sync"></i>
                        <span>Updating interface</span>
                    </div>
                </div>
            </div>
        `;

        // Insert after the section header
        sectionHeader.insertAdjacentElement('afterend', progressContainer);
    }

    updateMainSectionProgress(stepIndex, isComplete = false) {
        const progressContainer = document.getElementById('main-section-progress');
        if (!progressContainer) {
            return;
        }

        const steps = progressContainer.querySelectorAll('.main-progress-step');

        if (isComplete) {
            // Mark all steps as complete
            steps.forEach(step => {
                step.classList.remove('active');
                step.classList.add('completed');
                const icon = step.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-check-circle';
                }
            });
        } else {
            // Update current step
            steps.forEach((step, index) => {
                step.classList.remove('active', 'completed');
                const icon = step.querySelector('i');
                if (index < stepIndex) {
                    step.classList.add('completed');
                    if (icon) {
                        icon.className = 'fas fa-check-circle';
                    }
                } else if (index === stepIndex) {
                    step.classList.add('active');
                    if (icon) {
                        icon.className = 'fas fa-spinner fa-spin';
                    }
                }
            });
        }
    }

    showMainSectionSuccess(word, typesCount) {
        const progressContainer = document.getElementById('main-section-progress');
        if (!progressContainer) {
            return;
        }

        progressContainer.innerHTML = `
            <div class="main-success-content">
                <div class="main-success-header">
                    <i class="fas fa-check-circle success-icon"></i>
                    <span>Successfully added "${word}" with ${typesCount} AI-generated types!</span>
                </div>
                <div class="main-success-actions">
                    <button class="btn btn-sm btn-outline" onclick="document.getElementById('main-section-progress').remove()">
                        <i class="fas fa-times"></i> Dismiss
                    </button>
                </div>
            </div>
        `;

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (progressContainer && progressContainer.parentNode) {
                progressContainer.remove();
            }
        }, 5000);
    }

    showMainSectionError(word, errorMessage) {
        const progressContainer = document.getElementById('main-section-progress');
        if (!progressContainer) {
            return;
        }

        progressContainer.innerHTML = `
            <div class="main-error-content">
                <div class="main-error-header">
                    <i class="fas fa-exclamation-triangle error-icon"></i>
                    <span>Failed to add "${word}": ${errorMessage}</span>
                </div>
                <div class="main-error-actions">
                    <button class="btn btn-sm btn-outline" onclick="document.getElementById('main-section-progress').remove()">
                        <i class="fas fa-times"></i> Dismiss
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="document.getElementById('main-section-progress').remove(); window.adminTermsManager.showAddTermModal();">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            </div>
        `;
    }

    showImmediateProgress(word) {
        const statusDiv = document.getElementById('add-term-status');
        const submitBtn = document.querySelector('#add-term-form button[type="submit"]');
        const form = document.getElementById('add-term-form');

        // Show immediate feedback
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        statusDiv.classList.remove('hidden');
        statusDiv.innerHTML = `
            <div class="immediate-feedback">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Submitting "${word}" for AI processing...</span>
            </div>
        `;
    }

    async addNewTerm(word) {
        if (this.duplicateCheckCache.has(word.toLowerCase())) {
            this.showNotification(`Term "${word}" already exists!`, 'warning');
            return;
        }

        const statusDiv = document.getElementById('add-term-status');
        const submitBtn = document.querySelector('#add-term-form button[type="submit"]');
        const form = document.getElementById('add-term-form');

        try {
            // Update progress steps in main section
            this.updateMainSectionProgress(1); // Validating term (step 0) is already active

            // Add timeout for long-running requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, 30000); // 30 second timeout

            // Update progress: Calling AI service
            this.updateMainSectionProgress(2);

            // Call AI generation endpoint
            const response = await fetch(`/ai/word/add/${encodeURIComponent(word)}`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Update progress: Processing response
            this.updateMainSectionProgress(3);

            if (response.ok) {
                const data = await response.json();
                console.log('🎭 ADMIN-TERMS: Server response:', data);

                // Check if we got valid types - handle both direct types and nested term.types
                let { types } = data;
                if (!types && data.term && data.term.types) {
                    types = data.term.types;
                }

                if (!types || types.length === 0) {
                    throw new Error('AI service returned no types for this term. Please try a different term.');
                }

                // Update progress: Saving to database
                this.updateMainSectionProgress(4);

                // Add the new term to the table immediately (optimistic update)
                this.addTermToTable(word, { types: types });

                // Update progress: Updating interface
                this.updateMainSectionProgress(5, true); // Complete all steps

                // Show success in main section
                this.showMainSectionSuccess(word, types.length);
                this.showNotification(`Successfully added term "${word}" with ${types.length} AI-generated types`, 'success');
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to generate term types');
            }
        } catch (error) {
            console.error('❌ ADMIN-TERMS: Error adding term:', error);

            // Handle specific error types
            let errorMessage = error.message;
            if (error.name === 'AbortError') {
                errorMessage = 'Request timed out. The AI service may be taking longer than expected. Please try again.';
            } else if (error.message.includes('fetch')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            }

            // Show error in main section
            this.showMainSectionError(word, errorMessage);
            this.showNotification(`Failed to add term "${word}": ${errorMessage}`, 'error');

            // Don't add to table if there was an error
            console.log('❌ ADMIN-TERMS: Not adding term to table due to error');
        }
    }

    showProgressSteps(statusDiv, word) {
        const steps = [
            { text: 'Validating term...', icon: 'fas fa-check-circle' },
            { text: 'Calling AI service...', icon: 'fas fa-brain' },
            { text: 'Processing AI response...', icon: 'fas fa-cogs' },
            { text: 'Saving to database...', icon: 'fas fa-database' },
            { text: 'Updating interface...', icon: 'fas fa-sync' }
        ];

        let currentStep = 0;
        statusDiv.innerHTML = `
            <div class="progress-container">
                <div class="progress-header">
                    <h4>Adding "${word}"</h4>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                </div>
                <div class="progress-steps">
                    ${steps.map((step, index) => `
                        <div class="progress-step" data-step="${index}">
                            <i class="${step.icon}"></i>
                            <span>${step.text}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Animate progress steps
        const progressFill = statusDiv.querySelector('.progress-fill');
        const progressSteps = statusDiv.querySelectorAll('.progress-step');

        const updateProgress = () => {
            if (currentStep < steps.length) {
                // Update current step
                progressSteps[currentStep].classList.add('active');
                progressFill.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
                currentStep++;

                if (currentStep < steps.length) {
                    setTimeout(updateProgress, 800);
                }
            }
        };

        // Start progress animation
        setTimeout(updateProgress, 300);
    }

    showSuccessState(statusDiv, word, data) {
        statusDiv.innerHTML = `
            <div class="success-container">
                <div class="success-header">
                    <i class="fas fa-check-circle success-icon"></i>
                    <h4>Successfully Added "${word}"</h4>
                </div>
                <div class="success-details">
                    <p>✅ AI-generated types created</p>
                    <p>✅ Term saved to database</p>
                    <p>✅ Added to terms list</p>
                </div>
                <div class="success-actions">
                    <button class="btn btn-sm btn-outline" onclick="window.adminModal.close()">
                        <i class="fas fa-times"></i> Close
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="window.adminTermsManager.viewTerm('${word}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        `;
    }

    showErrorState(statusDiv, word, error) {
        statusDiv.innerHTML = `
            <div class="error-container">
                <div class="error-header">
                    <i class="fas fa-exclamation-triangle error-icon"></i>
                    <h4>Failed to Add "${word}"</h4>
                </div>
                <div class="error-details">
                    <p><strong>Error:</strong> ${error.message}</p>
                    <p><strong>Possible causes:</strong></p>
                    <ul>
                        <li>Network connection issue</li>
                        <li>AI service temporarily unavailable</li>
                        <li>Invalid term format</li>
                        <li>Server processing error</li>
                    </ul>
                </div>
                <div class="error-actions">
                    <button class="btn btn-sm btn-outline" onclick="window.adminModal.close()">
                        <i class="fas fa-times"></i> Close
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="this.closest('.error-container').style.display='none'; document.getElementById('add-term-form').style.display='block';">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            </div>
        `;

        // Hide the form and show the error
        const form = document.getElementById('add-term-form');
        if (form) {
            form.style.display = 'none';
        }
    }

    addTermToTable(word, data) {
        // Create optimistic update - add the new term to the table immediately
        const newTerm = {
            id: word,
            word: word,
            types: data.types || [],
            typesCount: data.types ? data.types.length : 0,
            created: new Date().toISOString()
        };

        // Add to current terms array
        this.currentTerms.unshift(newTerm);
        this.duplicateCheckCache.add(word.toLowerCase());

        // Re-render the table
        this.renderTermsTable();

        // Highlight the new row
        setTimeout(() => {
            const newRow = document.querySelector(`tr[data-term-id="${word}"]`);
            if (newRow) {
                newRow.classList.add('new-term-highlight');
                setTimeout(() => {
                    newRow.classList.remove('new-term-highlight');
                }, 3000);
            }
        }, 100);
    }

    viewTerm(termId) {
        const term = this.currentTerms.find(t => t.id === termId);
        if (!term) {
            return;
        }

        const modalContent = `
            <div class="term-details">
                <div class="detail-row">
                    <label>Word:</label>
                    <span class="detail-value">${this.escapeHtml(term.word)}</span>
                </div>
                <div class="detail-row">
                    <label>Types Count:</label>
                    <span class="detail-value">${term.typesCount}</span>
                </div>
                <div class="detail-row">
                    <label>Created:</label>
                    <span class="detail-value">${this.formatTimestamp(term.created)}</span>
                </div>
                <div class="detail-row">
                    <label>All Types (${term.types.length}):</label>
                    <div class="types-grid">
                        ${term.types.map(type => `<span class="type-tag">${this.escapeHtml(type)}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;

        window.adminModal.show(`Term Details: ${this.escapeHtml(term.word)}`, modalContent, { size: 'lg' });
    }

    editTerm(termId) {
        const term = this.currentTerms.find(t => t.id === termId);
        if (!term) {
            return;
        }

        const modalContent = `
            <form id="edit-term-form">
                <div class="form-group">
                    <label for="edit-term-word">Word:</label>
                    <input type="text" id="edit-term-word" class="form-control" value="${this.escapeHtml(term.word)}" required>
                </div>
                <div class="form-group">
                    <label>Types:</label>
                    <div id="edit-types-container" class="types-edit-container">
                        ${term.types.map((type, index) => `
                            <div class="type-edit-item">
                                <input type="text" class="form-control type-input" value="${this.escapeHtml(type)}" data-index="${index}">
                                <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <button type="button" class="btn btn-sm btn-outline" id="add-type-btn">
                        <i class="fas fa-plus"></i> Add Type
                    </button>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="window.adminModal.close()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
            <div id="edit-term-status" class="status-message hidden"></div>
        `;

        window.adminModal.show(`Edit Term: ${this.escapeHtml(term.word)}`, modalContent, { size: 'lg' });

        // Setup form functionality
        setTimeout(() => {
            const form = document.getElementById('edit-term-form');
            if (form) {
                form.addEventListener('submit', e => {
                    e.preventDefault();
                    this.saveTermChanges(termId);
                });
            }

            // Add type input functionality
            const addTypeBtn = document.getElementById('add-type-btn');
            if (addTypeBtn) {
                addTypeBtn.addEventListener('click', () => {
                    const container = document.getElementById('edit-types-container');
                    if (container) {
                        const newInput = document.createElement('div');
                        newInput.className = 'type-edit-item';
                        newInput.innerHTML = `
                            <input type="text" class="form-control type-input" placeholder="Enter new type..." data-index="${container.children.length}">
                            <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">
                                <i class="fas fa-trash"></i>
                            </button>
                        `;
                        container.appendChild(newInput);
                    }
                });
            }
        }, 100);
    }

    async saveTermChanges(termId) {
        const word = document.getElementById('edit-term-word').value.trim();
        const typeInputs = document.querySelectorAll('#edit-types-container .type-input');
        const types = Array.from(typeInputs)
            .map(input => input.value.trim())
            .filter(type => type.length > 0);

        if (!word) {
            this.showNotification('Word cannot be empty', 'error');
            return;
        }

        const statusDiv = document.getElementById('edit-term-status');
        const submitBtn = document.querySelector('#edit-term-form button[type="submit"]');

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            statusDiv.classList.remove('hidden');
            statusDiv.innerHTML = '<p class="status-info">Saving changes...</p>';

            // Make actual API call to update term
            const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            const response = await fetch(`/api/admin/terms/${encodeURIComponent(word)}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    word: newWord,
                    type: newType,
                    description: newDescription,
                    examples: newExamples
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to update term');
            }

            statusDiv.innerHTML = '<p class="status-success">✅ Changes saved successfully!</p>';
            this.showNotification(`Term "${word}" updated successfully`, 'success');

            setTimeout(() => {
                window.adminModal.close();
                this.loadTermsData();
            }, 1500);
        } catch (error) {
            console.error('❌ ADMIN-TERMS: Error saving term:', error);
            statusDiv.innerHTML = '<p class="status-error">❌ Failed to save changes. Please try again.</p>';
            this.showNotification(`Failed to save term: ${error.message}`, 'error');

            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Save Changes';
        }
    }

    async deleteTerm(termId) {
        const term = this.currentTerms.find(t => t.id === termId);
        if (!term) {
            return;
        }

        if (!confirm(`Are you sure you want to delete the term "${term.word}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/ai/word/delete/${encodeURIComponent(term.word)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showNotification(`Term "${term.word}" deleted successfully`, 'success');
                this.loadTermsData();
            } else {
                throw new Error('Failed to delete term');
            }
        } catch (error) {
            console.error('❌ ADMIN-TERMS: Error deleting term:', error);
            this.showNotification(`Failed to delete term: ${error.message}`, 'error');
        }
    }

    handleTermAction(action, termId) {
        switch (action) {
            case 'view':
                this.viewTerm(termId);
                break;
            case 'edit':
                this.editTerm(termId);
                break;
            case 'delete':
                this.deleteTerm(termId);
                break;
        }
    }

    // Static method to ensure global instance is available
    static ensureGlobalInstance() {
        if (!window.adminTermsManager) {
            console.warn('⚠️ ADMIN-TERMS: Global instance not found, attempting to find UI renderer...');
            // Try to find the UI renderer and get its terms manager
            if (window.adminApp && window.adminApp.uiRenderer && window.adminApp.uiRenderer.termsManager) {
                window.adminTermsManager = window.adminApp.uiRenderer.termsManager;
                console.log('✅ ADMIN-TERMS: Global instance restored from UI renderer');
            } else {
                console.error('❌ ADMIN-TERMS: Cannot restore global instance - UI renderer not found');
            }
        }
        return window.adminTermsManager;
    }

    showNotification(message, type = 'info') {
        if (this.uiRenderer && this.uiRenderer.showNotification) {
            this.uiRenderer.showNotification(message, type);
        } else {
            // Fallback notification
            const notification = document.createElement('div');
            notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
            notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
            notification.innerHTML = `
                ${message}
                <button type="button" class="close" onclick="this.parentElement.remove()">
                    <span>&times;</span>
                </button>
            `;
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }
    }

    formatTimestamp(timestamp) {
        if (!timestamp) {
            return 'Unknown';
        }
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    escapeHtml(text) {
        if (!text) {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        // Clean up global instance
        if (window.adminTermsManager === this) {
            window.adminTermsManager = null;
        }
        console.log('🗑️ ADMIN-TERMS: Terms manager destroyed');
    }
}

// Export for global access
window.AdminTermsManager = AdminTermsManager;

// Global instance for direct access
window.adminTermsManager = null;

// Fallback functions for global access
window.viewTerm = function(termId) {
    const manager = AdminTermsManager.ensureGlobalInstance();
    if (manager) {
        manager.viewTerm(termId);
    } else {
        console.error('❌ ADMIN-TERMS: Cannot access viewTerm - manager not available');
    }
};

window.editTerm = function(termId) {
    const manager = AdminTermsManager.ensureGlobalInstance();
    if (manager) {
        manager.editTerm(termId);
    } else {
        console.error('❌ ADMIN-TERMS: Cannot access editTerm - manager not available');
    }
};

window.deleteTerm = function(termId) {
    const manager = AdminTermsManager.ensureGlobalInstance();
    if (manager) {
        manager.deleteTerm(termId);
    } else {
        console.error('❌ ADMIN-TERMS: Cannot access deleteTerm - manager not available');
    }
};
