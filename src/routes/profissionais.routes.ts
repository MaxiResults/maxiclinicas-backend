import { Router } from 'express';
import { profissionaisController } from '../controllers/profissionais.controller';

const router = Router();

/**
 * GET /api/v1/profissionais
 * Listar profissionais
 */
router.get('/', profissionaisController.listar.bind(profissionaisController));

/**
 * GET /api/v1/profissionais/:id
 * Buscar profissional por ID
 */
router.get('/:id', profissionaisController.buscarPorId.bind(profissionaisController));

/**
 * POST /api/v1/profissionais
 * Criar profissional
 */
router.post('/', profissionaisController.criar.bind(profissionaisController));

/**
 * PATCH /api/v1/profissionais/:id
 * Atualizar profissional
 */
router.patch('/:id', profissionaisController.atualizar.bind(profissionaisController));

/**
 * PATCH /api/v1/profissionais/:id/status
 * Atualizar status do profissional
 */
router.patch('/:id/status', profissionaisController.atualizarStatus.bind(profissionaisController));

/**
 * DELETE /api/v1/profissionais/:id
 * Excluir profissional
 */
router.delete('/:id', profissionaisController.excluir.bind(profissionaisController));

export default router;