import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes';
import alertRoutes from './routes/alert.routes';
import teamRoutes from './routes/team.routes';
import { socketHandler } from './services/socket.service';
import { errorHandler } from './utils/errorHandler';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/team', teamRoutes);

// Socket.io
socketHandler(io);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    services: {
      api: 'running',
      websocket: 'running'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   🚀 Serveur Vauban démarré !       ║
╠══════════════════════════════════════╣
║   API:    http://localhost:${PORT}     ║
║   Health: http://localhost:${PORT}/health ║
║   Socket: ws://localhost:${PORT}       ║
╚══════════════════════════════════════╝
  `);
});