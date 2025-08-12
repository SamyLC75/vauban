import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getUsers } from "../utils/userStore";
import { Request, Response } from "express";
import { jwtConfig } from "../config/jwt";
const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const users = getUsers();

  // DEBUG: log de tous les utilisateurs
  console.log("Users loaded:", users);

  // Recherche de l'utilisateur (attention à la casse !)
  const user = users.find((u: any) => u.username === username);
  console.log("Tentative login =>", { username, password, userFound: !!user, hash: user?.passwordHash });

  if (!user) {
    return res.status(401).json({ error: "Identifiant incorrect" });
  }

  // Vérification du mot de passe (hash bcrypt)
  let ok = false;
  try {
    ok = await bcrypt.compare(password, user.passwordHash);
    console.log(`Résultat bcrypt.compare pour ${username} :`, ok);
  } catch (err) {
    console.error("Erreur bcrypt.compare :", err);
    return res.status(500).json({ error: "Erreur serveur lors de la vérification du mot de passe" });
  }

  if (!ok) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }

  // JWT Token
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      maxUsage: user.maxUsage,
      currentUsage: user.currentUsage,
    },
    jwtConfig.secret,
    { expiresIn: "2h" }
  );

  // Réponse au frontend
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      maxUsage: user.maxUsage,
      currentUsage: user.currentUsage,
    },
  });
});

export default router;
