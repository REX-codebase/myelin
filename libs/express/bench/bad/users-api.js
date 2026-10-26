const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
app.use(bodyParser.json());

app.get('/users/:id', function (req, res, next) {
  db.users.findById(req.param('id'))
    .then(function (user) {
      if (!user) return res.send(404);
      res.json(user);
    })
    .catch(next);
});

app.post('/users', function (req, res, next) {
  db.users.create(req.body)
    .then(function (user) { res.json(user, 201); })
    .catch(next);
});

app.del('/users/:id', function (req, res, next) {
  db.users.remove(req.params.id)
    .then(function () { res.send(204); })
    .catch(next);
});

app.listen(3000, function () {
  console.log('API listening on port 3000');
});
