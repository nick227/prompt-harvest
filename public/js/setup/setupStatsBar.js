async function setupStatsBar() {
    const response = await fetch('/images/count');
    const results = await response.json();
    const count = results.count;
    const container = document.querySelector('.stats');
    const target = document.querySelector('#image-count');
    const costTarget = document.querySelector('#image-cost');
    //each image cost .99 of one cent calculate as costValue
    const costValue = count * .99 / 100;
    //set costValue as currency as dollars and fractions of cents
    costTarget.textContent = costValue.toLocaleString('en-US', {style: 'currency', currency: 'USD'});
    


    container.classList.remove('hidden');
    target.textContent = count;
    //if count is multiple of 10 alert the user how many images they created
    if(count % 25 === 0 && count > 9){
        alert(`You have created ${count} images! These images are not not free. Please consider chipping in a few bucks. Thank You!`);
    }
}