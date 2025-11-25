import { Request, Response } from 'express';
import { leadsService } from '../services/leads.service';
import { conversasService } from '../services/conversas.service';
import { zapiService } from '../services/zapi.service';
import { logger } from '../utils/logger';
import { ZApiWebhookMessage } from '../types';
import { extractPhoneFromWhatsApp } from '../utils/helpers';

export class WebhooksController {
  /**
   * Processar webhook recebido do Z-API
   */
  async handleZApiWebhook(req: Request, res: Response) {
    try {
      const webhookData: ZApiWebhookMessage = req.body;

      logger.info('Webhook Z-API recebido', {
        type: webhookData.type,
        phone: webhookData.phone,
        fromMe: webhookData.fromMe
      });

      // Ignorar mensagens enviadas por nós
      if (webhookData.fromMe) {
        logger.debug('Mensagem enviada por nós, ignorando');
        return res.status(200).json({ received: true, processed: false });
      }

      // Ignorar se não for mensagem de texto (por enquanto)
      if (!webhookData.text?.message) {
        logger.debug('Mensagem sem texto, ignorando');
        return res.status(200).json({ received: true, processed: false });
      }

      // Processar mensagem
      await this.processarMensagemRecebida(webhookData);

      return res.status(200).json({
        success: true,
        message: 'Webhook processado com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao processar webhook', error);
      
      // Sempre retorna 200 para o Z-API não ficar reenviando
      return res.status(200).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Processar mensagem recebida
   */
  private async processarMensagemRecebida(webhookData: ZApiWebhookMessage) {
    try {
      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '1');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '1');
      
      const telefone = extractPhoneFromWhatsApp(webhookData.phone);
      const mensagem = webhookData.text?.message || '';
      const senderName = webhookData.chatName;

      logger.info('Processando mensagem', {
        telefone,
        mensagem: mensagem.substring(0, 50)
      });

      // 1. BUSCAR OU CRIAR LEAD
      const leadResult = await leadsService.buscarOuCriarLead({
        telefone,
        clienteId,
        empresaId,
        whatsappId: webhookData.phone,
        whatsappNome: senderName,
        nome: senderName
      });

      if (!leadResult.success || !leadResult.data) {
        logger.error('Erro ao buscar/criar lead', leadResult.error);
        return;
      }

      const { leadId } = leadResult.data;

      // 2. BUSCAR OU CRIAR SESSÃO DE CONVERSA
      const sessaoResult = await conversasService.buscarOuCriarSessao({
        leadId,
        clienteId,
        empresaId,
        whatsappId: webhookData.phone,
        instanciaId: webhookData.instanceId
      });

      if (!sessaoResult.success || !sessaoResult.data) {
        logger.error('Erro ao buscar/criar sessão', sessaoResult.error);
        return;
      }

      const { sessaoId } = sessaoResult.data;

      // 3. SALVAR MENSAGEM NO HISTÓRICO
      await conversasService.salvarMensagem({
        sessaoId,
        clienteId,
        empresaId,
        remetente: 'lead',
        mensagem,
        tipoMensagem: 'texto',
        messageId: webhookData.messageId,
        instanciaId: webhookData.instanceId
      });

      // 4. GERAR E ENVIAR RESPOSTA AUTOMÁTICA
      const respostaAutomatica = zapiService.gerarRespostaAutomatica(mensagem);

      if (respostaAutomatica) {
        logger.info('Enviando resposta automática');

        // Enviar resposta
        const envioResult = await zapiService.enviarMensagem(
          telefone,
          respostaAutomatica,
          1000 // Delay de 1 segundo
        );

        if (envioResult.success) {
          // Salvar resposta no histórico
          await conversasService.salvarMensagem({
            sessaoId,
            clienteId,
            empresaId,
            remetente: 'sistema',
            mensagem: respostaAutomatica,
            tipoMensagem: 'texto',
            messageId: envioResult.data?.messageId,
            instanciaId: webhookData.instanceId
          });

          logger.info('Resposta automática enviada com sucesso');
        } else {
          logger.error('Erro ao enviar resposta automática', envioResult.error);
        }
      } else {
        logger.debug('Nenhuma resposta automática gerada');
      }

      // 5. VERIFICAR SE PRECISA TRANSFERIR PARA ATENDENTE HUMANO
      if (this.precisaAtendimentoHumano(mensagem)) {
        logger.info('Transferindo para atendimento humano');
        
        // Você pode implementar lógica de notificação aqui
        // Ex: enviar mensagem para Slack, email, etc.
        
        await zapiService.enviarMensagem(
          telefone,
          '👤 Entendi! Vou transferir você para um atendente humano.\n' +
          'Aguarde um momento, por favor! 😊',
          500
        );
      }

      logger.info('Mensagem processada com sucesso', { leadId, sessaoId });
    } catch (error: any) {
      logger.error('Erro ao processar mensagem recebida', error);
      throw error;
    }
  }

  /**
   * Verificar se mensagem precisa de atendimento humano
   */
  private precisaAtendimentoHumano(mensagem: string): boolean {
    const mensagemLower = mensagem.toLowerCase();
    
    const palavrasChave = [
      'atendente',
      'pessoa',
      'humano',
      'falar com alguém',
      'quero falar',
      'preciso falar',
      'urgente',
      'reclamação',
      'problema'
    ];

    return palavrasChave.some(palavra => mensagemLower.includes(palavra));
  }

  /**
   * Health check do webhook
   */
  async healthCheck(req: Request, res: Response) {
    return res.status(200).json({
      status: 'ok',
      service: 'webhook-zapi',
      timestamp: new Date().toISOString()
    });
  }
}

export const webhooksController = new WebhooksController();