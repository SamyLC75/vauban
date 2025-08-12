import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in environment variables');
}

export const jwtConfig = {
  secret: JWT_SECRET,
  expiresIn: '7d'
};
