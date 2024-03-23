

function addPromptToOutput(prompt) {
    const value = typeof prompt.processed === 'string' ? prompt.processed : prompt;
    const originalVal = typeof prompt.original === 'string' ? prompt.original : "";
    const target = document.querySelector('.prompt-output');
    const h6 = document.createElement('h6');
    const row = document.createElement('div');
    const li = document.createElement('li');

    row.className = 'row';
    h6.textContent = 'original';
    h6.setAttribute('title', originalVal);
    h6.addEventListener('click', function(){
        navigator.clipboard.writeText(originalVal);
    });
    h6.style.width = '100%';
    h6.style.cursor = 'pointer';
    
    const button = document.createElement('button');
    button.addEventListener('click', handleNewPromptClick);
    button.textContent = 'make';

    const div = document.createElement('div');
    div.textContent = value;

    row.appendChild(div);
    row.appendChild(button);
    li.appendChild(h6);
    li.appendChild(row);

    target.prepend(li);
}