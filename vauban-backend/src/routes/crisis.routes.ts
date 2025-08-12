// File: vauban-backend/src/routes/crisis.routes.ts
import { Router } from 'express';
import { getCrisisTemplate, analyzeSituation } from '../controllers/crisis.controller';

const router = Router();

/**
 * GET /api/crisis/template/:type
 * Ex. /api/crisis/template/incendie
 */
// Route statique
router.get('/api/crisis/template/:type', getCrisisTemplate);

// Nouvelle route IA
router.post('/api/crisis/analyze', analyzeSituation);


export default router;

