const User = require('../models/user');

function listUsers(req, res) {
  User.find({ active: true }, function (err, users) {
    if (err) return res.status(500).end();
    User.count({ active: true }, function (err, total) {
      res.json({ users, total });
    });
  });
}

function renameUser(id, name, cb) {
  User.update({ _id: id }, { $set: { name } }, cb);
}

module.exports = { listUsers, renameUser };
