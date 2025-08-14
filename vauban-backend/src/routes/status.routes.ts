import { Router } from 'express';
import { optionalAuth, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/status', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const mistralConfigured = !!process.env.MISTRAL_API_KEY;
    res.json({
      mistralConfigured,
      model: process.env.MISTRAL_MODEL || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la vérification du statut' });
  }
});

export default router;
