// search Module - Consolidated from setupImageSearch.js and setupSearchTerm.js
class SearchManager {
    constructor() {
        this.currentSearchTerm = '';
        this.searchTimeout = null;
        this.init();
    }

    init() {
        this.setupImageSearch();
        this.setupSearchTerm();
    }

    // image Search Management
    setupImageSearch() {
        const searchInput = document.querySelector('input[name="image-search"]');

        if (!searchInput) {
            return;
        }

        // Add keyup event for immediate filtering
        searchInput.addEventListener('keyup', event => {
            this.handleImageSearch(event);
        });

        // Keep debounced input for performance on rapid typing
        searchInput.addEventListener('input', Utils.async.debounce(event => {
            this.handleImageSearch(event);
        }, 300));
    }

    handleImageSearch(event) {
        const searchValue = this.getSearchValue(event);
        const searchItems = this.getSearchItems(event);

        if (!searchValue) {
            this.showAllItems(searchItems);

            return;
        }

        searchItems.forEach(item => {
            if (this.isItemMatch(item, searchValue)) {
                this.showItem(item);
            } else {
                this.hideItem(item);
            }
        });
    }

    getSearchValue(event) {
        return event.target.value.toLowerCase();
    }

    // eslint-disable-next-line no-unused-vars
    getSearchItems(event) {
        // look for image wrapper items in the prompt output
        const imageItems = Array.from(document.querySelectorAll('.prompt-output .image-wrapper'));

        return imageItems.filter(item => item.querySelector('img') !== null);
    }

    showAllItems(searchItems) {
        searchItems.forEach(item => this.showItem(item));
    }

    isItemMatch(item, searchValue) {
        return this.checkRatingMatch(item, searchValue) ||
            this.checkTagMatch(item, searchValue) ||
            this.checkImgMatch(item, searchValue) ||
            this.checkFilenameMatch(item, searchValue) ||
            this.checkPromptMatch(item, searchValue);
    }

    checkRatingMatch(item, searchValue) {
        const ratingElement = item.querySelector('.rating');

        if (!ratingElement) {
            return false;
        }

        const ratingText = ratingElement.textContent.toLowerCase();

        return ratingText.includes(searchValue);
    }

    checkTagMatch(item, searchValue) {
        // Search in compact tags overlay
        const compactTags = item.querySelectorAll('.compact-tags-overlay span');
        // Search in list tags container
        const listTags = item.querySelectorAll('.list-tags-container span');
        // Search in any other tag elements with .tag class (legacy support)
        const legacyTags = item.querySelectorAll('.tag');

        // Combine all tag elements
        const allTags = [...compactTags, ...listTags, ...legacyTags];

        // Check if any visible tag elements match
        const tagElementsMatch = allTags.some(tag => tag.textContent.toLowerCase().includes(searchValue));

        // Also check dataset tags (stored as JSON string)
        const datasetTags = item.dataset.tags;

        if (datasetTags) {
            try {
                const parsedTags = JSON.parse(datasetTags);
                const datasetTagsMatch = Array.isArray(parsedTags) &&
                    parsedTags.some(tag => tag.toLowerCase().includes(searchValue));

                return tagElementsMatch || datasetTagsMatch;
            } catch (error) {
                // If JSON parsing fails, fall back to string search
                const datasetStringMatch = datasetTags.toLowerCase().includes(searchValue);

                return tagElementsMatch || datasetStringMatch;
            }
        }

        return tagElementsMatch;
    }

    checkImgMatch(imgElement, searchValue) {
        const img = imgElement.querySelector('img');

        if (!img) {
            return false;
        }

        const altText = (img.alt || '').toLowerCase();
        const titleText = (img.title || '').toLowerCase();
        const datasetPrompt = (img.dataset.prompt || '').toLowerCase();
        const datasetProvider = (img.dataset.provider || '').toLowerCase();

        return altText.includes(searchValue) ||
            titleText.includes(searchValue) ||
            datasetPrompt.includes(searchValue) ||
            datasetProvider.includes(searchValue);
    }

    checkFilenameMatch(item, searchValue) {
        const img = item.querySelector('img');

        if (!img || !img.src) {
            return false;
        }

        // Extract filename from src URL
        const filename = img.src.split('/').pop().split('?')[0].toLowerCase();

        return filename.includes(searchValue);
    }

