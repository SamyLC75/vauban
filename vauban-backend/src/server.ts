// src/server.ts
import express from 'express';  
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import app from './app';
import { socketHandler } from './services/socket.service';

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../../.env');
console.log('Loading environment variables from:', envPath);
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.error('Failed to load .env file:', envResult.error);
} else {
  console.log('Environment variables loaded successfully');
}

// Debug log important environment variables
console.log('Server starting with configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  JWT_SECRET: process.env.JWT_SECRET ? '***' : 'NOT SET',
  CORS_ORIGINS: process.env.CORS_ORIGINS,
  DATABASE_URL: process.env.DATABASE_URL ? '***' : 'NOT SET'
});

// Force le port à 5001
const PORT = 5001;
console.log('Configuration initiale:', { 
  PORT, 
  ENV_PORT: process.env.PORT,
  CORS_ORIGINS: process.env.CORS_ORIGINS 
});
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const ALLOW = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:3000").split(",").map(s => s.trim());
      if (ALLOW.includes(origin)) return cb(null, true);
      return cb(new Error("CORS: origin not allowed"));
    },
    credentials: true
  }
});

// Branche le handler
socketHandler(io);

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
  console.log('Configuration:', { PORT, CORS_ORIGINS: process.env.CORS_ORIGINS });
});
