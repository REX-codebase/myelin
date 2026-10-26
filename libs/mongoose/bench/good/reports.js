import mongoose from 'mongoose';
import { Order } from './models/order.js';

export async function revenueByDay(from, to) {
  return Order.aggregate([
    { $match: { status: 'paid', createdAt: { $gte: from, $lt: to } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$amount' } } },
    { $sort: { _id: 1 } },
  ]);
}

export async function bulkRename(ids, name) {
  return Order.bulkWrite(
    ids.map((id) => ({ updateOne: { filter: { _id: id }, update: { $set: { label: name } } } })),
  );
}

export async function estimated() {
  return Order.estimatedDocumentCount();
}

export const isConnected = () => mongoose.connection.readyState === 1;
