// vauban-backend/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';

export interface AuthRequest extends Request {
  userId?: string;
  username?: string;
  role?: 'admin' | 'user';
  orgId?: string;
  user?: { id: string; username: string; role: 'admin' | 'user' };
}

function attachUserFromToken(req: AuthRequest) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return;

  const decoded = jwt.verify(token, jwtConfig.secret) as any;
  // 👇 Aligne avec le payload signé lors du login: { id, username, role }
  req.userId = decoded.id;
  req.username = decoded.username;
  req.role = decoded.role;
  if (req.userId) {
    req.user = { id: req.userId, username: req.username!, role: req.role! };
  }
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    req.userId = decoded.userId;
    req.orgId = decoded.orgId;
    req.role = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};



export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try { attachUserFromToken(req); } catch { /* ignore */ }
  next();
}
