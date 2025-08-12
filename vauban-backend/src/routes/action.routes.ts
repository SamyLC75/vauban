import { Router } from "express";
import { saveActions, getActions } from "../controllers/action.controller";
import { requireAuth } from "../middleware/auth";
const router = Router();
router.post("/actions", requireAuth, saveActions);
router.get("/actions", requireAuth, getActions);

export default router;
