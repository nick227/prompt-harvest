const authSection = document.getElementById('authWidget');
let user = null;


/*
* register
*/

async function registerUser(e) {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const data = await fetchData('/register', email, password);
    if (data && data.email) {
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
    const data = await fetchData('/login', email, password);
    if (!data) {
        return;
    }
    const user = await checkUser();
    if (user) {
        window.location.href = '/';
    }
}

/*
* misc
*/

async function fetchWithCredentials(endpoint) {
    return await fetch(endpoint, { credentials: 'include' });
}

async function checkUser() {
    const response = await fetchWithCredentials('/user');
    if (response.status === 401) {
        //showRegisterLoginFormPopUp();
        return null;
    }
    user = await response.json();
    return user;
}

function showRegisterLoginFormPopUp() {
    if (window.location.pathname !== '/') {
        return;
    }
    const registerLoginForm = `<a href="/register.html" class="link" id="">Register</a> / <a href="/login.html" class="link" id="">Login</a>`;
    Swal.fire({
        html: registerLoginForm,
        width: '720',
        confirmButtonText: 'later',
      });
}

async function fetchData(endpoint, email, password) {
    const payload = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    };
    return await fetchAndHandleResponse(endpoint, payload);
}

async function fetchAndHandleResponse(endpoint, options) {
    const response = await fetch(endpoint, options);
    let data;
    if (response.body) {
        data = await response.json();
    }
    if (!response.ok) {
        alert(data.error);
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
        <div class="row">
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