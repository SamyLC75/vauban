import express from "express";
import pcaRoutes from "./routes/pca.routes";
import actionRoutes from "./routes/action.routes";
import alertRoutes from "./routes/alert.routes";
import teamRoutes from "./routes/team.routes";
import authRoutes from "./routes/auth.routes";
import crisisRoutes from "./routes/crisis.routes";
import entrepriseRoutes from "./routes/entreprise.routes";
// ...autres imports

const app = express();
app.use(express.json());
// ...autres middlewares

app.use("/api", pcaRoutes);
app.use("/api", actionRoutes);
app.use("/api", alertRoutes);
app.use("/api", teamRoutes);
app.use("/api", authRoutes);
app.use("/api", crisisRoutes);
app.use("/api", entrepriseRoutes);  
// ...autres routes

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