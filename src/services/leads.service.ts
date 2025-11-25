import { supabase } from '../config/supabase';
import { Lead, ApiResponse } from '../types';
import { formatPhone, formatPhoneWhatsApp } from '../utils/helpers';
import { logger } from '../utils/logger';

export class LeadsService {
  /**
   * Busca ou cria lead por telefone
   */
  async buscarOuCriarLead(data: {
    telefone: string;
    clienteId: number;
    empresaId: number;
    whatsappId?: string;
    whatsappNome?: string;
    nome?: string;
  }): Promise<ApiResponse<{ leadId: string; isNew: boolean; lead: Lead }>> {
    try {
      const telefoneFormatado = formatPhone(data.telefone);
      
      logger.info('Buscando ou criando lead', { telefone: telefoneFormatado });

      // Chamar função SQL do banco
      const { data: result, error } = await supabase.rpc('buscar_ou_criar_lead', {
        p_telefone: telefoneFormatado,
        p_cliente_id: data.clienteId,
        p_empresa_id: data.empresaId,
        p_whatsapp_id: data.whatsappId,
        p_whatsapp_nome: data.whatsappNome || data.nome
      });

      if (error) {
        logger.error('Erro ao buscar/criar lead', error);
        return {
          success: false,
          error: error.message
        };
      }

      // Buscar lead completo
      const { data: lead, error: leadError } = await supabase
        .from('Leads_Cadastro')
        .select('*')
        .eq('id', result)
        .single();

      if (leadError) {
        return {
          success: false,
          error: leadError.message
        };
      }

      logger.info('Lead encontrado/criado', { leadId: result });

      return {
        success: true,
        data: {
          leadId: result,
          isNew: true, // A função SQL não retorna isso, assume novo por enquanto
          lead: lead as Lead
        }
      };
    } catch (error: any) {
      logger.error('Erro inesperado ao buscar/criar lead', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar lead por ID
   */
  async buscarPorId(leadId: string): Promise<ApiResponse<Lead>> {
    try {
      const { data, error } = await supabase
        .from('Leads_Cadastro')
        .select('*')
        .eq('id', leadId)
        .is('data_excluido', null)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data as Lead
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar lead por telefone
   */
  async buscarPorTelefone(
    telefone: string,
    clienteId: number,
    empresaId: number
  ): Promise<ApiResponse<Lead | null>> {
    try {
      const telefoneFormatado = formatPhone(telefone);

      const { data, error } = await supabase
        .from('Leads_Cadastro')
        .select('*')
        .eq('telefone', telefoneFormatado)
        .eq('Cliente_ID', clienteId)
        .eq('Empresa_ID', empresaId)
        .is('data_excluido', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data as Lead | null
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Listar leads
   */
  async listar(filters: {
    clienteId: number;
    empresaId: number;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Lead[]>> {
    try {
      let query = supabase
        .from('Leads_Cadastro')
        .select('*')
        .eq('Cliente_ID', filters.clienteId)
        .eq('Empresa_ID', filters.empresaId)
        .is('data_excluido', null)
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data as Lead[]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Atualizar lead
   */
  async atualizar(
    leadId: string,
    updates: Partial<Lead>
  ): Promise<ApiResponse<Lead>> {
    try {
      const { data, error } = await supabase
        .from('Leads_Cadastro')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      logger.info('Lead atualizado', { leadId });

      return {
        success: true,
        data: data as Lead
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Converter lead em cliente
   */
  async converterEmCliente(
    leadId: string,
    nomeCompleto?: string
  ): Promise<ApiResponse<{ clienteFinalId: string }>> {
    try {
      logger.info('Convertendo lead em cliente', { leadId });

      const { data: result, error } = await supabase.rpc('converter_lead_em_cliente', {
        p_lead_id: leadId,
        p_nome_completo: nomeCompleto
      });

      if (error) {
        logger.error('Erro ao converter lead', error);
        return {
          success: false,
          error: error.message
        };
      }

      logger.info('Lead convertido com sucesso', { clienteFinalId: result });

      return {
        success: true,
        data: {
          clienteFinalId: result
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Adicionar tag ao lead
   */
  async adicionarTag(
    leadId: string,
    tag: string,
    clienteId: number,
    empresaId: number,
    cor?: string
  ): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('leads_tags')
        .insert({
          lead_id: leadId,
          cliente_id: clienteId,
          empresa_id: empresaId,
          tag: tag,
          cor: cor || '#6366f1'
        });

      if (error) {
        // Se já existe, ignora o erro
        if (error.code === '23505') {
          return { success: true };
        }
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
   * Buscar tags do lead
   */
  async buscarTags(leadId: string): Promise<ApiResponse<string[]>> {
    try {
      const { data, error } = await supabase
        .from('leads_tags')
        .select('tag')
        .eq('lead_id', leadId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data.map(t => t.tag)
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const leadsService = new LeadsService();