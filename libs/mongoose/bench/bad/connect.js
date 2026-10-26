const fs = require('fs');
const mongoose = require('mongoose');

const uri = process.env.MONGO_URL;

mongoose.set('useFindAndModify', false);

mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    sslCA: fs.readFileSync('ca.pem'),
  })
  .then(() => console.log('connected'));
