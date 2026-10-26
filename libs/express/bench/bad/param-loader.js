const express = require('express');
const app = express();

// Allow regex-style param definitions
app.param(function (name, fn) {
  if (fn instanceof RegExp) {
    return function (req, res, next, val) {
      if (fn.test(String(val))) { req.params[name] = val; next(); } else { next('route'); }
    };
  }
});

app.param('id', /^\d+$/);

app.get('/item/:id', function (req, res) {
  res.json({ id: req.params.id }, 200);
});

app.get('/user/:id?', function (req, res) {
  res.send(req.params.id ? 'user ' + req.params.id : 'all users');
});

module.exports = app;
