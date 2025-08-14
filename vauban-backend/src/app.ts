import 'dotenv/config';
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { authMiddleware, AuthRequest } from "./middleware/auth.middleware";
import pcaRoutes from "./routes/pca.routes";
import actionRoutes from "./routes/action.routes";
import alertRoutes from "./routes/alert.routes";
import teamRoutes from "./routes/team.routes";
import authRoutes from "./routes/auth.routes";
import crisisRoutes from "./routes/crisis.routes";
import entrepriseRoutes from "./routes/entreprise.routes";
import duerRoutes from "./routes/duer.routes";
import engineRoutes from "./routes/engine.routes";
// ...autres imports
import statusRoutes from "./routes/status.routes";

const app = express();

// Enable CORS (dynamic)
app.use(cors({
  origin: (origin, cb) => cb(null, true), // à raffiner: liste blanche
  credentials: true
}));

// Parse JSON with limit
app.use(express.json({ limit: "1mb" }));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600, // par IP (ajouter override par user/org si besoin)
}));

// Apply auth middleware to all routes except login
app.use((req: AuthRequest, res, next) => {
  if (req.path === '/api/login') return next();
  if (req.path === '/health') return next();
  if (req.path === '/api/testproxy') return next();
  if (req.path === '/api/status') return next();
  if (req.path === '/api/duer/ia-questions') return next();
  return authMiddleware(req, res, next);
});

// Mount all API routes
app.use("/api", authRoutes);
app.use("/api", statusRoutes);
app.use("/api", pcaRoutes);
app.use("/api", actionRoutes);
app.use("/api", alertRoutes);
app.use("/api", teamRoutes);
app.use("/api", crisisRoutes);
app.use("/api", entrepriseRoutes);
app.use("/api", duerRoutes);
app.use("/api", engineRoutes);

// Error handling middleware
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ error: "Erreur serveur", message: err?.message || "unknown" });
});

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