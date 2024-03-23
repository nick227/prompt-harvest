import express from 'express';
import User from './User.js';
import routes from './routes.js';
//import stripe from './stripe.js';

const app = express();
new User(app);

app.use(express.static('public'));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
routes.init(app);
//stripe.init(app, express);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Prompt app listening on port ${port}!`));