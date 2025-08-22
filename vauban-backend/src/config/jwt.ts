// src/config/jwt.ts
import dotenv from 'dotenv';
import { SignOptions } from 'jsonwebtoken';

dotenv.config();

// Debug: Log all environment variables (without sensitive values)
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  JWT_SECRET: process.env.JWT_SECRET ? '***' : 'NOT SET',
  CORS_ORIGINS: process.env.CORS_ORIGINS
});

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in environment variables');
  throw new Error('JWT_SECRET must be set in environment variables');
}

const jwtConfig = {
  secret: JWT_SECRET,
  signOptions: {
    expiresIn: '7d',
    algorithm: 'HS256' as const
  }
} as const;

console.log('JWT Config initialized with secret:', JWT_SECRET ? '***' : 'NOT SET');

export { jwtConfig };
