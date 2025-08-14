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
  const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;
  // garde-fou runtime
  if (
    typeof decoded !== "object" ||
    !decoded.sub ||
    typeof decoded.sub !== "string"
  ) throw new Error("Invalid token payload");
  return decoded as TokenPayload;
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
    attachUserFromToken(req);
    if (!req.user) return res.status(401).json({ error: "Missing token" });
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try { attachUserFromToken(req); } catch { /* noop */ }
  next();
}
