document.addEventListener('DOMContentLoaded', (event) => {

    setupModal();

    setupTextArea();

    setupFeed();

    setupStatsBar();
    
    setupGuidance();

    setupWordTypeSection();

    setupCustomVariables();

    setupToggleView();


    checkUser().then(user => {
        if (user) {
            renderUserUI(user.username);

        } else {
            renderLoginForm();
            renderGuestUi();
        }
    });
   
});