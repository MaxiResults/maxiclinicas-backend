import { Router } from 'express';
import { agendamentosController } from '../controllers/agendamentos.controller';

const router = Router();

/**
 * GET /api/v1/agendamentos/horarios-disponiveis
 * Buscar horários disponíveis de um profissional
 */
router.get('/horarios-disponiveis', agendamentosController.buscarHorariosDisponiveis.bind(agendamentosController));

/**
 * GET /api/v1/agendamentos
 * Listar agendamentos
 */
router.get('/', agendamentosController.listar.bind(agendamentosController));

/**
 * GET /api/v1/agendamentos/:id
 * Buscar agendamento por ID
 */
router.get('/:id', agendamentosController.buscarPorId.bind(agendamentosController));

/**
 * POST /api/v1/agendamentos
 * Criar agendamento
 */
router.post('/', agendamentosController.criar.bind(agendamentosController));

/**
 * PATCH /api/v1/agendamentos/:id
 * Atualizar agendamento
 */
router.patch('/:id', agendamentosController.atualizar.bind(agendamentosController));

/**
 * PATCH /api/v1/agendamentos/:id/confirmar
 * Confirmar agendamento
 */
router.patch('/:id/confirmar', agendamentosController.confirmar.bind(agendamentosController));

/**
 * PATCH /api/v1/agendamentos/:id/cancelar
 * Cancelar agendamento
 */
router.patch('/:id/cancelar', agendamentosController.cancelar.bind(agendamentosController));

/**
 * DELETE /api/v1/agendamentos/:id
 * Excluir agendamento
 */
router.delete('/:id', agendamentosController.excluir.bind(agendamentosController));

export default router;