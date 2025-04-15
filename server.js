import express from 'express';
import User from './User.js';
import routes from './routes.js';

const app = express();
new User(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
routes.init(app);
app.use(express.static('public'));

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Prompt app listening on port ${port}!`));

export default app;