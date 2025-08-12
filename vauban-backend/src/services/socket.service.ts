import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  orgId?: string;
  pseudonym?: string;
}

export const socketHandler = (io: Server) => {
  // Middleware d'authentification
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Token manquant'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
      socket.userId = decoded.userId;
      socket.orgId = decoded.orgId;
      next();
    } catch (err) {
      next(new Error('Erreur authentification'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`✅ Utilisateur ${socket.userId} connecté`);
    
    // Rejoindre la room de l'organisation
    if (socket.orgId) {
      socket.join(`org:${socket.orgId}`);
      console.log(`👥 Rejoint l'organisation ${socket.orgId}`);
    }

    // Gestion des statuts
    socket.on('status:update', (data) => {
      console.log(`📊 Mise à jour statut:`, data);
      io.to(`org:${socket.orgId}`).emit('status:update', {
        userId: socket.userId,
        ...data
      });
    });

    // Gestion des alertes
    socket.on('alert:send', (alert) => {
      console.log(`🚨 Nouvelle alerte:`, alert);
      const alertWithMetadata = {
        ...alert,
        id: Date.now().toString(),
        senderId: socket.userId,
        timestamp: new Date()
      };
      
      io.to(`org:${socket.orgId}`).emit('alert:new', alertWithMetadata);
    });

    // Réponse aux alertes
    socket.on('alert:respond', (data) => {
      console.log(`💬 Réponse alerte:`, data);
      io.to(`org:${socket.orgId}`).emit('alert:response', {
        ...data,
        userId: socket.userId,
        timestamp: new Date()
      });
    });

    // Déconnexion
    socket.on('disconnect', () => {
      console.log(`❌ Utilisateur ${socket.userId} déconnecté`);
      io.to(`org:${socket.orgId}`).emit('user:offline', {
        userId: socket.userId,
        timestamp: new Date()
      });
    });

    // Ping pour maintenir la connexion
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });
};