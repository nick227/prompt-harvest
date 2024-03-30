let isProcessingAddRequest = false;

function setupSearchTerm() {
    const searchTerm = document.querySelector('#term');
    const button = document.querySelector('.find');

    searchTerm.addEventListener('keyup', handleSearchTermKeyUp);
    searchTerm.addEventListener('focusout', function(){
        setTimeout(function(){
            clearTermDropDown();
        }, 200);
    });
    button.addEventListener('click', handleFindClick);
    const clearBtn = document.querySelector('.clear');
    clearBtn.addEventListener('click', handleClearBtnClick);

    setupFilterInput();
}

function handleClearBtnClick() {
    clearTypeSearchInput();
    resetTextArea();
}

function handleSearchTermKeyUp(e) {
    if (e.key === 'Enter') {
        handleFindClick();
    } else {
        addAutoDropDown(e);
    }
}

function clearTermDropDown(){
        const dropdown = document.querySelector('.dropdown');
        if (dropdown) {
            dropdown.remove();
        }
}

function addAutoDropDown(e) {
    clearTermDropDown();
    const searchTerm = document.querySelector('#term').value.toLowerCase();
    const matches = Array.from(document.querySelectorAll('.word-types li'))
        .reduce((acc, li) => {
            const text = li.textContent;
            if (text.toLowerCase().startsWith(searchTerm)) {
                acc.push(text);
            }
            return acc;
        }, []);

    if (matches.length) {
        const dropdownHtml = generateDropDownHtml(matches);
        document.querySelector(".term-container").appendChild(dropdownHtml);
    }
}

function generateDropDownHtml(matches){
    const ul = document.createElement('ul');
    ul.classList.add('dropdown');
    matches.forEach(match => {
        let li = document.createElement('li');
        li.textContent = match;
        li.addEventListener('click', handleTermMatchItemClick);
        ul.appendChild(li);
    });
    return ul;
}

function handleTermMatchItemClick(e){
    const term = e.target.textContent;
    document.querySelector('#term').value = term;
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

    clearTermDropDown();
    resetTextArea();
    await checkTermTypes(searchTerm);
}

function toggleLoading() {
    const loadingEl = document.querySelector('.loading');
    loadingEl.classList.toggle('hidden');
}

function setupFilterInput() {
    const filterInput = document.querySelector('#filterTypes');
    if(filterInput){
        filterInput.addEventListener('input', handleFilterInput);
    }   
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

async function requestWordTypes(searchTerm){
    const safeSearchTerm = makeUrlSafe(searchTerm);
    return await fetch(`/word/types/${safeSearchTerm}?limit=6`).then(res => res.json());

}

async function checkTermTypes(searchTerm) {
    const results = await requestWordTypes(searchTerm);
    if (results.length === 0) {
        await showAddTermConfirmation(searchTerm);
    } else {
        renderTermResults(results, searchTerm);
    }
}

function makeUrlSafe(term) {
    return encodeURIComponent(term).toLowerCase();
}

async function showAddTermConfirmation(searchTerm) {
    const confirm = window.confirm(`No results found for ${searchTerm}. Would you like to add it?`);
    if (confirm) {
        toggleLoading();
        isProcessingAddRequest = true;
        try {
            const safeSearchTerm = makeUrlSafe(searchTerm);
            await fetch(`ai/word/add/${safeSearchTerm}`).then(res => res.json());
            checkTermTypes(searchTerm);
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

function renderTermResults(list, searchTerm) {
    const target = document.querySelector('.term-results');

    const resultsEl = document.createElement('ul');
    resultsEl.classList.add('word-type-results');
    resultsEl.innerHTML = list.map(word => `<li>${word}</li>`).join('');
    
    const h4 = document.createElement('h4');
    h4.classList.add('word-type-results-title');
    h4.textContent = `${searchTerm}`;
    target.appendChild(h4);

    target.appendChild(resultsEl);
}