import session from 'express-session';
import bodyParser from 'body-parser';
import passport from 'passport';
import LocalStrategy from 'passport-local';
import bcrypt from 'bcryptjs';
import DB from './DB.js';
import dotenv from 'dotenv';

dotenv.config();

const db = new DB('users.db');
export default class User {
    constructor(app) {
        this.app = app;
        this.initializePassport();
        this.setupRoutes();
    }

    initializePassport() {
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: false }));
        this.app.use(session({
            secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: process.env.NODE_ENV === 'production', // Set to true in production with HTTPS
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
                sameSite: 'lax'
            }
        }));
        this.app.use(passport.initialize());
        this.app.use(passport.session());

        passport.use(new LocalStrategy({
                usernameField: 'email',
                passwordField: 'password'
            },
            async(email, password, done) => {
                console.log(email, password);
                try {
                    let user = await db.findOne({ email: email });
                    console.log(user);
                    if (!user) { return done(null, false); }
                    if (!bcrypt.compareSync(password, user.password)) { return done(null, false); }
                    return done(null, user);
                } catch (err) {
                    return done(err);
                }
            }
        ));

        passport.serializeUser((user, done) => {
            done(null, user._id);
        });

        passport.deserializeUser(async(id, done) => {
            try {
                let user = await db.findOne({ _id: id });
                done(null, user);
            } catch (err) {
                done(err, null);
            }
        });
    }

    setupRoutes() {
        this.app.post('/login', (req, res, next) => {
            passport.authenticate('local', (err, user, info) => {
                if (err) {
                    return next(err);
                }
                if (!user) {
                    console.log('login');
                    return res.status(400).send({ error: 'Invalid email or password' });
                }
                req.logIn(user, (err) => {
                    if (err) {
                        return next(err);
                    }
                    return res.send(user);
                });
            })(req, res, next);
        });
        this.app.post('/register', this.register.bind(this));
        this.app.get('/logout', this.logout.bind(this));
        this.app.post('/reset-password', this.resetPassword.bind(this));
        this.app.get('/user', this.getUser.bind(this));
        this.app.delete('/user', this.deleteUser.bind(this));
    }

    async register(req, res, next) {
        let { email, password } = req.body;
        let existingUser = await db.findOne({ email });
        console.log('existingUser', existingUser)
        if (existingUser) {
            return res.status(400).send({ error: 'Email is already in use' });
        }
        if (!password) {
            return res.status(400).send({ error: 'Password is required' });
        }
        let hashedPassword = bcrypt.hashSync(password, 10);
        let user = await db.insert({ email: email, password: hashedPassword });

        req.login(user, function(err) {
            if (err) { return next(err); }
            return res.send(user);
        });
    }

    // Removed unused login method - login is handled in setupRoutes

    logout(req, res) {
        req.logout(() => {
            res.send({ message: 'Logged out' });
        });
    }

    async resetPassword(req, res) {
        let { email, newPassword } = req.body;
        let user = await db.findOne({ email });
        if (!user) {
            res.status(404).send('User not found');
            return;
        }
        let hashedPassword = bcrypt.hashSync(newPassword, 10);
        await db.update({ email }, { $set: { password: hashedPassword } });
        res.send({ message: 'Password reset' });
    }

    async getUser(req, res) {
        if (!req.user) {
            res.status(401).send('Not logged in');
            return;
        }

        let user = await db.findOne({ _id: req.user._id });
        if (user) {
            res.json(user);
        } else {
            res.status(404).send('User not found');
        }
    }

    async deleteUser(req, res) {
        if (!req.user) {
            res.status(401).send('Not logged in');
            return;
        }
        let user = await db.findOne({ _id: req.user._id });
        if (!user) {
            res.status(404).send('User not found');
            return;
        }
        await db.remove({ _id: req.user._id });
        res.send({ message: 'User deleted' });
    }
}