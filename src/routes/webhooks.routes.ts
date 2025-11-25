import { Router } from 'express';
import { webhooksController } from '../controllers/webhooks.controller';

const router = Router();

/**
 * POST /api/v1/webhooks/zapi
 * Recebe webhooks do Z-API
 */
router.post('/zapi', webhooksController.handleZApiWebhook.bind(webhooksController));

/**
 * GET /api/v1/webhooks/health
 * Health check do webhook
 */
router.get('/health', webhooksController.healthCheck.bind(webhooksController));

export default router;