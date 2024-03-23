document.addEventListener('DOMContentLoaded', (event) => {

    setupModal();

    setupTextArea();
    
    setupSearchTerm();

    setupWordTypeSection();

    setupFeed();

    setupStatsBar();
    
    setupGuidance();


    checkUser().then(user => {
        if (user) {
            renderUserUI(user.username);

        } else {
            renderLoginForm();
        }
    });
});