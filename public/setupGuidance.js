const DEFAULT_GUIDANCE_VALUE = 10;

function setupGuidance(){
    const localStorageGuidance = localStorage.getItem('guidance');
    const target = document.querySelector('select[name="guidance"]');
    target.value = localStorageGuidance || DEFAULT_GUIDANCE_VALUE;
    target.addEventListener('change', function(){
        localStorage.setItem('guidance', target.value);
    });

}