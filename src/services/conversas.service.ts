import { supabase } from '../config/supabase';
import { ConversaSessao, ConversaHistorico, ApiResponse } from '../types';
import { logger } from '../utils/logger';

export class ConversasService {
  /**
   * Buscar ou criar sessão de conversa ativa
   */
  async buscarOuCriarSessao(data: {
    leadId: string;
    clienteId: number;
    empresaId: number;
    whatsappId?: string;
    instanciaId?: string;
  }): Promise<ApiResponse<{ sessaoId: string; isNew: boolean }>> {
    try {
      logger.info('Buscando ou criando sessão de conversa', { leadId: data.leadId });

      // Verificar se existe sessão ativa
      const { data: sessaoAtiva, error: searchError } = await supabase
        .from('Conversas_Sessoes')
        .select('*')
        .eq('lead_id', data.leadId)
        .eq('Cliente_ID', data.clienteId)
        .eq('Empresa_ID', data.empresaId)
        .eq('status_sessao', 'ativa')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (searchError) {
        logger.error('Erro ao buscar sessão ativa', searchError);
        return {
          success: false,
          error: searchError.message
        };
      }

      // Se existe sessão ativa, atualiza última interação
      if (sessaoAtiva) {
        const { error: updateError } = await supabase
          .from('Conversas_Sessoes')
          .update({
            ultima_interacao: new Date().toISOString(),
            total_mensagens: (sessaoAtiva.total_mensagens || 0) + 1
          })
          .eq('id', sessaoAtiva.id);

        if (updateError) {
          logger.error('Erro ao atualizar sessão', updateError);
        }

        logger.info('Sessão ativa encontrada', { sessaoId: sessaoAtiva.id });

        return {
          success: true,
          data: {
            sessaoId: sessaoAtiva.id,
            isNew: false
          }
        };
      }

      // Criar nova sessão
      const novaSessao = {
        Cliente_ID: data.clienteId,
        Empresa_ID: data.empresaId,
        lead_id: data.leadId,
        instancia_id: data.instanciaId && this.isValidUUID(data.instanciaId) ? data.instanciaId : null,  // ← CORRIGIDO!
        whatsapp_id: data.whatsappId,
        canal: 'whatsapp',
        status_sessao: 'ativa',
        data_inicio: new Date().toISOString(),
        ultima_interacao: new Date().toISOString(),
        total_mensagens: 1,
        tipo_atendimento: 'automatico'
      };

      const { data: novaSessaoData, error: insertError } = await supabase
        .from('Conversas_Sessoes')
        .insert(novaSessao)
        .select()
        .single();

      if (insertError) {
        logger.error('Erro ao criar sessão', insertError);
        return {
          success: false,
          error: insertError.message
        };
      }

      logger.info('Nova sessão criada', { sessaoId: novaSessaoData.id });

      return {
        success: true,
        data: {
          sessaoId: novaSessaoData.id,
          isNew: true
        }
      };
    } catch (error: any) {
      logger.error('Erro inesperado ao buscar/criar sessão', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Salvar mensagem no histórico
   */
  async salvarMensagem(data: {
    sessaoId: string;
    clienteId: number;
    empresaId: number;
    remetente: 'lead' | 'sistema' | 'atendente';
    mensagem: string;
    tipoMensagem?: 'texto' | 'audio' | 'imagem' | 'video' | 'documento';
    messageId?: string;
    instanciaId?: string;
  }): Promise<ApiResponse<ConversaHistorico>> {
    try {
      const novaMensagem = {
        sessao_id: data.sessaoId,
        Cliente_ID: data.clienteId,
        Empresa_ID: data.empresaId,
        instancia_id: data.instanciaId && this.isValidUUID(data.instanciaId) ? data.instanciaId : null,  // ← CORRIGIDO!
        remetente: data.remetente,
        mensagem: data.mensagem,
        tipo_mensagem: data.tipoMensagem || 'texto',
        message_id: data.messageId,
        status_entrega: data.remetente === 'lead' ? 'entregue' : 'enviando',
        data_envio: new Date().toISOString()
      };

      const { data: mensagemSalva, error } = await supabase
        .from('Conversas_Historico')
        .insert(novaMensagem)
        .select()
        .single();

      if (error) {
        logger.error('Erro ao salvar mensagem', error);
        return {
          success: false,
          error: error.message
        };
      }

      logger.info('Mensagem salva', { 
        sessaoId: data.sessaoId,
        remetente: data.remetente 
      });

      return {
        success: true,
        data: mensagemSalva as ConversaHistorico
      };
    } catch (error: any) {
      logger.error('Erro inesperado ao salvar mensagem', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar histórico de mensagens de uma sessão
   */
  async buscarHistorico(
    sessaoId: string,
    limit: number = 50
  ): Promise<ApiResponse<ConversaHistorico[]>> {
    try {
      const { data, error } = await supabase
        .from('Conversas_Historico')
        .select('*')
        .eq('sessao_id', sessaoId)
        .order('data_envio', { ascending: true })
        .limit(limit);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data as ConversaHistorico[]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Atualizar status de entrega da mensagem
   */
  async atualizarStatusEntrega(
    messageId: string,
    status: 'enviando' | 'enviado' | 'entregue' | 'lido' | 'erro'
  ): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('Conversas_Historico')
        .update({ status_entrega: status })
        .eq('message_id', messageId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Finalizar sessão
   */
  async finalizarSessao(sessaoId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('Conversas_Sessoes')
        .update({
          status_sessao: 'finalizada',
          data_fim: new Date().toISOString()
        })
        .eq('id', sessaoId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      logger.info('Sessão finalizada', { sessaoId });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Transferir conversa para atendente
   */
  async transferirParaAtendente(
    sessaoId: string,
    atendenteId: string
  ): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('Conversas_Sessoes')
        .update({
          atendente_id: atendenteId,
          tipo_atendimento: 'humano'
        })
        .eq('id', sessaoId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      logger.info('Conversa transferida para atendente', { 
        sessaoId, 
        atendenteId 
      });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar sessões ativas
   */
  async buscarSessoesAtivas(
    clienteId: number,
    empresaId: number
  ): Promise<ApiResponse<ConversaSessao[]>> {
    try {
      const { data, error } = await supabase
        .from('Conversas_Sessoes')
        .select('*')
        .eq('Cliente_ID', clienteId)
        .eq('Empresa_ID', empresaId)
        .eq('status_sessao', 'ativa')
        .order('ultima_interacao', { ascending: false });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data as ConversaSessao[]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Validar se string é UUID
   */
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}

export const conversasService = new ConversasService();