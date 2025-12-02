import { supabase } from '../config/supabase';
import axios from 'axios';

interface Sessao {
  id: string;
  whatsapp_id: string;
  lead_id?: string;
  canal: string;
  status_sessao: string;
  profissional_responsavel_id?: string;
  tipo_atendimento_atual: string;
  ultima_interacao: string;
  total_mensagens: number;
  created_at: string;
}

interface Mensagem {
  id: string;
  sessao_id: string;
  remetente: string;
  tipo_mensagem: string;
  mensagem: string;
  message_id?: string;
  data_envio: string;
  status_entrega: string;
  midia_url?: string;
  midia_tipo?: string;
}

export class ConversasService {
  /**
   * Listar sessões de conversa
   */
async listarSessoes(filters: {
  status?: string;
  profissional_id?: string;
  cliente_id: number;
  empresa_id: number;
}): Promise<any[]> {
  try {
    // 1. Buscar sessões
    let query = supabase
      .from('Conversas_Sessoes')
      .select('*')
      .eq('Cliente_ID', filters.cliente_id)
      .eq('Empresa_ID', filters.empresa_id)
      .order('ultima_interacao', { ascending: false });

    // Filtros opcionais
    if (filters.status) {
      query = query.eq('status_sessao', filters.status);
    }

    if (filters.profissional_id) {
      query = query.eq('profissional_responsavel_id', filters.profissional_id);
    }

    const { data: sessoes, error: sessoesError } = await query;

    if (sessoesError) {
      console.error('❌ Erro ao listar sessões:', sessoesError);
      throw new Error(`Erro ao listar sessões: ${sessoesError.message}`);
    }

    // 2. Para cada sessão, buscar última mensagem
    const sessoesComMensagem = await Promise.all(
      (sessoes || []).map(async (sessao) => {
        const { data: ultimaMensagem } = await supabase
          .from('Conversas_Historico')
          .select('mensagem, data_envio, tipo_mensagem')
          .eq('sessao_id', sessao.id)
          .order('data_envio', { ascending: false })
          .limit(1)
          .single();

        return {
          ...sessao,
          ultima_mensagem: ultimaMensagem || null,
        };
      })
    );

    console.log(`✅ ${sessoesComMensagem.length} sessões encontradas`);
    return sessoesComMensagem;
  } catch (error: any) {
    console.error('❌ Erro no service listarSessoes:', error);
    throw error;
  }
}
  /**
   * Listar mensagens de uma sessão
   */
  async listarMensagens(
    sessaoId: string,
    clienteId: number,
    empresaId: number
  ): Promise<Mensagem[]> {
    try {
      const { data, error } = await supabase
        .from('Conversas_Historico')
        .select('*')
        .eq('sessao_id', sessaoId)
        .eq('Cliente_ID', clienteId)
        .eq('Empresa_ID', empresaId)
        .order('data_envio', { ascending: true });

      if (error) {
        console.error('❌ Erro ao listar mensagens:', error);
        throw new Error(`Erro ao listar mensagens: ${error.message}`);
      }

      console.log(`✅ ${data?.length || 0} mensagens encontradas`);
      return data || [];
    } catch (error: any) {
      console.error('❌ Erro no service listarMensagens:', error);
      throw error;
    }
  }

  /**
   * Enviar mensagem via Z-API
   */
  async enviarMensagem(
    sessaoId: string,
    whatsappId: string,
    texto: string,
    clienteId: number,
    empresaId: number
  ): Promise<Mensagem> {
    try {
      const ZAPI_URL = process.env.ZAPI_URL;
      const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
      const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE_ID;

      if (!ZAPI_URL || !ZAPI_TOKEN || !ZAPI_INSTANCE) {
        throw new Error('Credenciais Z-API não configuradas');
      }

      console.log('📤 Enviando mensagem via Z-API...');
      console.log('📱 Para:', whatsappId);
      console.log('💬 Texto:', texto);

      // Enviar via Z-API
      const response = await axios.post(
        `${ZAPI_URL}/instances/${ZAPI_INSTANCE}/send-text`,
        {
          phone: whatsappId,
          message: texto,
        },
        {
          headers: {
            'Client-Token': ZAPI_TOKEN,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Z-API Response:', response.data);

      const messageId = response.data?.messageId || response.data?.id;

      // Salvar no banco
      const { data, error } = await supabase
        .from('Conversas_Historico')
        .insert({
          sessao_id: sessaoId,
          Cliente_ID: clienteId,
          Empresa_ID: empresaId,
          remetente: 'atendente',
          tipo_mensagem: 'text',
          mensagem: texto,
          message_id: messageId,
          data_envio: new Date().toISOString(),
          status_entrega: 'enviado',
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao salvar mensagem:', error);
        throw new Error(`Erro ao salvar mensagem: ${error.message}`);
      }

      // Atualizar sessão
      await supabase
        .from('Conversas_Sessoes')
        .update({
          ultima_interacao: new Date().toISOString(),
        })
        .eq('id', sessaoId);

      console.log('✅ Mensagem salva no banco');
      return data;
    } catch (error: any) {
      console.error('❌ Erro ao enviar mensagem:', error);
      
      // Salvar erro no banco
      await supabase.from('Conversas_Historico').insert({
        sessao_id: sessaoId,
        Cliente_ID: clienteId,
        Empresa_ID: empresaId,
        remetente: 'atendente',
        tipo_mensagem: 'text',
        mensagem: texto,
        data_envio: new Date().toISOString(),
        status_entrega: 'erro',
        erro_descricao: error.message,
      });

      throw error;
    }
  }

  /**
   * Buscar sessão por ID
   */
  async buscarSessao(
    sessaoId: string,
    clienteId: number,
    empresaId: number
  ): Promise<Sessao | null> {
    try {
      const { data, error } = await supabase
        .from('Conversas_Sessoes')
        .select('*')
        .eq('id', sessaoId)
        .eq('Cliente_ID', clienteId)
        .eq('Empresa_ID', empresaId)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar sessão:', error);
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('❌ Erro no service buscarSessao:', error);
      return null;
    }
  }
}