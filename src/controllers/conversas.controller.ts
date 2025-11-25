import { Request, Response } from 'express';
import { conversasService } from '../services/conversas.service';
import { leadsService } from '../services/leads.service';
import { logger } from '../utils/logger';

export class ConversasController {
  /**
   * Criar ou buscar sessão - ENDPOINT PARA N8N
   * POST /api/v1/conversas/sessao
   */
  async criarSessao(req: Request, res: Response) {
    try {
      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '1');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '1');
      
      const { lead_id, telefone, whatsapp_id, instancia_id } = req.body;

      let leadId = lead_id;

      // Se não tem lead_id, criar por telefone
      if (!leadId && telefone) {
        const leadResult = await leadsService.buscarOuCriarLead({
          telefone,
          clienteId,
          empresaId,
          whatsappId: whatsapp_id
        });

        if (!leadResult.success || !leadResult.data) {
          return res.status(400).json({
            success: false,
            error: 'Erro ao buscar/criar lead: ' + leadResult.error
          });
        }

        leadId = leadResult.data.leadId;
      }

      if (!leadId) {
        return res.status(400).json({
          success: false,
          error: 'lead_id ou telefone é obrigatório'
        });
      }

      const result = await conversasService.buscarOuCriarSessao({
        leadId,
        clienteId,
        empresaId,
        whatsappId: whatsapp_id,
        instanciaId: instancia_id
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          sessao_id: result.data?.sessaoId,
          lead_id: leadId,
          is_new: result.data?.isNew
        }
      });
    } catch (error: any) {
      logger.error('Erro ao criar sessão', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Salvar mensagem - ENDPOINT PARA N8N
   * POST /api/v1/conversas/mensagem
   */
  async salvarMensagem(req: Request, res: Response) {
    try {
      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '1');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '1');
      
      const {
        sessao_id,
        remetente,
        mensagem,
        tipo_mensagem,
        message_id,
        instancia_id
      } = req.body;

      if (!sessao_id || !remetente || !mensagem) {
        return res.status(400).json({
          success: false,
          error: 'sessao_id, remetente e mensagem são obrigatórios'
        });
      }

      const result = await conversasService.salvarMensagem({
        sessaoId: sessao_id,
        clienteId,
        empresaId,
        remetente,
        mensagem,
        tipoMensagem: tipo_mensagem,
        messageId: message_id,
        instanciaId: instancia_id
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
      logger.error('Erro ao salvar mensagem', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Buscar histórico
   * GET /api/v1/conversas/:leadId/historico
   */
  async buscarHistorico(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const { limit } = req.query;

      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '1');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '1');

      const sessaoResult = await conversasService.buscarOuCriarSessao({
        leadId,
        clienteId,
        empresaId
      });

      if (!sessaoResult.success || !sessaoResult.data) {
        return res.status(404).json({
          success: false,
          error: 'Sessão não encontrada'
        });
      }

      const historicoResult = await conversasService.buscarHistorico(
        sessaoResult.data.sessaoId,
        limit ? parseInt(limit as string) : 50
      );

      if (!historicoResult.success) {
        return res.status(400).json({
          success: false,
          error: historicoResult.error
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          sessao_id: sessaoResult.data.sessaoId,
          mensagens: historicoResult.data
        }
      });
    } catch (error: any) {
      logger.error('Erro ao buscar histórico', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const conversasController = new ConversasController();