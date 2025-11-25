import { Router } from 'express';
import { categoriasController } from '../controllers/categorias.controller';

const router = Router();

/**
 * GET /api/v1/categorias
 * Listar categorias
 */
router.get('/', categoriasController.listar.bind(categoriasController));

/**
 * GET /api/v1/categorias/:id
 * Buscar categoria por ID
 */
router.get('/:id', categoriasController.buscarPorId.bind(categoriasController));

/**
 * GET /api/v1/categorias/:id/produtos/count
 * Contar produtos da categoria
 */
router.get('/:id/produtos/count', categoriasController.contarProdutos.bind(categoriasController));

/**
 * POST /api/v1/categorias
 * Criar categoria
 */
router.post('/', categoriasController.criar.bind(categoriasController));

/**
 * PATCH /api/v1/categorias/:id
 * Atualizar categoria
 */
router.patch('/:id', categoriasController.atualizar.bind(categoriasController));

/**
 * DELETE /api/v1/categorias/:id
 * Excluir categoria
 */
router.delete('/:id', categoriasController.excluir.bind(categoriasController));

export default router;