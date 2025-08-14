import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.middleware";

let team = [
  { id: "1", name: "Napoléon", role: "Directeur" },
  { id: "2", name: "Clemenceau", role: "RH" }
];

const router = Router();

// GET équipe
router.get("/", authMiddleware, (req: Request, res: Response) => {
  res.json(team);
});

// Ajout membre (optionnel pour ce soir)
router.post("/", authMiddleware, (req: Request, res: Response) => {
  const { name, role } = req.body;
  const newMember = { id: Date.now().toString(), name, role };
  team.push(newMember);
  res.status(201).json(newMember);
});

export default router;
