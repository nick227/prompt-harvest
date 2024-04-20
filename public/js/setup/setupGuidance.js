const DEFAULT_GUIDANCE_TOP_VALUE = 10;
const DEFAULT_GUIDANCE_BOTTOM_VALUE = 10;

function setupGuidanceDropDowns(){
    const top = document.querySelector('select[name="guidance-top"]');
    const bottom = document.querySelector('select[name="guidance-bottom"]');

    top.value = localStorage.getItem('guidance-top') || DEFAULT_GUIDANCE_TOP_VALUE;
    bottom.value = localStorage.getItem('guidance-bottom') || DEFAULT_GUIDANCE_BOTTOM_VALUE;

    top.addEventListener('change', function(){
        localStorage.setItem('guidance-top', top.value);
    });
    bottom.addEventListener('change', function(){
        localStorage.setItem('guidance-bottom', bottom.value);
    });

}