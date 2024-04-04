const authSection = document.getElementById('authWidget');
let user = null;

async function fetchWithCredentials(endpoint) {
    return await fetch(endpoint, { credentials: 'include' });
}

async function fetchAndHandleResponse(endpoint, options) {
    const response = await fetch(endpoint, options);
    if (!response.ok) {
        return null;
    }
    const data = await response.json();
    return data;
}

async function checkUser() {
    const response = await fetchWithCredentials('/user');
    if (response.status === 401) {
        return null;
    }
    user = await response.json();
    return user;
}

async function registerUser(e) {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    if(!isValidEmail(email)){
        alert("Invalid email address");
        return;
    }
    const password = document.getElementById('registerPassword').value;
    const data = await fetchAndHandleResponse('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (data && data.email) {
        window.location.href = '/';
    } else {
        console.log(data)
    }
}

function isValidEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

async function loginUser(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) {
        alert("Please enter email and password");
        return;
    }
    if(!isValidEmail(email)){
        alert("Invalid Login");
        return;
    }
    const data = await fetchAndHandleResponse('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email:email, password:password })
    });
    if (data) {
        const user = await checkUser();
        if (user) {
            window.location.href = '/';
        } else {
            alert("User failed");
        }
    } else {
        alert("Login failed");
    }
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

async function logoutUser() {
    const data = await fetchAndHandleResponse('/logout');
    if (data && data.message === 'Logged out') {
        window.location.href = '/';
    }
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