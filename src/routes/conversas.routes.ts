import { Router } from 'express';
import { ConversasController } from '../controllers/conversas.controller';

const router = Router();
const conversasController = new ConversasController();

/**
 * GET /conversas
 * Listar sessões de conversa
 * Query params: ?status=ativa&profissional_id=xxx
 */
router.get(
  '/',
  (req, res) => conversasController.listarSessoes(req, res)
);

/**
 * GET /conversas/:sessaoId/mensagens
 * Listar mensagens de uma sessão
 */
router.get(
  '/:sessaoId/mensagens',
  (req, res) => conversasController.listarMensagens(req, res)
);

/**
 * POST /conversas/:sessaoId/mensagens
 * Enviar mensagem para cliente
 * Body: { texto: string }
 */
router.post(
  '/:sessaoId/mensagens',
  (req, res) => conversasController.enviarMensagem(req, res)
);

export default router;