import { Router } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/status', async (req: AuthRequest, res) => {
  try {
    // Check if Mistral API key is configured
    const mistralKey = process.env.MISTRAL_API_KEY;
    const mistralConfigured = !!mistralKey;

    res.json({
      authenticated: !!req.user,
      mistralConfigured,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la vérification du statut' });
  }
});

export default router;
