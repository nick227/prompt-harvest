const PROMPT_TEXT_CLASS_NAME = 'prompt-text';

function addPromptToOutput(result, className='') {
    const target = document.querySelector('.prompt-output');
    if(!target){
        return;
    }
    const value = typeof result.processed === 'string' ? result.processed : result;
    const originalVal = typeof result.original === 'string' ? result.original : "";
    const h6 = document.createElement('h6');
    const row = document.createElement('div');
    const li = document.createElement('li');
    li.className = className;

    row.className = 'row';
    h6.textContent = originalVal;
    h6.setAttribute('title', originalVal);
    h6.addEventListener('click', function(){
        navigator.clipboard.writeText(originalVal);
    });
    
    const button = document.createElement('button');
    button.addEventListener('click', handleMakeNewImageClick);
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

async function handleMakeNewImageClick(e) {
    e.preventDefault();
    originalVal = e.target.closest('li').querySelector('h6').textContent;
    const text = e.target.closest('li').querySelector('.prompt-text').textContent;
    const url = await convertPromptUrl(text);
    if(!url){
        alert('Invalid Prompt');
        return;
    }
console.log(url)
    const results = await fetchData(url);
    addPromptToOutput(results);
    await generateImage(results.processed);

    /*
    const promptObj = {
        processed: text,
        original: originalVal
    };
    console.log(promptObj)
    addPromptToOutput(promptObj, 'loading');
    await generateImage(text);

    */
}
