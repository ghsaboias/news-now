
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const requiredEnvVars = ['PORT', 'NODE_ENV', 'JWT_SECRET', 'MONGODB_URI'];

const config = {
  port: parseInt(process.env.PORT, 10),
  nodeEnv: process.env.NODE_ENV,
  jwtSecret: process.env.JWT_SECRET,
  mongoUri: process.env.MONGODB_URI,
};

// Validate required environment variables
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Environment variable ${varName} is missing`);
  }
});

export default config;
