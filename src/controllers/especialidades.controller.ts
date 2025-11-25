import { Request, Response } from 'express';
import { especialidadesService } from '../services/especialidades.service';
import { logger } from '../utils/logger';

export class EspecialidadesController {
  /**
   * Listar especialidades
   * GET /api/v1/especialidades
   */
  async listar(req: Request, res: Response) {
    try {
      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '1');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '1');
      
      const { ativo } = req.query;

      const result = await especialidadesService.listar(clienteId, empresaId, {
        ativo: ativo === 'true' ? true : ativo === 'false' ? false : undefined
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data,
        total: result.data?.length || 0
      });
    } catch (error: any) {
      logger.error('Erro ao listar especialidades', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Buscar especialidade por ID
   * GET /api/v1/especialidades/:id
   */
  async buscarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await especialidadesService.buscarPorId(id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error || 'Especialidade não encontrada'
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error: any) {
      logger.error('Erro ao buscar especialidade', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Criar especialidade
   * POST /api/v1/especialidades
   */
  async criar(req: Request, res: Response) {
    try {
      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '1');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '1');
      
      const { nome, descricao, icone, cor, slug, ordem } = req.body;

      if (!nome || !slug) {
        return res.status(400).json({
          success: false,
          error: 'Nome e slug são obrigatórios'
        });
      }

      const result = await especialidadesService.criar({
        clienteId,
        empresaId,
        nome,
        descricao,
        icone,
        cor,
        slug,
        ordem
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(201).json({
        success: true,
        data: result.data
      });
    } catch (error: any) {
      logger.error('Erro ao criar especialidade', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Atualizar especialidade
   * PATCH /api/v1/especialidades/:id
   */
  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const result = await especialidadesService.atualizar(id, updates);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error: any) {
      logger.error('Erro ao atualizar especialidade', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Excluir especialidade
   * DELETE /api/v1/especialidades/:id
   */
  async excluir(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await especialidadesService.excluir(id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Especialidade excluída com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao excluir especialidade', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Contar profissionais da especialidade
   * GET /api/v1/especialidades/:id/profissionais/count
   */
  async contarProfissionais(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await especialidadesService.contarProfissionais(id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        count: result.data
      });
    } catch (error: any) {
      logger.error('Erro ao contar profissionais', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const especialidadesController = new EspecialidadesController();