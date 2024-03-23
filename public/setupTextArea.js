WORD_TYPE_LIMIT = 20;
MAX_AUTO_NUM = 5;

async function getMatches(word) {
    return await fetch(`/word/type/${word}?limit=${WORD_TYPE_LIMIT}`).then(res => res.json());
}

function setupTextArea() {
    const textArea = document.getElementById('prompt-textarea');
    const convertBtn = document.querySelector('.btn-convert');
    const startGeneratingBtn = document.querySelector('.btn-generate');
    const matchesEl = document.getElementById('matches');
    const toggleProviders = document.querySelector('.all-providers');

    const helpLink = document.querySelector('.help');
    let dropdownIsOpen = false;

    const updateMatchesDisplay = matches => {
        matchesEl.innerHTML = matches.map(word => `<li>${word}</li>`).join('');
        updateModal(textArea, matches.length);
        dropdownIsOpen = matches.length > 0;
    };

    let lastMatchedWord = '';

    const handleInput = async (e) => {
        const textArea = e.target;
        const cursorPosition = textArea.selectionStart;
        const textBeforeCursor = textArea.value.slice(0, cursorPosition).trim();

        if (!textBeforeCursor) {
            matchesEl.innerHTML = '';
            return;
        }

        const wordsBeforeCursor = textBeforeCursor.split(/\s+/);
        const currentWord = wordsBeforeCursor[wordsBeforeCursor.length - 1];

        if (currentWord.length < 3) {
            matchesEl.innerHTML = '';
            return;
        }

        let matches = [];
        for (let i = 1; i <= 3; i++) {
            if (wordsBeforeCursor.length >= i) {
                lastMatchedWord = wordsBeforeCursor.slice(-i).join(' ');
                try {
                    matches = await getMatches(lastMatchedWord);
                    if (matches.length > 0) break;
                } catch (error) {
                    console.error('An error occurred while getting matches:', error);
                    return;
                }
            }
        }

        if(matches.length){
            matches.push(', ');
        }

        updateMatchesDisplay(matches);
    };

const handleMatchListItemClick = e => {
    if (e.target.tagName === 'LI') {
   
        const getTextBeforeCursor = (textArea, cursorPosition) => textArea.value.slice(0, cursorPosition);
        
        const getNumWordsToReplace = (lastMatchedWord) => (lastMatchedWord.match(/\s/g) || []).length + 1;
        
        const getCursorPosition = (textArea) => textArea.selectionStart;
        
        const getTextAfterCursor = (textArea, cursorPosition) => textArea.value.slice(cursorPosition);
     
        const getReplacement = (text) => {
            return text === ',' ? ', ' : `\${${text}} `;
        }; 

        const replaceLastWords = (textBeforeCursor, numWordsToReplace, replacement) => {
        const words = textBeforeCursor.split(/\s+/);
            if (replacement.trim() === ',') {
                textBeforeCursor = textBeforeCursor.replace(/\s+$/, '');
            }
            words.splice(-numWordsToReplace, numWordsToReplace, replacement);
            return words.join(' ') + ' ';
        };
        
        const updateTextAreaValue = (textArea, newTextBeforeCursor, textAfterCursor) => {
            textArea.value = newTextBeforeCursor + textAfterCursor;
        };
        
        const updateTextAreaSelection = (textArea, newTextBeforeCursor) => {
            textArea.focus();
            textArea.selectionStart = newTextBeforeCursor.length;
            textArea.selectionEnd = newTextBeforeCursor.length;
        };

        const replacement = getReplacement(e.target.innerText);
        const numWordsToReplace = dropdownIsOpen ? getNumWordsToReplace(lastMatchedWord) : 0;
        
        const cursorPosition = getCursorPosition(textArea);
        const textBeforeCursor = getTextBeforeCursor(textArea, cursorPosition);
        const textAfterCursor = getTextAfterCursor(textArea, cursorPosition);

        const newTextBeforeCursor = replaceLastWords(textBeforeCursor, numWordsToReplace, replacement);
        updateTextAreaValue(textArea, newTextBeforeCursor, textAfterCursor);
        updateTextAreaSelection(textArea, newTextBeforeCursor);

        updateModal(textArea, true);
    }
};

    setupMaxNumInput();
    textArea.addEventListener('input', handleInput);
    matchesEl.addEventListener('click', handleMatchListItemClick);
    convertBtn.addEventListener('click', handleConvertClick);
    startGeneratingBtn.addEventListener('click', handleGenerateClick);
    toggleProviders.addEventListener('click', toggleAllProviders);
    helpLink.addEventListener('click', handleHelpLinkClick);
}

function toggleAllProviders(e){
    const checkboxes = Array.from(document.querySelectorAll('input[name="providers"]'));
    checkboxes.forEach(checkbox => checkbox.checked = e.target.checked);
}

let maxRequests = 3;
let requestCount = 0;

async function makeFeedBuildUrl() {
    const textArea = document.getElementById('prompt-textarea');
    const prompt = encodeURIComponent(textArea.value.trim());
    if(!prompt){
        return false;
    }
    const multiplier = document.querySelector("#multiplier");
    const multiplierPair = multiplier.value.length ? `&multiplier=${encodeURIComponent(multiplier.value)}` : '';
    const mixup = document.querySelector('input[name="mixup"]:checked');
    const mixupPair = mixup ? `&mixup=true` : '';

    return `/prompt/build?prompt=${prompt}${multiplierPair}${mixupPair}`;
}

async function fetchData(url) {
    const response = await fetch(url);
    return await response.json();
}

async function handleGenerateClick(e){
    const url = await makeFeedBuildUrl();
    if(!url){
        alert('Invalid Prompt');
        return;
    }
    const checkedProviders = Array.from(document.querySelectorAll('input[name="providers"]:checked')).map(input => input.value);
    if(!checkedProviders.length){
        alert('Please select at least one provider');
        return;
    }
    try {
        const results = await fetchData(url);
        await addPromptToOutput(results); 
        await generateImage(results.processed);
        const isAuto = document.querySelector('input[name="auto-generate"]:checked');
        const maxNum = document.querySelector('input[name="maxNum"]');

        if(isAuto && requestCount < (maxNum.value || maxRequests)) {
            requestCount++;
            handleGenerateClick(e);
        } else {
            requestCount = 0;
        }

    } catch (error) {
        console.error('An error occurred while fetching the data.', error);
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
    const url = await makeFeedBuildUrl();
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

async function handleNewPromptClick(e) {
    e.preventDefault();
    const text = e.target.previousElementSibling.textContent;
    await generateImage(text, e.target.closest('li'));
}
