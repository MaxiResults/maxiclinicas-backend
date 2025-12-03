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
/**
   * Listar leads que têm conversas
   */
  async listarLeadsComConversas(filters: {
    status?: string;
    profissional_id?: string;
    cliente_id: number;
    empresa_id: number;
  }): Promise<any[]> {
    try {
      console.log('📋 Listando leads com conversas...');

      // Buscar leads que têm pelo menos uma sessão
      let query = supabase
        .from('Leads')
        .select(`
          id,
          nome,
          telefone,
          whatsapp,
          status,
          origem,
          created_at
        `)
        .eq('cliente_id', filters.cliente_id)
        .eq('Empresa_ID', filters.empresa_id);

      const { data: leads, error: leadsError } = await query;

      if (leadsError) {
        console.error('❌ Erro ao buscar leads:', leadsError);
        throw new Error(`Erro ao buscar leads: ${leadsError.message}`);
      }

      if (!leads || leads.length === 0) {
        console.log('⚠️ Nenhum lead encontrado');
        return [];
      }

      // Para cada lead, buscar sessão ativa e última mensagem
      const leadsComConversas = await Promise.all(
        leads.map(async (lead) => {
          // Buscar sessão ativa
          const { data: sessaoAtiva } = await supabase
            .from('Conversas_Sessoes')
            .select('id, status_sessao, ultima_interacao, total_mensagens')
            .eq('lead_id', lead.id)
            .eq('Cliente_ID', filters.cliente_id)
            .eq('Empresa_ID', filters.empresa_id)
            .eq('status_sessao', 'ativa')
            .order('ultima_interacao', { ascending: false })
            .limit(1)
            .single();

          // Buscar última mensagem de qualquer sessão
          const { data: ultimaMensagem } = await supabase
            .from('Conversas_Historico')
            .select('mensagem, data_envio, tipo_mensagem')
            .in('sessao_id', 
              supabase
                .from('Conversas_Sessoes')
                .select('id')
                .eq('lead_id', lead.id)
            )
            .order('data_envio', { ascending: false })
            .limit(1)
            .single();

          // Contar total de mensagens
          const { count: totalMensagens } = await supabase
            .from('Conversas_Historico')
            .select('id', { count: 'exact', head: true })
            .in('sessao_id',
              supabase
                .from('Conversas_Sessoes')
                .select('id')
                .eq('lead_id', lead.id)
            );

          // Verificar se lead tem conversas
          const temConversas = totalMensagens && totalMensagens > 0;

          if (!temConversas) {
            return null; // Filtrar leads sem conversas
          }

          return {
            ...lead,
            sessao_ativa: sessaoAtiva || null,
            ultima_mensagem: ultimaMensagem || null,
            total_mensagens: totalMensagens || 0,
            ultima_interacao: sessaoAtiva?.ultima_interacao || lead.created_at,
          };
        })
      );

      // Filtrar nulls e ordenar por última interação
      const resultado = leadsComConversas
        .filter(lead => lead !== null)
        .sort((a, b) => {
          const dateA = new Date(a.ultima_interacao).getTime();
          const dateB = new Date(b.ultima_interacao).getTime();
          return dateB - dateA;
        });

      console.log(`✅ ${resultado.length} leads com conversas encontrados`);
      return resultado;
    } catch (error: any) {
      console.error('❌ Erro no service listarLeadsComConversas:', error);
      throw error;
    }
  }

  /**
   * Listar todas mensagens de um lead (de todas as sessões)
   */
  async listarMensagensPorLead(
    leadId: string,
    clienteId: number,
    empresaId: number
  ): Promise<any[]> {
    try {
      console.log('💬 Listando mensagens do lead:', leadId);

      // Buscar todas as sessões do lead
      const { data: sessoes, error: sessoesError } = await supabase
        .from('Conversas_Sessoes')
        .select('id')
        .eq('lead_id', leadId)
        .eq('Cliente_ID', clienteId)
        .eq('Empresa_ID', empresaId);

      if (sessoesError) {
        console.error('❌ Erro ao buscar sessões:', sessoesError);
        throw new Error(`Erro ao buscar sessões: ${sessoesError.message}`);
      }

      if (!sessoes || sessoes.length === 0) {
        console.log('⚠️ Lead não tem sessões');
        return [];
      }

      const sessoesIds = sessoes.map(s => s.id);

      // Buscar mensagens de todas as sessões
      const { data: mensagens, error: mensagensError } = await supabase
        .from('Conversas_Historico')
        .select('*')
        .in('sessao_id', sessoesIds)
        .order('data_envio', { ascending: true });

      if (mensagensError) {
        console.error('❌ Erro ao buscar mensagens:', mensagensError);
        throw new Error(`Erro ao buscar mensagens: ${mensagensError.message}`);
      }

      console.log(`✅ ${mensagens?.length || 0} mensagens encontradas`);
      return mensagens || [];
    } catch (error: any) {
      console.error('❌ Erro no service listarMensagensPorLead:', error);
      throw error;
    }
  }

  /**
   * Buscar ou criar sessão ativa para um lead
   */
  async buscarOuCriarSessaoAtiva(
    leadId: string,
    whatsappId: string,
    clienteId: number,
    empresaId: number
  ): Promise<string> {
    try {
      console.log('🔍 Buscando sessão ativa do lead:', leadId);

      // Buscar sessão ativa (últimas 24h)
      const { data: sessaoAtiva, error: buscaError } = await supabase
        .from('Conversas_Sessoes')
        .select('id, ultima_interacao')
        .eq('lead_id', leadId)
        .eq('Cliente_ID', clienteId)
        .eq('Empresa_ID', empresaId)
        .eq('status_sessao', 'ativa')
        .gte('ultima_interacao', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('ultima_interacao', { ascending: false })
        .limit(1)
        .single();

      if (sessaoAtiva && !buscaError) {
        console.log('✅ Sessão ativa encontrada:', sessaoAtiva.id);
        return sessaoAtiva.id;
      }

      console.log('⚠️ Nenhuma sessão ativa, criando nova...');

      // Encerrar sessões antigas se existirem
      await supabase
        .from('Conversas_Sessoes')
        .update({
          status_sessao: 'encerrada',
          data_fim: new Date().toISOString(),
          motivo_encerramento: 'timeout_24h',
        })
        .eq('lead_id', leadId)
        .eq('Cliente_ID', clienteId)
        .eq('Empresa_ID', empresaId)
        .eq('status_sessao', 'ativa');

      // Criar nova sessão
      const { data: novaSessao, error: criacaoError } = await supabase
        .from('Conversas_Sessoes')
        .insert({
          Cliente_ID: clienteId,
          Empresa_ID: empresaId,
          lead_id: leadId,
          whatsapp_id: whatsappId,
          canal: 'whatsapp',
          status_sessao: 'ativa',
          tipo_atendimento_atual: 'humano',
          total_mensagens: 0,
          data_inicio: new Date().toISOString(),
          ultima_interacao: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (criacaoError) {
        console.error('❌ Erro ao criar sessão:', criacaoError);
        throw new Error(`Erro ao criar sessão: ${criacaoError.message}`);
      }

      console.log('✅ Nova sessão criada:', novaSessao.id);
      return novaSessao.id;
    } catch (error: any) {
      console.error('❌ Erro no service buscarOuCriarSessaoAtiva:', error);
      throw error;
    }
  }

  /**
   * Enviar mensagem para um lead (cria sessão automaticamente se necessário)
   */
  async enviarMensagemPorLead(
    leadId: string,
    texto: string,
    clienteId: number,
    empresaId: number
  ): Promise<any> {
    try {
      console.log('📤 Enviando mensagem para lead:', leadId);

      // Buscar lead
      const { data: lead, error: leadError } = await supabase
        .from('Leads')
        .select('id, nome, telefone, whatsapp')
        .eq('id', leadId)
        .eq('cliente_id', clienteId)
        .eq('Empresa_ID', empresaId)
        .single();

      if (leadError || !lead) {
        throw new Error('Lead não encontrado');
      }

      const whatsappId = lead.whatsapp || lead.telefone;

      if (!whatsappId) {
        throw new Error('Lead não possui WhatsApp configurado');
      }

      // Buscar ou criar sessão ativa
      const sessaoId = await this.buscarOuCriarSessaoAtiva(
        leadId,
        whatsappId,
        clienteId,
        empresaId
      );

      // Enviar mensagem via Z-API
      const mensagem = await this.enviarMensagem(
        sessaoId,
        whatsappId,
        texto,
        clienteId,
        empresaId
      );

      console.log('✅ Mensagem enviada para lead com sucesso');
      return mensagem;
    } catch (error: any) {
      console.error('❌ Erro no service enviarMensagemPorLead:', error);
      throw error;
    }
  }
}