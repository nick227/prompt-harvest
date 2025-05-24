function isAuth() {
    const password = prompt('Enter password');
    if (password === pwd) {
        localStorage.setItem('password', password);
        return true;
    }
    return false;
}