import { Router, Request, Response } from 'express';
import { AlertController } from '../controllers/alert.controller';
import { authMiddleware } from "../middleware/auth.middleware";
let alerts = [
    { id: "a1", message: "Alerte test", time: new Date().toLocaleTimeString(), sender: "Napoléon" }
  ];
const router = Router();
const alertController = new AlertController();
// Removed redundant authMiddleware since it's already applied globally in app.ts

router.get('/', authMiddleware, (req: Request, res: Response) => res.json(alerts.slice(-5).reverse()));
router.post("/", authMiddleware, (req: Request, res: Response) => {
    const { message, sender } = req.body;
    const alert = { id: Date.now().toString(), message, sender, time: new Date().toLocaleTimeString() };
    alerts.push(alert);
    res.status(201).json(alert);
});


export default router;