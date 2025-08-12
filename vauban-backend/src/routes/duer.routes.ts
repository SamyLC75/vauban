// vauban-backend/src/routes/duer.routes.ts
import { Router } from 'express';
import { authMiddleware as requireAuth } from '../middleware/auth.middleware';
import {
  generateQuestions,
  generateDUER,
  getDUER,
  explainRisk,
  updateDUER,
  generateInnovativeMeasures,
  generateDUERPdf,
  listDUERs,
  deleteDUER
} from '../controllers/duer.controller';

const router = Router();

// ✅ Toutes les routes DUER sont protégées
router.use(requireAuth);

// Génération des questions d'affinage
router.post('/duer/ia-questions', generateQuestions);

// Génération complète du DUER
router.post('/duer/ia-generate', generateDUER);

// Récupération d'un DUER existant
router.get('/duer/:id', getDUER);
router.get('/duer/:id/pdf', generateDUERPdf);

// Explication d'un risque
router.post('/duer/ia-explain', explainRisk);

// Mise à jour partielle
router.put('/duer/:id/update', updateDUER);

// Génération de mesures innovantes
router.post('/duer/ia-measures', generateInnovativeMeasures);

// Liste mes DUER
router.get('/duer', listDUERs);

// Suppression d'un DUER
router.delete('/duer/:id', deleteDUER);

export default router;