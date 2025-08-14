import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { FrenchCodesService } from '../services/frenchCodes.service';
import { jwtConfig } from '../config/jwt';
import { DUERStore } from '../store/duer.store';
export class AuthController {
  private organizations = new Map<string, any>();
  private users = new Map<string, any>();

  async createOrganization(req: AuthRequest, res: Response) {
    const { name, sector, size, adminPseudonym } = req.body;
    
    // Générer code organisation
    const orgCode = `VAUBAN-${Date.now().toString(36).toUpperCase()}`;
    const orgId = Date.now().toString();
    
    // Créer l'organisation
    const organization = {
      id: orgId,
      name,
      code: orgCode,
      sector,
      size,
      createdAt: new Date()
    };
    
    this.organizations.set(orgId, organization);
    
    // Créer l'admin
    const adminId = Date.now().toString();
    const frenchCode = FrenchCodesService.getRandomCode();
    
    const admin = {
      id: adminId,
      pseudonym: adminPseudonym,
      frenchCode,
      orgId,
      role: 'admin',
      createdAt: new Date()
    };
    
    this.users.set(adminId, admin);
    
    // Générer token
    const token = jwt.sign(
      { userId: adminId, orgId, role: 'admin' },
      jwtConfig.secret,
      { expiresIn: '7d' }
    );
    
    // Get user's DUER stats
    const myDuers = DUERStore.listByOwner(adminId);
    const last = [...myDuers].sort((a, b) => a.dateCreation < b.dateCreation ? 1 : -1)[0];

    res.json({
      success: true,
      token,
      user: admin,
      stats: {
        duerCount: myDuers.length,
        lastDUERId: last?.id || null,
        lastDUERAt: last?.dateCreation || null,
      },
      organization
    });
  }

  async login(req: AuthRequest, res: Response) {
    const { orgCode, pseudonym } = req.body;
    
    // Trouver l'organisation
    const org = Array.from(this.organizations.values())
      .find(o => o.code === orgCode);
    
    if (!org) {
      return res.status(401).json({ error: 'Code organisation invalide' });
    }
    
    // Créer ou trouver l'utilisateur
    let user = Array.from(this.users.values())
      .find(u => u.orgId === org.id && u.pseudonym === pseudonym);
    
    if (!user) {
      // Créer un nouvel utilisateur
      const userId = Date.now().toString();
      const frenchCode = FrenchCodesService.getRandomCode();
      
      user = {
        id: userId,
        pseudonym,
        frenchCode,
        orgId: org.id,
        role: 'member',
        createdAt: new Date()
      };
      
      this.users.set(userId, user);
    }
    
    // Générer token
    const token = jwt.sign(
      { userId: user.id, orgId: org.id, role: user.role },
      jwtConfig.secret,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        pseudonym: user.pseudonym,
        frenchCode: user.frenchCode,
        role: user.role
      },
      organization: org
    });
  }

  async joinOrganization(req: AuthRequest, res: Response) {
    // Similaire à login mais pour rejoindre une org existante
    return this.login(req, res);
  }
}