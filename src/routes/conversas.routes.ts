import { Router } from 'express';
import { conversasController } from '../controllers/conversas.controller';

const router = Router();

/**
 * POST /api/v1/conversas/sessao
 * Criar ou buscar sessão (N8N usa isso!)
 */
router.post('/sessao', conversasController.criarSessao.bind(conversasController));

/**
 * POST /api/v1/conversas/mensagem
 * Salvar mensagem (N8N usa isso!)
 */
router.post('/mensagem', conversasController.salvarMensagem.bind(conversasController));

/**
 * GET /api/v1/conversas/:leadId/historico
 * Buscar histórico de mensagens
 */
router.get('/:leadId/historico', conversasController.buscarHistorico.bind(conversasController));

export default router;