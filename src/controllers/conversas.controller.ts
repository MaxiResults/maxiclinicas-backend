import { Request, Response } from 'express';
import { ConversasService } from '../services/conversas.service';

const conversasService = new ConversasService();

// IDs padrão (temporário - até ter autenticação)
const DEFAULT_CLIENTE_ID = 1;
const DEFAULT_EMPRESA_ID = 1;

export class ConversasController {
  /**
   * GET /conversas
   * Listar sessões de conversa
   */
  async listarSessoes(req: Request, res: Response) {
    try {
      const { status, profissional_id } = req.query;

      console.log('📋 Listando sessões...');
      console.log('Filtros:', { status, profissional_id });

      const sessoes = await conversasService.listarSessoes({
        status: status as string,
        profissional_id: profissional_id as string,
        cliente_id: DEFAULT_CLIENTE_ID,
        empresa_id: DEFAULT_EMPRESA_ID,
      });

      return res.json({
        success: true,
        data: sessoes,
        total: sessoes.length,
      });
    } catch (error: any) {
      console.error('❌ Erro no controller listarSessoes:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar sessões',
        error: error.message,
      });
    }
  }

  /**
   * GET /conversas/:sessaoId/mensagens
   * Listar mensagens de uma sessão
   */
  async listarMensagens(req: Request, res: Response) {
    try {
      const { sessaoId } = req.params;

      console.log('💬 Listando mensagens da sessão:', sessaoId);

      // Verificar se sessão existe
      const sessao = await conversasService.buscarSessao(
        sessaoId,
        DEFAULT_CLIENTE_ID,
        DEFAULT_EMPRESA_ID
      );

      if (!sessao) {
        return res.status(404).json({
          success: false,
          message: 'Sessão não encontrada',
        });
      }

      const mensagens = await conversasService.listarMensagens(
        sessaoId,
        DEFAULT_CLIENTE_ID,
        DEFAULT_EMPRESA_ID
      );

      return res.json({
        success: true,
        data: mensagens,
        total: mensagens.length,
      });
    } catch (error: any) {
      console.error('❌ Erro no controller listarMensagens:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar mensagens',
        error: error.message,
      });
    }
  }

  /**
   * POST /conversas/:sessaoId/mensagens
   * Enviar mensagem para cliente
   */
  async enviarMensagem(req: Request, res: Response) {
    try {
      const { sessaoId } = req.params;
      const { texto } = req.body;

      console.log('📤 Enviando mensagem...');
      console.log('Sessão:', sessaoId);
      console.log('Texto:', texto);

      // Validações
      if (!texto || texto.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Texto da mensagem é obrigatório',
        });
      }

      // Buscar sessão
      const sessao = await conversasService.buscarSessao(
        sessaoId,
        DEFAULT_CLIENTE_ID,
        DEFAULT_EMPRESA_ID
      );

      if (!sessao) {
        return res.status(404).json({
          success: false,
          message: 'Sessão não encontrada',
        });
      }

      if (!sessao.whatsapp_id) {
        return res.status(400).json({
          success: false,
          message: 'Sessão não possui WhatsApp ID',
        });
      }

      // Enviar mensagem
      const mensagem = await conversasService.enviarMensagem(
        sessaoId,
        sessao.whatsapp_id,
        texto,
        DEFAULT_CLIENTE_ID,
        DEFAULT_EMPRESA_ID
      );

      return res.json({
        success: true,
        data: mensagem,
        message: 'Mensagem enviada com sucesso',
      });
    } catch (error: any) {
      console.error('❌ Erro no controller enviarMensagem:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar mensagem',
        error: error.message,
      });
    }
  }
/**
   * GET /conversas-leads
   * Listar leads que têm conversas
   */
  async listarLeadsComConversas(req: Request, res: Response) {
    try {
      const { status, profissional_id } = req.query;

      console.log('📋 Listando leads com conversas...');
      console.log('Filtros:', { status, profissional_id });

      const leads = await conversasService.listarLeadsComConversas({
        status: status as string,
        profissional_id: profissional_id as string,
        cliente_id: DEFAULT_CLIENTE_ID,
        empresa_id: DEFAULT_EMPRESA_ID,
      });

      return res.json({
        success: true,
        data: leads,
        total: leads.length,
      });
    } catch (error: any) {
      console.error('❌ Erro no controller listarLeadsComConversas:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar leads com conversas',
        error: error.message,
      });
    }
  }

  /**
   * GET /conversas-leads/:leadId/mensagens
   * Listar todas mensagens de um lead
   */
  async listarMensagensPorLead(req: Request, res: Response) {
    try {
      const { leadId } = req.params;

      console.log('💬 Listando mensagens do lead:', leadId);

      const mensagens = await conversasService.listarMensagensPorLead(
        leadId,
        DEFAULT_CLIENTE_ID,
        DEFAULT_EMPRESA_ID
      );

      return res.json({
        success: true,
        data: mensagens,
        total: mensagens.length,
      });
    } catch (error: any) {
      console.error('❌ Erro no controller listarMensagensPorLead:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar mensagens do lead',
        error: error.message,
      });
    }
  }

  /**
   * POST /conversas-leads/:leadId/mensagens
   * Enviar mensagem para um lead
   */
  async enviarMensagemPorLead(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const { texto } = req.body;

      console.log('📤 Enviando mensagem para lead...');
      console.log('Lead:', leadId);
      console.log('Texto:', texto);

      // Validações
      if (!texto || texto.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Texto da mensagem é obrigatório',
        });
      }

      // Enviar mensagem
      const mensagem = await conversasService.enviarMensagemPorLead(
        leadId,
        texto,
        DEFAULT_CLIENTE_ID,
        DEFAULT_EMPRESA_ID
      );

      return res.json({
        success: true,
        data: mensagem,
        message: 'Mensagem enviada com sucesso',
      });
    } catch (error: any) {
      console.error('❌ Erro no controller enviarMensagemPorLead:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar mensagem para lead',
        error: error.message,
      });
    }
  }
}