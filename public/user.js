const authSection = document.getElementById('authentication');
let user = null;
async function checkUser() {
    if(!authSection){
        return;
    }
    try {
        const response = await fetch('/user', { credentials: 'include' });
        if (response.status === 401) {
            return null;
        }
        const data = await response.json();
        user = data;
        return data;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

function renderRegistrationForm() {
    authSection.innerHTML = `
    <a id="toggle-login" class="row align-right" href="javascript:void">Login</a>
        <form id="registration-form">
        <h2>Register</h2>
            <input type="text" id="register-username" placeholder="Username">
            <input type="password" id="register-password" placeholder="Password">
            <div>
            <button type="submit">Submit</button>
            </div>
        </form>
    `;
    document.getElementById('registration-form').addEventListener('submit', registerUser);
    document.getElementById('toggle-login').addEventListener('click', renderLoginForm);
}

function renderLoginForm() {
    authSection.innerHTML = `
    <a id="registration-form" class="row align-right" href="javascript:void">Register</a>
        <form id="login-form">
        <h2>Login</h2>
            <input type="text" id="login-username" placeholder="Username">
            <input type="password" id="login-password" placeholder="Password">
            <div>
            <button type="submit">Submit</button>
            </div>
        </form>
    `;
    document.getElementById('login-form').addEventListener('submit', loginUser);
    document.getElementById('registration-form').addEventListener('click', renderRegistrationForm);
}


async function registerUser(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;

    const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if(data.error){
        alert(data.error);
        return;
    }
    if (data.username) renderUserUI(data.username);
}

async function loginUser(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    try {
        const data = await response.json();
        if(data.error){
            alert(data.error);
            return;
        }
        checkUser().then(user => {
            if (user) {
                renderUserUI(user.username);
            }
            else {
                renderRegistrationForm();
            }
        });
    } catch(err){
        alert("Login failed")

    }
}

function renderUserUI(username) {
    authSection.innerHTML = `
        <div class="row align-right">
            <h3 class="user">Logged in as: ${username}</h3>
            <button id="logout-button">Logout</button>
        </div>
    `;
    document.getElementById('logout-button').addEventListener('click', logoutUser);
    //document.getElementById('reset-button').addEventListener('click', resetPassword);
    //document.getElementById('delete-button').addEventListener('click', deleteUser);
    setupFeed();
}

async function logoutUser() {
    const response = await fetch('/logout');
    const data = await response.json();
    if (data.message === 'Logged out') renderLoginForm();
}

async function resetPassword() {
    const newPassword = prompt('Enter new password');
    const response = await fetch('/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
    });
    const data = await response.json();
    alert(data.message);
}

async function deleteUser() {
    const response = await fetch('/user', { method: 'DELETE' });
    const data = await response.json();
    if (data.message === 'User deleted') renderLoginForm();
}