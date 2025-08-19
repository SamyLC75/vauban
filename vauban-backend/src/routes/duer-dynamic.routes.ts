import { Router } from "express";
import { DuerDynamicController } from "../controllers/duer-dynamic.controller";

const router = Router();

// This route is protected by global auth in app.ts
router.post("/duer/ia-questions-dynamic", DuerDynamicController.generateQuestions);

export default router;
