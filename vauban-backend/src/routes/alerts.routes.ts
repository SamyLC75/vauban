import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { sendTestAlert, listAlerts } from "../controllers/alerts.controller";

const router = Router();
router.use(authMiddleware);
router.get("/alerts", listAlerts);
router.post("/alerts/test", sendTestAlert);
export default router;
