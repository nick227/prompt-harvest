import express from 'express';
import User from './auth/User.js';
import { setupRoutes } from './src/routes/index.js';
import { authenticateToken } from './src/middleware/authMiddleware.js';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();

// Enable CORS for all routes
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3200', 'http://127.0.0.1:3000', 'http://127.0.0.1:3200'],
    credentials: true
}));

new User(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply JWT authentication middleware globally
app.use(authenticateToken);

// Serve static files BEFORE setting up routes
app.use(express.static('public'));

const port = process.env.PORT || 3200;

// Setup routes and start server
setupRoutes(app).then(() => {
    app.listen(port, () => {
        console.log(`Prompt app listening on port ${port}!`);
    });
}).catch(error => {
    console.error('Failed to setup routes:', error);
    process.exit(1);
});

export default app;
