document.addEventListener('DOMContentLoaded', (event) => {

    setupModal();

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