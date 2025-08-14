import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  generateQuestions,
  generateDUER,
  getDUER,
  explainRisk,
  generateDUERPdf,
  listDUERs,
  deleteDUER
} from '../controllers/duer.controller';

const router = Router();

// Toutes les routes DUER sont protégées
router.use(authMiddleware);

// Génération des questions d'affinage
router.post("/duer/ia-questions", generateQuestions);

// Génération complète du DUER + persistance
router.post("/duer/ia-generate", generateDUER);

// Récupération d'un DUER existant
router.get("/duer/:id", getDUER);

// Export PDF
router.get("/duer/:id/pdf", generateDUERPdf);

// Explication d'un risque
router.post("/duer/ia-explain", explainRisk);

// Liste des DUER (par org)
router.get("/duer", listDUERs);

// Suppression d'un DUER
router.delete("/duer/:id", deleteDUER);

export default router;
