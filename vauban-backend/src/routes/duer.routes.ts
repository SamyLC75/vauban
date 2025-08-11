// vauban-backend/src/routes/duer.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  generateQuestions,
  generateDUER,
  getDUER,
  explainRisk,
  updateDUER,
  generateInnovativeMeasures
} from '../controllers/duer.controller';

const router = Router();

// Toutes les routes DUER sont protégées par auth
// router.use(requireAuth); // Temporairement désactivé pour le test

// Génération des questions d'affinage
router.post('/duer/ia-questions', generateQuestions);

// Génération complète du DUER
router.post('/duer/ia-generate', generateDUER);

// Récupération d'un DUER existant
router.get('/duer/:id', getDUER);

// Explication d'un risque
router.post('/duer/ia-explain', explainRisk);

// Mise à jour partielle
router.put('/duer/:id/update', updateDUER);

// Génération de mesures innovantes
router.post('/duer/ia-measures', generateInnovativeMeasures);

export default router;