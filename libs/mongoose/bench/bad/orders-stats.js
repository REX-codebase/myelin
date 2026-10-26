const Order = require('../models/order');

async function stats(userId) {
  const total = await Order.count({ userId });
  const open = await Order.find({ userId, status: 'open' }).count();
  return { total, open };
}

function recent(userId, cb) {
  Order.find({ userId }).sort('-createdAt').limit(10).exec(function (err, rows) {
    cb(err, rows);
  });
}

module.exports = { stats, recent };
