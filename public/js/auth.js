function isAuth() {
    const isLocal = window.location.href.indexOf('localhost') > -1;
    if (!isLocal) {
        const password = prompt('Enter password');
        if (password.indexOf('123456') > -1) {
            localStorage.setItem('password', password);
            return true;
        }
        return false;
    }

}