const mongoose = require('mongoose');
const Item = require('../models/item');

const itemSchema = new mongoose.Schema(
  { sku: String, reserved: Number },
  { skipOriginalStackTraces: true }
);

async function reserve(sku, qty) {
  const doc = await Item.findOne({ sku });
  await doc.update({ $inc: { reserved: qty } });
}

function warehouse(conn) {
  return conn.useDb('warehouse', { noListener: true });
}

module.exports = { reserve, warehouse, itemSchema };
