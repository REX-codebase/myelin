const mongoose = require('mongoose');
const Session = require('../models/session');

function sessionKey(hex) {
  return mongoose.Types.ObjectId(hex);
}

async function rotate(id) {
  const res = await Session.findOneAndUpdate(
    { _id: id },
    { token: 'new-token' },
    { new: true, rawResult: true }
  );
  return res.value;
}

module.exports = { sessionKey, rotate };
