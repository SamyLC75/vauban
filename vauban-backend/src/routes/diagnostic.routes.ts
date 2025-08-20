import { Router } from "express";
import { testIaConnectivity, healthCheck } from "../controllers/diagnostic.controller";

const router = Router();

/**
 * @openapi
 * /api/diag/ia:
 *   get:
 *     tags: [Diagnostic]
 *     summary: Test AI service connectivity
 *     description: Verifies connectivity to the AI service with a simple ping-pong test
 *     responses:
 *       200:
 *         description: Successfully connected to AI service
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 provider:
 *                   type: string
 *                   example: mistral
 *                 model:
 *                   type: string
 *                   example: mistral-small-latest
 *                 response_time_ms:
 *                   type: number
 *                   example: 1250
 *                 message:
 *                   type: string
 *                   example: Successfully connected to AI service
 *       502:
 *         description: Failed to connect to AI service
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Failed to connect to AI service
 *                 error:
 *                   type: object
 *                   description: Detailed error information
 */
router.get('/ia', testIaConnectivity);

/**
 * @openapi
 * /api/diag/health:
 *   get:
 *     tags: [Diagnostic]
 *     summary: Health check endpoint
 *     description: Basic health check to verify service is running
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-08-20T15:53:18.000Z
 *                 service:
 *                   type: string
 *                   example: vauban-backend
 *                 environment:
 *                   type: string
 *                   example: development
 */
router.get('/health', healthCheck);

export default router;
