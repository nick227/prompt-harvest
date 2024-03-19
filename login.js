import session from 'express-session';
import bodyParser from 'body-parser';
import passport from 'passport';
import LocalStrategy from 'passport-local';
import bcrypt from 'bcryptjs';
import DB from './DB.js';
import dotenv from 'dotenv';

dotenv.config();

const login = {
    setup: function(app){

        app.use(bodyParser.urlencoded({ extended: false }));
        app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
        app.use(passport.initialize());
        app.use(passport.session());
        
        passport.use(new LocalStrategy(
            function(username, password, done) {
                User.findOne({ username: username }, function(err, user) {
                    if (err) { return done(err); }
                    if (!user) { return done(null, false); }
                    if (!bcrypt.compareSync(password, user.password)) { return done(null, false); }
                    return done(null, user);
                });
            }
        ));
        
        passport.serializeUser(function(user, done) {
            done(null, user.id);
        });
        
        passport.deserializeUser(function(id, done) {
            User.findById(id, function(err, user) {
                done(err, user);
            });
        });
        
        app.get('/', (req, res) => {
            res.send('Home page');
        });
        
        app.get('/login', (req, res) => {
            res.send('Login page');
        });
        
        app.post('/login', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login' }));
        
        function ensureAuthenticated(req, res, next) {
            if (req.isAuthenticated()) { return next(); }
            res.redirect('/login');
        }
        
        app.get('/secret', ensureAuthenticated, (req, res) => {
            res.send('Secret page');
        });

    }
};

export default login;