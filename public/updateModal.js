const updateModal = (textArea, visible) => {
    const modal = document.querySelector('.modal');
    if (!visible) {
        modal.style.display = 'none';
        return;
    }
    modal.style.display = 'block';
    const textAreaRect = textArea.getBoundingClientRect();

    const targetTop = textAreaRect.bottom + window.scrollY;
    const targetLeft = textAreaRect.left + window.scrollX;

    modal.style.top = targetTop + 'px';
    modal.style.left = targetLeft + 'px';
}