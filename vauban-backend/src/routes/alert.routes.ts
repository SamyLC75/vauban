import { Router } from 'express';
import { AlertController } from '../controllers/alert.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const alertController = new AlertController();

router.use(authMiddleware);

router.get('/', (req, res) => alertController.getAlerts(req, res));
router.post('/', (req, res) => alertController.createAlert(req, res));
router.post('/:alertId/respond', (req, res) => alertController.respondToAlert(req, res));

export default router;