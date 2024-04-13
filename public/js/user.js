const authSection = document.getElementById('authWidget');
let user = null;

async function fetchWithCredentials(endpoint) {
    return await fetch(endpoint, { credentials: 'include' });
}

async function checkUser() {
    const response = await fetchWithCredentials('/user');
    if (response.status === 401) {
        //if is not currently at localhost
        if (window.location.href.indexOf('localhost') === -1) {
            alert('Please login!');
        }

        return null;
    }
    user = await response.json();
    return user;
}

async function registerUser(e) {
    const data = await fetchData(e, '/register', 'registerEmail', 'registerPassword');
    if (data && data.email) {
        window.location.href = '/';
    } else {
        console.log('error', data)
    }
}

async function logoutUser() {
    const data = await fetchAndHandleResponse('/logout');
    if (data && data.message === 'Logged out') {
        window.location.href = '/';
    }
}

async function fetchData(e, endpoint, emailId, passwordId) {
    e.preventDefault();
    const email = document.getElementById(emailId).value;
    const password = document.getElementById(passwordId).value;
    const payload = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    };
    return await fetchAndHandleResponse(endpoint, payload);
}

async function loginUser(e) {
    const data = await fetchData(e, '/login', 'loginEmail', 'loginPassword');
    if (!data) {
        alert("Login failed");
        return;
    }
    const user = await checkUser();
    if (user) {
        window.location.href = '/';
    } else {
        alert("User failed");
    }
}

async function fetchAndHandleResponse(endpoint, options) {
    const response = await fetch(endpoint, options);
    let data;
    if (response.body) {
        data = await response.json();
    }
    if (!response.ok) {
        console.log('Server error:', data);
    }
    return data;
}

function isValidEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

function renderUserUI(email) {
    const authentication = document.getElementById('authentication');
    authentication.innerHTML = `
        <div class="row align-right">
            <h3 class="user">Logged in as: ${email}</h3>
            <button id="logout-button">Logout</button>
        </div>
    `;
    document.getElementById('logout-button').addEventListener('click', logoutUser);
}

function toggleFormVisibility(showFormId, hideFormId) {
    document.getElementById(showFormId).style.display = 'block';
    document.getElementById(hideFormId).style.display = 'none';
}

function loadPageElements() {
    const showRegisterForm = document.getElementById('showRegisterForm');
    const showLoginForm = document.getElementById('showLoginForm');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (showRegisterForm) {
        showRegisterForm.addEventListener('click', e => {
            e.preventDefault();
            toggleFormVisibility('registerForm', 'loginForm');
        });
    }

    if (showLoginForm) {
        showLoginForm.addEventListener('click', e => {
            e.preventDefault();
            toggleFormVisibility('loginForm', 'registerForm');
        });
    }

    if (loginForm) {
        loginForm.querySelector('button[type="submit"]').addEventListener('click', loginUser);
    }

    if (registerForm) {
        registerForm.querySelector('button[type="submit"]').addEventListener('click', registerUser);
    }
}

document.addEventListener('DOMContentLoaded', loadPageElements);