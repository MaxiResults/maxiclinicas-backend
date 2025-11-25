import axios from 'axios';
import { ZApiWebhookMessage, ApiResponse } from '../types';
import { logger } from '../utils/logger';
import { formatPhoneWhatsApp, sleep } from '../utils/helpers';

export class ZApiService {
  private baseUrl: string;
  private instanceId: string;
  private token: string;

  constructor() {
    this.baseUrl = process.env.ZAPI_BASE_URL || 'https://api.z-api.io';
    this.instanceId = process.env.ZAPI_INSTANCE_ID || '';
    this.token = process.env.ZAPI_TOKEN || '';

    if (!this.instanceId || !this.token) {
      logger.warn('Z-API credentials not configured');
    }
  }

  /**
   * Enviar mensagem de texto
   */
  async enviarMensagem(
    telefone: string,
    mensagem: string,
    delay: number = 0
  ): Promise<ApiResponse<any>> {
    try {
      if (delay > 0) {
        await sleep(delay);
      }

      const phoneFormatted = formatPhoneWhatsApp(telefone);

      logger.info('Enviando mensagem via Z-API', { 
        telefone: phoneFormatted,
        preview: mensagem.substring(0, 50) 
      });

      const response = await axios.post(
        `${this.baseUrl}/instances/${this.instanceId}/token/${this.token}/send-text`,
        {
          phone: phoneFormatted,
          message: mensagem
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      logger.info('Mensagem enviada com sucesso', { 
        messageId: response.data?.messageId 
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      logger.error('Erro ao enviar mensagem via Z-API', {
        error: error.message,
        response: error.response?.data
      });

      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Enviar imagem
   */
  async enviarImagem(
    telefone: string,
    imageUrl: string,
    caption?: string
  ): Promise<ApiResponse<any>> {
    try {
      const phoneFormatted = formatPhoneWhatsApp(telefone);

      logger.info('Enviando imagem via Z-API', { telefone: phoneFormatted });

      const response = await axios.post(
        `${this.baseUrl}/instances/${this.instanceId}/token/${this.token}/send-image`,
        {
          phone: phoneFormatted,
          image: imageUrl,
          caption: caption || ''
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      logger.error('Erro ao enviar imagem via Z-API', error);

      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Enviar arquivo/documento
   */
  async enviarDocumento(
    telefone: string,
    fileUrl: string,
    fileName?: string
  ): Promise<ApiResponse<any>> {
    try {
      const phoneFormatted = formatPhoneWhatsApp(telefone);

      logger.info('Enviando documento via Z-API', { telefone: phoneFormatted });

      const response = await axios.post(
        `${this.baseUrl}/instances/${this.instanceId}/token/${this.token}/send-document`,
        {
          phone: phoneFormatted,
          document: fileUrl,
          fileName: fileName || 'documento.pdf'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      logger.error('Erro ao enviar documento via Z-API', error);

      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Marcar mensagem como lida
   */
  async marcarComoLida(
    telefone: string,
    messageId: string
  ): Promise<ApiResponse<void>> {
    try {
      const phoneFormatted = formatPhoneWhatsApp(telefone);

      await axios.post(
        `${this.baseUrl}/instances/${this.instanceId}/token/${this.token}/read-message`,
        {
          phone: phoneFormatted,
          messageId: messageId
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true };
    } catch (error: any) {
      logger.error('Erro ao marcar mensagem como lida', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verificar status da instância
   */
  async verificarStatus(): Promise<ApiResponse<any>> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/instances/${this.instanceId}/token/${this.token}/status`,
        {
          timeout: 10000
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      logger.error('Erro ao verificar status da instância Z-API', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Baixar mídia (imagem, áudio, vídeo)
   */
  async baixarMidia(mediaUrl: string): Promise<ApiResponse<Buffer>> {
    try {
      const response = await axios.get(mediaUrl, {
        responseType: 'arraybuffer',
        timeout: 60000
      });

      return {
        success: true,
        data: Buffer.from(response.data)
      };
    } catch (error: any) {
      logger.error('Erro ao baixar mídia', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Processar webhook recebido
   */
  processarWebhook(webhookData: ZApiWebhookMessage): {
    telefone: string;
    mensagem: string;
    messageId: string;
    tipo: string;
    fromMe: boolean;
    timestamp: number;
    senderName?: string;
  } {
    return {
      telefone: webhookData.phone,
      mensagem: webhookData.text?.message || '',
      messageId: webhookData.messageId,
      tipo: webhookData.type,
      fromMe: webhookData.fromMe,
      timestamp: webhookData.momment,
      senderName: webhookData.chatName
    };
  }

  /**
   * Validar webhook signature
   */
  validarWebhookSignature(
    signature: string,
    body: any
  ): boolean {
    const webhookSecret = process.env.ZAPI_WEBHOOK_SECRET || '';
    
    if (!webhookSecret) {
      logger.warn('ZAPI_WEBHOOK_SECRET não configurado');
      return true; // Aceita se não configurou secret
    }

    // Aqui você implementaria a validação real
    // Por enquanto, apenas compara com o secret
    return signature === webhookSecret;
  }

  /**
   * Gerar respostas automáticas baseadas em palavras-chave
   */
  gerarRespostaAutomatica(mensagem: string): string | null {
    const mensagemLower = mensagem.toLowerCase().trim();

    // Saudações
    if (/^(oi|olá|ola|hey|opa|bom dia|boa tarde|boa noite)$/i.test(mensagemLower)) {
      return '👋 Olá! Seja bem-vindo(a)! Como posso ajudar você hoje?\n\n' +
             'Você pode:\n' +
             '• Agendar um procedimento\n' +
             '• Tirar dúvidas\n' +
             '• Falar com um atendente\n\n' +
             'Digite sua dúvida ou o que precisa! 😊';
    }

    // Agendamento
    if (/(agendar|marcar|horário|consulta|procedimento|sessão)/i.test(mensagemLower)) {
      return '📅 *Agendamento*\n\n' +
             'Ótimo! Vou te ajudar a agendar.\n\n' +
             'Qual procedimento você gostaria de realizar?\n' +
             'Ou digite *CARDÁPIO* para ver todos os nossos serviços.';
    }

    // Preço
    if (/(quanto custa|valor|preço|$$)/i.test(mensagemLower)) {
      return '💰 *Valores*\n\n' +
             'Nossos valores variam de acordo com o procedimento.\n\n' +
             'Para um orçamento personalizado, me conte:\n' +
             '• Qual procedimento te interessa?\n' +
             '• Já fez antes ou seria a primeira vez?\n\n' +
             'Assim consigo te passar o valor exato! 😊';
    }

    // Horários
    if (/(horário|funciona|atende|aberto)/i.test(mensagemLower)) {
      return '🕐 *Horário de Atendimento*\n\n' +
             '• Segunda a Sexta: 8h às 18h\n' +
             '• Sábado: 8h às 12h\n' +
             '• Domingo: Fechado\n\n' +
             'Posso agendar um horário para você! 😊';
    }

    // Localização
    if (/(endereço|local|fica|onde)/i.test(mensagemLower)) {
      return '📍 *Localização*\n\n' +
             'Estamos localizados em:\n' +
             '[Seu endereço aqui]\n\n' +
             'Quer agendar uma visita? 😊';
    }

    // Atendente humano
    if (/(atendente|pessoa|humano|falar com alguém)/i.test(mensagemLower)) {
      return '👤 *Atendimento Humano*\n\n' +
             'Vou transferir você para um de nossos atendentes.\n' +
             'Aguarde um momento, por favor! 😊';
    }

    // Sem resposta específica
    return null;
  }
}

export const zapiService = new ZApiService();