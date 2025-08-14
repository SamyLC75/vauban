import { Router } from "express";
import jwt, { type Secret } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../services/prisma";
import { jwtConfig } from "../config/jwt";

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body as { username: string; password: string };
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ error: "Identifiants invalides" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Identifiants invalides" });

  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,               // "ADMIN" | "USER"
    orgId: user.orgId,
  };

  const token = jwt.sign(payload, jwtConfig.secret, jwtConfig.signOptions);
  return res.json({ token, user: payload });
});

export default router;
