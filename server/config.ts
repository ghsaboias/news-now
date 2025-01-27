
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'PORT',
  'GOOGLE_PRIVATE_KEY',
  'WEBHOOK_SECRET',
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Environment variable ${varName} is required`);
  }
});

export const config = {
  port: parseInt(process.env.PORT, 10),
  google: {
    privateKey: process.env.GOOGLE_PRIVATE_KEY,
  },
  webhook: {
    secret: process.env.WEBHOOK_SECRET,
  },
};