    checkPromptMatch(item, searchValue) {
        const img = item.querySelector('img');

        if (!img) {
            return false;
        }

        // Check dataset prompt
        const datasetPrompt = (img.dataset.prompt || '').toLowerCase();

        // Check title attribute (often contains prompt)
        const titlePrompt = (img.title || '').toLowerCase();

        // Check alt attribute (sometimes contains prompt info)
        const altPrompt = (img.alt || '').toLowerCase();

        return datasetPrompt.includes(searchValue) ||
            titlePrompt.includes(searchValue) ||
            altPrompt.includes(searchValue);
    }

    showItem(item) {
        item.style.display = 'flex';
        item.style.visibility = 'visible';
        item.style.opacity = '1';
    }

    hideItem(item) {
        item.style.display = 'none';
        item.style.visibility = 'hidden';
        item.style.opacity = '0';
    }

    // search Term Management
    setupSearchTerm() {
        const searchInput = document.querySelector('input[name="search_term"]');

        if (!searchInput) {
            return;
        }

        searchInput.addEventListener('input', Utils.async.debounce(event => {
            this.handleSearchTerm(event);
        }, 300));
        searchInput.addEventListener('focus', () => {
            this.showSearchSuggestions();
        });
        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                this.hideSearchSuggestions();
            }, 200);
        });
    }

    handleSearchTerm(event) {
        const searchValue = event.target.value.toLowerCase();

        this.currentSearchTerm = searchValue;
        if (!searchValue) {
            this.hideSearchSuggestions();

            return;
        }

        const suggestions = this.getSearchSuggestions(searchValue);

        this.displaySearchSuggestions(suggestions);
    }

    getSearchSuggestions(searchValue) {
        const allTerms = this.getAllSearchTerms();

        return allTerms.filter(term => term.toLowerCase().includes(searchValue)).slice(0, 10);
    }

    getAllSearchTerms() {
        // this would typically come from a database or API
        // for now, we'll use a static list
        return [
            'landscape', 'portrait', 'abstract', 'realistic', 'cartoon',
            'anime', 'photography', 'digital art', 'oil painting', 'watercolor',
            'sketch', 'vector', '3d', 'minimalist', 'vintage', 'modern',
            'fantasy', 'sci-fi', 'nature', 'urban', 'architecture', 'people',
            'animals', 'food', 'technology', 'space', 'ocean', 'forest',
            'mountain', 'desert', 'city', 'village', 'castle', 'bridge'
        ];
    }

    displaySearchSuggestions(suggestions) {
        const suggestionsContainer = this.getOrCreateSuggestionsContainer();

        suggestionsContainer.innerHTML = '';
        if (suggestions.length === 0) {
            return;
        }

        suggestions.forEach(suggestion => {
            const suggestionElement = document.createElement('div');

            suggestionElement.className = 'search-suggestion';
            suggestionElement.textContent = suggestion;
            suggestionElement.addEventListener('click', () => {
                this.selectSuggestion(suggestion);
            });
            suggestionsContainer.appendChild(suggestionElement);
        });
    }

    getOrCreateSuggestionsContainer() {
        let _container = document.querySelector('.search-suggestions');

        if (!_container) {
            _container = document.createElement('div');
            _container.className = 'search-suggestions';
            const searchInput = document.querySelector('input[name="search_term"]');

            if (searchInput && searchInput.parentNode) {
                searchInput.parentNode.appendChild(_container);
            }
        }

        return _container;
    }

    showSearchSuggestions() {
        const _container = this.getOrCreateSuggestionsContainer();

        _container.style.display = 'block';
    }

    hideSearchSuggestions() {
        const _container = document.querySelector('.search-suggestions');

        if (_container) {
            _container.style.display = 'none';
        }
    }

    selectSuggestion(suggestion) {
        const searchInput = document.querySelector('input[name="search_term"]');

        if (searchInput) {
            searchInput.value = suggestion;
            this.currentSearchTerm = suggestion;
            this.hideSearchSuggestions();
            this.triggerSearchEvent(suggestion);
        }
    }

    triggerSearchEvent(searchTerm) {
        const event = new CustomEvent('searchTermSelected', {
            detail: { searchTerm }
        });

        document.dispatchEvent(event);

        // also trigger image search if there's an image search input
        const imageSearchInput = document.querySelector('input[name="image-search"]');

        if (imageSearchInput) {
            imageSearchInput.value = searchTerm;
            this.handleImageSearch({ target: { value: searchTerm } });
        }
    }

    // utility methods
    getCurrentSearchTerm() {
        return this.currentSearchTerm;
    }

    clearSearch() {
        const searchInput = document.querySelector('input[name="image-search"]');

        if (searchInput) {
            searchInput.value = '';
            this.handleImageSearch({ target: { value: '' } });
        }

        // also clear search term input
        this.clearSearchTerm();
    }

    clearSearchTerm() {
        const searchInput = document.querySelector('input[name="search_term"]');

        if (searchInput) {
            searchInput.value = '';
            this.currentSearchTerm = '';
            this.hideSearchSuggestions();
        }
    }

    // search history management
    addToSearchHistory(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            return;
        }

        let history = this.getSearchHistory();

        history = history.filter(term => term !== searchTerm);
        history.unshift(searchTerm);
        history = history.slice(0, 20); // keep only last 20 searches

        localStorage.setItem('searchHistory', JSON.stringify(history));
    }

    getSearchHistory() {
        try {
            const history = localStorage.getItem('searchHistory');

            return history ? JSON.parse(history) : [];
        } catch (error) {
            return [];
        }
    }

    clearSearchHistory() {
        localStorage.removeItem('searchHistory');
    }

    // advanced search features
    performAdvancedSearch(criteria) {
        const searchItems = this.getSearchItems({ /* Empty block */ });
        const _results = [];

        searchItems.forEach(item => {
            if (this.matchesAdvancedCriteria(item, criteria)) {
                _results.push(item);
            }
        });

        return _results;
    }

    matchesAdvancedCriteria(item, criteria) {
        // check rating criteria
        if (criteria.minRating) {
            const rating = this.getItemRating(item);

            if (rating < criteria.minRating) {
                return false;
            }
        }

        // check date criteria
        if (criteria.dateRange) {
            const itemDate = this.getItemDate(item);

            if (!this.isDateInRange(itemDate, criteria.dateRange)) {
                return false;
            }
        }

        // check tag criteria
        if (criteria.tags && criteria.tags.length > 0) {
            const itemTags = this.getItemTags(item);

            if (!criteria.tags.some(tag => itemTags.includes(tag))) {
                return false;
            }
        }

        return true;
    }

    getItemRating(item) {
        const ratingElement = item.querySelector('.rating');

        if (!ratingElement) {
            return 0;
        }
        const ratingText = ratingElement.textContent;
        const match = ratingText.match(/\d+/);

        return match ? parseInt(match[0]) : 0;
    }

    getItemDate(item) {
        const dateElement = item.querySelector('.date');

        if (!dateElement) {
            return new Date();
        }

        return new Date(dateElement.textContent);
    }

    getItemTags(item) {
        const tagElements = item.querySelectorAll('.tag');

        return Array.from(tagElements).map(tag => tag.textContent.toLowerCase());
    }

    isDateInRange(date, range) {
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        switch (range) {
            case 'today':
                return diffDays <= 1;
            case 'week':
                return diffDays <= 7;
            case 'month':
                return diffDays <= 30;
            case 'year':
                return diffDays <= 365;
            default:
                return true;
        }
    }

    getSearchStats() {
        const searchItems = this.getSearchItems({ /* Empty block */ });
        const visibleItems = searchItems.filter(item => item.style.display !== 'none');
        const hiddenItems = searchItems.filter(item => item.style.display === 'none');

        return {
            total: searchItems.length,
            visible: visibleItems.length,
            hidden: hiddenItems.length,
            searchTerm: this.currentSearchTerm
        };
    }

    // method to export search results
    exportSearchResults() {
        const searchItems = this.getSearchItems({ /* Empty block */ });
        const visibleItems = searchItems.filter(item => item.style.display !== 'none');

        return visibleItems.map(item => {
            const img = item.querySelector('img');

            return {
                id: item.dataset.id || (img && img.dataset.id),
                url: img && img.src,
                alt: img && img.alt,
                title: img && img.title,
                prompt: img && img.dataset.prompt,
                provider: img && img.dataset.provider,
                rating: item.querySelector('.rating') && item.querySelector('.rating').textContent
            };
        });
    }
}

// Export for global access
window.SearchManager = SearchManager;
window.searchManager = new SearchManager();
