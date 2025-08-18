import { Request, Response, NextFunction } from "express";
import { authMiddleware } from "./auth.middleware";

// Compat: expose requireAuth comme avant, en s'appuyant sur le nouveau middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // authMiddleware attend un AuthRequest; le cast est OK ici
  return authMiddleware(req as any, res, next);
}

export default requireAuth;
