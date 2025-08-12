import { Router } from "express";
import { saveEntreprise, getEntreprise } from "../controllers/entreprise.controller";
const router = Router();

router.post("/entreprise", saveEntreprise);
router.get("/entreprise", getEntreprise);

export default router;
