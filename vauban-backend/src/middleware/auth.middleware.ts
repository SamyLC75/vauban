// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { jwtConfig } from "../config/jwt";

export interface TokenPayload extends JwtPayload {
  sub: string;
  username: string;
  role: "ADMIN" | "USER";
  orgId: string;
}

export interface AuthRequest extends Request {
  user?: { id: string; username: string; role: "ADMIN" | "USER"; orgId: string };
}

function decodeToken(token: string): TokenPayload {
  try {
    console.log('JWT Secret being used:', jwtConfig.secret ? '***' : 'NOT SET');
    console.log('Token being verified:', token.substring(0, 10) + '...');
    
    const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;
    
    // garde-fou runtime
    if (
      typeof decoded !== "object" ||
      !decoded.sub ||
      typeof decoded.sub !== "string"
    ) {
      console.error('Invalid token payload:', decoded);
      throw new Error("Invalid token payload");
    }
    
    return decoded as TokenPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    throw error;
  }
}

export function attachUserFromToken(req: AuthRequest): void {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return;
  const payload = decodeToken(token);
  req.user = {
    id: payload.sub,
    username: payload.username,
    role: payload.role,
    orgId: payload.orgId,
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log(`[${new Date().toISOString()}] Auth check for:`, {
      path: req.path,
      method: req.method,
      hasAuthHeader: !!req.headers.authorization,
      authHeader: req.headers.authorization ? `${req.headers.authorization.substring(0, 10)}...` : 'none'
    });
    
    attachUserFromToken(req);
    
    if (!req.user) {
      console.log('No user attached - missing or invalid token');
      return res.status(401).json({ error: "Missing token" });
    }
    
    console.log(`Authenticated user: ${req.user.username} (${req.user.role})`);
    next();
  } catch (e) {
    console.error('Authentication error:', e);
    return res.status(401).json({ error: "Invalid token" });
  }
};

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try { attachUserFromToken(req); } catch { /* noop */ }
  next();
}
