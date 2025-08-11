import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "vauban_dev_secret";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Token manquant" });
  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // @ts-ignore : Pour TypeScript, si tu veux accéder à req.user sans déclarer de type custom
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Token invalide" });
  }
}
