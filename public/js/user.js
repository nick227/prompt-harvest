// eslint-disable-next-line no-unused-vars
const authSection = document.getElementById('authWidget');
let user = null;

/*
 * register
 */

const registerUser = async(e) => {
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
        // store user data locally for immediate UI update
        user = data;
        renderUserUI(user.email);
        window.location.href = '/';
    } else {
        // error: data
    }
};

/*
 * login
 */

const loginUser = async(e) => {
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
    // store user data locally for immediate UI update
    user = data;
    renderUserUI(user.email);
    window.location.href = '/';
};

/*
 * misc
 */

const fetchWithCredentials = async endpoint => await fetch(endpoint, { credentials: 'include' });

// eslint-disable-next-line no-unused-vars
const checkUser = async() => {
    try {
        const response = await fetchWithCredentials('/user');

        if (response.status === 401) {
            return null;
        }
        if (!response.ok) {
            return null;
        }
        user = await response.json();

        return user;
    } catch (error) {
        return null;
    }
};

const fetchData = async(endpoint, email, password) => {
    const payload = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    };

    return await fetchAndHandleResponse(endpoint, payload);
};

const fetchAndHandleResponse = async(endpoint, options) => {
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
        alert('Network error. Please check your connection.');

        return null;
    }
};

const isValidEmail = email => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    return re.test(String(email).toLowerCase());
};

const renderUserUI = email => {
    // Update the header component if it exists
    if (window.headerComponent) {
        window.headerComponent.updateAuthentication({ email });
    }

    // Fallback for old authentication element
    const authentication = document.getElementById('authentication');

    if (authentication) {
        authentication.innerHTML = `
            <div class="row">
                ${email} <button id="logout-button">Logout</button>
            </div>
        `;
        const logoutButton = document.getElementById('logout-button');

        if (logoutButton) {
            logoutButton.addEventListener('click', logoutUser);
        }
    }
};

// eslint-disable-next-line no-unused-vars
const showAuthLoading = () => {
    const authentication = document.getElementById('authentication');

    if (!authentication) {
        return;
    }

    authentication.innerHTML = `
        <div class="row">
            <span>Loading...</span>
        </div>
    `;
};

const logoutUser = async() => {
    const data = await fetchAndHandleResponse('/logout');

    if (data && data.message === 'Logged out') {
        window.location.href = '/';
    }
};

const loadPageElements = () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.querySelector('button[type="submit"]').addEventListener('click', loginUser);
    }

    if (registerForm) {
        registerForm.querySelector('button[type="submit"]').addEventListener('click', registerUser);
    }
};

document.addEventListener('DOMContentLoaded', loadPageElements);
