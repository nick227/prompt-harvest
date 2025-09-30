// search Module - Minimal version with only essential functionality
class SearchManager {
    constructor() {
        this.currentSearchTerm = '';
        this.init();
    }

    init() {
        this.setupImageSearch();
        this.setupSearchTerm();
    }

    // Image Search Management
    setupImageSearch() {
        const searchInput = document.querySelector('input[name="image-search"]');

        if (!searchInput) {
            return;
        }

        searchInput.addEventListener('input', Utils.async.debounce(event => {
            this.handleImageSearch(event);
        }, 300));
    }

    handleImageSearch(event) {
        const searchValue = event.target.value.toLowerCase();
        const searchItems = this.getSearchItems();

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

    getSearchItems() {
        const imageItems = Array.from(document.querySelectorAll('.prompt-output .image-wrapper'));

        return imageItems.filter(item => item.querySelector('img') !== null);
    }

    showAllItems(searchItems) {
        searchItems.forEach(item => this.showItem(item));
    }

    isItemMatch(item, searchValue) {
        return this.checkTagMatch(item, searchValue) ||
            this.checkImgMatch(item, searchValue) ||
            this.checkPromptMatch(item, searchValue);
    }

    checkTagMatch(item, searchValue) {
        const compactTags = item.querySelectorAll('.compact-tags-overlay span');
        const listTags = item.querySelectorAll('.list-tags-container span');
        const legacyTags = item.querySelectorAll('.tag');
        const allTags = [...compactTags, ...listTags, ...legacyTags];

        const tagElementsMatch = allTags.some(tag => tag.textContent.toLowerCase().includes(searchValue));

        const datasetTags = item.dataset.tags;

        if (datasetTags) {
            try {
                const parsedTags = JSON.parse(datasetTags);

                const datasetTagsMatch = Array.isArray(parsedTags) &&
                    parsedTags.some(tag => tag.toLowerCase().includes(searchValue));

                return tagElementsMatch || datasetTagsMatch;
            } catch (error) {

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

    checkPromptMatch(item, searchValue) {
        const img = item.querySelector('img');

        if (!img) {
            return false;
        }

        const datasetPrompt = (img.dataset.prompt || '').toLowerCase();
        const titlePrompt = (img.title || '').toLowerCase();
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

    // Search Term Management
    setupSearchTerm() {
        const searchInput = document.querySelector('input[name="search_term"]');

        if (!searchInput) {
            return;
        }

        searchInput.addEventListener('input', Utils.async.debounce(event => {
            this.handleSearchTerm(event);
        }, 300));
    }

    handleSearchTerm(event) {
        const searchValue = event.target.value.toLowerCase();

        this.currentSearchTerm = searchValue;
    }

    triggerSearchEvent(searchTerm) {

        const event = new CustomEvent('searchTermSelected', {
            detail: { searchTerm }
        });

        document.dispatchEvent(event);

        const imageSearchInput = document.querySelector('input[name="image-search"]');

        if (imageSearchInput) {
            imageSearchInput.value = searchTerm;
            this.handleImageSearch({ target: { value: searchTerm } });
        }
    }
}

// Export for global access
window.searchManager = new SearchManager();
