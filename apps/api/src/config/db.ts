import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB(): Promise<void> {
  const uri = `${env.MONGO_URI}/${env.DB_NAME}`;
  console.log(`Connecting to MongoDB at ${env.MONGO_URI}/${env.DB_NAME}...`);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB runtime error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });
}
