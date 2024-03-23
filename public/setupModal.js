function setupModal(){
    const modal = document.querySelector(".modal");
    document.addEventListener("click", (e) => {
        //check if e.target !== modal or not a modal child then hide modal
        if (e.target!== modal &&!modal.contains(e.target)) {
            modal.style.display = "none";
            console.log('whut?')
            const textArea = document.querySelector('#prompt-textarea');
            updateModal(textArea, false);
        }
    });
}

const updateModal = (textArea, visible) => {
    const modal = document.querySelector('.modal');
    const matches = document.querySelector('.matches');

    modal.style.display = visible ? 'block' : 'none';
    //if (!visible) return;

    const textAreaRect = textArea.getBoundingClientRect();
    const textAreaStyle = getComputedStyle(textArea);

    let lineHeight = parseFloat(textAreaStyle.lineHeight);
    if (isNaN(lineHeight)) {
        let fontSize = parseFloat(textAreaStyle.fontSize);
        lineHeight = fontSize; 
    }

    const textAreaWidth = textArea.clientWidth;
    const charWidth = parseFloat(textAreaStyle.fontSize); 

    const textBeforeCursor = textArea.value.substring(0, textArea.selectionEnd);
    const estimatedRows = Math.ceil(textBeforeCursor.length * charWidth / textAreaWidth);

    const targetTop = textAreaRect.top + window.scrollY + (lineHeight * estimatedRows) + lineHeight;
    const targetLeft = textAreaRect.left + window.scrollX;

    modal.style.width = `${textAreaWidth}px`;
    modal.style.top = `${targetTop}px`;
    modal.style.left = `${targetLeft}px`;

    const matchesAreaRect = matches.getBoundingClientRect();
    let matchesHeight = parseFloat(matchesAreaRect.height);
    textArea.style.height = visible ? `${matchesHeight + (lineHeight * estimatedRows) + 5}px` : 'auto';
    console.log('height',textArea.style.height)

}