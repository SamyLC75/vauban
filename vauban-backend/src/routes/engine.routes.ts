import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { generateQuestions, generateDUER, getDUER } from "../controllers/duer.controller";

const router = Router();
router.use(authMiddleware);

router.post("/engine/questions", generateQuestions);
router.post("/engine/generate", generateDUER);
router.get("/engine/duer/:id", getDUER);

export default router;
