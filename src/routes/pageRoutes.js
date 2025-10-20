import path from 'path';
import { fileURLToPath } from 'url';
import { requireAdminPage } from '../middleware/PageAuthMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const setupPageRoutes = app => {
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

    // Serve test widget page
    app.get('/test-widget', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/test-widget.html'));
    });

    // Serve test button page
    app.get('/test-button', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/test-button.html'));
    });

    // Serve test generation page
    app.get('/test-generation', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/test-generation.html'));
    });

    // Serve button isolation test page
    app.get('/test-button-isolated', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/test-button-isolated.html'));
    });

    // Serve favicon
    app.get('/favicon.ico', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/images/favicon.png'));
    });

    // Blog routes with SEO-friendly URLs
    app.get('/blog', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/blog/index.html'));
    });

    // Blog post creation page (client-side auth check)
    app.get('/blog/new', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/blog/post.html'));
    });

    // Dynamic blog post routes - must be after static routes
    app.get('/blog/:slug', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/blog/post-title.html'));
    });

    // Blog post editing page (client-side auth check)
    app.get('/blog/:slug/edit', (req, res) => {
        res.sendFile(path.join(__dirname, '../../public/blog/post-title-edit.html'));
    });
};
