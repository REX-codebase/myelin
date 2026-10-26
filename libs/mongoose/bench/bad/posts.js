const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({ title: String, deleted: Boolean });

postSchema.pre('remove', function (next) {
  this.deleted = true;
  next();
});

const Post = mongoose.model('Post', postSchema);

async function removePost(id) {
  const doc = await Post.findById(id);
  await doc.remove();
}

async function removeOld(cutoff) {
  return Post.findOneAndRemove({ createdAt: { $lt: cutoff } });
}

module.exports = { Post, removePost, removeOld };
