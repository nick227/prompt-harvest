async function getMatches(word) {
    return await fetch(`/word/type/${word}`).then(res => res.json());
}

function setupTextArea() {
    const textArea = document.getElementById('prompt-textarea');
    const convertBtn = document.querySelector('.btn-convert');
    const startGeneratingBtn = document.querySelector('.btn-generate');
    const matchesEl = document.getElementById('matches');

    const updateMatchesDisplay = matches => {
        matchesEl.innerHTML = matches.map(word => `<li>${word}</li>`).join('');
        updateModal(textArea, matches.length);
    };

    let lastMatchedWord = '';

    const handleInput = async () => {
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
        updateMatchesDisplay(matches);
    };

    const handleMatchListItemClick = e => {
        if (e.target.tagName === 'LI') {
            const replacement = '${' + e.target.innerText + '}';
            const numWordsToReplace = (lastMatchedWord.match(/\s/g) || []).length + 1;

            const cursorPosition = textArea.selectionStart;
            const textBeforeCursor = textArea.value.slice(0, cursorPosition).trim();
            const textAfterCursor = textArea.value.slice(cursorPosition);

            const textArray = textBeforeCursor.split(/\s+/);
            textArray.splice(-numWordsToReplace, numWordsToReplace, replacement);
            textArea.value = textArray.join(' ') + textAfterCursor;
        }
    };

    setupMaxNumInput();
    textArea.addEventListener('input', handleInput);
    matchesEl.addEventListener('click', handleMatchListItemClick);
    convertBtn.addEventListener('click', handleConvertClick);
    startGeneratingBtn.addEventListener('click', handleGenerateClick);
}

let maxRequests = 3;
let requestCount = 0;

function buildUrl() {
    const textArea = document.getElementById('prompt-textarea');
    const prompt = encodeURIComponent(textArea.value.trim());
    if(!prompt){
        return;
    }
    const multiplier = document.querySelector("#multiplier");
    const multiplierPair = multiplier.value.length ? `&multiplier=${encodeURIComponent(multiplier.value)}` : '';
    const mixup = document.querySelector('input[name="auto-generate"]:checked');
    const mixupPair = mixup ? `&mixup=true` : '';

    const maxNum = document.querySelector('input[name="maxNum"]');
    const maxNumPair = maxNum ? `&maxNum=${maxNum}` : '';

    return `/chat/build?prompt=${prompt}${multiplierPair}${mixupPair}${maxNumPair}`;
}

async function fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
}

async function handleGenerateClick(e){
    const url = buildUrl();
    if(!url){
        alert('Invalid Prompt');
    }
    const checkedProviders = Array.from(document.querySelectorAll('input[name="providers"]:checked')).map(input => input.value);
    if(!checkedProviders.length){
        alert('Please select at least one provider');
        return;
    }
    try {
        const results = await fetchData(url);
        await addPromptToOutput(results); 
        await generateImage(results);
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
    const maxNum = document.querySelector("input[name='maxNum']");
    const isAuto = document.querySelector("input[name='auto-generate']");
    maxNum.disabled = !isAuto.checked;
    isAuto.addEventListener('change', () => {
        maxNum.disabled = !isAuto.checked;
    });
}

async function handleConvertClick() {
    const url = buildUrl();
    if(!url){
        alert('Invalid Prompt');
    }
    try {
        const results = await fetchData(url);
        addPromptToOutput(results);

    } catch (error) {
        console.error('An error occurred while fetching the data.', error);
    }
}

function addPromptToOutput(value) {
            const target = document.querySelector('.prompt-output');
            const button = document.createElement('button');
            button.addEventListener('click', handleNewPromptClick);
            button.textContent = 'make';
            const span = document.createElement('div');
            span.textContent = value;
            const li = document.createElement('li');
            li.appendChild(span);
            li.appendChild(button);
            target.prepend(li);
}

async function handleNewPromptClick(e) {
    e.preventDefault();
    const text = e.target.previousElementSibling.textContent;
    await generateImage(text, e.target.closest('li'));
}

async function generateImage(text, e=null){
    toggleProcessingStyle(e);
    const checkedProviders = Array.from(document.querySelectorAll('input[name="providers"]:checked')).map(input => input.value);
    const url = `/chat/generate?prompt=${encodeURIComponent(text)}&providers=${encodeURIComponent(checkedProviders)}`;
    const results = await fetch(url).then(res => res.json());
    addImageUrlToOutput(results, true);
    toggleProcessingStyle(e);
}

function toggleProcessingStyle(e=null){
    const generateBtn = document.querySelector('.btn-generate');
    const currentPrompt = e || document.querySelector('.prompt-output li:first-child');
    generateBtn.classList.toggle('processing');
    currentPrompt.classList.toggle('processing');
    generateBtn.innerText = generateBtn.innerText === 'loading...' ? "Let's Go" : 'loading...';
    generateBtn.disabled = !generateBtn.disabled;
    currentPrompt.disabled = !currentPrompt.disabled;
}

function makeFileNameSafeForWindows(name) {
    const illegalChars = /[\u0000-\u001F<>:"\/\\|?*.,;(){}[\]!@#$%^&+=`~]/g;
    const maxLength = 100;
    let safeName = name.replace(illegalChars, '')
        .replace(/\.{2,}/g, '.')
        .replace(/ /g, '-')  // Replace spaces with dashes
        .trim()
        .replace(/(^[. ]+|[. ]+$)/g, '');

    const reservedNames = ["CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"];

    if (reservedNames.includes(safeName.toUpperCase())) {
        safeName = 'file';
    }
    return safeName.slice(0, maxLength);
}