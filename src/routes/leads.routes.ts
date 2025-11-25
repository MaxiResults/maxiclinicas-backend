import { Router } from 'express';
import { leadsController } from '../controllers/leads.controller';

const router = Router();

/**
 * GET /api/v1/leads
 * Listar leads
 */
router.get('/', leadsController.listar.bind(leadsController));

/**
 * GET /api/v1/leads/telefone/:telefone
 * Buscar lead por telefone (N8N usa isso!)
 */
router.get('/telefone/:telefone', leadsController.buscarPorTelefone.bind(leadsController));

/**
 * GET /api/v1/leads/:id
 * Buscar lead por ID
 */
router.get('/:id', leadsController.buscarPorId.bind(leadsController));

/**
 * POST /api/v1/leads
 * Criar novo lead
 */
router.post('/', leadsController.criar.bind(leadsController));

/**
 * PATCH /api/v1/leads/:id
 * Atualizar lead
 */
router.patch('/:id', leadsController.atualizar.bind(leadsController));

/**
 * POST /api/v1/leads/:id/converter
 * Converter lead em cliente
 */
router.post('/:id/converter', leadsController.converterEmCliente.bind(leadsController));

/**
 * POST /api/v1/leads/:id/tags
 * Adicionar tag ao lead
 */
router.post('/:id/tags', leadsController.adicionarTag.bind(leadsController));

/**
 * GET /api/v1/leads/:id/tags
 * Buscar tags do lead
 */
router.get('/:id/tags', leadsController.buscarTags.bind(leadsController));

export default router;