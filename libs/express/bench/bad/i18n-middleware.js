import express from 'express';

const app = express();

app.use((req, res, next) => {
  const lang = req.acceptsLanguage('en', 'fr', 'de') || 'en';
  req.query.lang = lang;
  res.locals.lang = lang;
  next();
});

app.get('/greeting', (req, res) => {
  const type = express.static.mime.lookup('json');
  res.type(type);
  res.send({ hello: res.locals.lang });
});

export default app;
