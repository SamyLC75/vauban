// duer.routes.ts
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  generateQuestions,
  generateDUER,
  getDUER,
  explainRisk,
  generateDUERPdf,
  listDUERs,
  deleteDUER,
  saveDUER,
  getDUERFlat,
  patchDUER,
  exportDUERCsv
} from '../controllers/duer.controller';
import { exportDUERXlsx } from "../services/xlsx.service";
import { DuerRepo } from "../repositories/duer.repo";

const router = Router();

// Toutes les routes DUER sont protégées
router.use(authMiddleware);

// Génération des questions d'affinage
router.post("/duer/ia-questions", generateQuestions);

// Génération complète du DUER + persistance
router.post("/duer/ia-generate", (req, res, next) => {
  // Garde le socket ouvert jusqu'à 120s pour cette route
  res.setTimeout(120000);
  next();
}, generateDUER);

// Récupération d'un DUER existant
router.get("/duer/:id", getDUER);

// Export PDF
router.get("/duer/:id/pdf", generateDUERPdf);

// Vue plate pour export Excel/LaTeX
router.get("/duer/:id/flat", getDUERFlat);

// Export CSV
router.get("/duer/:id/csv", exportDUERCsv);

// Explication d'un risque
router.post("/duer/ia-explain", explainRisk);

// Liste des DUER (par org)
router.get("/duer", listDUERs);

// Suppression d'un DUER
router.delete("/duer/:id", deleteDUER);
router.put("/duer/:id", saveDUER);
router.patch("/duer/:id/patch", patchDUER);
router.get("/duer/:id/xlsx", async (req, res) => {
  const row = await DuerRepo.getOne(req.params.id);
  if (!row) return res.status(404).json({ error: "DUER non trouvé" });

  const wb = await exportDUERXlsx(row.doc);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="DUER_${row.id}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

export default router;
