import { Request, Response } from 'express';
import { profissionaisService } from '../services/profissionais.service';
import { logger } from '../utils/logger';

export class ProfissionaisController {
  /**
   * Listar profissionais
   * GET /api/v1/profissionais
   */
  async listar(req: Request, res: Response) {
    try {
      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '1');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '1');
      
      const { status, funcao_id } = req.query;

      const result = await profissionaisService.listar(clienteId, empresaId, {
        status: status as string,
        funcaoId: funcao_id ? parseInt(funcao_id as string) : undefined
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
      logger.error('Erro ao listar profissionais', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Buscar profissional por ID
   * GET /api/v1/profissionais/:id
   */
  async buscarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await profissionaisService.buscarPorId(id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error || 'Profissional não encontrado'
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error: any) {
      logger.error('Erro ao buscar profissional', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Criar profissional
   * POST /api/v1/profissionais
   */
  async criar(req: Request, res: Response) {
    try {
      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '1');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '1');
      
      const {
        funcao_id,
        nome,
        email,
        telefone,
        whatsapp,
        cpf,
        foto_url,
        registro_profissional,
        especialidades,
        biografia,
        horario_trabalho,
        duracao_padrao_consulta,
        permite_agendamento_online,
        comissao_percentual,
        data_admissao,
        observacoes
      } = req.body;

      if (!nome || !funcao_id) {
        return res.status(400).json({
          success: false,
          error: 'Nome e função são obrigatórios'
        });
      }

      const result = await profissionaisService.criar({
        clienteId,
        empresaId,
        funcaoId: funcao_id,
        nome,
        email,
        telefone,
        whatsapp,
        cpf,
        foto_url,
        registro_profissional,
        especialidades,
        biografia,
        horario_trabalho,
        duracao_padrao_consulta,
        permite_agendamento_online,
        comissao_percentual,
        data_admissao,
        observacoes
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
      logger.error('Erro ao criar profissional', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Atualizar profissional
   * PATCH /api/v1/profissionais/:id
   */
  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { especialidades, ...updates } = req.body;

      const result = await profissionaisService.atualizar(id, updates, especialidades);

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
      logger.error('Erro ao atualizar profissional', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Excluir profissional
   * DELETE /api/v1/profissionais/:id
   */
  async excluir(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await profissionaisService.excluir(id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Profissional excluído com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao excluir profissional', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Atualizar status
   * PATCH /api/v1/profissionais/:id/status
   */
  async atualizarStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status é obrigatório'
        });
      }

      const result = await profissionaisService.atualizarStatus(id, status);

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
      logger.error('Erro ao atualizar status', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const profissionaisController = new ProfissionaisController();