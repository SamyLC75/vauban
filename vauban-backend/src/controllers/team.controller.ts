import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { dbConfig } from '../config/database';

export class TeamController {
  async getTeamMembers(req: AuthRequest, res: Response) {
    const members = Array.from(dbConfig.users.values())
      .filter(user => user.orgId === req.user!.orgId)
      .map(user => ({
        id: user.id,
        pseudonym: user.pseudonym,
        frenchCode: user.frenchCode,
        role: user.role,
        status: user.status || 'unknown',
        lastSeen: user.lastSeen || new Date()
      }));
    
    res.json({ members });
  }

  async updateStatus(req: AuthRequest, res: Response) {
    const { status } = req.body;
    
    const user = dbConfig.users.get(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    user.status = status;
    user.lastSeen = new Date();
    dbConfig.users.set(req.user!.id, user);
    
    res.json({ success: true, status });
  }

  async addMember(req: AuthRequest, res: Response) {
    const { name, role, phone, email } = req.body;
    const { FrenchCodesService } = require('../services/frenchCodes.service');
    
    const member = {
      id: Date.now().toString(),
      realName: name,
      pseudonym: name.split(' ')[0],
      frenchCode: FrenchCodesService.getRandomCode(),
      role,
      phone,
      email,
      orgId: req.user!.orgId,
      status: 'offline',
      createdAt: new Date()
    };
    
    dbConfig.users.set(member.id, member);
    
    res.json({ success: true, member });
  }
}