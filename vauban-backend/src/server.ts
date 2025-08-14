// src/server.ts
import express from 'express';  
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import app from './app';
import { socketHandler } from './services/socket.service';  

dotenv.config();

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
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
});
