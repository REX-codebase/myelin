import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    name: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const User = mongoose.model('User', userSchema);

export async function listUsers(page = 1) {
  return User.find({ active: true }).sort({ createdAt: -1 }).skip((page - 1) * 20).limit(20).lean();
}

export async function countActive() {
  return User.countDocuments({ active: true });
}

export async function rename(id, name) {
  return User.updateOne({ _id: id }, { $set: { name } });
}

export async function remove(id) {
  return User.deleteOne({ _id: id });
}

export { User };
