import { Router } from 'express';

const router = Router();

// Routes temporaires
router.get('/', (req, res) => {
  res.json({ alerts: [] });
});

router.post('/', (req, res) => {
  res.json({ success: true, alert: req.body });
});

export default router;