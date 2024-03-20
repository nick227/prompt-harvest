async function setupStatsBar() {
    const response = await fetch('/feed/count');
    const results = await response.json();
    const count = results.count;
    const container = document.querySelector('.stats');
    const target = document.querySelector('#image-count');
    container.classList.remove('hidden');
    target.textContent = count;
}