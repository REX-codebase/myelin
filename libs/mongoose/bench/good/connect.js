import mongoose from 'mongoose';

// Mongoose 6+ no longer needs useNewUrlParser or useUnifiedTopology.
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is not set');

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error', err);
});

export async function connectDb() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  return mongoose.connection;
}
