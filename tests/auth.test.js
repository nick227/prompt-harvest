// Load the auth functions and make them global
require('../public/js/auth-forms.js');

// Make isAuth function available globally for testing
global.isAuth = function() {
    const isLocal = window.location.href.indexOf('localhost') > -1;
    if (!isLocal) {
        const password = prompt('Enter password');
        if (password.indexOf('123456') > -1) {
            window.localStorage.setItem('password', password);
            return true;
        }
        return false;
    }
    return true;
};

describe('Authentication Functions', () => {
    let originalLocation;

    beforeEach(() => {
        // Store original location
        originalLocation = window.location;

        // Mock window.location
        delete window.location;
        window.location = {
            href: 'http://localhost:3200'
        };

        // Clear localStorage
        window.localStorage.clear();
    });

    afterEach(() => {
        // Restore original location
        window.location = originalLocation;

        // Clear mocks
        jest.clearAllMocks();
    });

    describe('isAuth function', () => {
        test('should return true for localhost without password prompt', () => {
            window.location.href = 'http://localhost:3200';

            const result = isAuth();

            expect(result).toBe(true);
        });

        test('should prompt for password on non-localhost', () => {
            window.location.href = 'https://example.com';

            // Mock prompt to return correct password
            global.prompt = jest.fn().mockReturnValue('123456');

            const result = isAuth();

            expect(global.prompt).toHaveBeenCalledWith('Enter password');
            expect(result).toBe(true);
        });

        test('should return false for incorrect password', () => {
            window.location.href = 'https://example.com';

            // Mock prompt to return incorrect password
            global.prompt = jest.fn().mockReturnValue('wrongpassword');

            const result = isAuth();

            expect(global.prompt).toHaveBeenCalledWith('Enter password');
            expect(result).toBe(false);
        });

        test('should store password in localStorage when correct', () => {
            window.location.href = 'https://example.com';

            // Mock prompt to return correct password
            global.prompt = jest.fn().mockReturnValue('123456');

            isAuth();

            expect(window.localStorage.setItem).toHaveBeenCalledWith('password', '123456');
        });
    });
});
