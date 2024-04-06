async function setupStatsBar() {
    const response = await fetch('/images/count');
    const results = await response.json();
    const count = results.count;
    const container = document.querySelector('.stats');
    const target = document.querySelector('#image-count');
    container.classList.remove('hidden');
    target.textContent = count;
    //if count is multiple of 10 alert the user how many images they created
    if(count % 25 === 0 && count > 9){
        alert(`You have created ${count} images! These images are not not free. Please consider chipping in a few bucks. Thank You!`);
    }
}