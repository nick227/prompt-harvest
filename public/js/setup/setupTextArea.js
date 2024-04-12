WORD_TYPE_LIMIT = 17;
MAX_AUTO_NUM = 10;
let requestCount = 0;

async function getMatches(word) {
    return await fetch(`/word/type/${word}?limit=${WORD_TYPE_LIMIT}`).then(res => res.json());
}

function setupTextArea() {
    const textArea = document.getElementById('prompt-textarea');
    const matchesEl = document.getElementById('matches');
    const insertComma = document.querySelector('.insert-comma');
    let dropdownIsOpen = false;
    let lastMatchedWord = '';

    insertComma.addEventListener("click", function(){
        const val = textArea.value;
        if(val.length > 0 && val.charAt(val.length - 1) === " "){
            textArea.value = val.slice(0, val.length - 1);
        }
        textArea.value += ", ";
        textArea.focus();
    });

    const updateMatchesDisplay = matches => {
        matchesEl.innerHTML = matches.map(word => `<li title="${word}">${word}</li>`).join('');
        dropdownIsOpen = matches.length > 0;
    };

const handleInput = async (e) => {
    const textBeforeCursor = e.target.value.slice(0, e.target.selectionStart).trim();
    if (!textBeforeCursor || textBeforeCursor.split(/\s+/).pop().length < 3) {
        matchesEl.innerHTML = '';
        return;
    }

    let matches = [];
    const wordsBeforeCursor = textBeforeCursor.split(/\s+/);
    for (let i = 1; i <= 3; i++) {
        if (wordsBeforeCursor.length >= i) {
            lastMatchedWord = wordsBeforeCursor.slice(-i).join(' ');
            try {
                matches = await getMatches(lastMatchedWord);
                if (matches.length > 0) break;
            } catch (error) {
                console.error('A handleInput error occurred while getting matches:', error);
                return;
            }
        }
    }

    if(matches.length){
        matches.push(', ');
    }

    updateMatchesDisplay(matches);
};

const getReplacement = (innerText) => innerText === ',' ? ', ' : `\${${innerText}} `;

const getNumWordsToReplace = (dropdownIsOpen, replacement, lastMatchedWord) => 
    dropdownIsOpen && replacement !== ', ' ? (lastMatchedWord.match(/\s/g) || []).length + 1 : 0;

const getWords = (textBeforeCursor) => textBeforeCursor.split(/\s+/);

const replaceWords = (words, numWordsToReplace, replacement) => {
    if (replacement.trim() !== ',') {
        words.splice(-numWordsToReplace, numWordsToReplace, replacement.trim());
    }
    return words;
};

const appendReplacement = (replacement, newTextBeforeCursor) => {
    if (newTextBeforeCursor !== '' || replacement.trim() !== ',') {
        return replacement === ', ' ? newTextBeforeCursor.trim() + replacement : newTextBeforeCursor + ' ';
    }
    return newTextBeforeCursor;
};

const getNewTextBeforeCursor = (replacement, newTextBeforeCursor) => {
    return appendReplacement(replacement, newTextBeforeCursor);
};

const updateTextArea = (textArea, newTextBeforeCursor, textAfterCursor) => {
    textArea.value = newTextBeforeCursor + textAfterCursor;
    textArea.focus();
    textArea.selectionStart = newTextBeforeCursor.length;
    textArea.selectionEnd = newTextBeforeCursor.length;
};

const handleMatchListItemClick = e => {
    if (e.target.tagName === 'LI') {
        const replacement = getReplacement(e.target.innerText);
        let numWordsToReplace = getNumWordsToReplace(dropdownIsOpen, replacement, lastMatchedWord);

        if (replacement === ', ') {
            numWordsToReplace = 0;
        }

        const cursorPosition = textArea.selectionStart;
        const textBeforeCursor = textArea.value.slice(0, cursorPosition);
        const textAfterCursor = textArea.value.slice(cursorPosition);

        let words = getWords(textBeforeCursor);
        words = replaceWords(words, numWordsToReplace, replacement);
        let newTextBeforeCursor = words.join(' ');

        newTextBeforeCursor = getNewTextBeforeCursor(replacement, newTextBeforeCursor);
        updateTextArea(textArea, newTextBeforeCursor, textAfterCursor);
    }
};

    setupResizeEventHandler(textArea);
    setupAutoDownload();
    setupMaxNumInput();
    setupProviderClicks();
    textArea.addEventListener('input', handleInput);
    textArea.addEventListener('keydown', handleTextAreaEnterKey);
    matchesEl.addEventListener('click', handleMatchListItemClick);
    //document.querySelector('.prompt-convert').addEventListener('click', handleConvertClick);
    document.querySelector('.btn-generate').addEventListener('click', handleGenerateClick);
    document.querySelector('.all-providers').addEventListener('click', toggleAllProviders);
    document.querySelector('.help').addEventListener('click', handleHelpLinkClick);

}

