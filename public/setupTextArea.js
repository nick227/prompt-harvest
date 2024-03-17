async function getMatches(word) {
    return await fetch(`/word/type/${word}`).then(res => res.json());
}

function setupTextArea() {
    const textArea = document.getElementById('prompt-textarea');
    const submitBtn = document.querySelector('button.submit');
    const matchesEl = document.getElementById('matches');

    let activeIndex = 0;

    const updateMatchesDisplay = matches => {
        matchesEl.innerHTML = matches.map(word => `<li>${word}</li>`).join('');
        updateModal(matches.length);
    };

    const updateModal = (visible) => {
        const modal = document.querySelector('.modal');
        if (!visible) {
            modal.style.display = 'none';
            return;
        }
        modal.style.display = 'block';
        const textAreaRect = textArea.getBoundingClientRect();


        let lineHeight = parseFloat(getComputedStyle(textArea).lineHeight);
        if (isNaN(lineHeight)) {
            let fontSize = parseFloat(getComputedStyle(textArea).fontSize);
            lineHeight = fontSize * 1.2;
        }

        let lines = textArea.value.substr(0, textArea.selectionEnd).split("\n");
        let currentLine = lines.length;

        let targetTop = textAreaRect.top + lineHeight * currentLine + 5;


        const targetLeft = textAreaRect.left + (textArea.selectionEnd * 7);
        modal.style.top = targetTop + 'px';
        modal.style.left = targetLeft + 'px';
    }

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

    textArea.addEventListener('input', handleInput);
    matchesEl.addEventListener('click', handleMatchListItemClick);
    submitBtn.addEventListener('click', handleSubmitClick);
}

async function handleSubmitClick() {
    const textArea = document.getElementById('prompt-textarea');
    if (textArea) {
        const prompt = encodeURIComponent(textArea.value.trim());
        const url = `/chat/build?prompt=${prompt}`;
        console.log('url', url);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const results = await response.json();
            console.log(results);
            const target = document.querySelector('.prompt-output');
            const button = document.createElement('button');
            button.addEventListener('click', handleNewPromptClick);
            button.textContent = 'make';
            const span = document.createElement('span');
            span.textContent = results.join(' ');
            const li = document.createElement('li');
            li.appendChild(span);
            li.appendChild(button);
            target.prepend(li);
        } catch (error) {
            console.error('An error occurred while fetching the data.', error);
        }
    }
}

async function handleNewPromptClick(e){
    const text = e.target.previousElementSibling.textContent;
    const results = await fetch(`/chat/generate?prompt=${encodeURIComponent(text)}`).then(res => res.json());
    console.log(results);
    const img = document.createElement('img');
    img.src = `data:image/jpeg;base64,${results}`;
    img.style.width = '100%';
    img.style.height = 'auto';
    const target = document.querySelector('.output');
    target.prepend(img);
    const a = document.createElement('a');
    a.href = `data:image/jpeg;base64,${results}`;
    a.download = 'image.jpeg';
    a.click();
}