const authSection = document.getElementById('authWidget');
let user = null;


/*
 * register
 */

async function registerUser(e) {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    if (!isValidEmail(email)) {
        alert('Please enter a valid email address');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }

    const data = await fetchData('/register', email, password);
    if (data && data.email) {
        // Store user data locally for immediate UI update
        user = data;
        renderUserUI(user.email);
        window.location.href = '/';
    } else {
        console.log('error', data)
    }
}

/*
 * login
 */

async function loginUser(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    if (!isValidEmail(email)) {
        alert('Please enter a valid email address');
        return;
    }

    const data = await fetchData('/login', email, password);
    if (!data) {
        return;
    }
    // Store user data locally for immediate UI update
    user = data;
    renderUserUI(user.email);
    window.location.href = '/';
}

/*
 * misc
 */

async function fetchWithCredentials(endpoint) {
    return await fetch(endpoint, { credentials: 'include' });
}

async function checkUser() {
    try {
        showAuthLoading();
        const response = await fetchWithCredentials('/user');
        console.log(response);
        if (response.status === 401) {
            showLoginLink();
            return null;
        }
        if (!response.ok) {
            console.error('Error checking user:', response.status);
            showLoginLink();
            return null;
        }
        user = await response.json();
        return user;
    } catch (error) {
        console.error('Error checking user:', error);
        showLoginLink();
        return null;
    }
}

function showRegisterLoginFormPopUp() {
    if (window.location.pathname !== '/') {
        return;
    }
    const registerLoginForm = `<img src="https://picsum.photos/400/400" /><a href="/register.html" class="link" id="">register</a> / <a href="/login.html" class="link" id="">login</a>`;
    Swal.fire({
        html: registerLoginForm,
        width: '420',
        confirmButtonText: 'later',
    });
}

async function fetchData(endpoint, email, password) {
    const payload = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
    };
    return await fetchAndHandleResponse(endpoint, payload);
}

async function fetchAndHandleResponse(endpoint, options) {
    try {
        const response = await fetch(endpoint, options);
        let data;
        if (response.body) {
            data = await response.json();
        }
        if (!response.ok) {
            if (data && data.error) {
                alert(data.error);
            } else {
                alert('An error occurred. Please try again.');
            }
            return null;
        }
        return data;
    } catch (error) {
        console.error('Network error:', error);
        alert('Network error. Please check your connection.');
        return null;
    }
}

function isValidEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

function renderUserUI(email) {
    const authentication = document.getElementById('authentication');
    if (!authentication) return;

    authentication.innerHTML = `
        <div class="row">
            ${email} <a href="/logout" class="ml-8">Logout</a>
        </div>
    `;
}

function showAuthLoading() {
    const authentication = document.getElementById('authentication');
    if (!authentication) return;

    authentication.innerHTML = `
        <div class="row">
            <span>Loading...</span>
        </div>
    `;
}

function showLoginLink() {
    const authentication = document.getElementById('authentication');
    if (!authentication) return;

    authentication.innerHTML = `
        <div class="row">
            <a href="/login.html">login</a>
        </div>
    `;
}

async function logoutUser() {
    const data = await fetchAndHandleResponse('/logout', {
        method: 'GET',
        credentials: 'include'
    });
    if (data && data.message === 'Logged out') {
        user = null;
        showLoginLink();
    }
}

function loadPageElements() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.querySelector('button[type="submit"]').addEventListener('click', loginUser);
    }

    if (registerForm) {
        registerForm.querySelector('button[type="submit"]').addEventListener('click', registerUser);
    }
}

document.addEventListener('DOMContentLoaded', loadPageElements);