function handleTextAreaEnterKey(e) {
    if (e.keyCode === 13) { // 13 is the keyCode for Enter
        e.preventDefault();
        if (e.shiftKey) {
            // If Shift+Enter was pressed, add a new line
            const value = this.value;
            const start = this.selectionStart;
            const end = this.selectionEnd;

            this.value = value.substring(0, start) + '\n' + value.substring(end);
            this.selectionStart = this.selectionEnd = start + 1;
        } else {
            // If Enter was pressed without Shift, prevent the default action (new line)
            // and trigger handleGenerateClick
            handleGenerateClick(e);
        }
    }


}

function setupResizeEventHandler(textArea){
    textArea.addEventListener('mouseup', function(e){
        localStorage.setItem('textAreaHeight', e.target.style.height);
    });
    const height = localStorage.getItem('textAreaHeight');
    if(height){
        textArea.style.height = height;
    }
}

function handleWordLiClick(){
    
    const wordTypesEl = document.querySelector('ul.word-types');
    wordTypesEl.addEventListener('click', function(e){
        if (e.target.tagName === 'LI') {
            const replacement = getReplacement(e.target.innerText);
            textArea.value = textArea.value + ' ' + replacement;

        }
    });
}

function setupAutoDownload() {
    let autoDownload = localStorage.getItem('autoDownload');
    autoDownload = autoDownload ? JSON.parse(autoDownload) : false;
    document.querySelector('input[name="autoDownload"]').checked = autoDownload;
    document.querySelector('input[name="autoDownload"]').addEventListener('change', function(e){
        localStorage.setItem('autoDownload', e.target.checked);
    });
}

function setupProviderClicks(){
    const providerCheckElms = document.querySelectorAll('input[name="providers"]');
    providerCheckElms.forEach(elm => elm.addEventListener('change', handleProviderClick));
}

function handleProviderClick(e){
    const anyProvidersChecked = document.querySelectorAll('input[name="providers"]:checked').length;
    const allProvidersCount = document.querySelectorAll('input[name="providers"]').length;
    if(anyProvidersChecked !== allProvidersCount){
        const allProvidersElm = document.querySelector('.all-providers');
        allProvidersElm.checked = false;
    }
}

function toggleAllProviders(e){
    const checkboxes = Array.from(document.querySelectorAll('input[name="providers"]'));
    checkboxes.forEach(checkbox => checkbox.checked = e.target.checked);
}

async function convertPromptUrl(prompt=null) {
    const textArea = document.getElementById('prompt-textarea');
    prompt = prompt ? prompt : encodeURIComponent(removeExtraWhiteSpace(textArea.value.trim()));
    if(!prompt){
        return false;
    }
    const multiplier = document.querySelector("#multiplier");
    const multiplierPair = multiplier.value.length ? `&multiplier=${encodeURIComponent(multiplier.value.trim().toLowerCase())}` : '';
    const mixup = document.querySelector('input[name="mixup"]:checked');
    const mixupPair = mixup ? `&mixup=true` : '';
    const customVariables = getCustomVariables();

    return `/prompt/build?prompt=${prompt}${multiplierPair}${mixupPair}${customVariables}`;
}

function removeExtraWhiteSpace(str){
    return str.replace(/\s+/g, ' ').trim();
}

async function fetchData(url) {
    const response = await fetch(url);
    return await response.json();
}

async function handleGenerateClick(e){
    const url = await convertPromptUrl();
    if(!url){
        alert('Invalid Prompt');
        return;
    }
    if(!isProviderSelected()){
        alert('Please select at least one provider');
        return;
    }
    try {
        const results = await fetchData(url);
        addPromptToOutput(results);
        await generateImage(results);
        const isAuto = document.querySelector('input[name="auto-generate"]:checked');
        const maxNum = document.querySelector('input[name="maxNum"]');

        if(isAuto && (requestCount < (maxNum.value || MAX_AUTO_NUM)-1)) {
            requestCount++;
            handleGenerateClick(e);
        } else {
            requestCount = 0;
        }

    } catch (error) {
        alert(`Error ${error}`);
    }
}

function setupMaxNumInput(){
    const localStorageMaxNum = localStorage.getItem('maxNum');
    const maxNum = document.querySelector("input[name='maxNum']");
    maxNum.setAttribute('min', 1);
    maxNum.setAttribute('max', MAX_AUTO_NUM);
    maxNum.value = localStorageMaxNum || MAX_AUTO_NUM;
    maxNum.addEventListener('change', () => {
        localStorage.setItem('maxNum', maxNum.value);
    });

    const isAuto = document.querySelector("input[name='auto-generate']");
    maxNum.disabled = !isAuto.checked;
    isAuto.addEventListener('change', () => {
        maxNum.disabled = !isAuto.checked;
    });
}

async function handleConvertClick() {
    const url = await convertPromptUrl();
    if(!url){
        alert('Invalid Prompt');
        return;
    }
    try {
        const results = await fetchData(url);
        addPromptToOutput(results);

    } catch (error) {
        console.error('An error occurred while fetching the data.', error);
    }
}