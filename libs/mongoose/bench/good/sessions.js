import mongoose from 'mongoose';
import { Session } from './models/session.js';

export async function rotateToken(id) {
  const res = await Session.findOneAndUpdate(
    { _id: id },
    { $set: { token: crypto.randomUUID() } },
    { returnDocument: 'after', includeResultMetadata: true, upsert: false },
  );
  return res?.value ?? null;
}

export async function deleteSession(id) {
  return Session.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
}
