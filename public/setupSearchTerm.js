let isProcessingAddRequest = false;

function setupSearchTerm() {
    const button = document.querySelector('.find');
    button.addEventListener('click', handleFindClick);

    const clearBtn = document.querySelector('.clear');
    clearBtn.addEventListener('click', handleClearBtnClick);

    setupFilterInput();
}

function handleClearBtnClick() {
    clearTypeSearchInput();
    resetTextArea();
}

async function handleFindClick() {
    if (isProcessingAddRequest) {
        alert('Please wait for the current request to finish.');
        return;
    }
    const searchTerm = document.querySelector('#term').value;
    if (searchTerm.trim() === '') {
        alert('Please enter a search term');
        return;
    }
    resetTextArea();
    await getTermTypes(searchTerm);
}

function toggleLoading() {
    const loadingEl = document.querySelector('.loading');
    loadingEl.classList.toggle('hidden');
}

function setupFilterInput() {
    const filterInput = document.querySelector('#filterTypes');
    filterInput.addEventListener('input', handleFilterInput);
}

function handleFilterInput(e) {
    const searchTerm = e.target.value;
    const list = Array.from(document.querySelectorAll('.word-types li'));
    list.forEach(li => {
        if (li.textContent.toLowerCase().startsWith(searchTerm.toLowerCase())) {
            li.style.display = 'block';
        } else {
            li.style.display = 'none';
        }
    });
}

function clearTypeSearchInput() {
    document.querySelector('#term').value = '';
}

async function getTermTypes(searchTerm) {
    const safeSearchTerm = makeUrlSafe(searchTerm);
    const results = await fetch(`/word/types/${safeSearchTerm}`).then(res => res.json());
    if (results.length === 0) {
        await showAddTermButton(searchTerm);
    } else {
        renderTermResults(searchTerm, results);
    }
}

function makeUrlSafe(term) {
    return encodeURIComponent(term).toLowerCase();
}

async function showAddTermButton(searchTerm) {
    const confirm = window.confirm(`No results found for ${searchTerm}. Would you like to add it?`);
    if (confirm) {
        toggleLoading();
        isProcessingAddRequest = true;
        try {
            const safeSearchTerm = makeUrlSafe(searchTerm);
            await fetch(`ai/word/add/${safeSearchTerm}`).then(res => res.json());
            getTermTypes(searchTerm);
            setupWordTypeSection();
        } catch (error) {
            console.error('Error adding term:', error);
        }
        isProcessingAddRequest = false;
        toggleLoading();
    }
}

function resetTextArea() {
    const title = document.querySelector('.word-type-results-title');
    const resultsEl = document.querySelector('.word-type-results');
    if (title && resultsEl) {
        title.remove();
        resultsEl.remove();
    }
}

function renderTermResults(searchTerm, list) {
    const target = document.querySelector('.term-results');

    const resultsEl = document.createElement('ul');
    resultsEl.classList.add('word-type-results');
    resultsEl.innerHTML = list.map(word => `<li>${word}</li>`).join('');

    const h4 = document.createElement('h4');
    h4.classList.add('word-type-results-title');
    h4.textContent = `${searchTerm}:`;
    
    target.appendChild(h4);
    target.appendChild(resultsEl);
}