import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { dbConfig } from '../config/database';

export class AlertController {
  async getAlerts(req: AuthRequest, res: Response) {
    const orgAlerts = Array.from(dbConfig.alerts.values())
      .filter(alert => alert.orgId === req.orgId)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    res.json({ alerts: orgAlerts });
  }

  async createAlert(req: AuthRequest, res: Response) {
    const { type, message } = req.body;
    
    const alert = {
      id: Date.now().toString(),
      type,
      message,
      senderId: req.userId,
      orgId: req.orgId,
      timestamp: new Date(),
      responses: []
    };
    
    dbConfig.alerts.set(alert.id, alert);
    
    res.json({ success: true, alert });
  }

  async respondToAlert(req: AuthRequest, res: Response) {
    const { alertId } = req.params;
    const { status, message } = req.body;
    
    const alert = dbConfig.alerts.get(alertId);
    if (!alert) {
      return res.status(404).json({ error: 'Alerte non trouvée' });
    }
    
    const response = {
      userId: req.userId,
      status,
      message,
      timestamp: new Date()
    };
    
    alert.responses.push(response);
    dbConfig.alerts.set(alertId, alert);
    
    res.json({ success: true, response });
  }
}