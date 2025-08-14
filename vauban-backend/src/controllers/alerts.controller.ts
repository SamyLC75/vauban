import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { publish } from "../services/socket.service";

type Alert = { id: string; type: "urgence"|"exercice"|"information"; message: string; orgId: string; ts: string; };
const alerts: Map<string, Alert> = new Map();

export const sendTestAlert = async (req: AuthRequest, res: Response) => {
  const { type = "information", message = "Message de test" } = req.body || {};
    const orgId = req.user?.orgId || "PUBLIC";
  const id = `ALERT-${Date.now()}`;
  const alert: Alert = { id, type, message, orgId, ts: new Date().toISOString() };
  alerts.set(id, alert);
  publish("alert:new", alert, orgId);
  return res.json({ success: true, alert });
};

export const listAlerts = async (_req: Request, res: Response) => {
  return res.json({ items: Array.from(alerts.values()).sort((a,b)=> (a.ts<b.ts?1:-1)) });
};
