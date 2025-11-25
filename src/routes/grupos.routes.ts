import { Router } from 'express';
import { gruposController } from '../controllers/grupos.controller';

const router = Router();

/**
 * GET /api/v1/grupos
 * Listar grupos
 */
router.get('/', gruposController.listar.bind(gruposController));

/**
 * GET /api/v1/grupos/:id
 * Buscar grupo por ID
 */
router.get('/:id', gruposController.buscarPorId.bind(gruposController));

/**
 * GET /api/v1/grupos/:id/produtos/count
 * Contar produtos do grupo
 */
router.get('/:id/produtos/count', gruposController.contarProdutos.bind(gruposController));

/**
 * POST /api/v1/grupos
 * Criar grupo
 */
router.post('/', gruposController.criar.bind(gruposController));

/**
 * PATCH /api/v1/grupos/:id
 * Atualizar grupo
 */
router.patch('/:id', gruposController.atualizar.bind(gruposController));

/**
 * DELETE /api/v1/grupos/:id
 * Excluir grupo
 */
router.delete('/:id', gruposController.excluir.bind(gruposController));

export default router;