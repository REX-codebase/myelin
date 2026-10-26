const { Schema, model, promiseOrCallback } = require('mongoose');

const accountSchema = new Schema({ email: String, slug: String });

accountSchema.pre('save', function (next) {
  this.slug = this.email.toLowerCase();
  next();
});

accountSchema.pre('validate', true, function (next, done) {
  done();
});

const Account = model('Account', accountSchema);

function findOrNull(id, cb) {
  return promiseOrCallback(Account.findById(id).lean(), cb);
}

module.exports = { Account, findOrNull };
