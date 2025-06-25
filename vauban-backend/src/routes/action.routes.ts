import { Router } from "express";
import { saveActions, getActions } from "../controllers/action.controller";
const router = Router();

router.post("/actions", saveActions);
router.get("/actions", getActions);

export default router;
