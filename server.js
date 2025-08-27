import express from 'express';
import User from './User.js';
import routes from './routes.js';
import dotenv from 'dotenv';
import cors from 'cors';
import wordTypeManager from './lib/word-type-manager.js';

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


routes.init(app);
app.use(express.static('public'));

const port = process.env.PORT || 3200;

app.listen(port, async() => {
    console.log(`Prompt app listening on port ${port}!`);

    // Warm up the word type cache for better performance
    try {
        await wordTypeManager.warmupCache();
        console.log('✅ Word type cache warmed up successfully');
    } catch (error) {
        console.warn('⚠️ Failed to warm up word type cache:', error.message);
    }
});

export default app;
