import mongoose from 'mongoose';
import { Order } from './models/order.js';

export async function recentOrders(userId, limit = 10) {
  return Order.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
}

export async function countOpen(userId) {
  return Order.countDocuments({ userId, status: 'open' });
}

export async function markShipped(id) {
  return Order.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(id), status: 'paid' },
    { $set: { status: 'shipped' } },
    { returnDocument: 'after' },
  ).lean();
}

export async function getOrder(id) {
  return Order.findById(id).exec();
}
