import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const setupPageRoutes = (app) => {
    // Serve the main application page
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/index.html'));
    });

    // Serve login page
    app.get('/login', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/login.html'));
    });

    // Serve register page
    app.get('/register', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/register.html'));
    });

    // Serve terms page
    app.get('/terms', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/terms.html'));
    });

    // Serve favicon
    app.get('/favicon.ico', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/images/favicon.png'));
    });
};
