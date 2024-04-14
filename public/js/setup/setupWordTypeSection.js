async function setupWordTypeSection() {
    const words = await fetch('/words').then(res => res.json()); 
    if(words.length){
        renderWordTypes(words);
    }
    setupTermCount();
}


function setupTermCount(){
    const elm = document.querySelector('#term-count');
    if(elm){
        elm.innerHTML = `${getTermCount()}`;
    }
}

function getTermCount(){
    return Array.from(document.querySelectorAll('.word-types li')).length.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function renderWordTypes(words) {
    const wordTypesEl = document.querySelector('ul.word-types');
    if(wordTypesEl){
        wordTypesEl.innerHTML = words.map(word => `<li title="${word}">${word}</li>`).join('');
    }
    wordTypesEl.addEventListener('click', handleWordTypeClick);
}

function handleWordTypeClick(e){
    const termEl = document.querySelector('#term');
    termEl.value = e.target.innerHTML;
    termEl.scrollIntoView({behavior:'smooth'});

}