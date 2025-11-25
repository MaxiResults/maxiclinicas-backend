import { Router } from 'express';
import { produtosController } from '../controllers/produtos.controller';

const router = Router();

/**
 * GET /api/v1/produtos
 * Listar produtos
 */
router.get('/', produtosController.listar.bind(produtosController));

/**
 * GET /api/v1/produtos/:id
 * Buscar produto por ID
 */
router.get('/:id', produtosController.buscarPorId.bind(produtosController));

/**
 * POST /api/v1/produtos
 * Criar produto
 */
router.post('/', produtosController.criar.bind(produtosController));

/**
 * PATCH /api/v1/produtos/:id
 * Atualizar produto
 */
router.patch('/:id', produtosController.atualizar.bind(produtosController));

/**
 * PATCH /api/v1/produtos/:id/toggle
 * Ativar/Desativar produto
 */
router.patch('/:id/toggle', produtosController.toggleAtivo.bind(produtosController));

/**
 * DELETE /api/v1/produtos/:id
 * Excluir produto
 */
router.delete('/:id', produtosController.excluir.bind(produtosController));

export default router;