import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: String,
  deleted: { type: Boolean, default: false },
});

postSchema.pre('save', async function () {
  if (this.isModified('title')) {
    this.slug = this.title.toLowerCase().replace(/\s+/g, '-');
  }
});

postSchema.pre('deleteOne', { document: true, query: false }, async function () {
  console.log('deleting post', this._id);
});

export const Post = mongoose.model('Post', postSchema);

export async function removePost(id) {
  const post = await Post.findById(id);
  if (!post) return false;
  await post.deleteOne();
  return true;
}

export async function purgeDeleted(cutoff) {
  const result = await Post.deleteMany({ deleted: true, updatedAt: { $lt: cutoff } });
  return result.deletedCount;
}
