import express from 'express';

const admin = express.Router();

admin.use('/*', (req, res, next) => {
  if (!req.get('x-admin-token')) return res.send(401);
  next();
});

admin.get('/report', (req, res) => {
  res.send('<h1>Report</h1>', 200);
});

export default admin;
