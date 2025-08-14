import { Router } from "express";
import { saveActions, getActions } from "../controllers/action.controller";
import { authMiddleware } from "../middleware/auth.middleware";
const router = Router();
router.post("/actions", authMiddleware, saveActions);
router.get("/actions", authMiddleware, getActions);

export default router;
