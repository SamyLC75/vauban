// src/config/jwt.ts
import dotenv from 'dotenv';
import { SignOptions } from 'jsonwebtoken';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in environment variables');
}

export const jwtConfig: { secret: string; signOptions: SignOptions } = {
  secret: JWT_SECRET,
  signOptions: {
    expiresIn: '7d',
    algorithm: 'HS256'
  }
};
