import express from "express";
import cors from "cors";
import { authMiddleware, AuthRequest } from "./middleware/auth.middleware";
import pcaRoutes from "./routes/pca.routes";
import actionRoutes from "./routes/action.routes";
import alertRoutes from "./routes/alert.routes";
import teamRoutes from "./routes/team.routes";
import authRoutes from "./routes/auth.routes";
import crisisRoutes from "./routes/crisis.routes";
import entrepriseRoutes from "./routes/entreprise.routes";
// ...autres imports

const app = express();

// Enable CORS
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Parse JSON before routes
app.use(express.json());

// Special routes
app.get('/api/testproxy', (req, res) => {
  console.log('TESTPROXY backend atteint !');
  res.json({ success: true });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Mount all API routes
app.use("/api", authRoutes);
app.use("/api", pcaRoutes);
app.use("/api", actionRoutes);
app.use("/api", alertRoutes);
app.use("/api", teamRoutes);
app.use("/api", crisisRoutes);
app.use("/api", entrepriseRoutes);

// Apply auth middleware to all routes except login
app.use((req, res, next) => {
  // Skip auth for login route
  if (req.path === '/api/login') {
    return next();
  }
  // Skip auth for health check
  if (req.path === '/health') {
    return next();
  }
  // Skip auth for testproxy
  if (req.path === '/api/testproxy') {
    return next();
  }
  return authMiddleware(req as AuthRequest, res, next);
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Route non trouvée" });
});

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Health check (optionnel)
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
  });
  
  // 404
  app.use((req, res) => {
    res.status(404).json({ error: "Route non trouvée" });
  });
  
  // Error handler (si besoin)
  // app.use(errorHandler);
  
  
  export default app;