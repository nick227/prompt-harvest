document.addEventListener('DOMContentLoaded', (event) => {

    setupTextArea();

    setupFeed();

    setupStatsBar();
    
    setupGuidance();

    setupCustomVariables();

    setupToggleView();

    setupImageSearch();

    setupScrollTopBar();

    checkUser().then(user => {
        if (user) {
            renderUserUI(user.email);

        }
    });
   
});