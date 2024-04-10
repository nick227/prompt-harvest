document.addEventListener('DOMContentLoaded', (event) => {

    setupTextArea();

    setupFeed();

    setupStatsBar();
    
    setupGuidance();

    setupCustomVariables();

    setupToggleView();

    setupImageSearch();

    setupScrollTopBar();

    setupScrollLoading();

    checkUser().then(user => {
        if (user) {
            renderUserUI(user.email);

        }
    });
   
});