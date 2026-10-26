import mongoose from 'mongoose';

import { env } from './env.js';

export const connectDB = async () => {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });

  const { host, name } = mongoose.connection;
  console.log(`MongoDB connected: ${name} at ${host}`);
};

export const disconnectDB = async () => {
  await mongoose.connection.close();
};
