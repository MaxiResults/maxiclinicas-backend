import { Request, Response } from 'express';
import { agendamentosService } from '../services/agendamentos.service';
import { logger } from '../utils/logger';
import { normalizeToUTC, isValidISOString } from '../utils/timezone.util';

export class AgendamentosController {
  /**
   * Listar agendamentos
   * GET /api/v1/agendamentos
   */
  async listar(req: Request, res: Response) {
    try {
      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '2');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '2');
      
      const { status, profissional_id, lead_id, data_inicio, data_fim } = req.query;

      const result = await agendamentosService.listar(clienteId, empresaId, {
        status: status as string,
        profissionalId: profissional_id as string,
        leadId: lead_id as string,
        dataInicio: data_inicio as string,
        dataFim: data_fim as string
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
      logger.error('Erro ao listar agendamentos', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Buscar agendamento por ID
   * GET /api/v1/agendamentos/:id
   */
  async buscarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await agendamentosService.buscarPorId(id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error || 'Agendamento não encontrado'
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error: any) {
      logger.error('Erro ao buscar agendamento', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Buscar horários disponíveis
   * GET /api/v1/agendamentos/horarios-disponiveis
   */
  async buscarHorariosDisponiveis(req: Request, res: Response) {
    try {
      const { profissional_id, data, duracao_minutos } = req.query;

      if (!profissional_id || !data) {
        return res.status(400).json({
          success: false,
          error: 'Parâmetros obrigatórios: profissional_id, data'
        });
      }

      const duracao = duracao_minutos ? parseInt(duracao_minutos as string) : 60;

      const result = await agendamentosService.buscarHorariosDisponiveis(
        profissional_id as string,
        data as string,
        duracao
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        horarios: result.data
      });
    } catch (error: any) {
      logger.error('Erro ao buscar horários disponíveis', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Criar agendamento
   * POST /api/v1/agendamentos
   */
  async criar(req: Request, res: Response) {
    try {
      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '2');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '2');
      
      const {
        lead_id,
        profissional_id,
        produto_id,
        data_hora_inicio,
        data_hora_fim,
        valor,
        valor_desconto,
        observacoes,
        observacoes_internas,
        user_timezone // Opcional: timezone do usuário (metadata)
      } = req.body;

      // Validar campos obrigatórios
      if (!lead_id || !profissional_id || !produto_id || !data_hora_inicio || !data_hora_fim) {
        return res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: lead_id, profissional_id, produto_id, data_hora_inicio, data_hora_fim'
        });
      }

      // Validar formato ISO 8601
      if (!isValidISOString(data_hora_inicio)) {
        return res.status(400).json({
          success: false,
          error: 'data_hora_inicio deve estar em formato ISO 8601 (ex: 2025-11-28T08:00:00-03:00)'
        });
      }

      if (!isValidISOString(data_hora_fim)) {
        return res.status(400).json({
          success: false,
          error: 'data_hora_fim deve estar em formato ISO 8601 (ex: 2025-11-28T09:00:00-03:00)'
        });
      }

      // Normalizar timestamps para UTC antes de salvar
      const dataHoraInicioUTC = normalizeToUTC(data_hora_inicio, user_timezone);
      const dataHoraFimUTC = normalizeToUTC(data_hora_fim, user_timezone);

      // Log para auditoria
      logger.info('Criando agendamento', {
        lead_id,
        profissional_id,
        data_hora_inicio_original: data_hora_inicio,
        data_hora_inicio_utc: dataHoraInicioUTC,
        user_timezone: user_timezone || 'não informado'
      });

      const result = await agendamentosService.criar({
        clienteId,
        empresaId,
        leadId: lead_id,
        profissionalId: profissional_id,
        produtoId: produto_id,
        dataHoraInicio: dataHoraInicioUTC,  // ✅ UTC
        dataHoraFim: dataHoraFimUTC,        // ✅ UTC
        valor: valor,
        valorDesconto: valor_desconto,
        observacoes,
        observacoesInternas: observacoes_internas
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
      logger.error('Erro ao criar agendamento', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Atualizar agendamento
   * PATCH /api/v1/agendamentos/:id
   */
  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Se estiver atualizando timestamps, validar e normalizar
      if (updates.data_hora_inicio) {
        if (!isValidISOString(updates.data_hora_inicio)) {
          return res.status(400).json({
            success: false,
            error: 'data_hora_inicio deve estar em formato ISO 8601'
          });
        }
        updates.dataHoraInicio = normalizeToUTC(updates.data_hora_inicio, updates.user_timezone);
        delete updates.data_hora_inicio;
      }

      if (updates.data_hora_fim) {
        if (!isValidISOString(updates.data_hora_fim)) {
          return res.status(400).json({
            success: false,
            error: 'data_hora_fim deve estar em formato ISO 8601'
          });
        }
        updates.dataHoraFim = normalizeToUTC(updates.data_hora_fim, updates.user_timezone);
        delete updates.data_hora_fim;
      }

      // Remover campos que não podem ser atualizados manualmente (colunas geradas)
      delete updates.duracao_minutos;
      delete updates.valor_final;
      delete updates.user_timezone; // Metadata, não salvar

      // Log para auditoria
      logger.info('Atualizando agendamento', { id, updates });

      const result = await agendamentosService.atualizar(id, updates);

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
      logger.error('Erro ao atualizar agendamento', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Confirmar agendamento
   * PATCH /api/v1/agendamentos/:id/confirmar
   */
  async confirmar(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await agendamentosService.confirmar(id);

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
      logger.error('Erro ao confirmar agendamento', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Cancelar agendamento
   * PATCH /api/v1/agendamentos/:id/cancelar
   */
  async cancelar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      const result = await agendamentosService.cancelar(id, motivo);

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
      logger.error('Erro ao cancelar agendamento', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Excluir agendamento
   * DELETE /api/v1/agendamentos/:id
   */
  async excluir(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await agendamentosService.excluir(id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Agendamento excluído com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao excluir agendamento', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const agendamentosController = new AgendamentosController();