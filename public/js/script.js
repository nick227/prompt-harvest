document.addEventListener('DOMContentLoaded', (event) => {

    setupTextArea();

    setupFeed();

    setupStatsBar();
    
    setupGuidance();

    setupCustomVariables();

    setupToggleView();

    checkUser().then(user => {
        if (user) {
            renderUserUI(user.email);

        }
    });
   
});