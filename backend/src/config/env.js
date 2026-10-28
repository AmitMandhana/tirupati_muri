import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, '../../.env'), quiet: true });

const requiredKeys = ['MONGODB_URI', 'JWT_SECRET'];
const missingKeys = requiredKeys.filter((key) => !process.env[key]?.trim());

if (missingKeys.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingKeys.join(', ')}. Copy .env.example to .env and fill in the values.`,
  );
}

if (process.env.JWT_SECRET.trim().length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long.');
}

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
// "*" must stay a string: cors treats each array entry as an exact origin.
const allowAllOrigins = allowedOrigins.includes('*');
const clientOrigins = allowAllOrigins ? '*' : allowedOrigins;

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI.trim(),
  jwtSecret: process.env.JWT_SECRET.trim(),
  clientUrl: allowAllOrigins ? '*' : allowedOrigins[0],
  clientOrigins,
  trustProxy: process.env.TRUST_PROXY === 'true',
});
