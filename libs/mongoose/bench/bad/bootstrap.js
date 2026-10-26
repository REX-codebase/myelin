const mongoose = require('mongoose');

const uri = process.env.MONGO_URL;

mongoose.connect(uri, { useCreateIndex: true }, function (err) {
  if (err) {
    console.error('db down', err);
    process.exit(1);
  }
  console.log('db ready');
});
