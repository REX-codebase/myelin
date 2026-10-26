import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({ email: String, slug: String });

accountSchema.pre('save', async function () {
  this.slug = this.email.toLowerCase();
});

accountSchema.pre('validate', async function () {
  if (!this.email.includes('@')) throw new Error('bad email');
});

export const Account = mongoose.model('Account', accountSchema);

export async function findAccount(id) {
  return Account.findById(id).lean();
}

export function toObjectId(hex) {
  if (!mongoose.isValidObjectId(hex)) return null;
  return new mongoose.Types.ObjectId(hex);
}
