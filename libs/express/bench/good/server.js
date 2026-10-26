import express from 'express';
import usersRouter from './users.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/.well-known', express.static('public/.well-known', { dotfiles: 'allow' }));
app.use(express.static('public'));

app.use('/users', usersRouter);

app.get('/health', (req, res) => {
  res.sendStatus(200);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message });
});

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, (error) => {
  if (error) {
    throw error;
  }
  console.log(`Listening on ${JSON.stringify(server.address())}`);
});
