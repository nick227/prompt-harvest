document.addEventListener('DOMContentLoaded', (event) => {

    setupModal();

    setupTextArea();

    setupFeed();

    setupStatsBar();
    
    setupGuidance();

    setupCustomVariables();

    setupToggleView();


    checkUser().then(user => {
        console.log('user', user)
        if (user) {
            renderUserUI(user.username);

        }
    });
   
});