const { Schema, model } = require('mongoose');

const taskSchema = new Schema({ title: String, done: Boolean, projectId: Schema.Types.ObjectId });
const Task = model('Task', taskSchema);

function markDone(taskId, cb) {
  Task.findByIdAndUpdate(taskId, { done: true }, function (err, task) {
    cb(err, task);
  });
}

function purge(projectId) {
  return Task.findOneAndRemove({ projectId }).exec();
}

module.exports = { markDone, purge };
