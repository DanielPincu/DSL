import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || '',
  DB_NAME: process.env.DB_NAME || 'danish-life-simulator',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
  DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
};

export function validateEnv(): void {
  const required = ['MONGO_URI', 'JWT_SECRET'];
  const missing = required.filter((key) => !env[key as keyof typeof env]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}
