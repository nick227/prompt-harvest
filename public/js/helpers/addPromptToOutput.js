const PROMPT_TEXT_CLASS_NAME = 'prompt-text';

function addPromptToOutput(result) {
    const target = document.querySelector('.prompt-output');
    if(!target){
        return;
    }
    const value = typeof result.processed === 'string' ? result.processed : result;
    const originalVal = typeof result.original === 'string' ? result.original : "";
    const h6 = document.createElement('h6');
    const row = document.createElement('div');
    const li = document.createElement('li');

    row.className = 'row';
    h6.textContent = originalVal;
    h6.setAttribute('title', originalVal);
    h6.addEventListener('click', function(){
        navigator.clipboard.writeText(originalVal);
    });
    
    const button = document.createElement('button');
    button.addEventListener('click', handleNewPromptClick);
    button.textContent = 'make';

    const div = document.createElement('div');
    div.classList.add('link');
    div.addEventListener('click', function(){
        navigator.clipboard.writeText(value);
    });
    div.className = PROMPT_TEXT_CLASS_NAME;
    div.textContent = value;

    const divWrapper = document.createElement('div');
    divWrapper.classList.add('prompt-text-wrapper');

    divWrapper.appendChild(div);
    divWrapper.appendChild(h6);
    row.appendChild(divWrapper);
    row.appendChild(button);
    li.appendChild(row);

    target.prepend(li);
    
        li.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});
    
}

async function handleNewPromptClick(e) {
    e.preventDefault();
    const text = e.target.previousElementSibling.textContent;
    await generateImage(text, e.target.closest('li'));
}
