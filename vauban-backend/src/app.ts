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
import duerRoutes from "./routes/duer.routes";
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

// Apply auth middleware to all routes except login
app.use((req: AuthRequest, res, next) => {
  if (req.path === '/api/login') return next();
  if (req.path === '/health') return next();
  if (req.path === '/api/testproxy') return next();
  if (req.path === '/api/duer/ia-questions') return next();
  return authMiddleware(req, res, next);
});

// Mount all API routes
app.use("/api", authRoutes);
app.use("/api", pcaRoutes);
app.use("/api", actionRoutes);
app.use("/api", alertRoutes);
app.use("/api", teamRoutes);
app.use("/api", crisisRoutes);
app.use("/api", entrepriseRoutes);
app.use("/api", duerRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route non trouvée" });
});

// Error handler (si besoin)
// app.use(errorHandler);

export default app;