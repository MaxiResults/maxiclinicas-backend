import { Router } from 'express';
import { especialidadesController } from '../controllers/especialidades.controller';

const router = Router();

/**
 * GET /api/v1/especialidades
 * Listar especialidades
 */
router.get('/', especialidadesController.listar.bind(especialidadesController));

/**
 * GET /api/v1/especialidades/:id
 * Buscar especialidade por ID
 */
router.get('/:id', especialidadesController.buscarPorId.bind(especialidadesController));

/**
 * GET /api/v1/especialidades/:id/profissionais/count
 * Contar profissionais da especialidade
 */
router.get('/:id/profissionais/count', especialidadesController.contarProfissionais.bind(especialidadesController));

/**
 * POST /api/v1/especialidades
 * Criar especialidade
 */
router.post('/', especialidadesController.criar.bind(especialidadesController));

/**
 * PATCH /api/v1/especialidades/:id
 * Atualizar especialidade
 */
router.patch('/:id', especialidadesController.atualizar.bind(especialidadesController));

/**
 * DELETE /api/v1/especialidades/:id
 * Excluir especialidade
 */
router.delete('/:id', especialidadesController.excluir.bind(especialidadesController));

export default router;