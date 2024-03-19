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
            secret: process.env.SESSION_SECRET, 
            resave: false, 
            saveUninitialized: false 
        }));
        this.app.use(passport.initialize());
        this.app.use(passport.session());

        passport.use(new LocalStrategy(
            async (username, password, done) => {
                let user = await db.findOne({ username: username });
                if (!user) { return done(null, false); }
                if (!bcrypt.compareSync(password, user.password)) { return done(null, false); }
                return done(null, user);
            }
        ));

        passport.serializeUser((user, done) => {
            done(null, user._id);
        });

        passport.deserializeUser(async (id, done) => {
            let user = await db.findOne({ _id: id });
            done(null, user);
        });
    }

    setupRoutes() {
        this.app.post('/register', this.register.bind(this));
        this.app.post('/login', passport.authenticate('local'), this.login.bind(this));
        this.app.get('/logout', this.logout.bind(this));
        this.app.post('/reset-password', this.resetPassword.bind(this));
        this.app.get('/user', this.getUser.bind(this));
        this.app.delete('/user', this.deleteUser.bind(this));
    }

    async register(req, res, next) {
        let { username, password } = req.body;
        let existingUser = await db.findOne({ username });
        if (existingUser) {
            return res.status(400).send({ error: 'Username is already in use' });
        }
        if (!password) {
            return res.status(400).send({ error: 'Password is required' });
        }
        let hashedPassword = bcrypt.hashSync(password, 10);
        let user = await db.insert({ username, password: hashedPassword });

        req.login(user, function(err) {
            if (err) { return next(err); }
            return res.send(user);
        });
    }

    login(req, res) {
        res.send(req.user);
    }
    
    logout(req, res) {
    req.logout(() => {
        res.send({ message: 'Logged out' });
    });
}

    async resetPassword(req, res) {
        let { username, newPassword } = req.body;
        let user = await db.findOne({ username });
        if (!user) {
            res.status(404).send('User not found');
            return;
        }
        let hashedPassword = bcrypt.hashSync(newPassword, 10);
        await db.update({ username }, { $set: { password: hashedPassword } });
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