import express from 'express';
import User from './User.js';
import routes from './routes.js';

const app = express();
new User(app);

app.use(express.static('public'));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
routes.init(app);

app.listen(3000, () => console.log('Prompt app listening on port 3000!'));