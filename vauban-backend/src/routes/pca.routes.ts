import { Router } from "express";
import { savePCA, getPCA } from "../controllers/pca.controller";
const router = Router();

router.post("/pca", savePCA);
router.get("/pca", getPCA);

export default router;
