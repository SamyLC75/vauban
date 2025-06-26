import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getUsers } from "../utils/userStore";
import { Request, Response } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "vauban_dev_secret";
const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const users = getUsers();
  const user = users.find((u : any) => u.username === username);
  if (!user) return res.status(401).json({ error: "Identifiant incorrect" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Mot de passe incorrect" });

  // Ajoute gestion des quotas ici si besoin

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, maxUsage: user.maxUsage, currentUsage: user.currentUsage },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      maxUsage: user.maxUsage,
      currentUsage: user.currentUsage
    }
  });
});

export default router;
