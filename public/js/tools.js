
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

HTMLElement.prototype.addSwipe = function(callback) {
    let startX = 0;
    let startY = 0;
    let dragging = false;

    this.addEventListener('mousedown', function(e) {
        startX = e.clientX;
        startY = e.clientY;
        dragging = true;
    }, false);

    this.addEventListener('mousemove', function(e) {
        if (dragging) {
            callback(e, {dx: e.clientX - startX, dy: e.clientY - startY});
        }
    }, false);

    this.addEventListener('mouseup', function(e) {
        dragging = false;
    }, false);
}