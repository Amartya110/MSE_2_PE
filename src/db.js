import mongoose from 'mongoose';
import { config } from './config.js';
import { Problem } from './models/problem.js';
import { Account } from './models/account.js';
import { User } from './models/user.js';

export const connectDatabase = async () => {
  if (!config.mongoUri) {
    throw new Error('MONGODB_URI is required before starting the API server.');
  }

  await mongoose.connect(config.mongoUri, {
    dbName: config.mongoDbName,
    serverSelectionTimeoutMS: 10000,
  });
  await Promise.all([Account.init(), User.init(), Problem.init()]);
  console.log(`Connected to MongoDB database "${config.mongoDbName}".`);
};

export const disconnectDatabase = () => mongoose.disconnect();
