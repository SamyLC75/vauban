// File: vauban-backend/src/routes/crisis.routes.ts
import { Router } from 'express';
import { getCrisisTemplate } from '../controllers/crisis.controller';

const router = Router();

/**
 * GET /api/crisis/template/:type
 * Ex. /api/crisis/template/incendie
 */
router.get('/api/crisis/template/:type', getCrisisTemplate);

export default router;

