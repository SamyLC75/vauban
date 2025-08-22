// duer.routes.ts
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  generateQuestions,
  generateQuestionsDynamic,
  generateDUER,
  getDUER,
  explainRisk,
  generateDUERPdf,
  listDUERs,
  deleteDUER,
  saveDUER,
  getDUERFlat,
  patchDUER,
  exportDUERCsv,
  suggestRisks,
  iaAudit,
  iaAuditById
} from '../controllers/duer.controller';
import { exportDUERXlsx } from "../services/xlsx.service";
import { DuerRepo } from "../repositories/duer.repo";
import { nextQuestions } from '../controllers/duer.controller';
import * as dotenv from "dotenv";
dotenv.config();

const router = Router();

// Toutes les routes DUER sont protégées
router.use(authMiddleware);

// ---- /api/status : utilisé par le Step 1 front pour vérifier la config IA
router.get("/status", (_req, res) => {
  const mistralConfigured = Boolean(process.env.MISTRAL_API_KEY && process.env.MISTRAL_API_KEY.trim());
  res.json({ mistralConfigured });
});

// ---- Middleware d'harmonisation d'input pour toutes les routes IA DUER
// - Tolère `units` ou `unites`
// - Accepte les champs étendus sans obligation (units_ext, incidents, contraintes_ext, transversal_flags)
router.use((req, _res, next) => {
  try {
    if (req.method === 'POST' && req.path.startsWith("/duer/ia-")) {
      const b: any = req.body || {};
      // key alias
      if (!b.unites && Array.isArray(b.units)) {
        b.unites = b.units;
      }
      // normalisation de tableaux
      for (const k of ["unites","units_ext","incidents","contraintes_ext","transversal_flags"]) {
        if (b[k] == null) continue;
        if (!Array.isArray(b[k])) { b[k] = [b[k]].filter(Boolean); }
      }
      req.body = b;
    }
  } catch {}
  next();
});

// Génération des questions d'affinage
router.post("/duer/ia-questions", generateQuestions);

// Génération des questions dynamiques
router.post("/duer/ia-questions-dynamic", generateQuestionsDynamic);

// Suggestions de risques
router.post("/duer/ia-suggest", suggestRisks);

// Audit IA
router.post("/duer/ia-audit", iaAudit);
router.post("/duer/:id/ia-audit", iaAuditById);

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

// Génération des questions suivantes
router.post("/duer/ia-questions-next", nextQuestions);

export default router;
