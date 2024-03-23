async function setupWordTypeSection() {
    const words = await fetch('/words').then(res => res.json()); 
    if(words.length){
        renderWordTypes(words);
    }
}

function renderWordTypes(words) {
    const wordTypesEl = document.querySelector('ul.word-types');
    wordTypesEl.innerHTML = words.map(word => `<li title="${word}">${word}</li>`).join('');

}